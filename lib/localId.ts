const KEY = 'mafiaWars.localUid'

/** Stable browser id used when Firebase Anonymous Auth is unavailable. */
export function getLocalUid(): string {
  if (typeof window === 'undefined') return 'server'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(KEY, id)
  }
  return id
}
