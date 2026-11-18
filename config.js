// Deployment configuration. Edit per environment (no secrets here).
globalThis.SWK_CONFIG = {
  API_BASE: 'https://os.swk.properties', // SWK OS server. It must allow this app's origin (CORS) — see README.
  ALLOW_SERVER_OVERRIDE: false,          // true only for staging/testing builds: shows a Server field on the sign-in screen.
  IDLE_MINUTES: 30                       // auto sign-out after this much inactivity
}
