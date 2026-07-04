import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth'
import { getFirebaseAuth, isFirebaseConfigured } from './client'

export async function ensureAuthUser(): Promise<User> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured.')
  }
  const auth = getFirebaseAuth()
  if (auth.currentUser) return auth.currentUser
  const cred = await signInAnonymously(auth)
  return cred.user
}

export function watchAuth(callback: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured()) {
    callback(null)
    return () => undefined
  }
  return onAuthStateChanged(getFirebaseAuth(), callback)
}
