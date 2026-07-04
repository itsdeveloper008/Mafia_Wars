'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
  const connectingRef = useRef(false)

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
      settings?.voiceEnabled !== false &&
      settings?.mediaMode !== 'none' &&
      (isHost || me),
  )

  const canTransmit = useCallback(() => {
    if (!session || !settings || !uid) return false
    if (settings.voiceEnabled === false || settings.voiceLocked) return false
    // Host and players can talk in lobby + discussion; mute only at night
    if (session.state.status === 'night') return false

    if (isHost) return hostMicOn

    if (!me) return false
    if (me.hostMuted) return false
    if (!me.isAlive && !settings.spectatorVoiceEnabled) return false

    if (settings.discussionMode === 'moderated') {
      // In moderated mode, allow open mic unless someone has the floor
      if (room?.currentSpeakerId) {
        return room.currentSpeakerId === me.playerId
      }
      return me.micEnabled
    }
    if (
      settings.discussionMode === 'push_to_talk' ||
      settings.forcePushToTalk
    ) {
      return pushToTalk || me.pushToTalkHeld
    }
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

  // Unlock audio on any user gesture (required by browsers)
  useEffect(() => {
    const unlock = () => {
      void VoiceRoom.unlockAudio()
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  // Connect once per room membership
  useEffect(() => {
    if (!shouldConnect || !room || !uid) {
      if (connectingRef.current) {
        connectingRef.current = false
        void VoiceRoom.disconnect()
      }
      setConnection('idle')
      setLocalStream(null)
      setRemoteStreams({})
      setPeerCount(0)
      return
    }

    let active = true
    connectingRef.current = true
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
        void VoiceRoom.unlockAudio()
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
      enableMic: true, // start with mic track live; canTransmit gates it
      enableCam: videoAllowed,
    }).then((state) => {
      if (!active) return
      setConnection(state)
      // Apply current intent immediately
      void VoiceRoom.setMicEnabled(canTransmit())
      void VoiceRoom.setCamEnabled(canShowCam())
      void VoiceRoom.unlockAudio()
    })

    return () => {
      active = false
      connectingRef.current = false
      void VoiceRoom.disconnect()
    }
    // Only reconnect when room identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldConnect, room?.roomId, uid, isHost])

  // Mic transmit — do not reconnect, only toggle tracks
  useEffect(() => {
    void VoiceRoom.setMicEnabled(canTransmit())
  }, [canTransmit])

  useEffect(() => {
    void VoiceRoom.setCamEnabled(canShowCam())
  }, [canShowCam])

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
  }, [
    me?.isAlive,
    me?.playerId,
    room?.roomId,
    settings?.spectatorVoiceEnabled,
    isHost,
  ])

  useEffect(() => {
    if (session?.state.status === 'night') {
      void VoiceRoom.setMicEnabled(false)
      void VoiceRoom.setCamEnabled(false)
    } else {
      void VoiceRoom.setMicEnabled(canTransmit())
      void VoiceRoom.setCamEnabled(canShowCam())
    }
  }, [session?.state.status, canTransmit, canShowCam])

  const holdPushToTalk = useCallback(
    (held: boolean) => {
      setPushToTalk(held)
      void VoiceRoom.unlockAudio()
      if (isHost) {
        if (held) {
          setHostMicOn(true)
          void VoiceRoom.setMicEnabled(true)
        } else {
          void VoiceRoom.setMicEnabled(hostMicOn)
        }
        return
      }
      if (!me || !room) return
      void updatePlayerFields(room.roomId, me.playerId, {
        pushToTalkHeld: held,
        micEnabled: held ? true : me.micEnabled,
      })
      void VoiceRoom.setMicEnabled(held)
    },
    [me, room, isHost, hostMicOn],
  )

  const toggleHostMic = useCallback(() => {
    void VoiceRoom.unlockAudio()
    setHostMicOn((v) => {
      const next = !v
      void VoiceRoom.setMicEnabled(next)
      return next
    })
  }, [])

  const toggleHostCam = useCallback(() => {
    void VoiceRoom.unlockAudio()
    setHostCamOn((v) => {
      const next = !v
      void VoiceRoom.setCamEnabled(next)
      return next
    })
  }, [])

  const togglePlayerMic = useCallback(async () => {
    if (!me || !room) return
    void VoiceRoom.unlockAudio()
    const next = !me.micEnabled
    await updatePlayerFields(room.roomId, me.playerId, { micEnabled: next })
    void VoiceRoom.setMicEnabled(next)
  }, [me, room])

  const togglePlayerCam = useCallback(async () => {
    if (!me || !room) return
    void VoiceRoom.unlockAudio()
    if (!videoAllowed) {
      setVoiceError('Enable Video channel in room settings first.')
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
