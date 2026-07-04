'use client'

import { Download, RotateCcw, Trophy } from 'lucide-react'
import type { RoomState } from '@/lib/game/types'
import {
  FadeIn,
  GhostButton,
  GlassPanel,
  PrimaryButton,
  ScreenShell,
} from './ui'

export function SummaryScreen({
  room,
  isHost,
  onPlayAgain,
}: {
  room: RoomState
  isHost: boolean
  onPlayAgain: () => void
}) {
  const title =
    room.winner === 'mafia'
      ? 'Mafia Wins'
      : room.winner === 'jester'
        ? 'Jester Wins'
        : room.winner === 'civilians'
          ? 'Town Wins'
          : 'Game Over'

  function downloadSummary() {
    const lines = [
      `Mafia Wars Summary — Room ${room.code}`,
      `Winner: ${room.winner ?? 'none'}`,
      `Rounds: ${room.round}`,
      '',
      'Roles:',
      ...room.players.map(
        (p) =>
          `- ${p.name}: ${p.role ?? '?'} (${p.alive ? 'survived' : 'eliminated'})`,
      ),
      '',
      'Timeline:',
      ...room.hostEvents.map((e) => `[R${e.round}/${e.phase}] ${e.message}`),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mafia-wars-${room.code}.txt`
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
          Room {room.code} · {room.round} rounds
        </p>

        <div className="grid gap-4 text-left sm:grid-cols-2">
          <GlassPanel>
            <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-slate-400">
              Roles
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {room.players.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between border-b border-white/5 pb-2"
                >
                  <span>
                    {p.avatar} {p.name}
                  </span>
                  <span className="font-mono text-amber-glow">
                    {p.role} · {p.alive ? 'Survived' : 'Out'}
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
              {room.publicEvents.map((e) => (
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
