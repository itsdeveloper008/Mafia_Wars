import { isMafiaTeam } from '@/constants/roles'
import { RoleManager } from './RoleManager'
import type {
  NightActionDoc,
  PlayerDoc,
  PrivateLogEntry,
  Role,
  SecretDoc,
} from '@/types/game'

function eid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export interface NightResolution {
  killedIds: string[]
  morningMessage: string
  privateLogs: Record<string, PrivateLogEntry[]>
  hostMessages: string[]
  publicMessages: string[]
}

export class ActionResolver {
  /**
   * Priority: Doctor protection → Mafia attack → Grandma passive → Detective investigation.
   */
  static resolveNight(input: {
    players: PlayerDoc[]
    secrets: SecretDoc[]
    actions: NightActionDoc[]
    round: number
    existingPrivateLogs: Record<string, PrivateLogEntry[]>
  }): NightResolution {
    const roleByPlayer = new Map(
      input.secrets.map((s) => [s.playerId, s.role] as const),
    )
    const actionByRole = new Map<Role, NightActionDoc>()
    const mafiaVotes: string[] = []

    for (const action of input.actions) {
      const role = roleByPlayer.get(action.playerId)
      if (!role) continue
      if (role === 'Mafia' || role === 'Godfather') {
        mafiaVotes.push(action.targetId)
      } else {
        actionByRole.set(role, action)
      }
    }

    const privateLogs: Record<string, PrivateLogEntry[]> = {
      ...Object.fromEntries(
        Object.entries(input.existingPrivateLogs).map(([k, v]) => [k, [...v]]),
      ),
    }
    const hostMessages: string[] = []
    const publicMessages: string[] = []
    const killedIds: string[] = []

    const pushPrivate = (
      playerId: string,
      kind: PrivateLogEntry['kind'],
      message: string,
    ) => {
      const entry: PrivateLogEntry = {
        id: eid(),
        round: input.round,
        kind,
        message,
        at: Date.now(),
      }
      privateLogs[playerId] = [...(privateLogs[playerId] ?? []), entry]
    }

    const doctorAction = actionByRole.get('Doctor')
    const doctor = input.players.find(
      (p) => p.isAlive && roleByPlayer.get(p.playerId) === 'Doctor',
    )
    const saveId = doctorAction?.targetId

    if (doctor && saveId) {
      const name =
        input.players.find((p) => p.playerId === saveId)?.displayName ?? 'someone'
      hostMessages.push(`Doctor protected ${name}.`)
    }

    // Mafia majority target
    const voteCounts: Record<string, number> = {}
    for (const t of mafiaVotes) voteCounts[t] = (voteCounts[t] ?? 0) + 1
    const mafiaTarget = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

    if (mafiaTarget) {
      const name =
        input.players.find((p) => p.playerId === mafiaTarget)?.displayName ??
        'someone'
      const saved = saveId === mafiaTarget
      hostMessages.push(`Mafia targeted ${name}${saved ? ' (saved)' : ''}.`)

      if (doctor) {
        pushPrivate(
          doctor.playerId,
          'doctor',
          saved
            ? 'Your protection was successful.'
            : 'Your protection had no effect tonight.',
        )
      }

      if (!saved) {
        killedIds.push(mafiaTarget)
        const victimRole = roleByPlayer.get(mafiaTarget)
        if (victimRole === 'Grandma') {
          const aliveMafia = input.players.filter(
            (p) =>
              p.isAlive &&
              p.playerId !== mafiaTarget &&
              isMafiaTeam(roleByPlayer.get(p.playerId)),
          )
          if (aliveMafia.length > 0) {
            const taken =
              aliveMafia[Math.floor(Math.random() * aliveMafia.length)]
            killedIds.push(taken.playerId)
            hostMessages.push(`Grandma took ${taken.displayName} with her.`)
            publicMessages.push(
              'A mysterious force claimed a second life.',
            )
          }
        }
      }
    } else if (doctor && saveId) {
      pushPrivate(
        doctor.playerId,
        'doctor',
        'Your protection had no effect tonight.',
      )
    }

    const detectiveAction = actionByRole.get('Detective')
    const detective = input.players.find(
      (p) => p.isAlive && roleByPlayer.get(p.playerId) === 'Detective',
    )
    if (detective && detectiveAction) {
      const target = input.players.find(
        (p) => p.playerId === detectiveAction.targetId,
      )
      const result = RoleManager.detectiveResult(
        roleByPlayer.get(detectiveAction.targetId),
      )
      hostMessages.push(
        `Detective investigated ${target?.displayName ?? 'someone'} → ${result}.`,
      )
      pushPrivate(
        detective.playerId,
        'detective',
        `Investigation: ${target?.displayName ?? 'Unknown'} is ${result}.`,
      )
    }

    const morningMessage = killedIds.length
      ? 'A player was found dead.'
      : 'No one died last night.'
    publicMessages.unshift(morningMessage)

    return {
      killedIds,
      morningMessage,
      privateLogs,
      hostMessages,
      publicMessages,
    }
  }
}
