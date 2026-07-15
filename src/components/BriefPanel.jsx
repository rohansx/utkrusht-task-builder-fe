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
  instructions,
  onInstructionsChange,
  suggest, // { status: 'loading' | '', items: [] }
  onSuggestClick,
  scenarioLabel,
  scenarioPicked,
  scenarioBtnLabel,
  onChooseScenario,
  env,
  onEnvChange,
  envDisabled,
  onGenerate,
  genHint,
  run, // { visible, stages: [{label,status,secs}], result }
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

        {ready && (
          <div id="review-fields">
            <div className="review-field">
              <label className="review-label" htmlFor="instructions">
                Instructions
                <span className="review-opt">optional — shapes the task</span>
              </label>
              <div className="suggest-chips">
                {suggest.status === 'loading' ? (
                  <span className="suggest-status">Loading suggestions…</span>
                ) : (
                  suggest.items.map((text, i) => (
                    <button
                      key={i}
                      type="button"
                      className="suggest-chip"
                      onClick={() => onSuggestClick(text)}
                    >
                      {text}
                    </button>
                  ))
                )}
              </div>
              <textarea
                id="instructions"
                className="instructions"
                rows="3"
                value={instructions}
                onChange={(e) => onInstructionsChange(e.target.value)}
                placeholder="e.g. make it infra — require a Redis dependency + Dockerfile + run.sh"
              />
            </div>

            <div className="review-field">
              <div className="review-label">
                Scenario
                <span className="review-opt">optional — pick one or let the pipeline choose</span>
              </div>
              <div className="scenario-state">
                <span className={`scenario-current${scenarioPicked ? ' picked' : ''}`}>
                  {scenarioLabel}
                </span>
                <button className="link-btn" type="button" onClick={onChooseScenario}>
                  {scenarioBtnLabel}
                </button>
              </div>
            </div>
          </div>
        )}

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
