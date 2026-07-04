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
    { urls: 'stun:stun2.l.google.com:19302' },
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

type PeerState = {
  pc: RTCPeerConnection
  makingOffer: boolean
  ignoreOffer: boolean
  polite: boolean
  pendingIce: RTCIceCandidateInit[]
}

/**
 * Reliable small-room WebRTC mesh (Firestore signaling).
 * Uses perfect negotiation to avoid glare / one-way audio.
 */
export class MeshVoiceService {
  private roomId = ''
  private uid = ''
  private localStream: MediaStream | null = null
  private peers = new Map<string, PeerState>()
  private remoteStreams = new Map<string, MediaStream>()
  private unsubs: Unsubscribe[] = []
  private callbacks: MeshCallbacks = {}
  private analyser: AnalyserNode | null = null
  private audioCtx: AudioContext | null = null
  private speakTimer: number | null = null
  private connected = false
  private audioUnlocked = false

  configure(callbacks: MeshCallbacks) {
    this.callbacks = callbacks
  }

  /** Call after a user click so browsers allow remote audio playback. */
  async unlockAudio() {
    this.audioUnlocked = true
    if (this.audioCtx?.state === 'suspended') {
      await this.audioCtx.resume().catch(() => undefined)
    }
    document.querySelectorAll<HTMLAudioElement>('[data-mesh-audio]').forEach((el) => {
      void el.play().catch(() => undefined)
    })
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
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })

      if (input.enableCam) {
        try {
          const cam = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: 'user',
            },
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

      // Presence
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
              // Polite peer = higher uid; impolite (lower uid) starts offers
              const polite = this.uid > otherId
              this.ensurePeer(otherId, polite)
              if (!polite) void this.makeOffer(otherId)
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
              if (data.to !== this.uid || data.from === this.uid) return
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

  private ensurePeer(remoteId: string, polite: boolean): PeerState {
    const existing = this.peers.get(remoteId)
    if (existing) return existing

    const pc = new RTCPeerConnection(ICE_SERVERS)
    const state: PeerState = {
      pc,
      makingOffer: false,
      ignoreOffer: false,
      polite,
      pendingIce: [],
    }
    this.peers.set(remoteId, state)

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

      const track = ev.track
      if (!stream.getTracks().some((t) => t.id === track.id)) {
        stream.addTrack(track)
      }

      track.onunmute = () => {
        this.callbacks.onRemoteStream?.(remoteId, stream!)
        this.playRemoteAudio(remoteId, stream!)
      }

      this.callbacks.onRemoteStream?.(remoteId, stream)
      this.playRemoteAudio(remoteId, stream)
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        // Restart ICE
        void pc.restartIce()
        if (!state.polite) void this.makeOffer(remoteId)
      }
    }

    return state
  }

  private playRemoteAudio(remoteId: string, stream: MediaStream) {
    const audioTracks = stream.getAudioTracks()
    if (!audioTracks.length) return

    let audio = document.getElementById(
      `mesh-audio-${remoteId}`,
    ) as HTMLAudioElement | null

    if (!audio) {
      audio = document.createElement('audio')
      audio.id = `mesh-audio-${remoteId}`
      audio.dataset.meshAudio = '1'
      audio.autoplay = true
      audio.setAttribute('playsinline', 'true')
      // Keep in DOM but not visible; volume full
      audio.style.position = 'fixed'
      audio.style.width = '0'
      audio.style.height = '0'
      audio.style.opacity = '0'
      audio.style.pointerEvents = 'none'
      document.body.appendChild(audio)
    }

    if (audio.srcObject !== stream) {
      audio.srcObject = stream
    }
    audio.muted = false
    audio.volume = 1

    const tryPlay = () => {
      void audio!.play().catch(() => {
        // Will retry on unlockAudio()
      })
    }
    tryPlay()
    if (this.audioUnlocked) tryPlay()
  }

  private async makeOffer(remoteId: string) {
    const state = this.peers.get(remoteId)
    if (!state || state.makingOffer) return
    const { pc } = state

    try {
      state.makingOffer = true
      const offer = await pc.createOffer()
      if (pc.signalingState !== 'stable') return
      await pc.setLocalDescription(offer)
      await addDoc(this.signalsCol(), {
        from: this.uid,
        to: remoteId,
        type: 'offer',
        sdp: pc.localDescription?.sdp ?? '',
        at: serverTimestamp(),
      } satisfies SignalDoc)
    } catch {
      // ignore transient negotiation errors
    } finally {
      state.makingOffer = false
    }
  }

  private async handleSignal(signal: SignalDoc, docId: string) {
    const polite = this.uid > signal.from
    const state = this.ensurePeer(signal.from, polite)
    const { pc } = state

    try {
      if (signal.type === 'offer' && signal.sdp) {
        const offerCollision =
          state.makingOffer || pc.signalingState !== 'stable'
        state.ignoreOffer = !state.polite && offerCollision
        if (state.ignoreOffer) return

        await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp })
        await this.flushIce(signal.from)

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        await addDoc(this.signalsCol(), {
          from: this.uid,
          to: signal.from,
          type: 'answer',
          sdp: pc.localDescription?.sdp ?? '',
          at: serverTimestamp(),
        } satisfies SignalDoc)
      }

      if (signal.type === 'answer' && signal.sdp) {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp })
          await this.flushIce(signal.from)
        }
      }

      if (signal.type === 'ice' && signal.candidate) {
        const init = JSON.parse(signal.candidate) as RTCIceCandidateInit
        if (pc.remoteDescription) {
          try {
            await pc.addIceCandidate(init)
          } catch {
            // ignore
          }
        } else {
          state.pendingIce.push(init)
        }
      }
    } catch {
      // ignore bad signals
    } finally {
      void deleteDoc(doc(getDb(), 'rooms', this.roomId, 'voiceSignals', docId))
    }
  }

  private async flushIce(remoteId: string) {
    const state = this.peers.get(remoteId)
    if (!state?.pc.remoteDescription) return
    const pending = state.pendingIce.splice(0)
    for (const init of pending) {
      try {
        await state.pc.addIceCandidate(init)
      } catch {
        // ignore
      }
    }
  }

  private closePeer(remoteId: string) {
    const state = this.peers.get(remoteId)
    state?.pc.close()
    this.peers.delete(remoteId)
    this.remoteStreams.delete(remoteId)
    this.callbacks.onRemoteStream?.(remoteId, null)
    document.getElementById(`mesh-audio-${remoteId}`)?.remove()
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
      const live =
        this.localStream?.getAudioTracks().some((t) => t.enabled) ?? false
      this.callbacks.onSpeaking?.(this.uid, live && avg > 12)
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
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
        })
        const track = cam.getVideoTracks()[0]
        if (track && this.localStream) {
          this.localStream.addTrack(track)
          for (const [remoteId, state] of this.peers) {
            state.pc.addTrack(track, this.localStream)
            if (!state.polite) void this.makeOffer(remoteId)
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
