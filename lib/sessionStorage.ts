const ROOM_KEY = 'mafiaWars.activeRoomId'
const NAME_KEY = 'mafiaWars.displayName'

export const sessionStorage = {
  saveRoom(roomId: string) {
    if (typeof window === 'undefined') return
    localStorage.setItem(ROOM_KEY, roomId)
  },
  getRoom(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(ROOM_KEY)
  },
  clearRoom() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(ROOM_KEY)
  },
  saveDisplayName(name: string) {
    if (typeof window === 'undefined') return
    localStorage.setItem(NAME_KEY, name)
  },
  getDisplayName(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(NAME_KEY)
  },
}
