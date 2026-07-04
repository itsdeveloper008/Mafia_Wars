'use client'

import {
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
} from 'livekit-client'
import { MeshVoice } from './MeshVoice'

export type VoiceConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'unavailable'

export interface VoiceCallbacks {
  onConnection?: (state: VoiceConnectionState) => void
  onSpeaking?: (identity: string, speaking: boolean) => void
  onPeerCount?: (count: number) => void
  onError?: (message: string) => void
}

/**
 * Voice layer: LiveKit when configured, otherwise WebRTC mesh via Firestore.
 */
export class VoiceRoomService {
  private room: Room | null = null
  private mode: 'livekit' | 'mesh' | 'none' = 'none'
  private callbacks: VoiceCallbacks = {}

  configure(callbacks: VoiceCallbacks) {
    this.callbacks = callbacks
  }

  async connect(input: {
    roomId: string
    roomName: string
    identity: string
    name: string
    enableMic: boolean
    enableCam?: boolean
  }): Promise<VoiceConnectionState> {
    await this.disconnect()
    this.callbacks.onConnection?.('connecting')

    // Prefer LiveKit when available
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
      }

      if (res.ok && data.token && data.url) {
        await this.connectLiveKit(data.url, data.token, input)
        return 'connected'
      }
    } catch {
      // fall through to mesh
    }

    // WebRTC mesh — real audio between peers, no LiveKit required
    try {
      MeshVoice.configure({
        onConnection: (s) => this.callbacks.onConnection?.(s),
        onSpeaking: (id, speaking) => this.callbacks.onSpeaking?.(id, speaking),
        onPeerCount: (n) => this.callbacks.onPeerCount?.(n),
        onError: (m) => this.callbacks.onError?.(m),
      })
      await MeshVoice.connect({
        roomId: input.roomId,
        uid: input.identity,
        name: input.name,
        enableMic: input.enableMic,
      })
      this.mode = 'mesh'
      return 'connected'
    } catch (e) {
      this.callbacks.onError?.(
        e instanceof Error ? e.message : 'Could not start voice',
      )
      this.callbacks.onConnection?.('disconnected')
      this.mode = 'none'
      return 'disconnected'
    }
  }

  private async connectLiveKit(
    url: string,
    token: string,
    input: { identity: string; enableMic: boolean; enableCam?: boolean },
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

    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === 'audio') {
        const el = track.attach()
        el.autoplay = true
        document.body.appendChild(el)
      }
    })

    room.on(RoomEvent.Disconnected, () => {
      this.callbacks.onConnection?.('disconnected')
    })

    await room.connect(url, token)
    this.room = room
    this.mode = 'livekit'

    await room.localParticipant.setMicrophoneEnabled(input.enableMic)
    if (input.enableCam) {
      await room.localParticipant.setCameraEnabled(true)
    }

    // Attach any already-subscribed remote audio
    room.remoteParticipants.forEach((p) => this.attachRemoteAudio(p))

    this.callbacks.onConnection?.('connected')
  }

  private attachRemoteAudio(participant: RemoteParticipant) {
    participant.audioTrackPublications.forEach((pub) => {
      const track = pub.track
      if (track) {
        const el = track.attach()
        el.autoplay = true
        document.body.appendChild(el)
      }
    })
  }

  async setMicEnabled(enabled: boolean) {
    if (this.mode === 'livekit' && this.room) {
      await this.room.localParticipant.setMicrophoneEnabled(enabled)
      return
    }
    if (this.mode === 'mesh') {
      MeshVoice.setMicEnabled(enabled)
    }
  }

  async setCamEnabled(enabled: boolean) {
    if (this.mode === 'livekit' && this.room) {
      await this.room.localParticipant.setCameraEnabled(enabled)
    }
  }

  getMode() {
    return this.mode
  }

  async disconnect() {
    if (this.mode === 'mesh') {
      await MeshVoice.disconnect()
    }
    if (this.room) {
      await this.room.disconnect()
      this.room = null
    }
    this.mode = 'none'
    this.callbacks.onConnection?.('idle')
  }
}

export const VoiceRoom = new VoiceRoomService()
