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
  onGrantSpeak,
  onClearSpeaker,
  onHostMute,
  onLockVoice,
  onBreakTie,
  onToggleVoice,
  onToggleVideo,
  voiceConnection,
}: {
  session: GameSession
  onPause: (paused: boolean) => void
  onSkip: () => void
  onEnd: () => void
  onAddTime: (sec: number) => void
  onMuteAll: (on: boolean) => void
  onAckHand: (id: string) => void
  onGrantSpeak: (id: string) => void
  onClearSpeaker: () => void
  onHostMute: (id: string, muted: boolean) => void
  onLockVoice: (locked: boolean) => void
  onBreakTie: (id: string) => void
  onToggleVoice: (on: boolean) => void
  onToggleVideo: (on: boolean) => void
  voiceConnection?: string
}) {
  const { room, state, players, secrets, votes, hostLogs } = session
  const roleById = Object.fromEntries(secrets.map((s) => [s.playerId, s.role]))
  const queue = room.speakingQueue ?? []
  const tieIds = state.pendingTiePlayerIds
  const anon = room.settings.anonymousMode
  const label = (p: (typeof players)[0], index: number) =>
    anon ? `Player ${index + 1}` : p.displayName

  return (
    <ScreenShell>
      <FadeIn className="space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mw-label text-mw-gold">
              Game Master Control · {room.settings.autoMode ? 'Auto' : 'Manual'}
            </p>
            <h1 className="font-display text-3xl font-bold text-mw-text">Host Dashboard</h1>
            <p className="text-sm text-mw-muted">
              Room {room.roomCode} · Round {state.currentRound} · You are not a
              player
            </p>
          </div>
          <GlassPanel className="min-w-[220px] text-center !py-4">
            <p className="mw-label text-mw-muted">
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
            <p className="mb-2 text-sm text-mw-gold">
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
            <h2 className="mw-label text-mw-muted">
              Player Grid
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {players.map((p, i) => (
                <div key={p.playerId} className="space-y-1">
                  <PlayerCard
                    player={{
                      ...p,
                      displayName: label(p, i),
                    }}
                    role={roleById[p.playerId]}
                    showRole
                  />
                  <div className="flex gap-2 px-1">
                    <button
                      type="button"
                      className="text-[11px] text-mw-primary"
                      onClick={() => onGrantSpeak(p.playerId)}
                    >
                      Give floor
                    </button>
                    <button
                      type="button"
                      className="text-[11px] text-mw-danger"
                      onClick={() => onHostMute(p.playerId, !p.hostMuted)}
                    >
                      {p.hostMuted ? 'Unmute' : 'Mute'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <GlassPanel>
              <h2 className="mw-label text-mw-muted">
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
                <GhostButton
                  onClick={() => onLockVoice(!room.settings.voiceLocked)}
                >
                  {room.settings.voiceLocked ? 'Unlock Voice' : 'Lock Voice'}
                </GhostButton>
                <GhostButton onClick={onClearSpeaker}>Clear Floor</GhostButton>
              </div>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-mw-faint">
                Voice: {voiceConnection ?? 'idle'} · Mode:{' '}
                {room.settings.discussionMode}
              </p>
              <DangerButton className="mt-3 w-full" onClick={onEnd}>
                <Flag className="h-4 w-4" /> End / Reset Lobby
              </DangerButton>
            </GlassPanel>

            <GlassPanel>
              <h2 className="mb-2 flex items-center gap-2 mw-label text-mw-muted">
                <Hand className="h-4 w-4" /> Speaking Queue
              </h2>
              {room.currentSpeakerId && (
                <p className="mb-2 rounded-lg bg-mw-primary/10 px-3 py-2 text-sm text-blue-100">
                  Live:{' '}
                  {players.find((p) => p.playerId === room.currentSpeakerId)
                    ?.displayName ?? '—'}
                </p>
              )}
              {queue.length === 0 ? (
                <p className="text-sm text-mw-faint">Queue empty</p>
              ) : (
                <ol className="space-y-2">
                  {queue.map((id, index) => {
                    const p = players.find((x) => x.playerId === id)
                    if (!p) return null
                    return (
                      <li
                        key={id}
                        className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm"
                      >
                        <span>
                          {index + 1}. {p.avatar} {p.displayName}
                        </span>
                        <button
                          type="button"
                          className="text-xs text-mw-primary"
                          onClick={() => onGrantSpeak(id)}
                        >
                          Give floor
                        </button>
                      </li>
                    )
                  })}
                </ol>
              )}
            </GlassPanel>

            <GlassPanel>
              <h2 className="mw-label text-mw-muted">
                Roles
              </h2>
              <ul className="mt-2 space-y-1 text-sm text-mw-text">
                {players.map((p) => (
                  <li key={p.playerId} className="flex justify-between gap-2">
                    <span>{p.displayName}</span>
                    <span className="font-mono text-mw-gold">
                      {roleById[p.playerId] ?? '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </GlassPanel>
          </section>

          <section className="space-y-4">
            <GlassPanel className="max-h-[320px] overflow-auto">
              <h2 className="mw-label text-mw-muted">
                Host Event Log
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-mw-muted">
                {[...hostLogs].reverse().slice(0, 40).map((e) => (
                  <li key={e.id} className="border-b border-white/5 pb-2">
                    <span className="font-mono text-[10px] text-mw-faint">
                      R{e.round} {e.phase}
                    </span>
                    <p>{e.message}</p>
                  </li>
                ))}
              </ul>
            </GlassPanel>

            <GlassPanel>
              <h2 className="mw-label text-mw-muted">
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
                        className="flex justify-between text-mw-muted"
                      >
                        <span>{p.displayName}</span>
                        <span className="font-mono text-mw-primary">
                          {targetName}
                        </span>
                      </li>
                    )
                  })}
              </ul>
            </GlassPanel>

            {state.morningMessage && (
              <GlassPanel>
                <p className="text-sm text-mw-text">{state.morningMessage}</p>
              </GlassPanel>
            )}
          </section>
        </div>
      </FadeIn>
    </ScreenShell>
  )
}
