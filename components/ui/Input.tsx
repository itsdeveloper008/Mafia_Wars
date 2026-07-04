'use client'

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      <span className="mw-label">{label}</span>
      {children}
      {hint && !error && <span className="text-xs text-mw-faint">{hint}</span>}
      {error && <span className="text-xs text-mw-danger">{error}</span>}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-mw border border-white/10 bg-mw-bg px-3 text-sm text-mw-text outline-none transition placeholder:text-mw-faint focus:border-mw-primary/50 focus:ring-2 focus:ring-mw-primary/25 disabled:opacity-40 ${props.className ?? ''}`}
    />
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-mw border border-white/10 bg-mw-bg px-3 text-sm text-mw-text outline-none transition focus:border-mw-primary/50 focus:ring-2 focus:ring-mw-primary/25 disabled:opacity-40 ${props.className ?? ''}`}
    />
  )
}
