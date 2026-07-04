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
  onError?: (message: string) => void
}

/**
 * Small-room WebRTC mesh using Firestore for signaling.
 * Works without LiveKit — suitable for party games (up to ~8 peers).
 */
export class MeshVoiceService {
  private roomId = ''
  private uid = ''
  private localStream: MediaStream | null = null
  private peers = new Map<string, RTCPeerConnection>()
  private makingOffer = new Set<string>()
  private audioEls = new Map<string, HTMLAudioElement>()
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

      if (!input.enableMic) {
        this.localStream.getAudioTracks().forEach((t) => {
          t.enabled = false
        })
      }

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

            // Remove peers that left
            for (const id of [...this.peers.keys()]) {
              if (!others.includes(id)) this.closePeer(id)
            }

            // Connect to new peers (lower uid creates offer to avoid glare)
            for (const otherId of others) {
              if (this.peers.has(otherId)) continue
              if (this.uid < otherId) {
                void this.createOffer(otherId)
              } else {
                this.ensurePeer(otherId)
              }
            }

            this.callbacks.onPeerCount?.(others.length)
            if (others.length >= 0) {
              this.connected = true
              this.callbacks.onConnection?.('connected')
            }
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

  private peersCol() {
    return collection(getDb(), 'rooms', this.roomId, 'voicePeers')
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
      const [stream] = ev.streams
      if (!stream) return
      let audio = this.audioEls.get(remoteId)
      if (!audio) {
        audio = new Audio()
        audio.autoplay = true
        audio.setAttribute('playsinline', 'true')
        this.audioEls.set(remoteId, audio)
      }
      audio.srcObject = stream
      void audio.play().catch(() => {
        // Autoplay may require a user gesture; retry on next interaction
      })
    }

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === 'failed' ||
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'closed'
      ) {
        // keep peer entry; presence snapshot will clean up if they left
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
          // ignore bad/out-of-order ICE
        }
      }
    } finally {
      // Clean up consumed signal
      void deleteDoc(doc(getDb(), 'rooms', this.roomId, 'voiceSignals', docId))
    }
  }

  private closePeer(remoteId: string) {
    const pc = this.peers.get(remoteId)
    pc?.close()
    this.peers.delete(remoteId)
    const audio = this.audioEls.get(remoteId)
    if (audio) {
      audio.srcObject = null
      audio.remove()
      this.audioEls.delete(remoteId)
    }
  }

  private startLocalSpeakDetect() {
    if (!this.localStream) return
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
      this.callbacks.onSpeaking?.(this.uid, avg > 18)
      this.speakTimer = window.setTimeout(tick, 120)
    }
    tick()
  }

  setMicEnabled(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = enabled
    })
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

    if (this.roomId && this.uid) {
      void deleteDoc(doc(getDb(), 'rooms', this.roomId, 'voicePeers', this.uid))
    }

    this.connected = false
    this.roomId = ''
    this.uid = ''
    this.callbacks.onConnection?.('disconnected')
  }

  isConnected() {
    return this.connected
  }
}

export const MeshVoice = new MeshVoiceService()
