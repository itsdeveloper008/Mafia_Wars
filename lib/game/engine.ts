import { detectiveResult, isMafiaTeam } from './roles'
import type {
  NightActions,
  Player,
  PrivateLogEntry,
  PublicEvent,
  Winner,
} from './types'

function eid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function makeEvent(
  round: number,
  phase: PublicEvent['phase'],
  message: string,
): PublicEvent {
  return { id: eid(), round, phase, message, at: Date.now() }
}

export function makePrivate(
  round: number,
  kind: PrivateLogEntry['kind'],
  message: string,
): PrivateLogEntry {
  return { id: eid(), round, kind, message, at: Date.now() }
}

/** Majority mafia target from internal votes. */
export function resolveMafiaTarget(
  mafiaVotes: Record<string, string>,
  players: Player[],
): string | undefined {
  const aliveMafiaIds = players
    .filter((p) => p.alive && isMafiaTeam(p.role))
    .map((p) => p.id)

  const counts: Record<string, number> = {}
  for (const mafiaId of aliveMafiaIds) {
    const target = mafiaVotes[mafiaId]
    if (!target) continue
    counts[target] = (counts[target] ?? 0) + 1
  }

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return entries[0]?.[0]
}

export interface NightResolution {
  players: Player[]
  morningMessage: string
  publicEvents: PublicEvent[]
  hostEvents: PublicEvent[]
  privateLogs: Record<string, PrivateLogEntry[]>
  winner: Winner
}

export function resolveNight(input: {
  players: Player[]
  actions: NightActions
  round: number
  privateLogs: Record<string, PrivateLogEntry[]>
}): NightResolution {
  const players = input.players.map((p) => ({ ...p }))
  const publicEvents: PublicEvent[] = []
  const hostEvents: PublicEvent[] = []
  const privateLogs: Record<string, PrivateLogEntry[]> = {
    ...Object.fromEntries(
      Object.entries(input.privateLogs).map(([k, v]) => [k, [...v]]),
    ),
  }

  const pushPrivate = (playerId: string, entry: PrivateLogEntry) => {
    privateLogs[playerId] = [...(privateLogs[playerId] ?? []), entry]
  }

  const doctor = players.find((p) => p.alive && p.role === 'Doctor')
  const detective = players.find((p) => p.alive && p.role === 'Detective')
  const saveId = input.actions.doctorSaveId
  const investigateId = input.actions.detectiveTargetId
  const mafiaTargetId = resolveMafiaTarget(input.actions.mafiaVotes, players)

  hostEvents.push(
    makeEvent(input.round, 'night', 'Night actions resolving…'),
  )

  if (doctor && saveId) {
    hostEvents.push(
      makeEvent(
        input.round,
        'night',
        `Doctor protected ${players.find((p) => p.id === saveId)?.name ?? 'someone'}.`,
      ),
    )
  }

  if (detective && investigateId) {
    const target = players.find((p) => p.id === investigateId)
    const result = detectiveResult(target?.role)
    hostEvents.push(
      makeEvent(
        input.round,
        'night',
        `Detective investigated ${target?.name ?? 'someone'} → ${result}.`,
      ),
    )
    pushPrivate(
      detective.id,
      makePrivate(
        input.round,
        'detective',
        `Investigation: ${target?.name ?? 'Unknown'} is ${result}.`,
      ),
    )
  }

  let killedId: string | undefined
  let grandmaRevenge = false

  if (mafiaTargetId) {
    const saved = saveId === mafiaTargetId
    hostEvents.push(
      makeEvent(
        input.round,
        'night',
        `Mafia targeted ${players.find((p) => p.id === mafiaTargetId)?.name ?? 'someone'}${saved ? ' (saved)' : ''}.`,
      ),
    )

    if (doctor && saveId) {
      pushPrivate(
        doctor.id,
        makePrivate(
          input.round,
          'doctor',
          saved
            ? 'Your protection was successful.'
            : 'Your protection had no effect tonight.',
        ),
      )
    }

    if (!saved) {
      killedId = mafiaTargetId
    }
  } else if (doctor && saveId) {
    pushPrivate(
      doctor.id,
      makePrivate(
        input.round,
        'doctor',
        'Your protection had no effect tonight.',
      ),
    )
  }

  if (killedId) {
    const victim = players.find((p) => p.id === killedId)
    if (victim) {
      victim.alive = false
      if (victim.role === 'Grandma') {
        grandmaRevenge = true
        const aliveMafia = players.filter(
          (p) => p.alive && isMafiaTeam(p.role),
        )
        if (aliveMafia.length > 0) {
          const taken =
            aliveMafia[Math.floor(Math.random() * aliveMafia.length)]
          taken.alive = false
          hostEvents.push(
            makeEvent(
              input.round,
              'morning',
              `Grandma took ${taken.name} with her.`,
            ),
          )
          publicEvents.push(
            makeEvent(
              input.round,
              'morning',
              'A mysterious force claimed a second life.',
            ),
          )
        }
      }
      hostEvents.push(
        makeEvent(input.round, 'morning', `${victim.name} was eliminated.`),
      )
    }
  }

  const morningMessage = killedId
    ? 'A player was found dead.'
    : 'No one died last night.'

  publicEvents.push(makeEvent(input.round, 'morning', morningMessage))
  if (grandmaRevenge) {
    // already added public event above
  }

  const winner = evaluateWinner(players)

  return {
    players,
    morningMessage,
    publicEvents,
    hostEvents,
    privateLogs,
    winner,
  }
}

export function evaluateWinner(players: Player[]): Winner {
  const alive = players.filter((p) => p.alive)
  const mafiaAlive = alive.filter((p) => isMafiaTeam(p.role)).length
  const nonMafia = alive.length - mafiaAlive

  if (mafiaAlive === 0) return 'civilians'
  if (mafiaAlive >= nonMafia) return 'mafia'
  return null
}

export function resolveVotes(input: {
  players: Player[]
  votes: Record<string, string>
  round: number
}): {
  players: Player[]
  eliminatedId: string | null
  jesterWin: boolean
  publicEvents: PublicEvent[]
  hostEvents: PublicEvent[]
  winner: Winner
} {
  const players = input.players.map((p) => ({ ...p }))
  const alive = players.filter((p) => p.alive)
  const publicEvents: PublicEvent[] = []
  const hostEvents: PublicEvent[] = []

  const tallies: Record<string, number> = {}
  for (const p of alive) {
    const vote = input.votes[p.id] ?? 'abstain'
    if (vote === 'abstain') {
      p.missedVotes = (p.missedVotes ?? 0) + 1
      hostEvents.push(
        makeEvent(input.round, 'voting', `${p.name} abstained.`),
      )
      continue
    }
    p.missedVotes = 0
    tallies[vote] = (tallies[vote] ?? 0) + 1
  }

  const ranked = Object.entries(tallies).sort((a, b) => b[1] - a[1])
  const top = ranked[0]
  let eliminatedId: string | null = null
  let jesterWin = false

  if (top && (ranked.length === 1 || top[1] > (ranked[1]?.[1] ?? 0))) {
    eliminatedId = top[0]
    const victim = players.find((p) => p.id === eliminatedId)
    if (victim) {
      victim.alive = false
      hostEvents.push(
        makeEvent(
          input.round,
          'result',
          `${victim.name} was voted out (${victim.role}).`,
        ),
      )
      publicEvents.push(
        makeEvent(input.round, 'result', 'A player has been eliminated.'),
      )
      if (victim.role === 'Jester') {
        jesterWin = true
        publicEvents.push(
          makeEvent(input.round, 'result', 'The Jester wins!'),
        )
        hostEvents.push(
          makeEvent(input.round, 'result', `${victim.name} (Jester) wins.`),
        )
      }
    }
  } else {
    publicEvents.push(
      makeEvent(input.round, 'result', 'No majority — no one was eliminated.'),
    )
    hostEvents.push(
      makeEvent(input.round, 'result', 'Vote tied or empty — no elimination.'),
    )
  }

  const winner: Winner = jesterWin
    ? 'jester'
    : evaluateWinner(players)

  return {
    players,
    eliminatedId,
    jesterWin,
    publicEvents,
    hostEvents,
    winner,
  }
}

export function phaseDurationMs(
  phase: 'discussion' | 'voting' | 'night',
  settings: { discussionSec: number; votingSec: number; nightSec: number },
): number {
  if (phase === 'discussion') return settings.discussionSec * 1000
  if (phase === 'voting') return settings.votingSec * 1000
  return settings.nightSec * 1000
}
