import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { getDb } from './firebase'

export type RoomMode = 'lobby' | 'game' | 'summary'
export type Phase = 'night' | 'day'
export type NightStep =
  | 'intro'
  | 'mafia'
  | 'serial'
  | 'doctor'
  | 'detective'
  | 'results'

export interface RoomPlayer {
  id: string
  name: string
  role?: string
  alive: boolean
  avatar: string
  lastWill: string
  sniperUsed?: boolean
  notes?: string[]
}

export interface RoomState {
  code: string
  hostId: string
  mode: RoomMode
  roomName: string
  password: string
  includeGodfather: boolean
  includeGrandmother: boolean
  settings: {
    defenseTimerSec: number
    allowSpy: boolean
    allowMayor: boolean
    allowSniper: boolean
    allowSerialKiller: boolean
  }
  players: RoomPlayer[]
  phase: Phase
  nightStep: NightStep
  roundNumber: number
  winner: 'mafia' | 'civilians' | 'serial' | null
  events: Array<{
    id: string
    round: number
    phase: Phase
    message: string
    privateTo?: string
  }>
  nightChoices: {
    mafiaTargetId?: string
    serialTargetId?: string
    doctorSaveId?: string
    detectiveTargetId?: string
  }
  doctorLastSavedId: string | null
  nominations: Record<string, number>
  defenseCandidateId: string | null
  defenseTimeLeft: number
  finalVotes: Record<string, 'yes' | 'no'>
  updatedAt: number
}

const CLIENT_KEY = 'mafiaWars.clientId'

export function getClientId(): string {
  if (typeof window === 'undefined') return 'server'
  let id = localStorage.getItem(CLIENT_KEY)
  if (!id) {
    id = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
    localStorage.setItem(CLIENT_KEY, id)
  }
  return id
}

export function generateRoomCode(): string {
  return Math.random().toString(36).slice(2, 7).toUpperCase()
}

function roomRef(code: string) {
  return doc(getDb(), 'rooms', code.toUpperCase())
}

export async function createRoom(input: {
  code: string
  hostId: string
  hostPlayer: RoomPlayer
  roomName: string
  password: string
  settings: RoomState['settings']
}): Promise<void> {
  const code = input.code.toUpperCase()
  const payload: RoomState = {
    code,
    hostId: input.hostId,
    mode: 'lobby',
    roomName: input.roomName,
    password: input.password,
    includeGodfather: false,
    includeGrandmother: false,
    settings: input.settings,
    players: [input.hostPlayer],
    phase: 'night',
    nightStep: 'intro',
    roundNumber: 1,
    winner: null,
    events: [],
    nightChoices: {},
    doctorLastSavedId: null,
    nominations: {},
    defenseCandidateId: null,
    defenseTimeLeft: 0,
    finalVotes: {},
    updatedAt: Date.now(),
  }
  await setDoc(roomRef(code), payload)
}

export async function getRoom(code: string): Promise<RoomState | null> {
  const snap = await getDoc(roomRef(code))
  if (!snap.exists()) return null
  return snap.data() as RoomState
}

export async function joinRoom(
  code: string,
  player: RoomPlayer,
): Promise<RoomState> {
  const room = await getRoom(code)
  if (!room) {
    throw new Error('Room not found. Check the code and try again.')
  }
  if (room.mode !== 'lobby') {
    throw new Error('This game already started. Ask the host for a new room.')
  }
  if (room.players.some((p) => p.id === player.id)) {
    return room
  }
  if (room.players.some((p) => p.name.toLowerCase() === player.name.toLowerCase())) {
    throw new Error('That name is already taken in this room.')
  }
  if (room.players.length >= 12) {
    throw new Error('This room is full (max 12 players).')
  }
  const players = [...room.players, player]
  await updateDoc(roomRef(code), {
    players,
    updatedAt: Date.now(),
  })
  return { ...room, players }
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
