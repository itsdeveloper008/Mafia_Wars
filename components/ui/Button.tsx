'use client'

import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'gold'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<Variant, string> = {
  primary:
    'bg-mw-primary text-white shadow-mw-blue hover:bg-blue-500 active:bg-blue-700',
  secondary:
    'bg-mw-card text-mw-text border border-white/10 hover:bg-mw-card-hover hover:border-white/20',
  danger:
    'bg-mw-danger/15 text-red-200 border border-mw-danger/40 hover:bg-mw-danger/25',
  ghost: 'bg-transparent text-mw-muted hover:bg-white/5 hover:text-mw-text',
  outline:
    'bg-transparent text-mw-text border border-white/15 hover:border-mw-primary/50 hover:bg-mw-primary/10',
  gold: 'bg-gradient-to-b from-amber-300 to-mw-gold text-mw-bg shadow-mw-gold hover:brightness-110',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-xs rounded-mw gap-1.5',
  md: 'h-11 px-4 text-sm rounded-mw gap-2',
  lg: 'h-12 px-6 text-sm rounded-mw-lg gap-2 font-semibold',
  icon: 'h-10 w-10 rounded-mw',
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  loading,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 ease-mw focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mw-primary disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
}
