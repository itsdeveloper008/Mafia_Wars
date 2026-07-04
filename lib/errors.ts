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

export function toUserError(error: unknown): AppError {
  if (error instanceof AppError) return error

  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error)

  if (message.includes('permission') || message.includes('insufficient')) {
    return new AppError(
      'PERMISSION',
      'You do not have permission to do that.',
      error,
    )
  }
  if (message.includes('not found') || message.includes('no document')) {
    return new AppError('NOT_FOUND', 'Room not found. Check the code.', error)
  }
  if (message.includes('network') || message.includes('offline')) {
    return new AppError(
      'NETWORK',
      'Connection lost. Trying to reconnect…',
      error,
    )
  }
  if (message.includes('auth') || message.includes('credential')) {
    return new AppError('AUTH', 'Sign-in failed. Please try again.', error)
  }
  if (message.includes('already taken') || message.includes('full')) {
    return new AppError('INVALID', error instanceof Error ? error.message : 'Invalid request.', error)
  }
  if (message.includes('voice') || message.includes('microphone') || message.includes('camera')) {
    return new AppError(
      'VOICE',
      'Microphone or camera access was denied.',
      error,
    )
  }

  return new AppError(
    'UNKNOWN',
    error instanceof Error ? error.message : 'Something went wrong.',
    error,
  )
}
