'use client'

import { WifiOff } from 'lucide-react'
import { useEffect } from 'react'
import { useUiStore } from '@/store/uiStore'

export function OfflineBanner() {
  const online = useUiStore((s) => s.online)
  const setOnline = useUiStore((s) => s.setOnline)
  const pushToast = useUiStore((s) => s.pushToast)

  useEffect(() => {
    const on = () => {
      setOnline(true)
      pushToast({
        title: 'Back online',
        description: 'Reconnected successfully.',
        tone: 'success',
      })
    }
    const off = () => {
      setOnline(false)
      pushToast({
        title: 'Connection lost',
        description: 'Trying to reconnect…',
        tone: 'warning',
      })
    }
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    setOnline(navigator.onLine)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [setOnline, pushToast])

  if (online) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-[95] flex items-center justify-center gap-2 bg-mw-warning px-4 py-2 text-sm font-medium text-mw-bg"
    >
      <WifiOff className="h-4 w-4" />
      You are offline. Game state will sync when you reconnect.
    </div>
  )
}
