// Left panel: session-wise task history, sourced from localStorage
// (taskbuilder.sessions). Each entry is one conversation; clicking opens it
// read-only in the chat. The currently-live session is highlighted.
function relTime(ts) {
  if (!ts) return ''
  const s = Math.max(0, (Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function HistoryPanel({ sessions, currentId, viewingId, onOpen, onDelete, onNew }) {
  return (
    <aside className="side side-left" aria-label="Task history">
      <div className="side-head">
        <h2 className="side-title">History</h2>
        <button type="button" className="side-new" onClick={onNew} title="Start a new task">
          + New
        </button>
      </div>

      <div className="side-scroll">
        {sessions.length === 0 && (
          <p className="side-empty">No past sessions yet. Your conversations are saved here.</p>
        )}
        <ul className="hist-list">
          {sessions.map((s) => {
            const active = s.id === (viewingId || currentId)
            return (
              <li key={s.id} className={active ? 'hist-item active' : 'hist-item'}>
                <button type="button" className="hist-open" onClick={() => onOpen(s)}>
                  {s.taskId && <span className="hist-dot" title="Task built">●</span>}
                  <span className="hist-title">{s.title || 'Untitled task'}</span>
                  <span className="hist-time">{s.id === currentId ? 'live' : relTime(s.updatedAt)}</span>
                </button>
                <button
                  type="button"
                  className="hist-del"
                  title="Delete from history"
                  onClick={() => onDelete(s.id)}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}
