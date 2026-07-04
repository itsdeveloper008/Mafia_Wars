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
  const [voiceError, setVoiceError] = useState('')

  const room = session?.room
  const me = session?.me
  const uid = session?.uid
  const isHost = session?.isHost ?? false
  const settings = room?.settings
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

  /** Host can always speak (except night). Players follow room rules. */
  const canTransmit = useCallback(() => {
    if (!session || !settings || !uid) return false
    if (!settings.voiceEnabled || settings.voiceLocked) return false
    if (session.state.status === 'night') return false

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

  // Join voice channel (host + players)
  useEffect(() => {
    if (!shouldConnect || !room || !uid) {
      void VoiceRoom.disconnect()
      setConnection('idle')
      return
    }

    let active = true

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
      enableMic: true,
      enableCam: Boolean(settings?.videoEnabled && !isHost),
    }).then((state) => {
      if (active) setConnection(state)
    })

    return () => {
      active = false
      void VoiceRoom.disconnect()
    }
  }, [
    shouldConnect,
    room?.roomId,
    room?.roomCode,
    uid,
    displayName,
    settings?.voiceEnabled,
    settings?.videoEnabled,
    isHost,
    me?.playerId,
    session?.players,
  ])

  // Apply mic permissions continuously
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

  // Dead players muted
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
    }
  }, [
    me?.isAlive,
    me?.playerId,
    room?.roomId,
    settings?.spectatorVoiceEnabled,
    isHost,
  ])

  // Night: everyone muted
  useEffect(() => {
    if (session?.state.status === 'night') {
      void VoiceRoom.setMicEnabled(false)
    }
  }, [session?.state.status])

  const holdPushToTalk = useCallback(
    (held: boolean) => {
      setPushToTalk(held)
      if (isHost) {
        setHostMicOn(held)
        return
      }
      if (!me || !room) return
      void updatePlayerFields(room.roomId, me.playerId, {
        pushToTalkHeld: held,
        micEnabled: held,
      })
    },
    [me, room, isHost],
  )

  const toggleHostMic = useCallback(() => {
    setHostMicOn((v) => !v)
  }, [])

  return {
    connection,
    peerCount,
    voiceError,
    holdPushToTalk,
    pushToTalk,
    hostMicOn,
    toggleHostMic,
    voiceMode: VoiceRoom.getMode(),
  }
}
