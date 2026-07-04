import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { getDb } from './firebase'
import {
  DEFAULT_SETTINGS,
  type Player,
  type RoomState,
} from './game/types'

export function generateRoomCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase()
}

function roomRef(code: string) {
  return doc(getDb(), 'rooms', code.toUpperCase())
}

export function createEmptyRoom(input: {
  code: string
  hostId: string
  hostName: string
  roomName: string
}): RoomState {
  const code = input.code.toUpperCase()
  const now = Date.now()
  return {
    code,
    hostId: input.hostId,
    hostName: input.hostName,
    roomName: input.roomName,
    mode: 'lobby',
    phase: 'night',
    nightStep: 'doctor',
    round: 1,
    paused: false,
    settings: { ...DEFAULT_SETTINGS },
    players: [],
    publicEvents: [],
    hostEvents: [
      {
        id: `${now}-created`,
        round: 0,
        phase: 'system',
        message: `Room ${code} created by ${input.hostName}.`,
        at: now,
      },
    ],
    privateLogs: {},
    nightActions: { mafiaVotes: {} },
    votes: {},
    phaseEndsAt: null,
    winner: null,
    morningMessage: '',
    eliminatedThisRound: null,
    createdAt: now,
    updatedAt: now,
  }
}

export async function createRoom(room: RoomState): Promise<void> {
  await setDoc(roomRef(room.code), room)
}

export async function getRoom(code: string): Promise<RoomState | null> {
  const snap = await getDoc(roomRef(code))
  if (!snap.exists()) return null
  return snap.data() as RoomState
}

export async function joinRoomAsPlayer(
  code: string,
  player: Player,
): Promise<RoomState> {
  const room = await getRoom(code)
  if (!room) throw new Error('Room not found. Check the code and try again.')
  if (room.mode !== 'lobby') {
    throw new Error('This game already started. Ask the host for a new room.')
  }
  if (player.id === room.hostId) {
    throw new Error('Host cannot join as a player.')
  }
  if (room.players.some((p) => p.id === player.id)) return room
  if (
    room.players.some(
      (p) => p.name.toLowerCase() === player.name.toLowerCase(),
    )
  ) {
    throw new Error('That name is already taken in this room.')
  }
  if (room.players.length >= 12) {
    throw new Error('This room is full (max 12 players).')
  }

  const players = [...room.players, player]
  const hostEvents = [
    ...room.hostEvents,
    {
      id: `${Date.now()}-join`,
      round: 0,
      phase: 'system' as const,
      message: `${player.name} joined the lobby.`,
      at: Date.now(),
    },
  ]

  await updateDoc(roomRef(code), {
    players,
    hostEvents,
    updatedAt: Date.now(),
  })

  return { ...room, players, hostEvents }
}

export async function updateRoom(
  code: string,
  patch: Partial<RoomState>,
): Promise<void> {
  await updateDoc(roomRef(code), {
    ...patch,
    updatedAt: Date.now(),
  })
}

export function subscribeRoom(
  code: string,
  onData: (room: RoomState) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    roomRef(code),
    (snap) => {
      if (!snap.exists()) {
        onError?.(new Error('Room was deleted.'))
        return
      }
      onData(snap.data() as RoomState)
    },
    (err) => onError?.(err),
  )
}
