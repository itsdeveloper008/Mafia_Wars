import {
  collection,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { DEFAULT_ROOM_SETTINGS } from '@/constants/settings'
import { getDb } from '@/services/firebase/client'
import type { GameStateDoc, RoomDoc, RoomSettings } from '@/types/game'
import {
  codeIndexDoc,
  hostLogsCol,
  logsCol,
  nightActionsCol,
  playersCol,
  roomDoc,
  secretsCol,
  stateDoc,
  votesCol,
} from './paths'

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
    speakingQueue: [],
    currentSpeakerId: null,
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

export async function getRoomById(roomId: string): Promise<RoomDoc | null> {
  const snap = await getDoc(roomDoc(roomId))
  return snap.exists() ? (snap.data() as RoomDoc) : null
}

export async function getRoomByCode(code: string): Promise<RoomDoc | null> {
  const idx = await getDoc(codeIndexDoc(code))
  if (!idx.exists()) {
    // fallback: roomId === code
    const direct = await getDoc(roomDoc(code.toUpperCase()))
    return direct.exists() ? (direct.data() as RoomDoc) : null
  }
  const roomId = idx.data().roomId as string
  return getRoomById(roomId)
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

export async function updateRoomFields(
  roomId: string,
  fields: Partial<RoomDoc>,
): Promise<void> {
  await updateDoc(roomDoc(roomId), { ...fields, updatedAt: Date.now() })
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

/** Host closes the room (lobby or mid-game). Deletes room data. */
export async function endRoom(roomId: string, roomCode: string): Promise<void> {
  const db = getDb()
  const batch = writeBatch(db)

  const cols = [
    playersCol(roomId),
    secretsCol(roomId),
    votesCol(roomId),
    nightActionsCol(roomId),
    logsCol(roomId),
    hostLogsCol(roomId),
    collection(db, 'rooms', roomId, 'voicePeers'),
    collection(db, 'rooms', roomId, 'voiceSignals'),
  ]

  for (const colRef of cols) {
    const snap = await getDocs(colRef)
    snap.docs.forEach((d) => batch.delete(d.ref))
  }

  batch.delete(stateDoc(roomId))
  batch.delete(roomDoc(roomId))
  batch.delete(codeIndexDoc(roomCode))
  await batch.commit()
}
