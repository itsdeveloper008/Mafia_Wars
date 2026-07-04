'use client'

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { getDb } from '@/services/firebase/client'

type SignalType = 'offer' | 'answer' | 'ice'

type SignalDoc = {
  from: string
  to: string
  type: SignalType
  sdp?: string
  candidate?: string
  at?: unknown
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

export type MeshCallbacks = {
  onConnection?: (state: 'connecting' | 'connected' | 'disconnected') => void
  onSpeaking?: (identity: string, speaking: boolean) => void
  onPeerCount?: (count: number) => void
  onRemoteStream?: (uid: string, stream: MediaStream | null) => void
  onLocalStream?: (stream: MediaStream | null) => void
  onError?: (message: string) => void
}

export class MeshVoiceService {
  private roomId = ''
  private uid = ''
  private localStream: MediaStream | null = null
  private peers = new Map<string, RTCPeerConnection>()
  private makingOffer = new Set<string>()
  private remoteStreams = new Map<string, MediaStream>()
  private unsubs: Unsubscribe[] = []
  private callbacks: MeshCallbacks = {}
  private analyser: AnalyserNode | null = null
  private audioCtx: AudioContext | null = null
  private speakTimer: number | null = null
  private connected = false

  configure(callbacks: MeshCallbacks) {
    this.callbacks = callbacks
  }

  async connect(input: {
    roomId: string
    uid: string
    name: string
    enableMic: boolean
    enableCam: boolean
  }) {
    await this.disconnect()
    this.roomId = input.roomId
    this.uid = input.uid
    this.callbacks.onConnection?.('connecting')

    try {
      // Prefer audio+video; fall back to audio-only if camera fails
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: input.enableCam
            ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
            : false,
        })
      } catch {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        })
      }

      // If video was requested but not granted, try adding camera separately
      if (input.enableCam && !this.localStream.getVideoTracks().length) {
        try {
          const cam = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          })
          cam.getVideoTracks().forEach((t) => this.localStream!.addTrack(t))
        } catch {
          // camera optional
        }
      }

      this.localStream.getAudioTracks().forEach((t) => {
        t.enabled = input.enableMic
      })
      this.localStream.getVideoTracks().forEach((t) => {
        t.enabled = input.enableCam
      })

      this.callbacks.onLocalStream?.(this.localStream)
      this.startLocalSpeakDetect()

      await setDoc(doc(getDb(), 'rooms', this.roomId, 'voicePeers', this.uid), {
        uid: this.uid,
        name: input.name,
        joinedAt: Date.now(),
      })

      this.unsubs.push(
        onSnapshot(
          collection(getDb(), 'rooms', this.roomId, 'voicePeers'),
          (snap) => {
            const others = snap.docs
              .map((d) => d.data().uid as string)
              .filter((id) => id && id !== this.uid)

            for (const id of [...this.peers.keys()]) {
              if (!others.includes(id)) this.closePeer(id)
            }

            for (const otherId of others) {
              if (this.peers.has(otherId)) continue
              if (this.uid < otherId) void this.createOffer(otherId)
              else this.ensurePeer(otherId)
            }

            this.callbacks.onPeerCount?.(others.length)
            this.connected = true
            this.callbacks.onConnection?.('connected')
          },
          (err) => this.callbacks.onError?.(err.message),
        ),
      )

      this.unsubs.push(
        onSnapshot(
          collection(getDb(), 'rooms', this.roomId, 'voiceSignals'),
          (snap) => {
            snap.docChanges().forEach((change) => {
              if (change.type !== 'added') return
              const data = change.doc.data() as SignalDoc
              if (data.to !== this.uid) return
              void this.handleSignal(data, change.doc.id)
            })
          },
        ),
      )
    } catch (e) {
      this.callbacks.onError?.(
        e instanceof Error ? e.message : 'Microphone permission denied',
      )
      this.callbacks.onConnection?.('disconnected')
      throw e
    }
  }

  private signalsCol() {
    return collection(getDb(), 'rooms', this.roomId, 'voiceSignals')
  }

  private ensurePeer(remoteId: string): RTCPeerConnection {
    const existing = this.peers.get(remoteId)
    if (existing) return existing

    const pc = new RTCPeerConnection(ICE_SERVERS)
    this.peers.set(remoteId, pc)

    this.localStream?.getTracks().forEach((track) => {
      pc.addTrack(track, this.localStream!)
    })

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return
      void addDoc(this.signalsCol(), {
        from: this.uid,
        to: remoteId,
        type: 'ice',
        candidate: JSON.stringify(ev.candidate.toJSON()),
        at: serverTimestamp(),
      } satisfies SignalDoc)
    }

    pc.ontrack = (ev) => {
      let stream = this.remoteStreams.get(remoteId)
      if (!stream) {
        stream = new MediaStream()
        this.remoteStreams.set(remoteId, stream)
      }
      ev.streams[0]?.getTracks().forEach((track) => {
        const already = stream!.getTracks().some((t) => t.id === track.id)
        if (!already) stream!.addTrack(track)
      })
      // Also handle track without streams array
      if (ev.track && !stream.getTracks().some((t) => t.id === ev.track.id)) {
        stream.addTrack(ev.track)
      }
      this.callbacks.onRemoteStream?.(remoteId, stream)

      // Ensure audio plays
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length) {
        let audio = document.getElementById(
          `mesh-audio-${remoteId}`,
        ) as HTMLAudioElement | null
        if (!audio) {
          audio = document.createElement('audio')
          audio.id = `mesh-audio-${remoteId}`
          audio.autoplay = true
          audio.setAttribute('playsinline', 'true')
          audio.style.display = 'none'
          document.body.appendChild(audio)
        }
        audio.srcObject = stream
        void audio.play().catch(() => undefined)
      }
    }

    return pc
  }

  private async createOffer(remoteId: string) {
    if (this.makingOffer.has(remoteId)) return
    this.makingOffer.add(remoteId)
    try {
      const pc = this.ensurePeer(remoteId)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      await addDoc(this.signalsCol(), {
        from: this.uid,
        to: remoteId,
        type: 'offer',
        sdp: offer.sdp ?? '',
        at: serverTimestamp(),
      } satisfies SignalDoc)
    } finally {
      this.makingOffer.delete(remoteId)
    }
  }

  private async handleSignal(signal: SignalDoc, docId: string) {
    try {
      const pc = this.ensurePeer(signal.from)

      if (signal.type === 'offer' && signal.sdp) {
        await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp })
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        await addDoc(this.signalsCol(), {
          from: this.uid,
          to: signal.from,
          type: 'answer',
          sdp: answer.sdp ?? '',
          at: serverTimestamp(),
        } satisfies SignalDoc)
      }

      if (signal.type === 'answer' && signal.sdp) {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp })
        }
      }

      if (signal.type === 'ice' && signal.candidate) {
        try {
          await pc.addIceCandidate(JSON.parse(signal.candidate))
        } catch {
          // ignore
        }
      }
    } finally {
      void deleteDoc(doc(getDb(), 'rooms', this.roomId, 'voiceSignals', docId))
    }
  }

  private closePeer(remoteId: string) {
    this.peers.get(remoteId)?.close()
    this.peers.delete(remoteId)
    this.remoteStreams.delete(remoteId)
    this.callbacks.onRemoteStream?.(remoteId, null)
    const audio = document.getElementById(`mesh-audio-${remoteId}`)
    audio?.remove()
  }

  private startLocalSpeakDetect() {
    if (!this.localStream?.getAudioTracks().length) return
    this.audioCtx = new AudioContext()
    const source = this.audioCtx.createMediaStreamSource(this.localStream)
    this.analyser = this.audioCtx.createAnalyser()
    this.analyser.fftSize = 512
    source.connect(this.analyser)
    const data = new Uint8Array(this.analyser.frequencyBinCount)

    const tick = () => {
      if (!this.analyser) return
      this.analyser.getByteFrequencyData(data)
      const avg = data.reduce((a, b) => a + b, 0) / data.length
      const live = this.localStream?.getAudioTracks().some((t) => t.enabled) ?? false
      this.callbacks.onSpeaking?.(this.uid, live && avg > 18)
      this.speakTimer = window.setTimeout(tick, 120)
    }
    tick()
  }

  setMicEnabled(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = enabled
    })
  }

  async setCamEnabled(enabled: boolean) {
    const hasVideo = Boolean(this.localStream?.getVideoTracks().length)
    if (!hasVideo && enabled) {
      try {
        const cam = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        })
        const track = cam.getVideoTracks()[0]
        if (track && this.localStream) {
          this.localStream.addTrack(track)
          // Add to existing peer connections and renegotiate
          for (const [remoteId, pc] of this.peers) {
            pc.addTrack(track, this.localStream)
            if (this.uid < remoteId) void this.createOffer(remoteId)
          }
          this.callbacks.onLocalStream?.(this.localStream)
        }
      } catch (e) {
        this.callbacks.onError?.(
          e instanceof Error ? e.message : 'Camera permission denied',
        )
        return
      }
    }
    this.localStream?.getVideoTracks().forEach((t) => {
      t.enabled = enabled
    })
    this.callbacks.onLocalStream?.(this.localStream)
  }

  getLocalStream() {
    return this.localStream
  }

  getRemoteStreams() {
    return new Map(this.remoteStreams)
  }

  async disconnect() {
    if (this.speakTimer) window.clearTimeout(this.speakTimer)
    this.speakTimer = null
    this.analyser = null
    if (this.audioCtx) {
      void this.audioCtx.close()
      this.audioCtx = null
    }

    for (const id of [...this.peers.keys()]) this.closePeer(id)
    this.unsubs.forEach((u) => u())
    this.unsubs = []

    this.localStream?.getTracks().forEach((t) => t.stop())
    this.localStream = null
    this.callbacks.onLocalStream?.(null)

    if (this.roomId && this.uid) {
      void deleteDoc(doc(getDb(), 'rooms', this.roomId, 'voicePeers', this.uid))
    }

    this.connected = false
    this.roomId = ''
    this.uid = ''
    this.callbacks.onConnection?.('disconnected')
  }
}

export const MeshVoice = new MeshVoiceService()
