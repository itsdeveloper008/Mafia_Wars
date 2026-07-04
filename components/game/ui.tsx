'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { CountdownDisplay, FadeIn, Shell } from '@/components/ui/Shell'

export function PrimaryButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) {
  return (
    <Button variant="gold" className={className} {...props}>
      {children}
    </Button>
  )
}

export function GhostButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) {
  return (
    <Button variant="outline" className={className} {...props}>
      {children}
    </Button>
  )
}

export function DangerButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children?: ReactNode }) {
  return (
    <Button variant="danger" className={className} {...props}>
      {children}
    </Button>
  )
}

export function GlassPanel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <Card glass className={className}>
      {children}
    </Card>
  )
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return <Input {...props} />
}

export { Field, FadeIn }
export const ScreenShell = Shell
export const Countdown = CountdownDisplay
