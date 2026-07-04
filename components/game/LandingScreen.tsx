'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const AUTO_MS = 5000

export function LandingScreen({ onContinue }: { onContinue: () => void }) {
  const continueRef = useRef(onContinue)
  continueRef.current = onContinue

  useEffect(() => {
    const timer = window.setTimeout(() => continueRef.current(), AUTO_MS)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div
      className="relative h-[100dvh] w-full cursor-pointer overflow-hidden bg-black"
      onClick={onContinue}
      role="button"
      tabIndex={0}
      aria-label="Enter game setup"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onContinue()
        }
      }}
    >
      {/* Full-bleed cinematic art */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/landing.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      {/* Gradient overlays for readability */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/45 to-black/92"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(0,0,0,0.55)_100%)]"
        aria-hidden="true"
      />

      {/* Soft smoke / glow accents */}
      <div
        className="pointer-events-none absolute left-[8%] top-[18%] h-[45%] w-[45%] rounded-full bg-orange-500/10 blur-[90px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-[12%] right-[6%] h-[40%] w-[40%] rounded-full bg-orange-600/10 blur-[80px]"
        aria-hidden="true"
      />

      {/* Center content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center"
        >
          <h1 className="font-display text-[clamp(2.75rem,10vw,5.5rem)] font-bold uppercase leading-none tracking-[0.14em]">
            <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-orange-300 bg-clip-text text-transparent drop-shadow-[0_0_40px_rgba(249,115,22,0.45)]">
              MAFIA
            </span>{' '}
            <span className="text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.65)]">
              WARS
            </span>
          </h1>

          <div
            className="mt-4 h-px w-28 bg-gradient-to-r from-transparent via-orange-400 to-transparent sm:w-36"
            aria-hidden="true"
          />

          <p className="mt-5 max-w-md text-base text-zinc-100 sm:text-lg">
            Fast party nights. Secret roles. Perfect shuffle.
          </p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 1.2 }}
            className="mt-4 text-sm text-zinc-400"
          >
            We&apos;ll take you to the game setup in a moment...
          </motion.p>
        </motion.div>
      </div>

      {/* Bottom progress bar */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 h-[3px] bg-orange-500/20"
        aria-hidden="true"
      >
        <motion.div
          className="h-full bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.8)]"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: AUTO_MS / 1000, ease: 'linear' }}
        />
      </div>
    </div>
  )
}
