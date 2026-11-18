// Deployment configuration (no secrets).
globalThis.SWK_CONFIG = {
  API_BASE: 'https://os.swk.properties', // SWK OS server. HTTPS only.
  ALLOW_SERVER_OVERRIDE: false,          // staging builds only
  IDLE_MINUTES: 10,                      // hard sign-out after inactivity
  LOCK_SECONDS: 45,                      // app locks (biometric / device credential) after this long in the background
  BLOCK_COMPROMISED_DEVICES: true        // refuse to run on rooted / debuggable builds (native app)
}
