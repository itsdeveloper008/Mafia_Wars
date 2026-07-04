'use client'

import {
  Room,
  RoomEvent,
  Track,
  type LocalAudioTrack,
  type LocalVideoTrack,
  type RemoteParticipant,
} from 'livekit-client'

export type VoiceConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'unavailable'

export interface VoiceCallbacks {
  onConnection?: (state: VoiceConnectionState) => void
  onSpeaking?: (identity: string, speaking: boolean) => void
  onError?: (message: string) => void
}

/**
 * LiveKit-backed voice/video room.
 * Falls back to local-only media when LiveKit is not configured.
 */
export class VoiceRoomService {
  private room: Room | null = null
  private localAudio: LocalAudioTrack | null = null
  private localVideo: LocalVideoTrack | null = null
  private localStream: MediaStream | null = null
  private analyser: AnalyserNode | null = null
  private audioCtx: AudioContext | null = null
  private speakTimer: number | null = null
  private mode: 'livekit' | 'local' | 'none' = 'none'
  private callbacks: VoiceCallbacks = {}

  configure(callbacks: VoiceCallbacks) {
    this.callbacks = callbacks
  }

  async connect(input: {
    roomName: string
    identity: string
    name: string
    enableMic: boolean
    enableCam: boolean
  }): Promise<VoiceConnectionState> {
    await this.disconnect()
    this.callbacks.onConnection?.('connecting')

    try {
      const res = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: input.roomName,
          identity: input.identity,
          name: input.name,
        }),
      })
      const data = (await res.json()) as {
        token?: string
        url?: string
        configured?: boolean
        error?: string
      }

      if (res.ok && data.token && data.url) {
        await this.connectLiveKit(data.url, data.token, input)
        return 'connected'
      }

      // Local fallback — mic meter + camera preview only
      await this.connectLocal(input.enableMic, input.enableCam)
      this.callbacks.onConnection?.('unavailable')
      return 'unavailable'
    } catch (e) {
      this.callbacks.onError?.(
        e instanceof Error ? e.message : 'Voice connection failed',
      )
      this.callbacks.onConnection?.('disconnected')
      return 'disconnected'
    }
  }

  private async connectLiveKit(
    url: string,
    token: string,
    input: {
      identity: string
      enableMic: boolean
      enableCam: boolean
    },
  ) {
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const ids = new Set(speakers.map((s) => s.identity))
      // Clear then set active
      room.remoteParticipants.forEach((p) => {
        this.callbacks.onSpeaking?.(p.identity, ids.has(p.identity))
      })
      if (room.localParticipant) {
        this.callbacks.onSpeaking?.(
          room.localParticipant.identity,
          ids.has(room.localParticipant.identity),
        )
      }
    })

    room.on(RoomEvent.Disconnected, () => {
      this.callbacks.onConnection?.('disconnected')
    })

    await room.connect(url, token)
    this.room = room
    this.mode = 'livekit'

    if (input.enableMic) {
      await room.localParticipant.setMicrophoneEnabled(true)
    }
    if (input.enableCam) {
      await room.localParticipant.setCameraEnabled(true)
    }

    this.callbacks.onConnection?.('connected')
  }

  private async connectLocal(enableMic: boolean, enableCam: boolean) {
    if (!enableMic && !enableCam) {
      this.mode = 'none'
      return
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: enableMic
        ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        : false,
      video: enableCam,
    })
    this.localStream = stream
    this.mode = 'local'

    if (enableMic) {
      this.audioCtx = new AudioContext()
      const source = this.audioCtx.createMediaStreamSource(stream)
      this.analyser = this.audioCtx.createAnalyser()
      this.analyser.fftSize = 512
      source.connect(this.analyser)
      this.startLocalSpeakDetect()
    }
  }

  private startLocalSpeakDetect() {
    if (!this.analyser) return
    const data = new Uint8Array(this.analyser.frequencyBinCount)
    const tick = () => {
      if (!this.analyser) return
      this.analyser.getByteFrequencyData(data)
      const avg = data.reduce((a, b) => a + b, 0) / data.length
      const speaking = avg > 18
      // identity filled by hook
      this.callbacks.onSpeaking?.('__local__', speaking)
      this.speakTimer = window.setTimeout(tick, 120)
    }
    tick()
  }

  async setMicEnabled(enabled: boolean) {
    if (this.mode === 'livekit' && this.room) {
      await this.room.localParticipant.setMicrophoneEnabled(enabled)
      return
    }
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = enabled
    })
  }

  async setCamEnabled(enabled: boolean) {
    if (this.mode === 'livekit' && this.room) {
      await this.room.localParticipant.setCameraEnabled(enabled)
      return
    }
    this.localStream?.getVideoTracks().forEach((t) => {
      t.enabled = enabled
    })
  }

  getLocalVideoElement(el: HTMLVideoElement | null) {
    if (!el) return
    if (this.mode === 'livekit' && this.room) {
      const pub = this.room.localParticipant.getTrackPublication(Track.Source.Camera)
      const track = pub?.track
      if (track) {
        track.attach(el)
      }
      return
    }
    if (this.localStream) {
      el.srcObject = this.localStream
      void el.play().catch(() => undefined)
    }
  }

  attachRemoteVideos(
    container: HTMLElement,
    render: (identity: string, el: HTMLVideoElement) => void,
  ) {
    if (!this.room) return
    this.room.remoteParticipants.forEach((p) => {
      this.attachParticipant(p, container, render)
    })
    this.room.on(RoomEvent.TrackSubscribed, (_track, _pub, participant) => {
      this.attachParticipant(participant, container, render)
    })
  }

  private attachParticipant(
    participant: RemoteParticipant,
    _container: HTMLElement,
    render: (identity: string, el: HTMLVideoElement) => void,
  ) {
    const el = document.createElement('video')
    el.autoplay = true
    el.playsInline = true
    participant.videoTrackPublications.forEach((pub) => {
      pub.track?.attach(el)
    })
    render(participant.identity, el)
  }

  getMode() {
    return this.mode
  }

  async disconnect() {
    if (this.speakTimer) window.clearTimeout(this.speakTimer)
    this.speakTimer = null
    this.analyser = null
    if (this.audioCtx) {
      void this.audioCtx.close()
      this.audioCtx = null
    }
    this.localStream?.getTracks().forEach((t) => t.stop())
    this.localStream = null
    if (this.room) {
      await this.room.disconnect()
      this.room = null
    }
    this.mode = 'none'
    this.callbacks.onConnection?.('idle')
  }
}

export const VoiceRoom = new VoiceRoomService()
