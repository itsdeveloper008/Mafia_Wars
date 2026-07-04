'use client'

import type { ReactNode } from 'react'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary' | 'gold'

const tones: Record<Tone, string> = {
  neutral: 'bg-white/5 text-mw-muted ring-white/10',
  success: 'bg-mw-success/15 text-emerald-300 ring-mw-success/25',
  warning: 'bg-mw-warning/15 text-amber-200 ring-mw-warning/25',
  danger: 'bg-mw-danger/15 text-red-300 ring-mw-danger/25',
  primary: 'bg-mw-primary/15 text-blue-300 ring-mw-primary/25',
  gold: 'bg-mw-gold/15 text-amber-200 ring-mw-gold/25',
}

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] ring-1 ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
