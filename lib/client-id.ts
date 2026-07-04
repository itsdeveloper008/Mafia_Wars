const CLIENT_KEY = 'mafiaWars.clientId'

export function getClientId(): string {
  if (typeof window === 'undefined') return 'server'
  let id = localStorage.getItem(CLIENT_KEY)
  if (!id) {
    id = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
    localStorage.setItem(CLIENT_KEY, id)
  }
  return id
}
