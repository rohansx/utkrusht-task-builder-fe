// Dev-JWT holder for local staging. Mirrors the old token flow: a build-time
// value wins, else a localStorage-persisted token, else a one-time prompt.
//
// The staging FE talks to the recruiter Flask API, which authenticates a
// testmaker JWT (Authorization: Bearer <jwt> + X-Token-Source: recruiter).
//
// ⚠️  SECURITY: VITE_DEV_JWT is baked into the client bundle at build time, so
// it is readable by anyone who loads the app. This is a LOCAL/STAGING dev aid —
// leave it empty to keep the prompt-once flow (token stays out of the bundle).
const JWT_KEY = 'taskbuilder.jwt'
const ENV_JWT = (import.meta.env.VITE_DEV_JWT || '').trim()

let jwt = ''
try {
  jwt = localStorage.getItem(JWT_KEY) || ''
} catch {
  /* storage unavailable — token re-prompted per page load */
}
// A configured build-time JWT wins, so a deployment can skip the prompt.
if (ENV_JWT) jwt = ENV_JWT

export function getJwt() {
  return jwt
}

export function setJwt(t) {
  jwt = (t || '').trim()
  try {
    localStorage.setItem(JWT_KEY, jwt)
  } catch {
    /* ignore */
  }
  return jwt
}

export function promptForJwt() {
  const t = window.prompt('Paste a dev testmaker JWT')
  if (!t || !t.trim()) return false
  setJwt(t)
  return true
}
