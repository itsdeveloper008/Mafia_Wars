import {
  deleteDoc,
  getDocs,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import type { LogDoc, NightActionDoc, Role, SecretDoc, VoteDoc } from '@/types/game'
import {
  hostLogsCol,
  logsCol,
  nightActionDoc,
  nightActionsCol,
  secretDoc,
  secretsCol,
  voteDoc,
  votesCol,
} from './paths'

export async function submitVote(input: {
  roomId: string
  playerId: string
  uid: string
  targetId: string | 'abstain'
}): Promise<void> {
  const vote: VoteDoc = {
    playerId: input.playerId,
    uid: input.uid,
    targetId: input.targetId,
    confirmed: true,
    at: Date.now(),
  }
  await setDoc(voteDoc(input.roomId, input.playerId), vote)
}

export async function submitNightAction(input: {
  roomId: string
  playerId: string
  uid: string
  role: Role
  targetId: string
}): Promise<void> {
  const action: NightActionDoc = {
    playerId: input.playerId,
    uid: input.uid,
    role: input.role,
    targetId: input.targetId,
    at: Date.now(),
  }
  await setDoc(nightActionDoc(input.roomId, input.playerId), action)
}

export function subscribeVotes(
  roomId: string,
  onData: (votes: Record<string, VoteDoc>) => void,
): Unsubscribe {
  return onSnapshot(votesCol(roomId), (snap) => {
    const votes: Record<string, VoteDoc> = {}
    snap.docs.forEach((d) => {
      const v = d.data() as VoteDoc
      votes[v.playerId] = v
    })
    onData(votes)
  })
}

/** Players may only read their own vote document under security rules. */
export function subscribeMyVote(
  roomId: string,
  playerId: string,
  onData: (vote: VoteDoc | null) => void,
): Unsubscribe {
  return onSnapshot(voteDoc(roomId, playerId), (snap) => {
    onData(snap.exists() ? (snap.data() as VoteDoc) : null)
  })
}

export function subscribeNightActions(
  roomId: string,
  onData: (actions: NightActionDoc[]) => void,
): Unsubscribe {
  return onSnapshot(nightActionsCol(roomId), (snap) => {
    onData(snap.docs.map((d) => d.data() as NightActionDoc))
  })
}

export function subscribeMyNightAction(
  roomId: string,
  playerId: string,
  onData: (action: NightActionDoc | null) => void,
): Unsubscribe {
  return onSnapshot(nightActionDoc(roomId, playerId), (snap) => {
    onData(snap.exists() ? (snap.data() as NightActionDoc) : null)
  })
}

export function subscribePublicLogs(
  roomId: string,
  onData: (logs: LogDoc[]) => void,
): Unsubscribe {
  return onSnapshot(logsCol(roomId), (snap) => {
    const logs = snap.docs.map((d) => d.data() as LogDoc)
    logs.sort((a, b) => a.at - b.at)
    onData(logs)
  })
}

export function subscribeHostLogs(
  roomId: string,
  onData: (logs: LogDoc[]) => void,
): Unsubscribe {
  return onSnapshot(hostLogsCol(roomId), (snap) => {
    const logs = snap.docs.map((d) => d.data() as LogDoc)
    logs.sort((a, b) => a.at - b.at)
    onData(logs)
  })
}

export function subscribeMySecret(
  roomId: string,
  playerId: string,
  onData: (secret: SecretDoc | null) => void,
): Unsubscribe {
  return onSnapshot(secretDoc(roomId, playerId), (snap) => {
    onData(snap.exists() ? (snap.data() as SecretDoc) : null)
  })
}

export function subscribeSecrets(
  roomId: string,
  onData: (secrets: SecretDoc[]) => void,
): Unsubscribe {
  return onSnapshot(secretsCol(roomId), (snap) => {
    onData(snap.docs.map((d) => d.data() as SecretDoc))
  })
}

export async function clearVotes(roomId: string): Promise<void> {
  const snap = await getDocs(votesCol(roomId))
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
}
