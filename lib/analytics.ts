import { logger } from './logger'

type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>

/**
 * Analytics facade — swap providers (GA, PostHog, Mixpanel) without UI changes.
 */
export const analytics = {
  track(event: string, payload?: AnalyticsPayload) {
    logger.info(`analytics.${event}`, payload)
    if (typeof window === 'undefined') return

    // Future: window.gtag?.('event', event, payload)
    // Future: posthog.capture(event, payload)
    const w = window as Window & {
      gtag?: (...args: unknown[]) => void
      posthog?: { capture: (e: string, p?: AnalyticsPayload) => void }
    }
    w.gtag?.('event', event, payload)
    w.posthog?.capture(event, payload)
  },

  page(name: string) {
    this.track('page_view', { page: name })
  },
}
