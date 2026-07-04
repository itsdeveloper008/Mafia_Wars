'use client'

import { create } from 'zustand'

export type ToastTone = 'info' | 'success' | 'warning' | 'danger'

export type Toast = {
  id: string
  title: string
  description?: string
  tone: ToastTone
  createdAt: number
}

type UiState = {
  online: boolean
  toasts: Toast[]
  setOnline: (online: boolean) => void
  pushToast: (toast: Omit<Toast, 'id' | 'createdAt'> & { id?: string }) => void
  dismissToast: (id: string) => void
  clearToasts: () => void
}

export const useUiStore = create<UiState>((set) => ({
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  toasts: [],
  setOnline: (online) => set({ online }),
  pushToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts.slice(-4),
        {
          id: toast.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: Date.now(),
          title: toast.title,
          description: toast.description,
          tone: toast.tone,
        },
      ],
    })),
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clearToasts: () => set({ toasts: [] }),
}))
