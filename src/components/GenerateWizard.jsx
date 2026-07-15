import { SERVICE_CHIPS, SHAPE_CHIPS } from '../constants.js'
import { parseScenario } from '../lib.js'

function ChipToggle({ on, label, onClick }) {
  return (
    <button type="button" className={`wz-chip${on ? ' on' : ''}`} onClick={onClick}>
      <span className="wz-box" aria-hidden="true">
        {on ? '✓' : ''}
      </span>
      <span>{label}</span>
    </button>
  )
}

function inlineCode(text, keyBase) {
  return text.split('`').map((p, i) =>
    i % 2 ? <code key={`${keyBase}-${i}`}>{p}</code> : <span key={`${keyBase}-${i}`}>{p}</span>
  )
}

function ScenarioText({ text }) {
  return parseScenario(text).map((sec, j) => (
    <span className="wz-sc-sec" key={j}>
      {sec.label ? <b>{sec.label}: </b> : null}
      {inlineCode(sec.body, j)}
    </span>
  ))
}

function StageDot({ status }) {
  if (status === 'running') return <span className="spin" aria-hidden="true" />
  return <span className="dot">{status === 'ok' ? '✓' : status === 'failed' ? '✗' : ''}</span>
}

// Preflight → input files → scenarios, shown INLINE with live logs so you can
// watch the input files being generated (no modal, since this takes a while).
function PrepProgress({ prepStages }) {
  return (
    <div className="prep-stages">
      {prepStages.map((s) => (
        <div className={`prep-stage ${s.status}`} key={s.key}>
          <div className="prep-stage-head">
            <StageDot status={s.status} />
            <span>{s.label}</span>
          </div>
          {s.log ? (
            <details className="prep-stage-log" open={s.status === 'running'}>
              <summary>logs</summary>
              <pre>{s.log}</pre>
            </details>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export default function GenerateWizard({
  open,
  step, // 'instructions' | 'scenarios'
  subtitle,
  selectedServices,
  onToggleService,
  selectedShapes,
  onToggleShape,
  instructions,
  onInstructionsChange,
  onGenerateScenarios,
  onBack,
  scenarioStage, // { mode: 'prep'|'list'|'error', prepStages, list, error }
  pickedScenario,
  onPickScenario,
  onBuildTask,
  buildStage, // { stages, status: 'running'|'done'|'failed', result, error }
  onBuildDone,
  onClose,
}) {
  if (!open) return null
  return (
    <div className="wizard-inline">
      <div className="modal-head">
        <div className="modal-title">
          {step === 'instructions'
            ? 'Suggested instructions'
            : step === 'scenarios'
              ? 'Pick a scenario'
              : 'Building your task'}
        </div>
        <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="modal-body">
        {step === 'instructions' ? (
          <div className="wizard-step">
            <div className="wz-sub">
              Optional — pick any that fit. These steer what kind of task gets built.
              {subtitle ? (
                <>
                  {' '}
                  Suggested for a <b>{subtitle}</b> role.
                </>
              ) : null}
            </div>

            <div className="wz-group">
              <div className="wz-chips">
                {SERVICE_CHIPS.map((c) => (
                  <ChipToggle
                    key={c.id}
                    on={selectedServices.has(c.id)}
                    label={c.label}
                    onClick={() => onToggleService(c.id)}
                  />
                ))}
              </div>
            </div>

            <div className="wz-group">
              <div className="wz-group-label">Task shape &amp; focus</div>
              <div className="wz-chips">
                {SHAPE_CHIPS.map((c) => (
                  <ChipToggle
                    key={c.id}
                    on={selectedShapes.has(c.id)}
                    label={c.label}
                    onClick={() => onToggleShape(c.id)}
                  />
                ))}
              </div>
            </div>

            <div className="wz-group">
              <div className="wz-group-label">Or add your own instructions</div>
              <textarea
                className="instructions"
                rows="3"
                value={instructions}
                onChange={(e) => onInstructionsChange(e.target.value)}
                placeholder="e.g. Must integrate with Stripe API, focus on error handling, or any custom requirements…"
              />
            </div>

            <div className="wz-actions">
              <button className="cta" onClick={onGenerateScenarios}>
                Generate scenarios →
              </button>
            </div>
          </div>
        ) : step === 'scenarios' ? (
          <div className="wizard-step">
            <div className="wz-sub">
              Choose the scenario this task will be built from — it becomes part of the brief.
            </div>

            {scenarioStage.mode === 'prep' && (
              <>
                <PrepProgress prepStages={scenarioStage.prepStages} />
                <div className="gen-hint">
                  Building a candidate pool for this brief — preflight, input files, and scenarios
                  (~1–2 min). Expand a stage's <b>logs</b> to watch it work.
                </div>
              </>
            )}

            {scenarioStage.mode === 'error' && (
              <div className="scenario-empty">
                {scenarioStage.error}
                <br />
                You can build anyway — the pipeline will auto-pick a scenario.
              </div>
            )}

            {scenarioStage.mode === 'list' &&
              (scenarioStage.list.length ? (
                <div className="wz-scenarios">
                  {scenarioStage.list.map((text, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`wz-scenario${text === pickedScenario ? ' on' : ''}`}
                      onClick={() => onPickScenario(text)}
                    >
                      <span className="wz-radio" aria-hidden="true" />
                      <span className="wz-scenario-text">
                        <ScenarioText text={text} />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="scenario-empty">
                  No scenarios yet — build anyway and the pipeline will create and pick one.
                </div>
              ))}

            <div className="wz-actions">
              <button className="link-btn" type="button" onClick={onBack}>
                ← Back
              </button>
              <button className="cta" disabled={scenarioStage.mode === 'prep'} onClick={onBuildTask}>
                Build this task →
              </button>
            </div>
          </div>
        ) : (
          <div className="wizard-step">
            <div className="wz-sub">
              {buildStage.status === 'running'
                ? 'Generating your task — prompts, code generation, and evaluation. Expand a stage to watch it work.'
                : buildStage.status === 'done'
                  ? 'Done — your task is ready.'
                  : 'Generation failed.'}
            </div>

            <PrepProgress prepStages={buildStage.stages} />

            {buildStage.status === 'done' && (
              <div className="scenario-empty">
                ✓ Task created{buildStage.result?.task_id ? ` — ID ${buildStage.result.task_id}` : ''}.
              </div>
            )}
            {buildStage.status === 'failed' && (
              <div className="scenario-empty">{buildStage.error}</div>
            )}

            <div className="wz-actions">
              <button className="cta" disabled={buildStage.status === 'running'} onClick={onBuildDone}>
                {buildStage.status === 'running' ? 'Building…' : 'Done'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
