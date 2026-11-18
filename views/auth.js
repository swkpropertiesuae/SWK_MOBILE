import { h } from '../lib/html.js'
import { $, toast } from '../lib/ui.js'
import { login, post, markPasswordChanged, base, setServer } from '../lib/api.js'

const hero = sub => h`<header class="hero login"><img class="logo" src="assets/brand/logo-horizontal.png" alt="SWK Properties OS"><div class="eyebrow">${sub}</div></header>`
export function loginView(root, { onDone }) {
  const override = globalThis.SWK_CONFIG?.ALLOW_SERVER_OVERRIDE
  root.innerHTML = h`${hero('SWK Properties LLC · Business Workspace')}
  <form class="wrap card-form" id="lf" novalidate autocomplete="on">
    <h1 class="hd">Sign in</h1>
    <label>Company email<input id="em" type="email" name="username" autocomplete="username" inputmode="email" autocapitalize="none" spellcheck="false" required></label>
    <label>Password<span class="pw"><input id="pw" type="password" name="password" autocomplete="current-password" required><button class="ghost" type="button" data-act="showpw" aria-label="Show password">Show</button></span></label>
    <label id="totpw" hidden>Authenticator code<input id="totp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\d{6}"></label>
    ${override ? h`<label>Server<input id="srv" type="url" value="${base()}" placeholder="https://os.swk.properties"></label>` : ''}
    <p class="bad-t" id="le" role="alert" aria-live="assertive"></p>
    <button class="btn" id="lb" type="submit">Sign in</button>
    <p class="note">Use your SWK OS credentials. Accounts lock for 15 minutes after 5 failed attempts.</p>
  </form>`.s
  const f = $('#lf', root)
  f.addEventListener('click', e => { if (e.target.closest('[data-act=showpw]')) { const p = $('#pw'); const s = p.type === 'password'; p.type = s ? 'text' : 'password'; e.target.textContent = s ? 'Hide' : 'Show' } })
  f.addEventListener('submit', async e => {
    e.preventDefault()
    const err = $('#le'), btn = $('#lb'); err.textContent = ''
    const em = $('#em').value, pw = $('#pw').value, totp = $('#totp').value.trim()
    if (!/^\S+@\S+\.\S+$/.test(em.trim()) || !pw) { err.textContent = 'Enter your email and password.'; return }
    if (override && $('#srv')) setServer($('#srv').value.trim() || null)
    if (!base()) { err.textContent = 'No server is configured.'; return }
    btn.disabled = true; btn.textContent = 'Signing in…'
    try {
      const r = await login(em, pw, totp)
      if (r.needsTotp) { $('#totpw').hidden = false; $('#totp').focus(); err.textContent = 'Enter the 6-digit code from your authenticator app.'; return }
      onDone(r)
    } catch (x) { err.textContent = x.message; if (x.status === 401) $('#pw').value = '' } finally { btn.disabled = false; btn.textContent = 'Sign in' }
  })
}
export function changePasswordView(root, { onDone, forced = true }) {
  root.innerHTML = h`${hero('Security')}
  <form class="wrap card-form" id="cf" novalidate>
    <h1 class="hd">${forced ? 'Choose a new password' : 'Change password'}</h1>
    ${forced ? h`<p class="m">Your administrator issued a temporary password. Set your own before continuing.</p>` : ''}
    <label>Current password<input id="cur" type="password" autocomplete="current-password" required></label>
    <label>New password<input id="nw" type="password" autocomplete="new-password" required minlength="10"></label>
    <label>Repeat new password<input id="nw2" type="password" autocomplete="new-password" required></label>
    <p class="m">At least 10 characters with upper-case, lower-case and a digit or symbol.</p>
    <p class="bad-t" id="ce" role="alert"></p>
    <button class="btn" type="submit">Update password</button>
  </form>`.s
  $('#cf', root).addEventListener('submit', async e => {
    e.preventDefault(); const err = $('#ce'); err.textContent = ''
    const cur = $('#cur').value, nw = $('#nw').value
    if (nw.length < 10 || !/[a-z]/.test(nw) || !/[A-Z]/.test(nw) || !(/\d/.test(nw) || /[^a-zA-Z0-9]/.test(nw))) { err.textContent = 'New password does not meet the rules.'; return }
    if (nw !== $('#nw2').value) { err.textContent = 'The two new passwords differ.'; return }
    try { await post('/api/auth/change-password', { current: cur, next: nw }); markPasswordChanged(); toast('Password updated'); onDone() } catch (x) { err.textContent = x.message }
  })
}
