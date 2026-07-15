// Transcript persistence (localStorage) — mirrors the static UI. The chat
// message list is saved so a page reload can re-render the conversation
// read-only. Debounced; self-disables on a quota error.
const STORE_KEY = 'taskbuilder.transcript'

export function loadTranscript() {
  let saved
  try {
    saved = JSON.parse(localStorage.getItem(STORE_KEY) || '[]')
  } catch {
    saved = []
  }
  return Array.isArray(saved) ? saved : []
}

let saveTimer = null
let disabled = false

export function saveTranscript(items) {
  if (disabled) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(items))
    } catch (e) {
      disabled = true
      // eslint-disable-next-line no-console
      console.warn('Task Builder: transcript persistence disabled —', e)
    }
  }, 500)
}

export function clearTranscript() {
  disabled = false
  clearTimeout(saveTimer)
  try {
    localStorage.removeItem(STORE_KEY)
  } catch {
    /* ignore */
  }
}
