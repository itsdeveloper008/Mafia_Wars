'use client'

import { motion } from 'framer-motion'
import {
  Camera,
  CameraOff,
  Hand,
  Mic,
  MicOff,
  Signal,
  SignalLow,
  SignalZero,
  Skull,
  Crown,
} from 'lucide-react'
import type { Player } from '@/lib/game/types'

export function PlayerCard({
  player,
  showRole,
  isYou,
  isHostView,
  compact,
}: {
  player: Player
  showRole?: boolean
  isYou?: boolean
  isHostView?: boolean
  compact?: boolean
}) {
  const SignalIcon =
    player.connectionQuality === 'good'
      ? Signal
      : player.connectionQuality === 'ok'
        ? SignalLow
        : SignalZero

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] p-4 shadow-lg backdrop-blur-md ${
        !player.alive ? 'opacity-60' : ''
      } ${compact ? 'p-3' : ''}`}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-cyan-glow/10 blur-2xl" />
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-950/70 text-2xl ring-1 ring-white/10">
          {player.avatar}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-white">
              {player.name}
              {isYou ? ' (you)' : ''}
            </h3>
            {isHostView && showRole && player.role && (
              <span className="rounded-full bg-amber-glow/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-glow">
                {player.role}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <StatusChip
              active={player.ready}
              activeClass="bg-emerald-500/15 text-emerald-300"
              idleClass="bg-white/5 text-slate-400"
            >
              {player.ready ? 'Ready' : 'Not ready'}
            </StatusChip>
            <StatusChip
              active={player.alive}
              activeClass="bg-emerald-500/15 text-emerald-300"
              idleClass="bg-rose-500/15 text-rose-300"
            >
              {player.alive ? (
                'Alive'
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Skull className="h-3 w-3" /> Dead
                </span>
              )}
            </StatusChip>
            {player.handRaised && (
              <StatusChip active activeClass="bg-amber-glow/20 text-amber-200">
                <Hand className="h-3 w-3" /> Hand
              </StatusChip>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-slate-300">
        {player.micOn ? (
          <Mic className="h-4 w-4 text-cyan-glow" />
        ) : (
          <MicOff className="h-4 w-4 text-slate-500" />
        )}
        {player.cameraOn ? (
          <Camera className="h-4 w-4 text-cyan-glow" />
        ) : (
          <CameraOff className="h-4 w-4 text-slate-500" />
        )}
        <SignalIcon
          className={`h-4 w-4 ${
            player.connected ? 'text-emerald-400' : 'text-rose-400'
          }`}
        />
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
          {player.connected ? player.connectionQuality : 'offline'}
        </span>
      </div>
    </motion.article>
  )
}

function StatusChip({
  children,
  active,
  activeClass,
  idleClass = 'bg-white/5 text-slate-400',
}: {
  children: React.ReactNode
  active?: boolean
  activeClass: string
  idleClass?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
        active ? activeClass : idleClass
      }`}
    >
      {children}
    </span>
  )
}

export function HostBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-glow/15 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-amber-glow">
      <Crown className="h-3 w-3" /> Game Master
    </span>
  )
}
