import {
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { DEFAULT_ROOM_SETTINGS } from '@/constants/settings'
import type { GameStateDoc, RoomDoc, RoomSettings } from '@/types/game'
import { codeIndexDoc, roomDoc, stateDoc } from './paths'

export function generateRoomCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase()
}

export async function createRoom(input: {
  hostId: string
  hostName: string
  roomName: string
}): Promise<RoomDoc> {
  const roomCode = generateRoomCode()
  const roomId = roomCode
  const now = Date.now()

  const room: RoomDoc = {
    roomId,
    roomCode,
    hostId: input.hostId,
    hostName: input.hostName,
    roomName: input.roomName || `${input.hostName}'s Room`,
    status: 'waiting',
    createdAt: now,
    updatedAt: now,
    currentRound: 0,
    currentPhase: 'waiting',
    playerCount: 0,
    settings: { ...DEFAULT_ROOM_SETTINGS },
    paused: false,
  }

  const state: GameStateDoc = {
    roomId,
    status: 'waiting',
    nightStep: 'actions',
    currentRound: 0,
    timerStartedAt: null,
    timerDurationMs: 0,
    winner: null,
    morningMessage: '',
    eliminatedPlayerId: null,
    pendingTiePlayerIds: [],
    updatedAt: now,
  }

  await setDoc(roomDoc(roomId), room)
  await setDoc(stateDoc(roomId), state)
  await setDoc(codeIndexDoc(roomCode), { roomId, roomCode })
  return room
}

export async function getRoomByCode(code: string): Promise<RoomDoc | null> {
  const idx = await getDoc(codeIndexDoc(code))
  if (!idx.exists()) {
    // fallback: roomId === code
    const direct = await getDoc(roomDoc(code.toUpperCase()))
    return direct.exists() ? (direct.data() as RoomDoc) : null
  }
  const roomId = idx.data().roomId as string
  const snap = await getDoc(roomDoc(roomId))
  return snap.exists() ? (snap.data() as RoomDoc) : null
}

export async function updateRoomSettings(
  roomId: string,
  settings: RoomSettings,
): Promise<void> {
  await updateDoc(roomDoc(roomId), {
    settings,
    updatedAt: Date.now(),
  })
}

export async function setRoomPaused(
  roomId: string,
  paused: boolean,
): Promise<void> {
  await updateDoc(roomDoc(roomId), { paused, updatedAt: Date.now() })
}

export function subscribeRoom(
  roomId: string,
  onData: (room: RoomDoc) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    roomDoc(roomId),
    (snap) => {
      if (!snap.exists()) {
        onError?.(new Error('Room was deleted.'))
        return
      }
      onData(snap.data() as RoomDoc)
    },
    (err) => onError?.(err),
  )
}

export function subscribeState(
  roomId: string,
  onData: (state: GameStateDoc) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    stateDoc(roomId),
    (snap) => {
      if (!snap.exists()) return
      onData(snap.data() as GameStateDoc)
    },
    (err) => onError?.(err),
  )
}
