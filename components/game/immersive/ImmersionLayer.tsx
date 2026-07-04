'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ROLE_INFO } from '@/constants/roles'
import type { Role } from '@/types/game'
import { PrimaryButton } from '../ui'

export function ImmersionLayer({
  showNight,
  showRoleReveal,
  showVoteBanner,
  countdownUrgent,
  secondsLeft,
  role,
  reducedMotion,
  onDismissRole,
}: {
  showNight: boolean
  showRoleReveal: boolean
  showVoteBanner: boolean
  countdownUrgent: boolean
  secondsLeft: number
  role?: Role
  reducedMotion?: boolean
  onDismissRole: () => void
}) {
  const transition = reducedMotion ? { duration: 0.01 } : { duration: 0.6 }

  return (
    <>
      <AnimatePresence>
        {showNight && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
          >
            <div className="text-center">
              <motion.p
                className="font-mono text-xs uppercase tracking-[0.4em] text-mw-danger"
                animate={reducedMotion ? undefined : { opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                The town falls silent
              </motion.p>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-[0.2em] text-mw-text sm:text-6xl">
                NIGHT HAS FALLEN
              </h2>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRoleReveal && role && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-mw-bg/95 p-6 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`w-full max-w-md rounded-[2rem] border p-8 text-center shadow-mw-blue ${
                roleTheme(role)
              }`}
              initial={reducedMotion ? false : { rotateY: 90, scale: 0.8 }}
              animate={{ rotateY: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 14 }}
            >
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-mw-text/70">
                Your fate
              </p>
              <h2 className="mt-4 font-display text-5xl font-bold text-mw-text">
                {role}
              </h2>
              <p className="mt-2 font-mono text-xs uppercase tracking-wider text-mw-gold">
                {ROLE_INFO[role].team} ·{' '}
                {ROLE_INFO[role].active ? 'Active' : 'Passive'}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-mw-text/85">
                {ROLE_INFO[role].ability}
              </p>
              <PrimaryButton className="mt-8 w-full" onClick={onDismissRole}>
                Continue
              </PrimaryButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVoteBanner && (
          <motion.div
            className="pointer-events-none fixed left-1/2 top-4 z-[70] -translate-x-1/2 rounded-full border border-mw-gold/40 bg-mw-secondary/90 px-5 py-2 font-mono text-xs uppercase tracking-[0.25em] text-mw-gold shadow-mw-gold"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
          >
            Voting in progress
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {countdownUrgent && secondsLeft > 0 && secondsLeft <= 10 && (
          <motion.div
            className="pointer-events-none fixed inset-x-0 bottom-8 z-[70] flex justify-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.08, 1], opacity: 1 }}
            transition={{ repeat: Infinity, duration: 0.8 }}
          >
            <div
              className={`rounded-3xl border px-8 py-4 font-mono font-black tracking-widest ${
                secondsLeft <= 3
                  ? 'border-rose-400 bg-rose-500/20 text-5xl text-red-200'
                  : 'border-mw-gold/50 bg-mw-secondary/90 text-4xl text-mw-gold'
              }`}
            >
              {secondsLeft}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function roleTheme(role: Role) {
  if (role === 'Doctor') return 'border-emerald-400/40 bg-emerald-950/80'
  if (role === 'Detective') return 'border-sky-400/40 bg-sky-950/80'
  if (role === 'Mafia' || role === 'Godfather')
    return 'border-rose-500/50 bg-rose-950/80'
  if (role === 'Jester') return 'border-violet-400/40 bg-violet-950/80'
  if (role === 'Grandma') return 'border-orange-300/40 bg-orange-950/80'
  return 'border-white/20 bg-mw-secondary/90'
}
