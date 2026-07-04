'use client'

import { motion } from 'framer-motion'
import { Play, Shield, Users, Moon } from 'lucide-react'
import { FadeIn, PrimaryButton, ScreenShell } from './ui'

export function LandingScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <ScreenShell>
      <FadeIn className="flex min-h-[85vh] flex-col items-center justify-center text-center">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="mb-6 font-mono text-xs uppercase tracking-[0.35em] text-cyan-glow"
        >
          Online Social Deduction
        </motion.div>
        <h1 className="bg-gradient-to-r from-amber-glow via-white to-cyan-glow bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-7xl">
          MAFIA WARS
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-300">
          Premium multiplayer nights. A Game Master hosts. Players get secret
          roles. Live sync across every device.
        </p>

        <div className="mt-10 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          {[
            { icon: Users, label: 'Invite-only rooms' },
            { icon: Shield, label: 'Host is Game Master' },
            { icon: Moon, label: 'Auto night & day' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 backdrop-blur"
            >
              <Icon className="mx-auto h-6 w-6 text-cyan-glow" />
              <p className="mt-2 text-sm text-slate-200">{label}</p>
            </div>
          ))}
        </div>

        <PrimaryButton className="mt-10 min-w-[220px] text-base" onClick={onContinue}>
          <Play className="h-4 w-4" /> Enter Lobby
        </PrimaryButton>
      </FadeIn>
    </ScreenShell>
  )
}
