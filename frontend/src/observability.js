let sentry = null

/** Sentry is loaded only when a DSN is configured, so it never weighs on the entry chunk. */
export function initObservability() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return
  sentry = import('@sentry/react').then((Sentry) => {
    Sentry.init({ dsn, environment: import.meta.env.MODE, sendDefaultPii: false })
    return Sentry
  })
}

export function reportError(error) {
  sentry?.then((Sentry) => Sentry.captureException(error))
}
