import {
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { logger } from '@/lib/logger'
import { AppError } from '@/lib/errors'
import { getFirebaseAuth, isFirebaseConfigured } from './client'

const googleProvider = new GoogleAuthProvider()

export async function ensureAuthUser(): Promise<User> {
  if (!isFirebaseConfigured()) {
    throw new AppError('AUTH', 'Firebase is not configured.')
  }
  const auth = getFirebaseAuth()
  if (auth.currentUser) return auth.currentUser
  const cred = await signInAnonymously(auth)
  logger.info('auth.anonymous', { uid: cred.user.uid })
  return cred.user
}

export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth()
  const current = auth.currentUser
  try {
    if (current?.isAnonymous) {
      const linked = await linkWithPopup(current, googleProvider)
      logger.info('auth.google_linked', { uid: linked.user.uid })
      return linked.user
    }
    const cred = await signInWithPopup(auth, googleProvider)
    logger.info('auth.google', { uid: cred.user.uid })
    return cred.user
  } catch (error) {
    // If link fails because account exists, fall back to popup sign-in
    const cred = await signInWithPopup(auth, googleProvider)
    logger.info('auth.google_fallback', { uid: cred.user.uid })
    return cred.user
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth())
  logger.info('auth.sign_out')
}

export function watchAuth(callback: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured()) {
    callback(null)
    return () => undefined
  }
  return onAuthStateChanged(getFirebaseAuth(), callback)
}
