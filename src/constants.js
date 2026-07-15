export const GREETING =
  "Hi! I'll help you put together a coding assessment. " +
  'First — what tech stack should the candidate work in?'

// Mirrors task_builder/slots.py: five required slots + optional scenario_count.
export const SLOT_DEFS = [
  { key: 'competencies', label: 'Tech stack', list: true, required: true },
  { key: 'proficiency', label: 'Proficiency', required: true },
  { key: 'role', label: 'Role', required: true },
  { key: 'focus_areas', label: 'Focus areas', list: true, required: true },
  { key: 'domain', label: 'Domain', required: true },
  { key: 'scenario_count', label: 'Scenarios', required: false, fallback: '6 (default)' },
]

export const PIPELINE_STAGES = [
  ['00_preflight', 'Preflight checks'],
  ['01_input_files', 'Input files'],
  ['02_scenarios', 'Scenarios'],
  ['03_prompt', 'Prompts'],
  ['04_tasks', 'Generate & evaluate'],
]

export const PREP_STAGES = [
  ['00_preflight', 'Preflight checks'],
  ['01_input_files', 'Input files'],
  ['02_scenarios', 'Scenarios'],
]

// Step 1 of the generate wizard — "Suggested instructions". Each selected chip
// appends its `directive` to the free-text instructions sent to the pipeline.
// `auto` contributes nothing (let the pipeline choose).
export const SERVICE_CHIPS = [
  { id: 'auto', label: 'Auto — pick a fitting service', directive: '' },
  { id: 'vectordb', label: 'Vector DB (pgvector / Qdrant)', directive: 'Require a vector database (pgvector or Qdrant) as a dependency.' },
  { id: 'redis', label: 'Redis (cache / idempotency)', directive: 'Require a Redis dependency for caching / idempotency.' },
  { id: 'kafka', label: 'Kafka (event-driven)', directive: 'Make it event-driven with a Kafka dependency.' },
  { id: 'postgres', label: 'PostgreSQL (relational)', directive: 'Require a PostgreSQL relational database.' },
  { id: 'mcp', label: 'MCP / tool server', directive: 'Require an MCP / tool-server component.' },
]

// "Task shape & focus" — orthogonal directives that shape the task.
export const SHAPE_CHIPS = [
  { id: 'debug', label: 'Make it a debugging task', directive: 'Make it a debugging task — the candidate fixes existing broken code.' },
  { id: 'greenfield', label: 'Greenfield build', directive: 'Make it a greenfield build — the candidate implements from scratch.' },
  { id: 'perf', label: 'Add a performance constraint', directive: 'Add a performance constraint the solution must satisfy.' },
  { id: 'tests', label: 'Require unit tests', directive: 'Require the candidate to write unit tests.' },
]

export const STARTERS = [
  'An INTERMEDIATE React + TypeScript task for a frontend engineer, focused on state management, e-commerce domain',
  'A BASIC Java + Kafka task for a backend engineer, focused on consumer groups, logistics domain',
  'An ADVANCED Python task for a data engineer, focused on pipeline reliability, fintech domain',
]
