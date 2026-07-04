type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogEvent = {
  level: LogLevel
  event: string
  data?: Record<string, unknown>
  at: number
}

const buffer: LogEvent[] = []
const MAX = 200

function push(level: LogLevel, event: string, data?: Record<string, unknown>) {
  const entry: LogEvent = { level, event, data, at: Date.now() }
  buffer.push(entry)
  if (buffer.length > MAX) buffer.shift()

  if (process.env.NODE_ENV !== 'production') {
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
    fn(`[mafia] ${event}`, data ?? '')
  }
}

export const logger = {
  debug: (event: string, data?: Record<string, unknown>) =>
    push('debug', event, data),
  info: (event: string, data?: Record<string, unknown>) =>
    push('info', event, data),
  warn: (event: string, data?: Record<string, unknown>) =>
    push('warn', event, data),
  error: (event: string, data?: Record<string, unknown>) =>
    push('error', event, data),
  recent: () => [...buffer],
}
