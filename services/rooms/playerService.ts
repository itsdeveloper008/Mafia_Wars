import {
  deleteDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import type { PlayerDoc } from '@/types/game'
import { playerDoc, playersCol, roomDoc } from './paths'

export async function joinAsPlayer(input: {
  roomId: string
  uid: string
  displayName: string
  avatar: string
  maxPlayers: number
  hostId: string
}): Promise<PlayerDoc> {
  if (input.uid === input.hostId) {
    throw new Error('Host cannot join as a player.')
  }

  const existing = await getDocs(playersCol(input.roomId))
  if (existing.size >= input.maxPlayers) {
    throw new Error('This room is full.')
  }
  for (const d of existing.docs) {
    const p = d.data() as PlayerDoc
    if (p.uid === input.uid) return p
    if (p.displayName.toLowerCase() === input.displayName.toLowerCase()) {
      throw new Error('That name is already taken.')
    }
  }

  const player: PlayerDoc = {
    playerId: input.uid,
    uid: input.uid,
    displayName: input.displayName.trim(),
    avatar: input.avatar,
    joinedAt: Date.now(),
    isAlive: true,
    isConnected: true,
    isReady: false,
    hasVoted: false,
    raisedHand: false,
    raisedHandAt: null,
    micEnabled: false,
    cameraEnabled: false,
    isHost: false,
    isSpectator: false,
    voteTarget: null,
    notes: '',
    connectionQuality: 'good',
    missedVotes: 0,
    isSpeaking: false,
    canSpeak: true,
    hostMuted: false,
    pushToTalkHeld: false,
  }

  await setDoc(playerDoc(input.roomId, player.playerId), player)
  await updateDoc(roomDoc(input.roomId), {
    playerCount: existing.size + 1,
    updatedAt: Date.now(),
  })
  return player
}

export async function updatePlayerFields(
  roomId: string,
  playerId: string,
  fields: Partial<PlayerDoc>,
): Promise<void> {
  await updateDoc(playerDoc(roomId, playerId), fields)
}

export async function kickPlayer(
  roomId: string,
  playerId: string,
): Promise<void> {
  await deleteDoc(playerDoc(roomId, playerId))
  const remaining = await getDocs(playersCol(roomId))
  await updateDoc(roomDoc(roomId), {
    playerCount: remaining.size,
    updatedAt: Date.now(),
  })
}

export function subscribePlayers(
  roomId: string,
  onData: (players: PlayerDoc[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    playersCol(roomId),
    (snap) => {
      const players = snap.docs.map((d) => d.data() as PlayerDoc)
      onData(players)
    },
    (err) => onError?.(err),
  )
}
