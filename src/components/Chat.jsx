import { useEffect, useRef } from 'react'

// Chat message renderers. `messages` is the source of truth; each item has a
// `kind` (bubble | divider | stage | done). Mirrors the DOM the static UI built
// imperatively.

function Row({ role, cls, children }) {
  const avatar = <div className={`avatar ${role}`}>{role === 'user' ? 'Y' : 'U'}</div>
  const bubble = <div className={`bubble ${cls || ''}`}>{children}</div>
  return (
    <div className={`row ${role === 'user' ? 'user' : 'bot'}`}>
      {role === 'user' ? (
        <>
          {bubble}
          {avatar}
        </>
      ) : (
        <>
          {avatar}
          {bubble}
        </>
      )}
    </div>
  )
}

// Collapsible per-stage log panel. `open` is driven by status transitions in
// App (running → open, ok → closed, failed → open); the <details> is otherwise
// uncontrolled so manual toggles and the print handler can open/close it.
function StageLog({ m }) {
  const detailsRef = useRef(null)
  const logRef = useRef(null)
  useEffect(() => {
    if (detailsRef.current) detailsRef.current.open = !!m.open
  }, [m.open])
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [m.log])
  return (
    <Row role="bot" cls="stage-log">
      <details ref={detailsRef}>
        <summary>{m.summary}</summary>
        <pre className="log" ref={logRef}>
          {m.log}
        </pre>
      </details>
    </Row>
  )
}

function DoneCard({ m }) {
  if (m.status !== 'completed') {
    return <Row role="bot" cls="stage failed">{m.outcome || m.detail || m.status}</Row>
  }
  const rows = [
    ['Task ID', m.task_id],
    ['Name', m.task_name],
    ['Type', m.task_type],
    ['Competencies', m.competencies],
    ['Environment', m.env],
  ].filter(([, v]) => v)
  return (
    <Row role="bot" cls="result-card">
      <h4>Task created</h4>
      <div className="kv">
        {rows.map(([k, v]) => (
          <Fragment key={k} label={k} value={v} />
        ))}
        {m.task_url ? (
          <>
            <div className="k">Repository</div>
            <div className="v">
              <a href={m.task_url} target="_blank" rel="noopener">
                {m.task_url}
              </a>
            </div>
          </>
        ) : null}
      </div>
    </Row>
  )
}

function Fragment({ label, value }) {
  return (
    <>
      <div className="k">{label}</div>
      <div className="v">{value}</div>
    </>
  )
}

export default function Chat({ messages }) {
  return (
    <>
      {messages.map((m) => {
        if (m.kind === 'divider') {
          return (
            <div className="divider" key={m.id}>
              {m.text}
            </div>
          )
        }
        if (m.kind === 'stage') return <StageLog m={m} key={m.id} />
        if (m.kind === 'done') return <DoneCard m={m} key={m.id} />
        // bubble
        return (
          <Row role={m.role} cls={m.cls} key={m.id}>
            {m.text}
          </Row>
        )
      })}
    </>
  )
}
