import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { api, eventsUrl } from './api.js'
import { loadTranscript, saveTranscript, clearTranscript } from './persist.js'
import { nextId } from './lib.js'
import {
  PIPELINE_STAGES,
  PREP_STAGES,
  STARTERS,
  SERVICE_CHIPS,
  SHAPE_CHIPS,
  SLOT_DEFS,
} from './constants.js'
import Header from './components/Header.jsx'
import Chat from './components/Chat.jsx'
import GenerateWizard from './components/GenerateWizard.jsx'

const EMPTY_PANEL = { brief: {}, missing: [], ready: false }
const PREPARED_STAGES = ['00_preflight', '01_input_files', '02_scenarios']
const emptyScenarioStage = () => ({ mode: 'prep', prepStages: [], list: [], error: '' })

// The brief is generation-ready once every REQUIRED slot is filled — this is
// exactly what the backend's /api/generate gates on (brief.is_complete()). We
// deliberately do NOT wait for the bot's `ready` confirmation flag: it stays
// false until the user says "yes, confirm" in chat, which would otherwise
// leave the Generate button disabled on a fully-filled brief.
function isBriefComplete(brief) {
  if (!brief) return false
  return SLOT_DEFS.filter((d) => d.required).every((d) => {
    const v = brief[d.key]
    return d.list ? Array.isArray(v) && v.length > 0 : v != null && String(v).trim() !== ''
  })
}

export default function App() {
  // ---- render state --------------------------------------------------------
  const [messages, setMessages] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [panelState, setPanelState] = useState(EMPTY_PANEL)
  const [input, setInput] = useState('')
  const [instructions, setInstructions] = useState('')
  const [showStarters, setShowStarters] = useState(false)
  const [env, setEnv] = useState('dev')
  const [printDate, setPrintDate] = useState('')

  // wizard
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState('instructions') // 'instructions' | 'scenarios'
  const [selectedServices, setSelectedServices] = useState(new Set(['auto']))
  const [selectedShapes, setSelectedShapes] = useState(new Set())
  const [scenarioStage, setScenarioStage] = useState(emptyScenarioStage())
  const [buildStage, setBuildStage] = useState({ stages: [], status: 'running', result: null, error: '' })
  const [pickedScenario, setPickedScenario] = useState('')

  // ---- refs (read inside async fetch / SSE callbacks) ----------------------
  const sessionIdRef = useRef(null)
  const busyRef = useRef(false)
  const generatingRef = useRef(false)
  const panelStateRef = useRef(EMPTY_PANEL)
  const envRef = useRef('dev')
  const instructionsRef = useRef('')
  const selectedScenarioRef = useRef('')
  const scenariosPreparedRef = useRef(false)
  const inputRef = useRef('')
  const activeStreamRef = useRef(null)
  const prepStreamRef = useRef(null)
  const prepTimerRef = useRef(null)
  const buildTimerRef = useRef(null)
  const inputElRef = useRef(null)
  const mainRef = useRef(null)
  const initRef = useRef(false)

  // ---- message helpers -----------------------------------------------------
  function addBubble(role, text, cls = '', pending = false) {
    const id = nextId()
    setMessages((prev) => [...prev, { id, kind: 'bubble', role, text, cls, pending }])
    return id
  }
  function addStage(label) {
    const id = nextId()
    setMessages((prev) => [
      ...prev,
      { id, kind: 'stage', label, summary: '', log: '', status: '', open: false },
    ])
    return id
  }
  function addDone(spec) {
    const id = nextId()
    setMessages((prev) => [...prev, { id, kind: 'done', ...spec }])
    return id
  }
  function patchMessage(id, patch) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }
  function appendLog(id, text) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, log: (m.log || '') + text } : m)))
  }

  // Persist the chat (minus the transient "thinking" bubble, the session
  // divider — re-added fresh on each restore — and the brief card, which is
  // live session state and would be stale in a restored transcript).
  useEffect(() => {
    saveTranscript(messages.filter((m) => !m.pending && m.kind !== 'divider' && m.kind !== 'brief'))
  }, [messages])

  // Keep the chat scrolled to the newest message. `main` is the scroll
  // container (overflow-y:auto) — not `.chat`, which is a flex:1 child — so
  // scroll the parent, else new replies never scroll into view.
  useEffect(() => {
    const el = mainRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // The inline generate wizard renders at the TOP of `main`. After a brief is
  // filled `main` is scrolled to the bottom, so opening the wizard would leave
  // it off-screen above the fold — the click "does nothing" from the user's
  // view. Scroll it into view whenever it opens.
  useEffect(() => {
    if (!wizardOpen) return
    const w = mainRef.current?.querySelector('.wizard-inline')
    if (w) w.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [wizardOpen])

  // ---- brief panel ---------------------------------------------------------
  function updateBrief(data) {
    const ns = {
      brief: data.brief || {},
      missing: data.missing_slots || [],
      ready: !!data.ready,
    }
    panelStateRef.current = ns
    setPanelState(ns)
    setMessages((prev) => [
      ...prev.filter((m) => m.kind !== 'brief'),
      { id: nextId(), kind: 'brief', ...ns },
    ])
  }

  // ---- conversation --------------------------------------------------------
  async function startSession() {
    try {
      const res = await api('/api/session', { method: 'POST' })
      if (res.status === 403) {
        addBubble('bot', 'Access token required — reload the page to try again.')
        return
      }
      const data = await res.json()
      sessionIdRef.current = data.session_id
      setSessionId(data.session_id)
      addBubble('bot', data.reply)
    } catch {
      addBubble('bot', 'Could not connect to the server. Is the backend running?')
    }
  }

  async function sendText(raw) {
    const text = (raw || '').trim()
    if (!text || busyRef.current || !sessionIdRef.current) return
    busyRef.current = true
    setInput('')
    inputRef.current = ''
    setShowStarters(false)
    addBubble('user', text)
    const thinkingId = addBubble('bot', '…', '', true)
    try {
      const res = await api('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionIdRef.current, message: text }),
      })
      const data = await res.json()
      patchMessage(thinkingId, { text: data.reply, pending: false })
      updateBrief(data)
    } catch {
      patchMessage(thinkingId, { text: 'Network error — please try again.', pending: false })
    } finally {
      busyRef.current = false
    }
  }
  const send = () => sendText(inputRef.current)

  // ---- generation ----------------------------------------------------------
  function startGeneration() {
    if (generatingRef.current || !isBriefComplete(panelStateRef.current.brief) || !sessionIdRef.current)
      return
    const curEnv = envRef.current
    const instr = (instructionsRef.current || '').trim()
    generatingRef.current = true
    setGenerating(true)

    const bits = []
    if (instr) bits.push('with your instructions')
    if (selectedScenarioRef.current) bits.push('your selected scenario')
    addBubble('bot', `Generating in ${curEnv}${bits.length ? ' — ' + bits.join(' and ') : ''}…`, 'stage')

    api('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionIdRef.current,
        env: curEnv,
        instructions: instr,
        selected_scenario: selectedScenarioRef.current,
        scenarios_prepared: scenariosPreparedRef.current,
      }),
    })
      .then((r) => r.json())
      .then((data) => streamRun(data.run_id))
      .catch(() => {
        generatingRef.current = false
        setGenerating(false)
        addBubble('bot', 'Could not start generation.', 'stage failed')
      })
  }

  function doneBubble(e) {
    const spec = {
      status: e.status,
      outcome: e.outcome || '',
      detail: e.detail || '',
      task_url: e.task_url || '',
      task_id: e.task_id || '',
      task_name: e.task_name || '',
      task_type: e.task_type || '',
      competencies: e.competencies || '',
      env: e.env || '',
    }
    addDone(spec)
    generatingRef.current = false
    setGenerating(false)
  }

  function streamRun(runId) {
    const stageMsgId = {}
    const es = new EventSource(eventsUrl(`/api/runs/${runId}/events`))
    activeStreamRef.current = es
    es.onmessage = (ev) => {
      const e = JSON.parse(ev.data)
      if (e.stage === 'done') {
        doneBubble(e)
        es.close()
        activeStreamRef.current = null
        return
      }
      let id = stageMsgId[e.stage]
      if (id == null) {
        id = addStage(e.stage)
        stageMsgId[e.stage] = id
      }
      if (e.status === 'running') {
        patchMessage(id, { summary: `⏳ ${e.stage}`, open: true })
      } else if (e.status === 'log') {
        appendLog(id, e.detail || '')
      } else if (e.status === 'ok') {
        const secs = e.duration_s != null ? ` · ${e.duration_s}s` : ''
        patchMessage(id, { summary: `✓ ${e.stage}${secs}`, open: false })
      } else if (e.status === 'failed') {
        patchMessage(id, { summary: `✗ ${e.stage} ${e.detail || ''}`.trim(), open: true })
      }
    }
    es.onerror = () => {
      es.close()
      activeStreamRef.current = null
      generatingRef.current = false
      setGenerating(false)
    }
  }

  // ---- generate wizard -----------------------------------------------------
  function composeInstructions() {
    const parts = []
    for (const c of SERVICE_CHIPS) if (selectedServices.has(c.id) && c.directive) parts.push(c.directive)
    for (const c of SHAPE_CHIPS) if (selectedShapes.has(c.id) && c.directive) parts.push(c.directive)
    const free = instructions.trim()
    if (free) parts.push(free)
    return parts.join('\n')
  }

  function openWizard() {
    if (!sessionIdRef.current || !isBriefComplete(panelStateRef.current.brief) || generatingRef.current)
      return
    setWizardStep('instructions')
    setWizardOpen(true)
  }
  function closeWizard() {
    if (prepStreamRef.current) {
      prepStreamRef.current.close()
      prepStreamRef.current = null
    }
    clearTimeout(prepTimerRef.current)
    clearTimeout(buildTimerRef.current)
    generatingRef.current = false
    setGenerating(false)
    setWizardOpen(false)
  }
  function toggleService(id) {
    setSelectedServices((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  function toggleShape(id) {
    setSelectedShapes((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function onGenerateScenarios() {
    setWizardStep('scenarios')
    setScenarioStage({
      mode: 'prep',
      prepStages: PREP_STAGES.map(([key, label]) => ({ key, label, status: 'pending', log: '' })),
      list: [],
      error: '',
    })
    const curEnv = envRef.current
    api(`/api/scenarios?session_id=${encodeURIComponent(sessionIdRef.current)}&env=${curEnv}`)
      .then((r) => r.json())
      .then((data) => {
        const pool = (data && data.scenarios) || []
        if (pool.length) {
          scenariosPreparedRef.current = true
          setScenarioStage((prev) => ({ ...prev, mode: 'list', list: pool }))
        } else {
          runPrepare(curEnv)
        }
      })
      .catch(() => runPrepare(curEnv))
  }

  function runPrepare(curEnv) {
    setScenarioStage((prev) => ({ ...prev, mode: 'prep' }))
    api('/api/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionIdRef.current, env: curEnv }),
    })
      .then((r) => r.json())
      .then((data) => pollPrep(data.run_id, curEnv))
      .catch(() =>
        setScenarioStage((prev) => ({ ...prev, mode: 'error', error: 'Could not start scenario preparation.' }))
      )
  }

  // Poll the run state (not SSE) so we can show each stage's LIVE LOG tail —
  // you watch input files being generated, right in the panel.
  function pollPrep(jobId, curEnv) {
    clearTimeout(prepTimerRef.current)
    const tick = () => {
      api(`/api/runs/${jobId}/state?env=${curEnv}`)
        .then((r) => r.json())
        .then((data) => {
          const byLabel = {}
          for (const s of data.stages || []) byLabel[s.label] = s
          const prep = PREP_STAGES.map(([key, label]) => {
            const s = byLabel[key] || {}
            return { key, label, status: s.status || 'pending', log: s.log || '' }
          })
          setScenarioStage((prev) => ({ ...prev, prepStages: prep }))
          const st = data.status
          if (st === 'done') {
            scenariosPreparedRef.current = true
            api(`/api/scenarios?session_id=${encodeURIComponent(sessionIdRef.current)}&env=${curEnv}`)
              .then((r) => r.json())
              .then((d) => setScenarioStage((prev) => ({ ...prev, mode: 'list', list: (d && d.scenarios) || [] })))
              .catch(() =>
                setScenarioStage((prev) => ({
                  ...prev,
                  mode: 'error',
                  error: 'Scenarios were generated but could not be loaded.',
                }))
              )
            return
          }
          if (st === 'failed' || st === 'cancelled') {
            setScenarioStage((prev) => ({ ...prev, mode: 'error', error: data.error || 'Scenario preparation failed.' }))
            return
          }
          prepTimerRef.current = setTimeout(tick, 1500)
        })
        .catch(() => {
          prepTimerRef.current = setTimeout(tick, 2500)
        })
    }
    tick()
  }

  function onBuildTask() {
    if (generatingRef.current || !isBriefComplete(panelStateRef.current.brief) || !sessionIdRef.current)
      return
    const curEnv = envRef.current
    const instr = composeInstructions()
    instructionsRef.current = instr
    selectedScenarioRef.current = pickedScenario
    generatingRef.current = true
    setGenerating(true)
    setWizardStep('building')
    setBuildStage({
      stages: PIPELINE_STAGES.map(([key, label]) => ({
        key,
        label,
        status: scenariosPreparedRef.current && PREPARED_STAGES.includes(key) ? 'ok' : 'pending',
        log: '',
      })),
      status: 'running',
      result: null,
      error: '',
    })
    api('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionIdRef.current,
        env: curEnv,
        instructions: instr,
        selected_scenario: selectedScenarioRef.current,
        scenarios_prepared: scenariosPreparedRef.current,
      }),
    })
      .then((r) => r.json())
      .then((data) => pollBuild(data.run_id, curEnv))
      .catch(() => {
        generatingRef.current = false
        setGenerating(false)
        setBuildStage((prev) => ({ ...prev, status: 'failed', error: 'Could not start generation.' }))
      })
  }

  // Poll the generation job so ALL five stages + their logs show live in the
  // wizard — same view the prep step uses, so the pipeline doesn't vanish
  // after Build.
  function pollBuild(jobId, curEnv) {
    clearTimeout(buildTimerRef.current)
    const tick = () => {
      api(`/api/runs/${jobId}/state?env=${curEnv}`)
        .then((r) => r.json())
        .then((data) => {
          const byLabel = {}
          for (const s of data.stages || []) byLabel[s.label] = s
          const stages = PIPELINE_STAGES.map(([key, label]) => {
            const s = byLabel[key] || {}
            return { key, label, status: s.status || 'pending', log: s.log || '' }
          })
          setBuildStage((prev) => ({ ...prev, stages }))
          const st = data.status
          if (st === 'done') {
            generatingRef.current = false
            setGenerating(false)
            setBuildStage((prev) => ({ ...prev, status: 'done', result: { task_id: data.result_task_id } }))
            return
          }
          if (st === 'failed' || st === 'cancelled') {
            generatingRef.current = false
            setGenerating(false)
            setBuildStage((prev) => ({ ...prev, status: 'failed', error: data.error || 'Generation failed.' }))
            return
          }
          buildTimerRef.current = setTimeout(tick, 1500)
        })
        .catch(() => {
          buildTimerRef.current = setTimeout(tick, 2500)
        })
    }
    tick()
  }

  // Record the outcome in the chat transcript, then close the wizard.
  function finishBuild() {
    if (buildStage.status === 'done') {
      addDone({
        status: 'completed',
        task_id: buildStage.result?.task_id || '',
        task_name: '',
        task_type: '',
        competencies: '',
        env: envRef.current,
        task_url: '',
        outcome: '',
        detail: '',
      })
    } else if (buildStage.status === 'failed') {
      addBubble('bot', buildStage.error || 'Generation failed.', 'stage failed')
    }
    closeWizard()
  }

  // ---- header actions ------------------------------------------------------
  function newTask() {
    if (!window.confirm('Discard this conversation and start a new task?')) return
    if (activeStreamRef.current) {
      activeStreamRef.current.close()
      activeStreamRef.current = null
    }
    clearTranscript()
    setMessages([])
    sessionIdRef.current = null
    setSessionId(null)
    busyRef.current = false
    generatingRef.current = false
    setGenerating(false)
    setInstructions('')
    instructionsRef.current = ''
    // reset wizard
    closeWizard()
    setSelectedServices(new Set(['auto']))
    setSelectedShapes(new Set())
    setPickedScenario('')
    setScenarioStage(emptyScenarioStage())
    selectedScenarioRef.current = ''
    scenariosPreparedRef.current = false
    panelStateRef.current = EMPTY_PANEL
    setPanelState(EMPTY_PANEL)
    setShowStarters(true)
    startSession()
  }

  function downloadPdf() {
    const panels = document.querySelectorAll('.stage-log details')
    const wasOpen = []
    panels.forEach((d) => {
      wasOpen.push(d.open)
      d.open = true
    })
    flushSync(() => setPrintDate(new Date().toLocaleString()))
    const restore = () => {
      panels.forEach((d, i) => {
        d.open = wasOpen[i]
      })
      window.removeEventListener('afterprint', restore)
    }
    window.addEventListener('afterprint', restore)
    window.print()
  }

  // ---- field change handlers ----------------------------------------------
  function onInputChange(v) {
    setInput(v)
    inputRef.current = v
  }
  function onEnvChange(v) {
    setEnv(v)
    envRef.current = v
  }
  function onSlotClick(def) {
    const v = `Change the ${def.label.toLowerCase()} to `
    setInput(v)
    inputRef.current = v
    if (inputElRef.current) inputElRef.current.focus()
  }

  // ---- one-time init: restore transcript, then start a fresh session -------
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    const saved = loadTranscript()
    if (saved.length) {
      const normalized = saved.map((m) => ({
        ...m,
        id: m.id ?? nextId(),
        open: m.kind === 'stage' ? m.status !== 'ok' : m.open,
      }))
      setMessages([...normalized, { id: nextId(), kind: 'divider', text: '— new session —' }])
      setShowStarters(false)
    } else {
      setShowStarters(true)
    }
    startSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const genHint = generating
    ? 'Generation in progress — logs stream in the chat.'
    : isBriefComplete(panelState.brief)
      ? 'Click Generate — add optional instructions, pick a scenario, then build.'
      : 'Answer the questions in the chat — the brief fills in here as you go.'
  const genDisabled = !(isBriefComplete(panelState.brief) && sessionId && !generating)

  const briefUi = {
    generating,
    genDisabled,
    onSlotClick,
    env,
    onEnvChange,
    onGenerate: openWizard,
    genHint,
  }

  const brief = panelState.brief || {}
  const wizardSubtitle = [(brief.competencies || []).join(', '), brief.role]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <Header onNewTask={newTask} onDownloadPdf={downloadPdf} />
      <div className="print-head" aria-hidden="true">
        Utkrusht Task Builder — <span id="print-date">{printDate}</span>
      </div>

      <div className="layout">
        <main ref={mainRef}>
          <div className="chat">
            <Chat messages={messages} briefUi={briefUi} />
          </div>

          {showStarters && !wizardOpen && (
            <div className="starters">
              <div className="starters-label">Try one of these to get going:</div>
              <div className="starters-row">
                {STARTERS.map((t, i) => (
                  <button key={i} type="button" className="chip" onClick={() => sendText(t)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* The wizard renders BELOW the conversation so it appears down the
              page (where the user clicked Generate), not at the top. */}
          <GenerateWizard
            open={wizardOpen}
            step={wizardStep}
            subtitle={wizardSubtitle}
            selectedServices={selectedServices}
            onToggleService={toggleService}
            selectedShapes={selectedShapes}
            onToggleShape={toggleShape}
            instructions={instructions}
            onInstructionsChange={setInstructions}
            onGenerateScenarios={onGenerateScenarios}
            onBack={() => setWizardStep('instructions')}
            scenarioStage={scenarioStage}
            pickedScenario={pickedScenario}
            onPickScenario={setPickedScenario}
            onBuildTask={onBuildTask}
            buildStage={buildStage}
            onBuildDone={finishBuild}
            onClose={closeWizard}
          />

          {/* Hide the chat input while the wizard is open — no typing during
              generate-setup, and it keeps the sticky dock from overlapping. */}
          {!wizardOpen && (
            <div className="dock">
              <div className="dock-inner">
                <input
                  type="text"
                  ref={inputElRef}
                  value={input}
                  placeholder="Type a message…"
                  autoComplete="off"
                  onChange={(e) => onInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') send()
                  }}
                />
                <button onClick={send}>Send</button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
