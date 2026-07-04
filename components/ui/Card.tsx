'use client'

import type { HTMLAttributes, ReactNode } from 'react'

export function Card({
  children,
  className = '',
  hover = false,
  glass = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  hover?: boolean
  glass?: boolean
}) {
  return (
    <div
      {...props}
      className={`rounded-mw-lg border border-white/[0.08] p-4 shadow-mw transition-all duration-200 ease-mw ${
        glass
          ? 'bg-mw-card/70 backdrop-blur-xl'
          : 'bg-mw-card'
      } ${
        hover
          ? 'hover:-translate-y-0.5 hover:border-white/15 hover:bg-mw-card-hover hover:shadow-mw-lg'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-base font-semibold text-mw-text">
          {title}
        </h3>
        {subtitle && <p className="mt-0.5 text-sm text-mw-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
