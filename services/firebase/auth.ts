import {
  GoogleAuthProvider,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { AppError, toUserError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { getFirebaseAuth, isFirebaseConfigured } from './client'

const googleProvider = new GoogleAuthProvider()

export async function ensureAuthUser(): Promise<User> {
  if (!isFirebaseConfigured()) {
    throw new AppError(
      'AUTH',
      'Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* keys on Vercel and redeploy.',
    )
  }

  const auth = getFirebaseAuth()

  // Wait for persisted session before creating a new anonymous user
  await auth.authStateReady()
  if (auth.currentUser) return auth.currentUser

  try {
    const cred = await signInAnonymously(auth)
    logger.info('auth.anonymous', { uid: cred.user.uid })
    return cred.user
  } catch (error) {
    logger.warn('auth.anonymous_failed', {
      code: typeof error === 'object' && error && 'code' in error
        ? String((error as { code: string }).code)
        : 'unknown',
    })
    throw toUserError(error)
  }
}

export async function signInWithGoogle(): Promise<User> {
  const auth = getFirebaseAuth()
  await auth.authStateReady()
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
    try {
      const cred = await signInWithPopup(auth, googleProvider)
      logger.info('auth.google_fallback', { uid: cred.user.uid })
      return cred.user
    } catch (fallbackError) {
      throw toUserError(fallbackError)
    }
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
