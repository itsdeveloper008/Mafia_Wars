import { doc, getDocs, writeBatch, type WriteBatch } from 'firebase/firestore'
import { getDb } from '@/services/firebase/client'
import {
  hostLogsCol,
  logsCol,
  matchHistoryCol,
  nightActionsCol,
  nightActionDoc,
  playerDoc,
  playersCol,
  roomDoc,
  secretDoc,
  secretsCol,
  stateDoc,
  voteDoc,
  votesCol,
} from '@/services/rooms/paths'
import type {
  GameStateDoc,
  LogDoc,
  NightActionDoc,
  PlayerDoc,
  RoomDoc,
  SecretDoc,
  VoteDoc,
} from '@/types/game'
import { ActionResolver } from './ActionResolver'
import { PhaseManager } from './PhaseManager'
import { RoleManager } from './RoleManager'
import { TimerManager } from './TimerManager'
import { VoteManager } from './VoteManager'
import { WinManager } from './WinManager'

function logId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function makeLog(
  round: number,
  phase: LogDoc['phase'],
  message: string,
  isPublic: boolean,
): LogDoc {
  return {
    id: logId(),
    round,
    phase,
    message,
    at: Date.now(),
    public: isPublic,
  }
}

/** Pure orchestration — all writes go through Firestore batch/transactions. */
export class GameEngine {
  static async startGame(room: RoomDoc, players: PlayerDoc[]): Promise<void> {
    const active = players.filter((p) => !p.isHost)
    if (active.length < 4) throw new Error('Need at least 4 players.')

    const roles = RoleManager.generateRoles(active.length, {
      includeGodfather: room.settings.includeGodfather,
      includeGrandma: room.settings.includeGrandma,
      includeJester: room.settings.includeJester,
    })

    const db = getDb()
    const batch = writeBatch(db)
    const timer = TimerManager.start('role_reveal', room.settings)

    const state: GameStateDoc = {
      roomId: room.roomId,
      status: 'role_reveal',
      nightStep: 'actions',
      currentRound: 1,
      timerStartedAt: timer.timerStartedAt,
      timerDurationMs: timer.timerDurationMs,
      winner: null,
      morningMessage: '',
      eliminatedPlayerId: null,
      pendingTiePlayerIds: [],
      updatedAt: Date.now(),
    }

    batch.update(roomDoc(room.roomId), {
      status: 'role_reveal',
      currentPhase: 'role_reveal',
      currentRound: 1,
      playerCount: active.length,
      paused: false,
      updatedAt: Date.now(),
    })
    batch.set(stateDoc(room.roomId), state)

    active.forEach((p, i) => {
      const role = roles[i]
      batch.set(secretDoc(room.roomId, p.playerId), {
        playerId: p.playerId,
        uid: p.uid,
        role,
        privateLogs: [],
      } satisfies SecretDoc)
      batch.update(playerDoc(room.roomId, p.playerId), {
        isAlive: true,
        isReady: true,
        isSpectator: false,
        hasVoted: false,
        raisedHand: false,
        voteTarget: null,
        missedVotes: 0,
      })
    })

    // Clear prior votes / night actions
    const [votesSnap, actionsSnap] = await Promise.all([
      getDocs(votesCol(room.roomId)),
      getDocs(nightActionsCol(room.roomId)),
    ])
    votesSnap.forEach((d) => batch.delete(d.ref))
    actionsSnap.forEach((d) => batch.delete(d.ref))

    const publicLog = makeLog(1, 'role_reveal', 'Roles have been assigned.', true)
    const hostLog = makeLog(1, 'role_reveal', 'Game started. Roles assigned.', false)
    batch.set(doc(logsCol(room.roomId), publicLog.id), publicLog)
    batch.set(doc(hostLogsCol(room.roomId), hostLog.id), hostLog)
    active.forEach((p, i) => {
      const hl = makeLog(1, 'system', `${p.displayName} → ${roles[i]}`, false)
      batch.set(doc(hostLogsCol(room.roomId), hl.id), hl)
    })

    await batch.commit()
  }

  static async advanceFromTimer(
    room: RoomDoc,
    state: GameStateDoc,
    players: PlayerDoc[],
    secrets: SecretDoc[],
    votes: Record<string, VoteDoc>,
    nightActions: NightActionDoc[],
  ): Promise<void> {
    if (room.paused) return
    if (
      !TimerManager.isExpired(
        state.timerStartedAt,
        state.timerDurationMs,
        room.paused,
      )
    ) {
      return
    }

    switch (state.status) {
      case 'role_reveal':
        await this.goToPhase(room, state, 'night')
        break
      case 'night':
        await this.resolveNightAndMorning(room, state, players, secrets, nightActions)
        break
      case 'morning':
        await this.goToPhase(room, state, 'discussion')
        break
      case 'discussion':
        await this.goToPhase(room, state, 'voting')
        break
      case 'voting':
        await this.resolveVoting(room, state, players, secrets, votes)
        break
      case 'elimination':
        await this.afterElimination(room, state, players, secrets)
        break
      default:
        break
    }
  }

  static async skipPhase(
    room: RoomDoc,
    state: GameStateDoc,
    players: PlayerDoc[],
    secrets: SecretDoc[],
    votes: Record<string, VoteDoc>,
    nightActions: NightActionDoc[],
  ): Promise<void> {
    // Force expire by running the same transitions
    const forced: GameStateDoc = {
      ...state,
      timerStartedAt: Date.now() - state.timerDurationMs - 1,
    }
    await this.advanceFromTimer(
      room,
      forced,
      players,
      secrets,
      votes,
      nightActions,
    )
  }

  private static async goToPhase(
    room: RoomDoc,
    state: GameStateDoc,
    status: GameStateDoc['status'],
  ): Promise<void> {
    const timer = TimerManager.start(status, room.settings)
    const db = getDb()
    const batch = writeBatch(db)
    batch.update(roomDoc(room.roomId), {
      status,
      currentPhase: status,
      updatedAt: Date.now(),
    })
    batch.set(stateDoc(room.roomId), {
      ...state,
      status,
      nightStep: status === 'night' ? 'actions' : state.nightStep,
      timerStartedAt: timer.timerStartedAt,
      timerDurationMs: timer.timerDurationMs,
      updatedAt: Date.now(),
    } satisfies GameStateDoc)

    const msg =
      status === 'night'
        ? 'Night has fallen.'
        : status === 'discussion'
          ? 'Discussion begins.'
          : status === 'voting'
            ? 'Voting has begun.'
            : status === 'morning'
              ? state.morningMessage || 'Morning arrives.'
              : `Phase: ${status}`

    const pl = makeLog(state.currentRound, status, msg, true)
    const hl = makeLog(state.currentRound, status, msg, false)
    batch.set(doc(logsCol(room.roomId), pl.id), pl)
    batch.set(doc(hostLogsCol(room.roomId), hl.id), hl)
    await batch.commit()
  }

  private static async resolveNightAndMorning(
    room: RoomDoc,
    state: GameStateDoc,
    players: PlayerDoc[],
    secrets: SecretDoc[],
    nightActions: NightActionDoc[],
  ): Promise<void> {
    const existingPrivate: Record<string, SecretDoc['privateLogs']> = {}
    for (const s of secrets) existingPrivate[s.playerId] = s.privateLogs

    const result = ActionResolver.resolveNight({
      players,
      secrets,
      actions: nightActions,
      round: state.currentRound,
      existingPrivateLogs: existingPrivate,
    })

    const db = getDb()
    const batch = writeBatch(db)
    const killed = new Set(result.killedIds)

    for (const p of players) {
      if (!killed.has(p.playerId)) continue
      batch.update(playerDoc(room.roomId, p.playerId), {
        isAlive: false,
        isSpectator: true,
        micEnabled: false,
        cameraEnabled: false,
      })
    }

    for (const s of secrets) {
      const logs = result.privateLogs[s.playerId] ?? s.privateLogs
      batch.set(secretDoc(room.roomId, s.playerId), {
        ...s,
        privateLogs: logs,
      })
    }

    // clear night actions
    for (const a of nightActions) {
      batch.delete(nightActionDoc(room.roomId, a.playerId))
    }

    const playersAfter = players.map((p) =>
      killed.has(p.playerId)
        ? { ...p, isAlive: false, isSpectator: true }
        : p,
    )

    const roleMap = new Map(secrets.map((s) => [s.playerId, s.role] as const))
    const winner = WinManager.evaluate(playersAfter, roleMap)

    for (const m of result.publicMessages) {
      const pl = makeLog(state.currentRound, 'morning', m, true)
      batch.set(doc(logsCol(room.roomId), pl.id), pl)
    }
    for (const m of result.hostMessages) {
      const hl = makeLog(state.currentRound, 'night', m, false)
      batch.set(doc(hostLogsCol(room.roomId), hl.id), hl)
    }

    if (winner) {
      await this.finishMatch(batch, room, state, playersAfter, secrets, winner)
      await batch.commit()
      return
    }

    const timer = TimerManager.start('morning', room.settings)
    batch.update(roomDoc(room.roomId), {
      status: 'morning',
      currentPhase: 'morning',
      updatedAt: Date.now(),
    })
    batch.set(stateDoc(room.roomId), {
      ...state,
      status: 'morning',
      nightStep: 'actions',
      morningMessage: result.morningMessage,
      timerStartedAt: timer.timerStartedAt,
      timerDurationMs: timer.timerDurationMs,
      updatedAt: Date.now(),
    } satisfies GameStateDoc)

    await batch.commit()
  }

  private static async resolveVoting(
    room: RoomDoc,
    state: GameStateDoc,
    players: PlayerDoc[],
    secrets: SecretDoc[],
    votes: Record<string, VoteDoc>,
  ): Promise<void> {
    const finalized = VoteManager.finalizeVotes(players, votes)
    const { topIds, isTie } = VoteManager.tally(finalized)
    const db = getDb()
    const batch = writeBatch(db)

    // persist abstains
    for (const [pid, vote] of Object.entries(finalized)) {
      batch.set(voteDoc(room.roomId, pid), vote)
      const missed = vote.targetId === 'abstain'
      batch.update(playerDoc(room.roomId, pid), {
        hasVoted: true,
        voteTarget: vote.targetId,
        missedVotes: missed
          ? (players.find((p) => p.playerId === pid)?.missedVotes ?? 0) + 1
          : 0,
      })
    }

    if (isTie && room.settings.tieBreakMode === 'host') {
      const timer = TimerManager.start('elimination', room.settings)
      batch.update(roomDoc(room.roomId), {
        status: 'elimination',
        currentPhase: 'elimination',
        updatedAt: Date.now(),
      })
      batch.set(stateDoc(room.roomId), {
        ...state,
        status: 'elimination',
        pendingTiePlayerIds: topIds,
        eliminatedPlayerId: null,
        timerStartedAt: timer.timerStartedAt,
        timerDurationMs: timer.timerDurationMs,
        updatedAt: Date.now(),
      } satisfies GameStateDoc)
      const pl = makeLog(
        state.currentRound,
        'elimination',
        'Vote tied — host must decide.',
        true,
      )
      batch.set(doc(logsCol(room.roomId), pl.id), pl)
      await batch.commit()
      return
    }

    const eliminatedId = !isTie && topIds[0] ? topIds[0] : null
    await this.applyElimination(
      batch,
      room,
      state,
      players,
      secrets,
      eliminatedId,
    )
    await batch.commit()
  }

  private static async applyElimination(
    batch: WriteBatch,
    room: RoomDoc,
    state: GameStateDoc,
    players: PlayerDoc[],
    secrets: SecretDoc[],
    eliminatedId: string | null,
  ): Promise<void> {
    const roleMap = new Map(secrets.map((s) => [s.playerId, s.role] as const))
    let playersAfter = players.map((p) => ({ ...p }))

    if (eliminatedId) {
      playersAfter = playersAfter.map((p) =>
        p.playerId === eliminatedId
          ? { ...p, isAlive: false, isSpectator: true, micEnabled: false }
          : p,
      )
      batch.update(playerDoc(room.roomId, eliminatedId), {
        isAlive: false,
        isSpectator: true,
        micEnabled: false,
        cameraEnabled: false,
      })
      const name =
        players.find((p) => p.playerId === eliminatedId)?.displayName ??
        'A player'
      const role = roleMap.get(eliminatedId)
      const pl = makeLog(
        state.currentRound,
        'elimination',
        'A player has been eliminated.',
        true,
      )
      const hl = makeLog(
        state.currentRound,
        'elimination',
        `${name} was voted out (${role}).`,
        false,
      )
      batch.set(doc(logsCol(room.roomId), pl.id), pl)
      batch.set(doc(hostLogsCol(room.roomId), hl.id), hl)

      if (WinManager.jesterWin(role)) {
        await this.finishMatch(batch, room, state, playersAfter, secrets, 'jester')
        return
      }
    } else {
      const pl = makeLog(
        state.currentRound,
        'elimination',
        'No majority — no one was eliminated.',
        true,
      )
      batch.set(doc(logsCol(room.roomId), pl.id), pl)
    }

    const winner = WinManager.evaluate(playersAfter, roleMap)
    if (winner) {
      await this.finishMatch(batch, room, state, playersAfter, secrets, winner)
      return
    }

    const timer = TimerManager.start('elimination', room.settings)
    batch.update(roomDoc(room.roomId), {
      status: 'elimination',
      currentPhase: 'elimination',
      updatedAt: Date.now(),
    })
    batch.set(stateDoc(room.roomId), {
      ...state,
      status: 'elimination',
      eliminatedPlayerId: eliminatedId,
      pendingTiePlayerIds: [],
      timerStartedAt: timer.timerStartedAt,
      timerDurationMs: timer.timerDurationMs,
      updatedAt: Date.now(),
    } satisfies GameStateDoc)
  }

  private static async afterElimination(
    room: RoomDoc,
    state: GameStateDoc,
    players: PlayerDoc[],
    secrets: SecretDoc[],
  ): Promise<void> {
    const roleMap = new Map(secrets.map((s) => [s.playerId, s.role] as const))
    const winner = WinManager.evaluate(players, roleMap)
    if (winner) {
      const db = getDb()
      const batch = writeBatch(db)
      await this.finishMatch(batch, room, state, players, secrets, winner)
      await batch.commit()
      return
    }

    const nextRound = state.currentRound + 1
    const timer = TimerManager.start('night', room.settings)
    const db = getDb()
    const batch = writeBatch(db)

    // clear votes
    const votesSnap = await getDocs(votesCol(room.roomId))
    votesSnap.forEach((d) => batch.delete(d.ref))

    for (const p of players) {
      batch.update(playerDoc(room.roomId, p.playerId), {
        hasVoted: false,
        voteTarget: null,
        raisedHand: false,
      })
    }

    batch.update(roomDoc(room.roomId), {
      status: 'night',
      currentPhase: 'night',
      currentRound: nextRound,
      updatedAt: Date.now(),
    })
    batch.set(stateDoc(room.roomId), {
      ...state,
      status: 'night',
      nightStep: 'actions',
      currentRound: nextRound,
      eliminatedPlayerId: null,
      pendingTiePlayerIds: [],
      morningMessage: '',
      timerStartedAt: timer.timerStartedAt,
      timerDurationMs: timer.timerDurationMs,
      updatedAt: Date.now(),
    } satisfies GameStateDoc)

    const pl = makeLog(nextRound, 'night', 'Night has fallen.', true)
    batch.set(doc(logsCol(room.roomId), pl.id), pl)
    await batch.commit()
  }

  private static async finishMatch(
    batch: WriteBatch,
    room: RoomDoc,
    state: GameStateDoc,
    players: PlayerDoc[],
    secrets: SecretDoc[],
    winner: NonNullable<GameStateDoc['winner']>,
  ): Promise<void> {
    const roleMap = new Map(secrets.map((s) => [s.playerId, s.role] as const))
    batch.update(roomDoc(room.roomId), {
      status: 'finished',
      currentPhase: 'finished',
      updatedAt: Date.now(),
    })
    batch.set(stateDoc(room.roomId), {
      ...state,
      status: 'finished',
      winner,
      timerStartedAt: null,
      timerDurationMs: 0,
      updatedAt: Date.now(),
    } satisfies GameStateDoc)

    const matchId = `${room.roomId}-${Date.now()}`
    batch.set(doc(matchHistoryCol(), matchId), {
      matchId,
      roomId: room.roomId,
      roomCode: room.roomCode,
      winner,
      durationMs: Date.now() - room.createdAt,
      rounds: state.currentRound,
      players: players.map((p) => ({
        uid: p.uid,
        displayName: p.displayName,
        role: roleMap.get(p.playerId) ?? 'Civilian',
        survived: p.isAlive,
      })),
      createdAt: Date.now(),
    })

    const pl = makeLog(
      state.currentRound,
      'finished',
      winner === 'mafia'
        ? 'Mafia wins.'
        : winner === 'jester'
          ? 'Jester wins.'
          : 'Town wins.',
      true,
    )
    batch.set(doc(logsCol(room.roomId), pl.id), pl)
  }

  static async hostBreakTie(
    room: RoomDoc,
    state: GameStateDoc,
    players: PlayerDoc[],
    secrets: SecretDoc[],
    eliminatedId: string,
  ): Promise<void> {
    const db = getDb()
    const batch = writeBatch(db)
    await this.applyElimination(
      batch,
      room,
      state,
      players,
      secrets,
      eliminatedId,
    )
    await batch.commit()
  }

  static async restartLobby(room: RoomDoc, players: PlayerDoc[]): Promise<void> {
    const db = getDb()
    const batch = writeBatch(db)
    batch.update(roomDoc(room.roomId), {
      status: 'waiting',
      currentPhase: 'waiting',
      currentRound: 0,
      paused: false,
      updatedAt: Date.now(),
    })
    batch.set(stateDoc(room.roomId), {
      roomId: room.roomId,
      status: 'waiting',
      nightStep: 'actions',
      currentRound: 0,
      timerStartedAt: null,
      timerDurationMs: 0,
      winner: null,
      morningMessage: '',
      eliminatedPlayerId: null,
      pendingTiePlayerIds: [],
      updatedAt: Date.now(),
    } satisfies GameStateDoc)

    for (const p of players) {
      batch.update(playerDoc(room.roomId, p.playerId), {
        isAlive: true,
        isReady: false,
        isSpectator: false,
        hasVoted: false,
        raisedHand: false,
        voteTarget: null,
        missedVotes: 0,
      })
      batch.delete(secretDoc(room.roomId, p.playerId))
    }

    const [votesSnap, actionsSnap] = await Promise.all([
      getDocs(votesCol(room.roomId)),
      getDocs(nightActionsCol(room.roomId)),
    ])
    votesSnap.forEach((d) => batch.delete(d.ref))
    actionsSnap.forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
}
