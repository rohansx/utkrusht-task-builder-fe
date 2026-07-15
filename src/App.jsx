import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { api, eventsUrl } from './api.js'
import { loadTranscript, saveTranscript, clearTranscript } from './persist.js'
import { nextId } from './lib.js'
import { PIPELINE_STAGES, PREP_STAGES, STARTERS } from './constants.js'
import Header from './components/Header.jsx'
import Chat from './components/Chat.jsx'
import BriefPanel from './components/BriefPanel.jsx'
import ScenarioModal from './components/ScenarioModal.jsx'

const EMPTY_PANEL = { brief: {}, missing: [], ready: false }
const PREPARED_STAGES = ['00_preflight', '01_input_files', '02_scenarios']

export default function App() {
  // ---- render state --------------------------------------------------------
  const [messages, setMessages] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [panelState, setPanelState] = useState(EMPTY_PANEL)
  const [input, setInput] = useState('')
  const [instructions, setInstructions] = useState('')
  const [suggest, setSuggest] = useState({ status: '', items: [] })
  const [showStarters, setShowStarters] = useState(false)
  const [env, setEnv] = useState('dev')
  const [selectedScenario, setSelectedScenario] = useState('')
  const [scenariosPrepared, setScenariosPrepared] = useState(false)
  const [scenarioLabel, setScenarioLabel] = useState('Auto — the pipeline picks one')
  const [scenarioPicked, setScenarioPicked] = useState(false)
  const [scenarioBtnLabel, setScenarioBtnLabel] = useState('Choose a scenario →')
  const [run, setRun] = useState({ visible: false, stages: [], result: null })
  const [modal, setModal] = useState({
    open: false,
    mode: 'prep',
    prepStages: [],
    scenarioList: null,
    errorMsg: '',
  })
  const [printDate, setPrintDate] = useState('')

  // ---- refs (read inside async fetch / SSE callbacks) ----------------------
  const sessionIdRef = useRef(null)
  const busyRef = useRef(false)
  const generatingRef = useRef(false)
  const panelStateRef = useRef(EMPTY_PANEL)
  const envRef = useRef('dev')
  const instructionsRef = useRef('')
  const selectedScenarioRef = useRef('')
  const scenariosPreparedRef = useRef(false)
  const suggestLoadedForRef = useRef('')
  const runStagesRef = useRef([])
  const inputRef = useRef('')
  const activeStreamRef = useRef(null)
  const prepStreamRef = useRef(null)
  const inputElRef = useRef(null)
  const chatRef = useRef(null)
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

  // Persist the chat (minus the transient "thinking" bubble and the session
  // divider — the divider is re-added fresh on each restore, so persisting it
  // would make "— new session —" markers pile up on every reload).
  useEffect(() => {
    saveTranscript(messages.filter((m) => !m.pending && m.kind !== 'divider'))
  }, [messages])

  // Keep the chat scrolled to the newest message.
  useEffect(() => {
    const el = chatRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // ---- brief panel + suggestions ------------------------------------------
  function updateBrief(data) {
    const ns = {
      brief: data.brief || {},
      missing: data.missing_slots || [],
      ready: !!data.ready,
    }
    panelStateRef.current = ns
    setPanelState(ns)
    if (ns.ready && !generatingRef.current) loadSuggestions(ns)
  }

  async function loadSuggestions(ns) {
    const b = ns.brief || {}
    const names = (b.competencies || []).join(',')
    const proficiency = b.proficiency || 'BASIC'
    if (!names) return
    const key = `${names}::${proficiency}`
    if (key === suggestLoadedForRef.current) return
    suggestLoadedForRef.current = key
    setSuggest({ status: 'loading', items: [] })
    try {
      const res = await api(
        `/api/suggest-instructions?names=${encodeURIComponent(names)}&proficiency=${encodeURIComponent(proficiency)}`
      )
      const data = await res.json()
      setSuggest({ status: '', items: data.suggestions || [] })
    } catch {
      setSuggest({ status: '', items: [] })
      suggestLoadedForRef.current = ''
    }
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

  // ---- pipeline checklist (right panel) -----------------------------------
  function setPanelStage(stageKey, status, durationS) {
    const stages = runStagesRef.current.map((s) => {
      if (s.label !== stageKey) return s
      const secs = status === 'ok' && durationS != null ? `${durationS}s` : status === 'ok' ? s.secs : ''
      return { ...s, status, secs }
    })
    runStagesRef.current = stages
    setRun((prev) => ({ ...prev, stages }))
  }

  function startGeneration() {
    if (generatingRef.current || !panelStateRef.current.ready || !sessionIdRef.current) return
    const curEnv = envRef.current
    const instr = (instructionsRef.current || '').trim()
    generatingRef.current = true
    setGenerating(true)

    const stages = PIPELINE_STAGES.map(([label, uiLabel]) => ({
      label,
      uiLabel,
      status: scenariosPreparedRef.current && PREPARED_STAGES.includes(label) ? 'ok' : 'pending',
      secs: '',
    }))
    runStagesRef.current = stages
    setRun({ visible: true, stages, result: null })

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
    if (spec.status === 'completed') {
      const stages = runStagesRef.current.map((s) => (s.status === 'failed' ? s : { ...s, status: 'ok' }))
      runStagesRef.current = stages
      setRun((prev) => ({ ...prev, stages, result: spec }))
    } else {
      setRun((prev) => ({ ...prev, result: spec }))
    }
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
        setPanelStage(e.stage, 'running')
      } else if (e.status === 'log') {
        appendLog(id, e.detail || '')
      } else if (e.status === 'ok') {
        const secs = e.duration_s != null ? ` · ${e.duration_s}s` : ''
        patchMessage(id, { summary: `✓ ${e.stage}${secs}`, open: false })
        setPanelStage(e.stage, 'ok', e.duration_s)
      } else if (e.status === 'failed') {
        patchMessage(id, { summary: `✗ ${e.stage} ${e.detail || ''}`.trim(), open: true })
        setPanelStage(e.stage, 'failed')
      }
    }
    es.onerror = () => {
      es.close()
      activeStreamRef.current = null
      generatingRef.current = false
      setGenerating(false)
    }
  }

  // ---- scenario modal ------------------------------------------------------
  function showScenarioList(pool) {
    setModal((prev) => ({ ...prev, mode: 'list', scenarioList: pool }))
  }
  function showScenarioError(msg) {
    setModal((prev) => ({ ...prev, mode: 'error', errorMsg: msg }))
  }
  function setPrepStage(key, status) {
    setModal((prev) => ({
      ...prev,
      prepStages: prev.prepStages.map((s) => (s.key === key ? { ...s, status } : s)),
    }))
  }

  function openScenarioModal() {
    if (!sessionIdRef.current || !panelStateRef.current.ready) return
    setModal({
      open: true,
      mode: 'prep',
      prepStages: PREP_STAGES.map(([key, label]) => ({ key, label, status: '' })),
      scenarioList: null,
      errorMsg: '',
    })
    const curEnv = envRef.current
    api(`/api/scenarios?session_id=${encodeURIComponent(sessionIdRef.current)}&env=${curEnv}`)
      .then((r) => r.json())
      .then((data) => {
        const pool = (data && data.scenarios) || []
        if (pool.length) {
          scenariosPreparedRef.current = true
          setScenariosPrepared(true)
          showScenarioList(pool)
        } else {
          runPrepare(curEnv)
        }
      })
      .catch(() => runPrepare(curEnv))
  }

  function runPrepare(curEnv) {
    setModal((prev) => ({ ...prev, mode: 'prep' }))
    api('/api/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionIdRef.current, env: curEnv }),
    })
      .then((r) => r.json())
      .then((data) => streamPrepare(data.run_id, curEnv))
      .catch(() => showScenarioError('Could not start scenario preparation.'))
  }

  function streamPrepare(runId, curEnv) {
    const es = new EventSource(eventsUrl(`/api/runs/${runId}/events`))
    prepStreamRef.current = es
    es.onmessage = (ev) => {
      const e = JSON.parse(ev.data)
      if (e.stage === 'done') {
        es.close()
        prepStreamRef.current = null
        if (e.status === 'completed') {
          scenariosPreparedRef.current = true
          setScenariosPrepared(true)
          api(`/api/scenarios?session_id=${encodeURIComponent(sessionIdRef.current)}&env=${curEnv}`)
            .then((r) => r.json())
            .then((data) => showScenarioList((data && data.scenarios) || []))
            .catch(() => showScenarioError('Scenarios were generated but could not be loaded.'))
        } else {
          showScenarioError(e.detail || 'Scenario preparation failed.')
        }
        return
      }
      if (PREPARED_STAGES.includes(e.stage)) {
        const status = e.status === 'ok' ? 'ok' : e.status === 'failed' ? 'failed' : 'running'
        setPrepStage(e.stage, status)
      }
    }
    es.onerror = () => {
      es.close()
      prepStreamRef.current = null
    }
  }

  function closeScenarioModal() {
    if (prepStreamRef.current) {
      prepStreamRef.current.close()
      prepStreamRef.current = null
    }
    setModal((prev) => ({ ...prev, open: false }))
  }

  function pickScenario(text, num) {
    selectedScenarioRef.current = text
    setSelectedScenario(text)
    setScenarioLabel(`Scenario ${num} selected`)
    setScenarioPicked(true)
    setScenarioBtnLabel('Change scenario →')
    closeScenarioModal()
  }

  function clearScenarioSelection() {
    selectedScenarioRef.current = ''
    setSelectedScenario('')
    scenariosPreparedRef.current = false
    setScenariosPrepared(false)
    setScenarioLabel('Auto — the pipeline picks one')
    setScenarioPicked(false)
    setScenarioBtnLabel('Choose a scenario →')
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
    setRun({ visible: false, stages: [], result: null })
    runStagesRef.current = []
    setInstructions('')
    instructionsRef.current = ''
    setSuggest({ status: '', items: [] })
    suggestLoadedForRef.current = ''
    clearScenarioSelection()
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
  function onInstructionsChange(v) {
    setInstructions(v)
    instructionsRef.current = v
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
  function onSuggestClick(text) {
    setInstructions((cur) => {
      const next = cur.trim() ? `${cur}\n${text}` : text
      instructionsRef.current = next
      return next
    })
    const el = document.getElementById('instructions')
    if (el) el.focus()
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
    : panelState.ready
      ? 'Add optional instructions, pick a scenario if you like, then generate.'
      : 'Answer the questions in the chat — the brief fills in here as you go.'
  const genDisabled = !(panelState.ready && sessionId && !generating)

  return (
    <>
      <Header onNewTask={newTask} onDownloadPdf={downloadPdf} />
      <div className="print-head" aria-hidden="true">
        Utkrusht Task Builder — <span id="print-date">{printDate}</span>
      </div>

      <div className="layout">
        <main>
          <div className="chat" ref={chatRef}>
            <Chat messages={messages} />
          </div>

          {showStarters && (
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
        </main>

        <BriefPanel
          panelState={panelState}
          generating={generating}
          genDisabled={genDisabled}
          onSlotClick={onSlotClick}
          instructions={instructions}
          onInstructionsChange={onInstructionsChange}
          suggest={suggest}
          onSuggestClick={onSuggestClick}
          scenarioLabel={scenarioLabel}
          scenarioPicked={scenarioPicked}
          scenarioBtnLabel={scenarioBtnLabel}
          onChooseScenario={openScenarioModal}
          env={env}
          onEnvChange={onEnvChange}
          envDisabled={generating}
          onGenerate={startGeneration}
          genHint={genHint}
          run={run}
        />
      </div>

      <ScenarioModal
        open={modal.open}
        mode={modal.mode}
        prepStages={modal.prepStages}
        scenarioList={modal.scenarioList}
        selectedScenario={selectedScenario}
        errorMsg={modal.errorMsg}
        onClose={closeScenarioModal}
        onPick={pickScenario}
      />
    </>
  )
}
