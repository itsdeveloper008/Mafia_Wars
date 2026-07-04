'use client'

import { Hand, Mic, MicOff, Video, VideoOff } from 'lucide-react'
import { isMafiaTeam } from '@/lib/game/roles'
import type { NightActions, Player, RoomState } from '@/lib/game/types'
import { ROLE_INFO } from '@/lib/game/types'
import { PlayerCard } from './PlayerCard'
import {
  Countdown,
  FadeIn,
  GhostButton,
  GlassPanel,
  PrimaryButton,
  ScreenShell,
} from './ui'

export function PlayerGameView({
  room,
  me,
  onPatchPlayer,
  onNightAction,
  onVote,
}: {
  room: RoomState
  me?: Player
  onPatchPlayer: (partial: Partial<Player>) => Promise<void>
  onNightAction: (actions: Partial<NightActions>) => Promise<void>
  onVote: (targetId: string) => Promise<void>
}) {
  if (!me) {
    return (
      <ScreenShell>
        <GlassPanel>
          <p>You are not in this game as a player.</p>
        </GlassPanel>
      </ScreenShell>
    )
  }

  const alive = room.players.filter((p) => p.alive)
  const dead = room.players.filter((p) => !p.alive)
  const role = me.role
  const info = role ? ROLE_INFO[role] : null
  const privateLog = room.privateLogs[me.id] ?? []
  const mafiaAlive = room.players.filter(
    (p) => p.alive && isMafiaTeam(p.role),
  )
  const isNight = room.phase === 'night'
  const nightDim = isNight

  return (
    <ScreenShell>
      <FadeIn className={`space-y-5 ${nightDim ? 'brightness-90' : ''}`}>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-glow">
              Round {room.round} · {room.phase}
              {isNight ? ` · ${room.nightStep}` : ''}
            </p>
            <h1 className="text-3xl font-bold text-white">Your Game</h1>
          </div>
          <GlassPanel className="min-w-[200px] text-center !py-3">
            <Countdown endsAt={room.phaseEndsAt} paused={room.paused} />
          </GlassPanel>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <GlassPanel className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.15),transparent_55%)]" />
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
              Your Role
            </p>
            <h2 className="mt-2 text-4xl font-extrabold text-white">
              {role ?? 'Hidden'}
            </h2>
            {info && (
              <>
                <p className="mt-1 font-mono text-xs uppercase tracking-wider text-amber-glow">
                  {info.team} · {info.active ? 'Active' : 'Passive'}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  {info.ability}
                </p>
              </>
            )}
            {!me.alive && (
              <p className="mt-4 rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-200">
                You are dead. Spectate quietly — mic muted.
              </p>
            )}
          </GlassPanel>

          <GlassPanel>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-400">
              Controls
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <GhostButton
                disabled={!me.alive}
                onClick={() =>
                  void onPatchPlayer({ handRaised: !me.handRaised })
                }
              >
                <Hand className="h-4 w-4" />
                {me.handRaised ? 'Lower Hand' : 'Raise Hand'}
              </GhostButton>
              <GhostButton
                disabled={!me.alive || !room.settings.voiceEnabled}
                onClick={() => void onPatchPlayer({ micOn: !me.micOn })}
              >
                {me.micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                Mic
              </GhostButton>
              <GhostButton
                disabled={!me.alive || !room.settings.videoEnabled || isNight}
                onClick={() => void onPatchPlayer({ cameraOn: !me.cameraOn })}
              >
                {me.cameraOn ? (
                  <Video className="h-4 w-4" />
                ) : (
                  <VideoOff className="h-4 w-4" />
                )}
                Camera
              </GhostButton>
            </div>
            {room.morningMessage && room.phase === 'morning' && (
              <p className="mt-4 rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-200">
                {room.morningMessage}
              </p>
            )}
          </GlassPanel>
        </div>

        {/* Night actions */}
        {me.alive && isNight && role === 'Doctor' && room.nightStep === 'doctor' && (
          <ActionPicker
            title="Protect a player"
            players={alive}
            selected={room.nightActions.doctorSaveId}
            onSelect={(id) => void onNightAction({ doctorSaveId: id })}
          />
        )}

        {me.alive &&
          isNight &&
          role === 'Detective' &&
          room.nightStep === 'detective' && (
            <ActionPicker
              title="Investigate a player"
              players={alive.filter((p) => p.id !== me.id)}
              selected={room.nightActions.detectiveTargetId}
              onSelect={(id) => void onNightAction({ detectiveTargetId: id })}
            />
          )}

        {me.alive &&
          isNight &&
          isMafiaTeam(role) &&
          room.nightStep === 'mafia' && (
            <div className="space-y-3">
              <GlassPanel>
                <p className="text-sm text-slate-300">
                  Mafia circle:{' '}
                  {mafiaAlive.map((p) => p.name).join(', ') || 'None'}
                </p>
              </GlassPanel>
              <ActionPicker
                title="Vote for a target"
                players={alive.filter((p) => !isMafiaTeam(p.role))}
                selected={room.nightActions.mafiaVotes[me.id]}
                onSelect={(id) =>
                  void onNightAction({
                    mafiaVotes: {
                      ...room.nightActions.mafiaVotes,
                      [me.id]: id,
                    },
                  })
                }
              />
            </div>
          )}

        {/* Voting */}
        {me.alive && room.phase === 'voting' && (
          <ActionPicker
            title="Cast your vote"
            players={alive.filter((p) => p.id !== me.id)}
            selected={
              room.votes[me.id] === 'abstain' ? undefined : room.votes[me.id]
            }
            onSelect={(id) => void onVote(id)}
            extra={
              <GhostButton onClick={() => void onVote('abstain')}>
                Abstain
              </GhostButton>
            }
          />
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <GlassPanel>
            <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
              Alive
            </h3>
            <div className="mt-3 grid gap-2">
              {alive.map((p) => (
                <PlayerCard key={p.id} player={p} isYou={p.id === me.id} compact />
              ))}
            </div>
          </GlassPanel>
          <GlassPanel>
            <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
              Dead
            </h3>
            <div className="mt-3 grid gap-2">
              {dead.length === 0 ? (
                <p className="text-sm text-slate-500">No one yet</p>
              ) : (
                dead.map((p) => (
                  <PlayerCard key={p.id} player={p} isYou={p.id === me.id} compact />
                ))
              )}
            </div>
          </GlassPanel>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <GlassPanel className="max-h-64 overflow-auto">
            <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
              Public Events
            </h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-300">
              {[...room.publicEvents].reverse().slice(0, 20).map((e) => (
                <li key={e.id}>{e.message}</li>
              ))}
            </ul>
          </GlassPanel>
          <GlassPanel className="max-h-64 overflow-auto">
            <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
              Private Log
            </h3>
            <ul className="mt-2 space-y-2 text-sm text-cyan-100/90">
              {privateLog.length === 0 ? (
                <li className="text-slate-500">No private notes yet</li>
              ) : (
                [...privateLog].reverse().map((e) => (
                  <li key={e.id}>
                    <span className="font-mono text-[10px] text-slate-500">
                      Night {e.round}
                    </span>
                    <p>{e.message}</p>
                  </li>
                ))
              )}
            </ul>
          </GlassPanel>
        </div>
      </FadeIn>
    </ScreenShell>
  )
}

function ActionPicker({
  title,
  players,
  selected,
  onSelect,
  extra,
}: {
  title: string
  players: Player[]
  selected?: string
  onSelect: (id: string) => void
  extra?: React.ReactNode
}) {
  return (
    <GlassPanel>
      <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
        {title}
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {players.map((p) => (
          <PrimaryButton
            key={p.id}
            className={
              selected === p.id ? 'ring-2 ring-white' : '!from-slate-200 !to-slate-400'
            }
            onClick={() => onSelect(p.id)}
          >
            {p.avatar} {p.name}
          </PrimaryButton>
        ))}
        {extra}
      </div>
    </GlassPanel>
  )
}
