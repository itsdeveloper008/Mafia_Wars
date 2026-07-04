'use client'

import {
  FastForward,
  Flag,
  Hand,
  Mic,
  MicOff,
  Pause,
  Play,
  SkipForward,
  TimerReset,
  Video,
  VideoOff,
} from 'lucide-react'
import type { GameSession } from '@/types/game'
import { PlayerCard } from './PlayerCard'
import {
  Countdown,
  DangerButton,
  FadeIn,
  GhostButton,
  GlassPanel,
  PrimaryButton,
  ScreenShell,
} from './ui'

export function HostDashboard({
  session,
  onPause,
  onSkip,
  onEnd,
  onAddTime,
  onMuteAll,
  onAckHand,
  onBreakTie,
  onToggleVoice,
  onToggleVideo,
}: {
  session: GameSession
  onPause: (paused: boolean) => void
  onSkip: () => void
  onEnd: () => void
  onAddTime: (sec: number) => void
  onMuteAll: (on: boolean) => void
  onAckHand: (id: string) => void
  onBreakTie: (id: string) => void
  onToggleVoice: (on: boolean) => void
  onToggleVideo: (on: boolean) => void
}) {
  const { room, state, players, secrets, votes, hostLogs } = session
  const roleById = Object.fromEntries(secrets.map((s) => [s.playerId, s.role]))
  const raised = players.filter((p) => p.raisedHand)
  const tieIds = state.pendingTiePlayerIds

  return (
    <ScreenShell>
      <FadeIn className="space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber-glow">
              Game Master Control · {room.settings.autoMode ? 'Auto' : 'Manual'}
            </p>
            <h1 className="text-3xl font-bold text-white">Host Dashboard</h1>
            <p className="text-sm text-slate-400">
              Room {room.roomCode} · Round {state.currentRound} · You are not a
              player
            </p>
          </div>
          <GlassPanel className="min-w-[220px] text-center !py-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
              {room.paused ? 'Paused' : state.status}
            </p>
            <Countdown
              timerStartedAt={state.timerStartedAt}
              timerDurationMs={state.timerDurationMs}
              paused={room.paused}
            />
          </GlassPanel>
        </header>

        {tieIds.length > 0 && (
          <GlassPanel>
            <p className="mb-2 text-sm text-amber-200">
              Vote tied — choose who is eliminated:
            </p>
            <div className="flex flex-wrap gap-2">
              {tieIds.map((id) => {
                const p = players.find((x) => x.playerId === id)
                return (
                  <PrimaryButton key={id} onClick={() => onBreakTie(id)}>
                    {p?.displayName ?? id}
                  </PrimaryButton>
                )
              })}
            </div>
          </GlassPanel>
        )}

        <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr_1fr]">
          <section className="space-y-3">
            <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
              Player Grid
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {players.map((p) => (
                <PlayerCard
                  key={p.playerId}
                  player={p}
                  role={roleById[p.playerId]}
                  showRole
                />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <GlassPanel>
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
                Host Controls
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <GhostButton onClick={() => onPause(!room.paused)}>
                  {room.paused ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                  {room.paused ? 'Resume' : 'Pause'}
                </GhostButton>
                <GhostButton onClick={onSkip}>
                  <SkipForward className="h-4 w-4" /> Skip Phase
                </GhostButton>
                <GhostButton onClick={() => onAddTime(30)}>
                  <TimerReset className="h-4 w-4" /> +30s
                </GhostButton>
                <GhostButton onClick={() => onAddTime(60)}>
                  <FastForward className="h-4 w-4" /> +1m
                </GhostButton>
                <GhostButton onClick={() => onMuteAll(false)}>
                  <MicOff className="h-4 w-4" /> Mute All
                </GhostButton>
                <GhostButton onClick={() => onMuteAll(true)}>
                  <Mic className="h-4 w-4" /> Unmute
                </GhostButton>
                <GhostButton
                  onClick={() => onToggleVoice(!room.settings.voiceEnabled)}
                >
                  <Mic className="h-4 w-4" /> Voice
                </GhostButton>
                <GhostButton
                  onClick={() => onToggleVideo(!room.settings.videoEnabled)}
                >
                  {room.settings.videoEnabled ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <VideoOff className="h-4 w-4" />
                  )}
                  Video
                </GhostButton>
              </div>
              <DangerButton className="mt-3 w-full" onClick={onEnd}>
                <Flag className="h-4 w-4" /> End / Reset Lobby
              </DangerButton>
            </GlassPanel>

            <GlassPanel>
              <h2 className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
                <Hand className="h-4 w-4" /> Raised Hands
              </h2>
              {raised.length === 0 ? (
                <p className="text-sm text-slate-500">No hands raised</p>
              ) : (
                <ul className="space-y-2">
                  {raised.map((p) => (
                    <li
                      key={p.playerId}
                      className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm"
                    >
                      <span>
                        {p.avatar} {p.displayName}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-cyan-glow"
                        onClick={() => onAckHand(p.playerId)}
                      >
                        Acknowledge
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </GlassPanel>

            <GlassPanel>
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
                Roles
              </h2>
              <ul className="mt-2 space-y-1 text-sm text-slate-200">
                {players.map((p) => (
                  <li key={p.playerId} className="flex justify-between gap-2">
                    <span>{p.displayName}</span>
                    <span className="font-mono text-amber-glow">
                      {roleById[p.playerId] ?? '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </GlassPanel>
          </section>

          <section className="space-y-4">
            <GlassPanel className="max-h-[320px] overflow-auto">
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
                Host Event Log
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {[...hostLogs].reverse().slice(0, 40).map((e) => (
                  <li key={e.id} className="border-b border-white/5 pb-2">
                    <span className="font-mono text-[10px] text-slate-500">
                      R{e.round} {e.phase}
                    </span>
                    <p>{e.message}</p>
                  </li>
                ))}
              </ul>
            </GlassPanel>

            <GlassPanel>
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
                Votes
              </h2>
              <ul className="mt-2 space-y-1 text-sm">
                {players
                  .filter((p) => p.isAlive)
                  .map((p) => {
                    const v = votes[p.playerId]
                    const targetName =
                      !v || v.targetId === 'abstain'
                        ? v?.targetId === 'abstain'
                          ? 'Abstain'
                          : '—'
                        : players.find((x) => x.playerId === v.targetId)
                            ?.displayName ?? v.targetId
                    return (
                      <li
                        key={p.playerId}
                        className="flex justify-between text-slate-300"
                      >
                        <span>{p.displayName}</span>
                        <span className="font-mono text-cyan-glow">
                          {targetName}
                        </span>
                      </li>
                    )
                  })}
              </ul>
            </GlassPanel>

            {state.morningMessage && (
              <GlassPanel>
                <p className="text-sm text-slate-200">{state.morningMessage}</p>
              </GlassPanel>
            )}
          </section>
        </div>
      </FadeIn>
    </ScreenShell>
  )
}
