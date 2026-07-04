'use client'

import { motion } from 'framer-motion'
import {
  Camera,
  CameraOff,
  Crown,
  Hand,
  Mic,
  MicOff,
  Signal,
  SignalLow,
  SignalZero,
  Skull,
} from 'lucide-react'
import type { PlayerDoc, Role } from '@/types/game'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

export function PlayerCard({
  player,
  role,
  showRole,
  isYou,
  compact,
}: {
  player: PlayerDoc
  role?: Role
  showRole?: boolean
  isYou?: boolean
  compact?: boolean
}) {
  const speaking = player.isSpeaking && player.isAlive
  const SignalIcon =
    player.connectionQuality === 'good'
      ? Signal
      : player.connectionQuality === 'ok'
        ? SignalLow
        : SignalZero

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        hover
        className={`relative ${compact ? 'p-3' : 'p-4'} ${
          speaking ? 'border-mw-primary/50 shadow-mw-blue' : ''
        } ${!player.isAlive ? 'opacity-70' : ''}`}
      >
        <div className="flex items-start gap-3">
          <Avatar
            name={player.displayName}
            speaking={speaking}
            dead={!player.isAlive}
            size={compact ? 'sm' : 'md'}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-display text-sm font-semibold text-mw-text">
                {player.displayName}
                {isYou ? (
                  <span className="ml-1 text-mw-muted">(you)</span>
                ) : null}
              </h3>
              {showRole && role && <Badge tone="gold">{role}</Badge>}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone={player.isReady ? 'success' : 'neutral'}>
                {player.isReady ? 'Ready' : 'Waiting'}
              </Badge>
              <Badge tone={player.isAlive ? 'success' : 'danger'}>
                {player.isAlive ? (
                  'Alive'
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Skull className="h-3 w-3" /> Dead
                  </span>
                )}
              </Badge>
              {player.raisedHand && (
                <Badge tone="warning">
                  <Hand className="h-3 w-3" /> Hand
                </Badge>
              )}
              {player.hasVoted && <Badge tone="primary">Voted</Badge>}
              {!player.isConnected && <Badge tone="danger">Offline</Badge>}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 text-mw-muted">
          {player.micEnabled && !player.hostMuted ? (
            <Mic className="h-4 w-4 text-mw-primary" strokeWidth={1.75} />
          ) : (
            <MicOff className="h-4 w-4" strokeWidth={1.75} />
          )}
          {player.cameraEnabled ? (
            <Camera className="h-4 w-4 text-mw-primary" strokeWidth={1.75} />
          ) : (
            <CameraOff className="h-4 w-4" strokeWidth={1.75} />
          )}
          <SignalIcon
            className={`h-4 w-4 ${
              player.isConnected ? 'text-mw-success' : 'text-mw-danger'
            }`}
            strokeWidth={1.75}
          />
          <span className="font-mono text-[10px] uppercase tracking-wider">
            {player.isConnected ? player.connectionQuality : 'offline'}
          </span>
        </div>
      </Card>
    </motion.div>
  )
}

export function HostBadge() {
  return (
    <Badge tone="gold">
      <Crown className="h-3 w-3" /> Game Master
    </Badge>
  )
}
