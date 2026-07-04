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
import { getLocalUid } from '@/lib/localId'
import { logger } from '@/lib/logger'
import { getFirebaseAuth, isFirebaseConfigured } from './client'

const googleProvider = new GoogleAuthProvider()

export type AuthIdentity = {
  uid: string
  isAnonymous: boolean
  /** True when using local fallback (Firebase Auth not available). */
  isLocalFallback: boolean
}

/**
 * Returns a stable user id for the session.
 * Prefers Firebase Anonymous Auth; falls back to a local id so the game
 * still works when Auth is not enabled or the domain is unauthorized.
 */
export async function ensureAuthUser(): Promise<AuthIdentity> {
  if (!isFirebaseConfigured()) {
    const uid = getLocalUid()
    logger.warn('auth.local_fallback', { reason: 'firebase_not_configured', uid })
    return { uid, isAnonymous: true, isLocalFallback: true }
  }

  try {
    const auth = getFirebaseAuth()
    await auth.authStateReady()
    if (auth.currentUser) {
      return {
        uid: auth.currentUser.uid,
        isAnonymous: auth.currentUser.isAnonymous,
        isLocalFallback: false,
      }
    }

    const cred = await signInAnonymously(auth)
    logger.info('auth.anonymous', { uid: cred.user.uid })
    return {
      uid: cred.user.uid,
      isAnonymous: true,
      isLocalFallback: false,
    }
  } catch (error) {
    const uid = getLocalUid()
    const err = toUserError(error)
    logger.warn('auth.local_fallback', {
      reason: err.code,
      message: err.userMessage,
      uid,
    })
    // Do not throw — allow gameplay with local identity + open rules
    return { uid, isAnonymous: true, isLocalFallback: true }
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
  try {
    await signOut(getFirebaseAuth())
  } catch {
    // ignore when auth unavailable
  }
  logger.info('auth.sign_out')
}

export function watchAuth(callback: (user: User | null) => void): () => void {
  if (!isFirebaseConfigured()) {
    callback(null)
    return () => undefined
  }
  try {
    return onAuthStateChanged(getFirebaseAuth(), callback)
  } catch {
    callback(null)
    return () => undefined
  }
}
