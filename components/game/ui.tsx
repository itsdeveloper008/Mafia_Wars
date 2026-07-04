'use client'

import { motion } from 'framer-motion'
import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'

export function GlassPanel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-navy-900/70 p-5 shadow-glow backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  )
}

export function PrimaryButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-5 py-3 text-sm font-bold text-navy-950 shadow-glow-amber transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

export function GhostButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-glow/30 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-glow/60 hover:bg-cyan-glow/10 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

export function DangerButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      {children}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-white/10 bg-navy-950/80 px-3 py-2.5 text-sm text-white outline-none ring-cyan-glow/40 placeholder:text-slate-500 focus:ring-2 ${props.className ?? ''}`}
    />
  )
}

export function ScreenShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-navy-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.1),transparent_40%)]" />
      <div className="relative z-10 mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  )
}

export function FadeIn({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function Countdown({
  timerStartedAt,
  timerDurationMs,
  paused,
}: {
  timerStartedAt: number | null
  timerDurationMs: number
  paused?: boolean
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
      const endsAt = timerStartedAt + timerDurationMs
      setLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)))
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [timerStartedAt, timerDurationMs, paused])

  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  return (
    <div className="font-mono text-4xl font-bold tracking-widest text-white sm:text-5xl">
      {mm}:{ss}
    </div>
  )
}
