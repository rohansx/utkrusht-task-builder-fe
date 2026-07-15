// API client — mirrors the token handling of the original static UI.
//
// Deployed backends set INTERNAL_PROXY_TOKEN; every /api/* call must then carry
// it as `X-Internal-Token`. The UI prompts once, stores the token in
// localStorage, and retries on 403. Local dev (token unset server-side) never
// 403s, so the prompt never fires.
import { API_BASE } from './config.js'

const TOKEN_KEY = 'taskbuilder.token'

// Optional build-time token. When set, the UI auto-attaches it and never
// prompts. SECURITY: Vite bakes this into the client bundle, so it is visible
// to anyone who loads the app — only use it when the frontend itself is
// access-controlled or the API is not sensitive. Leave empty to keep the
// prompt-once flow (token stays out of the shipped code).
const ENV_TOKEN = (import.meta.env.VITE_INTERNAL_TOKEN || '').trim()

let apiToken = ''
try {
  apiToken = localStorage.getItem(TOKEN_KEY) || ''
} catch {
  /* storage unavailable — token re-prompted per page load */
}
// A configured build-time token wins, so a deployment can skip the prompt.
if (ENV_TOKEN) apiToken = ENV_TOKEN

export function getToken() {
  return apiToken
}

export function promptForToken() {
  const t = window.prompt(
    'This Task Builder deployment is protected.\nEnter the access token:'
  )
  if (!t || !t.trim()) return false
  apiToken = t.trim()
  try {
    localStorage.setItem(TOKEN_KEY, apiToken)
  } catch {
    /* ignore */
  }
  return true
}

function resolve(path) {
  return API_BASE ? API_BASE + path : path
}

// fetch() wrapper: attaches the token header and, on 403, prompts for the token
// and retries once.
export async function api(path, opts = {}) {
  const doFetch = () => {
    const headers = { ...(opts.headers || {}) }
    if (apiToken) headers['X-Internal-Token'] = apiToken
    return fetch(resolve(path), { ...opts, headers })
  }
  let res = await doFetch()
  if (res.status === 403 && promptForToken()) {
    res = await doFetch()
  }
  return res
}

// EventSource cannot set headers — the backend accepts ?access_token= as a
// fallback for the SSE stream. Also resolves against API_BASE so SSE works
// cross-origin.
export function eventsUrl(path) {
  let url = resolve(path)
  if (apiToken) {
    url += (url.includes('?') ? '&' : '?') + 'access_token=' + encodeURIComponent(apiToken)
  }
  return url
}
