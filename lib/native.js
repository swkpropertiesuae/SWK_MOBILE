// Bridge to the native SwkSecure Capacitor plugin (Android Keystore storage, biometrics, integrity, duty GPS). Falls back gracefully in a browser.
export const isNative = () => !!globalThis.Capacitor?.isNativePlatform?.()
const P = () => globalThis.Capacitor?.Plugins?.SwkSecure
const call = async (m, a) => { const p = P(); if (!p) throw new Error('native_unavailable'); return p[m](a || {}) }
export const secure = {
  async get(k) { return isNative() ? (await call('secureGet', { key: k })).value : localStorage.getItem(k) },
  async set(k, v) { return isNative() ? call('secureSet', { key: k, value: v }) : localStorage.setItem(k, v) },
  async remove(k) { return isNative() ? call('secureRemove', { key: k }) : localStorage.removeItem(k) }
}
export const integrity = async () => isNative() ? call('integrity') : { debuggable: false, rooted: false, emulator: false }
export const biometricAvailable = async () => isNative() ? (await call('biometricAvailable')).available : false
export const biometricAuth = async reason => (await call('biometricAuth', { reason })).verified === true
export const deviceInfo = () => call('deviceInfo')
export const startDuty = a => call('startDuty', a)
export const stopDuty = () => call('stopDuty')
export const telemetry = () => call('telemetry')
