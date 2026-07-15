import { SLOT_DEFS } from '../constants.js'

function slotValue(def, brief) {
  const v = brief ? brief[def.key] : null
  if (def.list) return (v || []).join(', ')
  if (v === null || v === undefined || v === '') return ''
  return String(v)
}

function dotChar(status) {
  return status === 'ok' ? '✓' : status === 'failed' ? '✗' : ''
}

function RunResult({ result }) {
  if (!result) return null
  if (result.status === 'completed') {
    return (
      <div className="run-result">
        <strong>{result.task_name || 'Task created'}</strong>
        {result.task_id ? (
          <>
            <br />
            {`ID ${result.task_id}`}
          </>
        ) : null}
        {result.task_url ? (
          <>
            <br />
            <a href={result.task_url} target="_blank" rel="noopener">
              Open repository →
            </a>
          </>
        ) : null}
      </div>
    )
  }
  return <div className="run-result">{result.outcome || result.detail || 'Generation failed.'}</div>
}

export default function BriefPanel({
  panelState,
  generating,
  genDisabled,
  onSlotClick,
  env,
  onEnvChange,
  envDisabled,
  onGenerate,
  genHint,
  run,
}) {
  const { brief, missing, ready } = panelState
  const asking = generating ? null : missing.length ? missing[0] : null
  const totalRequired = SLOT_DEFS.filter((d) => d.required).length
  let filledRequired = 0
  const slots = SLOT_DEFS.map((def) => {
    const value = slotValue(def, brief)
    const filled = !!value
    if (filled && def.required) filledRequired += 1
    const display = filled
      ? value
      : def.fallback || (def.key === asking ? 'being asked now…' : 'not set yet')
    const clickable = filled && !generating
    return { def, filled, display, asking: def.key === asking, clickable }
  })
  const pct = (filledRequired / totalRequired) * 100

  return (
    <aside className="brief-panel" aria-label="Task brief">
      <div className="panel-section">
        <div className="panel-title">Task brief</div>
        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="progress-label">{`${filledRequired} of ${totalRequired} fields`}</div>
        <ul className="slots">
          {slots.map((s) => (
            <li
              key={s.def.key}
              className={`${s.filled ? 'filled' : 'empty'}${s.asking ? ' asking' : ''}`}
              title={s.clickable ? `Click to change ${s.def.label.toLowerCase()}` : undefined}
              onClick={s.clickable ? () => onSlotClick(s.def) : undefined}
            >
              <div className="slot-label">{s.def.label}</div>
              <div className="slot-value">{s.display}</div>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel-section panel-review">
        <div className="panel-title">Review &amp; generate</div>
        <label className="env-pick">
          Environment
          <select value={env} onChange={(e) => onEnvChange(e.target.value)} disabled={envDisabled}>
            <option value="dev">dev</option>
            <option value="prod">prod</option>
          </select>
        </label>
        <button className="cta" disabled={genDisabled} onClick={onGenerate}>
          Generate task →
        </button>
        <div className="gen-hint">{genHint}</div>
      </div>

      {run.visible && (
        <div className="panel-section panel-run">
          <div className="panel-title">Pipeline</div>
          <ul className="run-stages">
            {run.stages.map((s) => (
              <li key={s.label} className={s.status}>
                <span className="dot">{dotChar(s.status)}</span>
                <span>{s.uiLabel}</span>
                <span className="secs">{s.secs || ''}</span>
              </li>
            ))}
          </ul>
          <RunResult result={run.result} />
        </div>
      )}
    </aside>
  )
}
