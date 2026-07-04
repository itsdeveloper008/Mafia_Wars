export type AppErrorCode =
  | 'NETWORK'
  | 'PERMISSION'
  | 'NOT_FOUND'
  | 'INVALID'
  | 'AUTH'
  | 'VOICE'
  | 'UNKNOWN'

export class AppError extends Error {
  code: AppErrorCode
  userMessage: string

  constructor(code: AppErrorCode, userMessage: string, cause?: unknown) {
    super(userMessage)
    this.name = 'AppError'
    this.code = code
    this.userMessage = userMessage
    if (cause instanceof Error) this.cause = cause
  }
}

function firebaseCode(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error) {
    return String((error as { code: string }).code)
  }
  return ''
}

export function toUserError(error: unknown): AppError {
  if (error instanceof AppError) return error

  const code = firebaseCode(error)
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  // Firebase Auth — common production issues
  if (code === 'auth/operation-not-allowed') {
    return new AppError(
      'AUTH',
      'Anonymous sign-in is off in Firebase. Enable Authentication → Sign-in method → Anonymous.',
      error,
    )
  }
  if (code === 'auth/unauthorized-domain') {
    return new AppError(
      'AUTH',
      'This site domain is not allowed. In Firebase → Authentication → Settings → Authorized domains, add your Vercel domain (e.g. mafia-wars-mfd1.vercel.app).',
      error,
    )
  }
  if (code === 'auth/network-request-failed') {
    return new AppError('NETWORK', 'Network error during sign-in. Check your connection.', error)
  }
  if (code === 'auth/too-many-requests') {
    return new AppError('AUTH', 'Too many sign-in attempts. Wait a moment and try again.', error)
  }
  if (code === 'auth/invalid-api-key') {
    return new AppError(
      'AUTH',
      'Invalid Firebase API key. Check NEXT_PUBLIC_FIREBASE_* on Vercel.',
      error,
    )
  }
  if (code === 'permission-denied') {
    return new AppError(
      'PERMISSION',
      'Database permission denied. Publish firestore.rules and ensure you are signed in.',
      error,
    )
  }

  if (message.includes('permission') || message.includes('insufficient')) {
    return new AppError(
      'PERMISSION',
      'You do not have permission to do that. Check Firestore rules.',
      error,
    )
  }
  if (message.includes('not found') || message.includes('no document')) {
    return new AppError('NOT_FOUND', 'Room not found. Check the code.', error)
  }
  if (message.includes('network') || message.includes('offline')) {
    return new AppError('NETWORK', 'Connection lost. Trying to reconnect…', error)
  }
  if (code.startsWith('auth/') || message.includes('auth') || message.includes('credential')) {
    return new AppError(
      'AUTH',
      'Sign-in failed. Enable Anonymous Auth and add this domain under Firebase Authorized domains.',
      error,
    )
  }
  if (message.includes('already taken') || message.includes('full')) {
    return new AppError(
      'INVALID',
      error instanceof Error ? error.message : 'Invalid request.',
      error,
    )
  }
  if (
    message.includes('voice') ||
    message.includes('microphone') ||
    message.includes('camera')
  ) {
    return new AppError('VOICE', 'Microphone or camera access was denied.', error)
  }

  return new AppError(
    'UNKNOWN',
    error instanceof Error ? error.message : 'Something went wrong.',
    error,
  )
}
