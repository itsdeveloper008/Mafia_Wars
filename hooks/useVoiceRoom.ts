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
  const identityRef = useRef('')

  const room = session?.room
  const me = session?.me
  const uid = session?.uid
  const settings = room?.settings

  const shouldConnect =
    Boolean(room && uid && settings?.voiceEnabled && settings.mediaMode !== 'none')

  const canTransmit = useCallback(() => {
    if (!session || !me || !settings) return false
    if (!settings.voiceEnabled || settings.voiceLocked) return false
    if (me.hostMuted) return false
    if (!me.isAlive && !settings.spectatorVoiceEnabled) return false
    if (session.state.status === 'night') return false

    if (settings.discussionMode === 'moderated') {
      return room?.currentSpeakerId === me.playerId || me.canSpeak
    }
    if (settings.discussionMode === 'push_to_talk' || settings.forcePushToTalk) {
      return pushToTalk || me.pushToTalkHeld
    }
    return me.micEnabled
  }, [session, me, settings, room?.currentSpeakerId, pushToTalk])

  useEffect(() => {
    if (!shouldConnect || !room || !uid || !me) {
      void VoiceRoom.disconnect()
      return
    }

    identityRef.current = uid
    let active = true

    VoiceRoom.configure({
      onConnection: setConnection,
      onSpeaking: (identity, speaking) => {
        const id = identity === '__local__' ? uid : identity
        if (!active || !room) return
        // Only update own speaking flag from local meter / livekit
        if (id === uid) {
          void updatePlayerFields(room.roomId, me.playerId, { isSpeaking: speaking })
        } else {
          // remote speaking — update if we find player
          const player = session?.players.find((p) => p.uid === id || p.playerId === id)
          if (player) {
            void updatePlayerFields(room.roomId, player.playerId, {
              isSpeaking: speaking,
            })
          }
        }
      },
    })

    void VoiceRoom.connect({
      roomName: `mafia-${room.roomCode}`,
      identity: uid,
      name: me.displayName,
      enableMic: settings?.voiceEnabled ?? true,
      enableCam: settings?.videoEnabled ?? false,
    })

    return () => {
      active = false
      void VoiceRoom.disconnect()
    }
  }, [shouldConnect, room?.roomId, room?.roomCode, uid, me?.playerId, me?.displayName, settings?.voiceEnabled, settings?.videoEnabled, session?.players])

  // Apply transmit permissions
  useEffect(() => {
    const allowed = canTransmit()
    void VoiceRoom.setMicEnabled(allowed)
  }, [canTransmit, me?.micEnabled, me?.hostMuted, me?.isAlive, pushToTalk, room?.currentSpeakerId, session?.state.status])

  // Auto-mute dead players
  useEffect(() => {
    if (!me || !room) return
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
  }, [me?.isAlive, me?.playerId, room?.roomId, settings?.spectatorVoiceEnabled])

  // Night: mute all local publish
  useEffect(() => {
    if (session?.state.status === 'night') {
      void VoiceRoom.setMicEnabled(false)
      void VoiceRoom.setCamEnabled(false)
    }
  }, [session?.state.status])

  const holdPushToTalk = useCallback(
    (held: boolean) => {
      setPushToTalk(held)
      if (!me || !room) return
      void updatePlayerFields(room.roomId, me.playerId, {
        pushToTalkHeld: held,
        micEnabled: held,
      })
    },
    [me, room],
  )

  return {
    connection,
    holdPushToTalk,
    pushToTalk,
    voiceMode: VoiceRoom.getMode(),
  }
}
