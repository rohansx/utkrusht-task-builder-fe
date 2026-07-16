// ---- session history (left panel) -----------------------------------------
// Each conversation is archived under its own entry so the sidebar can list
// past sessions and re-open any one read-only. Keyed by the backend session id
// so re-opening the same conversation upserts in place instead of duplicating.
const SESSIONS_KEY = 'taskbuilder.sessions'
const MAX_SESSIONS = 40

export function loadSessions() {
  try {
    const a = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]')
    return Array.isArray(a) ? a : []
  } catch {
    return []
  }
}

let sessTimer = null
let sessDisabled = false

// Persist the whole list (debounced, newest-first, capped). Kept dumb: the
// caller owns the upsert/order so history and live chat share one save path.
export function saveSessions(list) {
  if (sessDisabled) return
  clearTimeout(sessTimer)
  sessTimer = setTimeout(() => {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(list.slice(0, MAX_SESSIONS)))
    } catch (e) {
      sessDisabled = true
      // eslint-disable-next-line no-console
      console.warn('Task Builder: session history persistence disabled —', e)
    }
  }, 500)
}
