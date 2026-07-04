'use client'

import {
  FastForward,
  Hand,
  Pause,
  Play,
  SkipForward,
  TimerReset,
  MicOff,
  Mic,
  Video,
  VideoOff,
  Flag,
} from 'lucide-react'
import { makeEvent } from '@/lib/game/engine'
import type { RoomState } from '@/lib/game/types'
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
  room,
  onPatch,
  onSkipPhase,
  onEndGame,
}: {
  room: RoomState
  onPatch: (patch: Partial<RoomState>) => Promise<void>
  onSkipPhase: () => void
  onEndGame: () => void
}) {
  const raised = room.players.filter((p) => p.handRaised)

  async function addDiscussion(seconds: number) {
    if (room.phase !== 'discussion' || !room.phaseEndsAt) return
    await onPatch({
      phaseEndsAt: room.phaseEndsAt + seconds * 1000,
      settings: {
        ...room.settings,
        discussionSec: room.settings.discussionSec + seconds,
      },
      hostEvents: [
        ...room.hostEvents,
        makeEvent(room.round, 'discussion', `Host added +${seconds}s.`),
      ],
    })
  }

  return (
    <ScreenShell>
      <FadeIn className="space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber-glow">
              Game Master Control
            </p>
            <h1 className="text-3xl font-bold text-white">Host Dashboard</h1>
            <p className="text-sm text-slate-400">
              Room {room.code} · Round {room.round} · You are not a player
            </p>
          </div>
          <GlassPanel className="min-w-[220px] text-center !py-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
              {room.paused ? 'Paused' : room.phase}
              {room.phase === 'night' ? ` · ${room.nightStep}` : ''}
            </p>
            <Countdown endsAt={room.phaseEndsAt} paused={room.paused} />
          </GlassPanel>
        </header>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr_1fr]">
          <section className="space-y-3">
            <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
              Player Grid
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {room.players.map((p) => (
                <PlayerCard key={p.id} player={p} showRole isHostView />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <GlassPanel>
              <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
                Host Controls
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <GhostButton
                  onClick={() => void onPatch({ paused: !room.paused })}
                >
                  {room.paused ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                  {room.paused ? 'Resume' : 'Pause'}
                </GhostButton>
                <GhostButton onClick={onSkipPhase}>
                  <SkipForward className="h-4 w-4" /> Skip Phase
                </GhostButton>
                <GhostButton onClick={() => void addDiscussion(30)}>
                  <TimerReset className="h-4 w-4" /> +30s
                </GhostButton>
                <GhostButton onClick={() => void addDiscussion(60)}>
                  <FastForward className="h-4 w-4" /> +1m
                </GhostButton>
                <GhostButton
                  onClick={() =>
                    void onPatch({
                      players: room.players.map((p) => ({ ...p, micOn: false })),
                    })
                  }
                >
                  <MicOff className="h-4 w-4" /> Mute All
                </GhostButton>
                <GhostButton
                  onClick={() =>
                    void onPatch({
                      players: room.players.map((p) => ({ ...p, micOn: true })),
                    })
                  }
                >
                  <Mic className="h-4 w-4" /> Unmute
                </GhostButton>
                <GhostButton
                  onClick={() =>
                    void onPatch({
                      settings: { ...room.settings, voiceEnabled: true },
                    })
                  }
                >
                  <Mic className="h-4 w-4" /> Voice On
                </GhostButton>
                <GhostButton
                  onClick={() =>
                    void onPatch({
                      settings: { ...room.settings, videoEnabled: !room.settings.videoEnabled },
                    })
                  }
                >
                  {room.settings.videoEnabled ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <VideoOff className="h-4 w-4" />
                  )}
                  Video
                </GhostButton>
              </div>
              <DangerButton className="mt-3 w-full" onClick={onEndGame}>
                <Flag className="h-4 w-4" /> End Game
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
                      key={p.id}
                      className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm"
                    >
                      <span>
                        {p.avatar} {p.name}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-cyan-glow"
                        onClick={() =>
                          void onPatch({
                            players: room.players.map((x) =>
                              x.id === p.id ? { ...x, handRaised: false } : x,
                            ),
                          })
                        }
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
                {room.players.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2">
                    <span>{p.name}</span>
                    <span className="font-mono text-amber-glow">{p.role}</span>
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
                {[...room.hostEvents].reverse().slice(0, 40).map((e) => (
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
                {room.players
                  .filter((p) => p.alive)
                  .map((p) => (
                    <li key={p.id} className="flex justify-between text-slate-300">
                      <span>{p.name}</span>
                      <span className="font-mono text-cyan-glow">
                        {room.votes[p.id]
                          ? room.votes[p.id] === 'abstain'
                            ? 'Abstain'
                            : room.players.find((x) => x.id === room.votes[p.id])
                                ?.name ?? room.votes[p.id]
                          : '—'}
                      </span>
                    </li>
                  ))}
              </ul>
            </GlassPanel>

            {room.morningMessage && (
              <GlassPanel>
                <p className="text-sm text-slate-200">{room.morningMessage}</p>
              </GlassPanel>
            )}
          </section>
        </div>
      </FadeIn>
    </ScreenShell>
  )
}
