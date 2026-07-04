'use client'

import { Download, RotateCcw, Trophy } from 'lucide-react'
import type { GameSession } from '@/types/game'
import {
  FadeIn,
  GhostButton,
  GlassPanel,
  PrimaryButton,
  ScreenShell,
} from './ui'

export function SummaryScreen({
  session,
  onPlayAgain,
}: {
  session: GameSession
  onPlayAgain: () => void
}) {
  const { room, state, players, secrets, publicLogs, isHost } = session
  const roleById = Object.fromEntries(secrets.map((s) => [s.playerId, s.role]))
  const winner = state.winner

  const title =
    winner === 'mafia'
      ? 'Mafia Wins'
      : winner === 'jester'
        ? 'Jester Wins'
        : winner === 'civilians'
          ? 'Town Wins'
          : 'Game Over'

  function downloadSummary() {
    const lines = [
      `Mafia Wars Summary — Room ${room.roomCode}`,
      `Winner: ${winner ?? 'none'}`,
      `Rounds: ${state.currentRound}`,
      '',
      'Roles:',
      ...players.map(
        (p) =>
          `- ${p.displayName}: ${roleById[p.playerId] ?? '?'} (${p.isAlive ? 'survived' : 'eliminated'})`,
      ),
      '',
      'Timeline:',
      ...publicLogs.map((e) => `[R${e.round}/${e.phase}] ${e.message}`),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mafia-wars-${room.roomCode}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ScreenShell>
      <FadeIn className="mx-auto max-w-4xl space-y-6 pt-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-glow/15 px-4 py-1 font-mono text-xs uppercase tracking-[0.2em] text-amber-glow">
          <Trophy className="h-4 w-4" /> Final Results
        </div>
        <h1 className="text-5xl font-extrabold text-white">{title}</h1>
        <p className="text-slate-400">
          Room {room.roomCode} · {state.currentRound} rounds
        </p>

        <div className="grid gap-4 text-left sm:grid-cols-2">
          <GlassPanel>
            <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
              Roles
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {players.map((p) => (
                <li
                  key={p.playerId}
                  className="flex items-center justify-between border-b border-white/5 pb-2"
                >
                  <span>
                    {p.avatar} {p.displayName}
                  </span>
                  <span className="font-mono text-amber-glow">
                    {roleById[p.playerId] ?? '—'} ·{' '}
                    {p.isAlive ? 'Survived' : 'Out'}
                  </span>
                </li>
              ))}
            </ul>
          </GlassPanel>
          <GlassPanel className="max-h-80 overflow-auto">
            <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
              Timeline
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {publicLogs.map((e) => (
                <li key={e.id}>{e.message}</li>
              ))}
            </ul>
          </GlassPanel>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <GhostButton onClick={downloadSummary}>
            <Download className="h-4 w-4" /> Download Summary
          </GhostButton>
          {isHost && (
            <PrimaryButton onClick={onPlayAgain}>
              <RotateCcw className="h-4 w-4" /> Play Again
            </PrimaryButton>
          )}
        </div>
      </FadeIn>
    </ScreenShell>
  )
}
