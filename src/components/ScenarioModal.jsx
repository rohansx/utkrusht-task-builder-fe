import { parseScenario } from '../lib.js'

function dotChar(status) {
  return status === 'ok' ? '✓' : status === 'failed' ? '✗' : ''
}

export default function ScenarioModal({
  open,
  mode, // 'prep' | 'list' | 'error'
  prepStages,
  scenarioList,
  selectedScenario,
  errorMsg,
  onClose,
  onPick,
}) {
  if (!open) return null
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="Choose a scenario">
        <div className="modal-head">
          <div className="modal-title">Choose a scenario</div>
          <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {mode === 'prep' && (
            <div className="modal-prep">
              <div className="panel-title">Preparing scenario options</div>
              <ul className="run-stages">
                {prepStages.map((s) => (
                  <li key={s.key} className={s.status}>
                    <span className="dot">{dotChar(s.status)}</span>
                    <span>{s.label}</span>
                  </li>
                ))}
              </ul>
              <div className="gen-hint">
                Generating a candidate pool for this brief — this runs preflight, input files,
                and scenarios (~1–2 min).
              </div>
            </div>
          )}

          {mode === 'error' && (
            <div className="scenario-list">
              <div className="scenario-empty">
                {errorMsg}
                <br />
                You can close this and generate with auto-selection instead.
              </div>
            </div>
          )}

          {mode === 'list' && (
            <div className="scenario-list">
              {!scenarioList || scenarioList.length === 0 ? (
                <div className="scenario-empty">
                  No scenarios available for this combo yet. Close this and generate — the
                  pipeline will create and pick one automatically.
                </div>
              ) : (
                scenarioList.map((text, i) => (
                  <button
                    key={i}
                    type="button"
                    className={'scenario-card' + (text === selectedScenario ? ' picked' : '')}
                    onClick={() => onPick(text, i + 1)}
                  >
                    <div className="sc-num">Scenario {i + 1}</div>
                    {parseScenario(text).map((sec, j) => (
                      <div className="sc-sec" key={j}>
                        {sec.label ? <b>{sec.label}: </b> : null}
                        {sec.body}
                      </div>
                    ))}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
