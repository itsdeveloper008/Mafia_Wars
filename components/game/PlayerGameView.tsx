'use client'

import { Hand } from 'lucide-react'
import { isMafiaTeam } from '@/constants/roles'
import { ROLE_INFO } from '@/constants/roles'
import type { GameSession, PlayerDoc } from '@/types/game'
import { MediaDock } from './MediaDock'
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
  session,
  onToggleHand,
  onToggleMic,
  onToggleCamera,
  onVote,
  onNightAction,
  media,
}: {
  session: GameSession
  onToggleHand: () => void
  onToggleMic: () => void
  onToggleCamera: () => void
  onVote: (id: string) => void
  onNightAction: (id: string) => void
  media?: {
    connection: string
    peerCount: number
    voiceError?: string
    micOn: boolean
    camOn: boolean
    videoAllowed: boolean
    localStream: MediaStream | null
    remoteStreams: Record<string, MediaStream>
    nameByUid: Record<string, string>
    onToggleMic: () => void
    onToggleCam: () => void
  }
}) {
  const { room, state, players, me, mySecret, votes, nightActions, publicLogs } =
    session

  if (!me) {
    return (
      <ScreenShell>
        <GlassPanel>
          <p>You are not in this game as a player.</p>
        </GlassPanel>
      </ScreenShell>
    )
  }

  const alive = players.filter((p) => p.isAlive)
  const dead = players.filter((p) => !p.isAlive)
  const role = mySecret?.role
  const info = role ? ROLE_INFO[role] : null
  const privateLog = mySecret?.privateLogs ?? []
  const isNight = state.status === 'night'
  const myVote = votes[me.playerId]
  const myNight = nightActions[me.playerId]

  // Mafia circle: only show names of other mafia if we know our role is mafia
  // We don't have other roles on client — only show "your crew is active"
  const canActAtNight =
    me.isAlive &&
    isNight &&
    role &&
    (role === 'Doctor' ||
      role === 'Detective' ||
      role === 'Mafia' ||
      role === 'Godfather')

  return (
    <ScreenShell>
      <FadeIn className={`space-y-5 ${isNight ? 'brightness-90' : ''}`}>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mw-label text-mw-primary">
              Round {state.currentRound} · {state.status}
            </p>
            <h1 className="font-display text-3xl font-bold text-mw-text">Your Game</h1>
          </div>
          <GlassPanel className="min-w-[200px] text-center !py-3">
            <Countdown
              timerStartedAt={state.timerStartedAt}
              timerDurationMs={state.timerDurationMs}
              paused={room.paused}
            />
          </GlassPanel>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <GlassPanel className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.15),transparent_55%)]" />
            <p className="mw-label text-mw-muted">
              Your Role
            </p>
            <h2 className="mt-2 font-display text-4xl font-bold text-mw-text">
              {role ?? (state.status === 'waiting' ? 'Waiting' : 'Hidden')}
            </h2>
            {info && (
              <>
                <p className="mt-1 font-mono text-xs uppercase tracking-wider text-mw-gold">
                  {info.team} · {info.active ? 'Active' : 'Passive'}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-mw-muted">
                  {info.ability}
                </p>
              </>
            )}
            {me.isSpectator && (
              <p className="mt-4 rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-red-200">
                Spectator mode — you cannot vote or use abilities.
              </p>
            )}
          </GlassPanel>

          <GlassPanel>
            <p className="mw-label">Controls</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <GhostButton disabled={!me.isAlive} onClick={onToggleHand}>
                <Hand className="h-4 w-4" />
                {me.raisedHand ? 'Lower Hand' : 'Raise Hand'}
              </GhostButton>
            </div>
            {state.morningMessage && state.status === 'morning' && (
              <p className="mt-4 rounded-xl bg-white/5 px-3 py-2 text-sm text-mw-text">
                {state.morningMessage}
              </p>
            )}
          </GlassPanel>
        </div>

        {media && (
          <MediaDock
            connection={media.connection}
            peerCount={media.peerCount}
            voiceError={media.voiceError}
            isHost={false}
            micOn={media.micOn}
            camOn={media.camOn}
            videoAllowed={media.videoAllowed}
            localStream={media.localStream}
            remoteStreams={media.remoteStreams}
            nameByUid={media.nameByUid}
            onToggleMic={media.onToggleMic}
            onToggleCam={media.onToggleCam}
          />
        )}

        {canActAtNight && (
          <ActionPicker
            title={
              role === 'Doctor'
                ? 'Protect a player'
                : role === 'Detective'
                  ? 'Investigate a player'
                  : 'Choose Mafia target'
            }
            players={
              isMafiaTeam(role)
                ? alive.filter((p) => p.playerId !== me.playerId)
                : alive
            }
            selected={myNight?.targetId}
            onSelect={onNightAction}
          />
        )}

        {me.isAlive && state.status === 'voting' && (
          <ActionPicker
            title="Cast your vote"
            players={alive.filter((p) => p.playerId !== me.playerId)}
            selected={
              myVote?.targetId === 'abstain' ? undefined : myVote?.targetId
            }
            onSelect={onVote}
            extra={
              <GhostButton onClick={() => onVote('abstain')}>Abstain</GhostButton>
            }
          />
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <GlassPanel>
            <h3 className="mw-label text-mw-muted">
              Alive
            </h3>
            <div className="mt-3 grid gap-2">
              {alive.map((p) => (
                <PlayerCard
                  key={p.playerId}
                  player={p}
                  isYou={p.playerId === me.playerId}
                  compact
                />
              ))}
            </div>
          </GlassPanel>
          <GlassPanel>
            <h3 className="mw-label text-mw-muted">
              Dead / Spectators
            </h3>
            <div className="mt-3 grid gap-2">
              {dead.length === 0 ? (
                <p className="text-sm text-mw-faint">No one yet</p>
              ) : (
                dead.map((p) => (
                  <PlayerCard
                    key={p.playerId}
                    player={p}
                    isYou={p.playerId === me.playerId}
                    compact
                  />
                ))
              )}
            </div>
          </GlassPanel>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <GlassPanel className="max-h-64 overflow-auto">
            <h3 className="mw-label text-mw-muted">
              Public Events
            </h3>
            <ul className="mt-2 space-y-2 text-sm text-mw-muted">
              {[...publicLogs].reverse().slice(0, 20).map((e) => (
                <li key={e.id}>{e.message}</li>
              ))}
            </ul>
          </GlassPanel>
          <GlassPanel className="max-h-64 overflow-auto">
            <h3 className="mw-label text-mw-muted">
              Private Log
            </h3>
            <ul className="mt-2 space-y-2 text-sm text-blue-100/90">
              {privateLog.length === 0 ? (
                <li className="text-mw-faint">No private notes yet</li>
              ) : (
                [...privateLog].reverse().map((e) => (
                  <li key={e.id}>
                    <span className="font-mono text-[10px] text-mw-faint">
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
  players: PlayerDoc[]
  selected?: string
  onSelect: (id: string) => void
  extra?: React.ReactNode
}) {
  return (
    <GlassPanel>
      <h3 className="mw-label text-mw-muted">
        {title}
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {players.map((p) => (
          <PrimaryButton
            key={p.playerId}
            className={
              selected === p.playerId
                ? 'ring-2 ring-white'
                : '!from-slate-200 !to-slate-400'
            }
            onClick={() => onSelect(p.playerId)}
          >
            {p.avatar} {p.displayName}
          </PrimaryButton>
        ))}
        {extra}
      </div>
    </GlassPanel>
  )
}
