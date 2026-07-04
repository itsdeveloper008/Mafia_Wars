'use client'

import { motion } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mw-shell">
      <div className="mw-shell-bg" aria-hidden="true" />
      <div className="mw-container">{children}</div>
    </div>
  )
}

export function FadeIn({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function CountdownDisplay({
  timerStartedAt,
  timerDurationMs,
  paused,
  urgent,
}: {
  timerStartedAt: number | null
  timerDurationMs: number
  paused?: boolean
  urgent?: boolean
}) {
  const [left, setLeft] = useState(0)

  useEffect(() => {
    if (!timerStartedAt || timerDurationMs <= 0) {
      setLeft(0)
      return
    }
    const tick = () => {
      if (paused) {
        setLeft(Math.ceil(timerDurationMs / 1000))
        return
      }
      setLeft(
        Math.max(
          0,
          Math.ceil((timerStartedAt + timerDurationMs - Date.now()) / 1000),
        ),
      )
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [timerStartedAt, timerDurationMs, paused])

  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')

  return (
    <div
      className={`font-mono text-4xl font-bold tracking-[0.18em] sm:text-5xl ${
        urgent ? 'text-mw-danger' : 'text-mw-text'
      }`}
    >
      {mm}:{ss}
    </div>
  )
}
