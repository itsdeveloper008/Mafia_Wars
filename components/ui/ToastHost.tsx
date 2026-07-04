'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { useUiStore, type ToastTone } from '@/store/uiStore'

const toneClass: Record<ToastTone, string> = {
  info: 'border-mw-primary/30 bg-mw-card',
  success: 'border-mw-success/30 bg-mw-card',
  warning: 'border-mw-warning/30 bg-mw-card',
  danger: 'border-mw-danger/30 bg-mw-card',
}

export function ToastHost() {
  const toasts = useUiStore((s) => s.toasts)
  const dismiss = useUiStore((s) => s.dismissToast)

  useEffect(() => {
    if (!toasts.length) return
    const latest = toasts[toasts.length - 1]
    const id = window.setTimeout(() => dismiss(latest.id), 4200)
    return () => window.clearTimeout(id)
  }, [toasts, dismiss])

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-mw-lg border px-4 py-3 shadow-mw-lg ${toneClass[toast.tone]}`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold text-mw-text">
                {toast.title}
              </p>
              {toast.description && (
                <p className="mt-0.5 text-xs text-mw-muted">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              className="text-mw-muted hover:text-mw-text"
              onClick={() => dismiss(toast.id)}
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
