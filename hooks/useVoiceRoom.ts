'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  VoiceRoom,
  type VoiceConnectionState,
} from '@/services/media/VoiceRoom'
import { updatePlayerFields } from '@/services/rooms/playerService'
import type { GameSession } from '@/types/game'

export function useVoiceRoom(session: GameSession | null) {
  const [connection, setConnection] =
    useState<VoiceConnectionState>('idle')
  const [pushToTalk, setPushToTalk] = useState(false)
  const [peerCount, setPeerCount] = useState(0)
  const [hostMicOn, setHostMicOn] = useState(true)
  const [hostCamOn, setHostCamOn] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<
    Record<string, MediaStream>
  >({})

  const room = session?.room
  const me = session?.me
  const uid = session?.uid
  const isHost = session?.isHost ?? false
  const settings = room?.settings
  const videoAllowed = Boolean(
    settings?.videoEnabled || settings?.mediaMode === 'voice_video',
  )
  const displayName = isHost
    ? room?.hostName || 'Host'
    : me?.displayName || 'Player'

  const shouldConnect = Boolean(
    room &&
      uid &&
      settings?.voiceEnabled &&
      settings.mediaMode !== 'none' &&
      (isHost || me),
  )

  const canTransmit = useCallback(() => {
    if (!session || !settings || !uid) return false
    if (!settings.voiceEnabled || settings.voiceLocked) return false
    if (session.state.status === 'night') return false

    // Host may always speak when mic is on
    if (isHost) return hostMicOn

    if (!me) return false
    if (me.hostMuted) return false
    if (!me.isAlive && !settings.spectatorVoiceEnabled) return false

    if (settings.discussionMode === 'moderated') {
      return room?.currentSpeakerId === me.playerId || me.canSpeak
    }
    if (
      settings.discussionMode === 'push_to_talk' ||
      settings.forcePushToTalk
    ) {
      return pushToTalk || me.pushToTalkHeld
    }
    // Default free discussion: mic on if player enabled it (default true after join fix)
    return me.micEnabled
  }, [
    session,
    me,
    settings,
    room?.currentSpeakerId,
    pushToTalk,
    isHost,
    hostMicOn,
    uid,
  ])

  const canShowCam = useCallback(() => {
    if (!settings || !videoAllowed) return false
    if (session?.state.status === 'night') return false
    if (isHost) return hostCamOn
    return Boolean(me?.cameraEnabled && me.isAlive)
  }, [settings, videoAllowed, session?.state.status, isHost, hostCamOn, me])

  // Connect host + players to the same voice/video mesh
  useEffect(() => {
    if (!shouldConnect || !room || !uid) {
      void VoiceRoom.disconnect()
      setConnection('idle')
      setLocalStream(null)
      setRemoteStreams({})
      return
    }

    let active = true
    setVoiceError('')

    VoiceRoom.configure({
      onConnection: (s) => {
        if (active) setConnection(s)
      },
      onPeerCount: (n) => {
        if (active) setPeerCount(n)
      },
      onError: (msg) => {
        if (active) setVoiceError(msg)
      },
      onLocalStream: (stream) => {
        if (active) setLocalStream(stream)
      },
      onRemoteStream: (id, stream) => {
        if (!active) return
        setRemoteStreams((prev) => {
          const next = { ...prev }
          if (!stream) delete next[id]
          else next[id] = stream
          return next
        })
      },
      onSpeaking: (identity, speaking) => {
        if (!active || !room) return
        const id = identity === '__local__' ? uid : identity
        if (id === uid) {
          if (me) {
            void updatePlayerFields(room.roomId, me.playerId, {
              isSpeaking: speaking,
            })
          }
          return
        }
        const player = session?.players.find(
          (p) => p.uid === id || p.playerId === id,
        )
        if (player) {
          void updatePlayerFields(room.roomId, player.playerId, {
            isSpeaking: speaking,
          })
        }
      },
    })

    void VoiceRoom.connect({
      roomId: room.roomId,
      roomName: `mafia-${room.roomCode}`,
      identity: uid,
      name: displayName,
      enableMic: isHost ? hostMicOn : Boolean(me?.micEnabled ?? true),
      enableCam: isHost ? hostCamOn : Boolean(me?.cameraEnabled && videoAllowed),
    }).then((state) => {
      if (active) setConnection(state)
    })

    return () => {
      active = false
      void VoiceRoom.disconnect()
    }
    // Reconnect only when room/identity/video setting changes — not on every mic toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    shouldConnect,
    room?.roomId,
    room?.roomCode,
    uid,
    displayName,
    settings?.voiceEnabled,
    videoAllowed,
    isHost,
  ])

  // Mic transmit
  useEffect(() => {
    void VoiceRoom.setMicEnabled(canTransmit())
  }, [
    canTransmit,
    me?.micEnabled,
    me?.hostMuted,
    me?.isAlive,
    pushToTalk,
    hostMicOn,
    room?.currentSpeakerId,
    session?.state.status,
  ])

  // Camera transmit
  useEffect(() => {
    void VoiceRoom.setCamEnabled(canShowCam())
  }, [canShowCam, me?.cameraEnabled, hostCamOn, videoAllowed, session?.state.status])

  useEffect(() => {
    if (!me || !room || isHost) return
    if (!me.isAlive && !settings?.spectatorVoiceEnabled) {
      void updatePlayerFields(room.roomId, me.playerId, {
        micEnabled: false,
        cameraEnabled: false,
        raisedHand: false,
        isSpeaking: false,
      })
      void VoiceRoom.setMicEnabled(false)
      void VoiceRoom.setCamEnabled(false)
    }
  }, [me?.isAlive, me?.playerId, room?.roomId, settings?.spectatorVoiceEnabled, isHost])

  useEffect(() => {
    if (session?.state.status === 'night') {
      void VoiceRoom.setMicEnabled(false)
      void VoiceRoom.setCamEnabled(false)
    }
  }, [session?.state.status])

  // Players default mic ON when they join voice (free discussion)
  useEffect(() => {
    if (!me || !room || isHost) return
    if (me.micEnabled === false && settings?.discussionMode === 'free') {
      // leave as-is if user muted; only set default once if undefined-like
    }
  }, [me, room, isHost, settings?.discussionMode])

  const holdPushToTalk = useCallback(
    (held: boolean) => {
      setPushToTalk(held)
      if (isHost) {
        void VoiceRoom.setMicEnabled(held || hostMicOn)
        return
      }
      if (!me || !room) return
      void updatePlayerFields(room.roomId, me.playerId, {
        pushToTalkHeld: held,
        micEnabled: held,
      })
      void VoiceRoom.setMicEnabled(held)
    },
    [me, room, isHost, hostMicOn],
  )

  const toggleHostMic = useCallback(() => {
    setHostMicOn((v) => {
      const next = !v
      void VoiceRoom.setMicEnabled(next)
      return next
    })
  }, [])

  const toggleHostCam = useCallback(() => {
    setHostCamOn((v) => {
      const next = !v
      void VoiceRoom.setCamEnabled(next)
      return next
    })
  }, [])

  const togglePlayerMic = useCallback(async () => {
    if (!me || !room) return
    const next = !me.micEnabled
    await updatePlayerFields(room.roomId, me.playerId, { micEnabled: next })
    void VoiceRoom.setMicEnabled(next)
  }, [me, room])

  const togglePlayerCam = useCallback(async () => {
    if (!me || !room) return
    if (!videoAllowed) {
      setVoiceError('Host has not enabled video for this room.')
      return
    }
    const next = !me.cameraEnabled
    await updatePlayerFields(room.roomId, me.playerId, { cameraEnabled: next })
    await VoiceRoom.setCamEnabled(next)
  }, [me, room, videoAllowed])

  return {
    connection,
    peerCount,
    voiceError,
    holdPushToTalk,
    pushToTalk,
    hostMicOn,
    hostCamOn,
    toggleHostMic,
    toggleHostCam,
    togglePlayerMic,
    togglePlayerCam,
    localStream,
    remoteStreams,
    videoAllowed,
    voiceMode: VoiceRoom.getMode(),
  }
}
