// Split a scenario's free text into its three bold sections for display.
// Mirrors parseScenario() from the static UI.
export function parseScenario(text) {
  const re = /\*\*(Current Implementation|Your Task|Success Criteria):\*\*/g
  const marks = []
  let m
  while ((m = re.exec(text)) !== null) {
    marks.push({ label: m[1], start: m.index, end: re.lastIndex })
  }
  if (!marks.length) return [{ label: '', body: text.trim() }]
  const sections = []
  for (let i = 0; i < marks.length; i++) {
    const bodyStart = marks[i].end
    const bodyEnd = i + 1 < marks.length ? marks[i + 1].start : text.length
    sections.push({ label: marks[i].label, body: text.slice(bodyStart, bodyEnd).trim() })
  }
  return sections
}

let _id = 0
export function nextId() {
  _id += 1
  return _id
}
