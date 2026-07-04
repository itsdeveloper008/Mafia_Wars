'use client'

import { motion } from 'framer-motion'
import { Moon, Play, Shield, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FadeIn, Shell } from '@/components/ui/Shell'

export function LandingScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <Shell>
      <FadeIn className="flex min-h-[85vh] flex-col items-center justify-center text-center">
        <motion.div
          animate={{ opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 3.5, repeat: Infinity }}
          className="mw-label text-mw-primary"
        >
          Online Social Deduction
        </motion.div>

        <h1 className="mt-4 font-display text-5xl font-bold tracking-tight text-mw-text sm:text-7xl">
          MAFIA
          <span className="bg-gradient-to-r from-mw-accent to-mw-gold bg-clip-text text-transparent">
            {' '}
            WARS
          </span>
        </h1>

        <p className="mt-4 max-w-xl text-base text-mw-muted sm:text-lg">
          A premium table-feel multiplayer experience. One Game Master. Secret
          roles. Live voice. Pure suspense.
        </p>

        <div className="mt-10 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          {[
            { icon: Users, label: 'Invite-only rooms', desc: 'Share a code' },
            { icon: Shield, label: 'Game Master host', desc: 'Never a player' },
            { icon: Moon, label: 'Cinematic nights', desc: 'Auto phases' },
          ].map(({ icon: Icon, label, desc }) => (
            <Card key={label} hover className="text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-mw-bg text-mw-primary ring-1 ring-white/10">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <p className="mt-3 font-display text-sm font-semibold text-mw-text">
                {label}
              </p>
              <p className="mt-1 text-xs text-mw-muted">{desc}</p>
            </Card>
          ))}
        </div>

        <Button
          variant="gold"
          size="lg"
          className="mt-10 min-w-[220px]"
          leftIcon={<Play className="h-4 w-4" />}
          onClick={onContinue}
        >
          Enter Lobby
        </Button>
      </FadeIn>
    </Shell>
  )
}
