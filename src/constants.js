export const GREETING =
  "Hi! I'll help you put together a coding assessment. " +
  'First — what tech stack should the candidate work in?'

// Mirrors task_builder/slots.py: five required slots. scenario_count is
// handled automatically by the pipeline, so it's not shown in the brief panel.
export const SLOT_DEFS = [
  { key: 'competencies', label: 'Tech stack', list: true, required: true },
  { key: 'proficiency', label: 'Proficiency', required: true },
  { key: 'role', label: 'Role', required: true },
  { key: 'focus_areas', label: 'Focus areas', list: true, required: true },
  { key: 'domain', label: 'Domain', required: true },
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

// Right-panel default skills — 9 famous ones (all exist in the dev DB). The
// full ~331-skill list is reachable via the search box.
export const FAMOUS_SKILLS = [
  'Python',
  'TypeScript',
  'Java',
  'Golang',
  'PostgreSQL',
  'Docker',
  'Kubernetes',
  'MongoDB',
  'Redis',
]

// Right-panel "Suggested roles" — curated, click-to-prefill the composer.
// Static on purpose: roles are a small fixed vocabulary, not DB-driven.
export const ROLE_SUGGESTIONS = [
  'Frontend Engineer',
  'Backend Engineer',
  'Full-stack Engineer',
  'Data Engineer',
  'ML / AI Engineer',
  'DevOps / Platform Engineer',
  'Mobile Engineer',
  'QA / SDET',
]

// Quick-start stacks for the right panel (prefill the composer with a stack).
export const POPULAR_STACKS = [
  'React + TypeScript',
  'Node.js + PostgreSQL',
  'Python + FastAPI',
  'Java + Spring Boot',
  'Java + Kafka',
  'Go + gRPC',
  'Django + Redis',
  'Next.js + Prisma',
  'Spring Boot + Kafka',
  'FastAPI + PostgreSQL',
  'Rust + Actix',
  'NestJS + MongoDB',
  'Ruby on Rails',
  'Kubernetes + Docker',
  'React + GraphQL',
]

export const STARTERS = [
  'An INTERMEDIATE React + TypeScript task for a frontend engineer, focused on state management, e-commerce domain',
  'A BASIC Java + Kafka task for a backend engineer, focused on consumer groups, logistics domain',
  'An ADVANCED Python task for a data engineer, focused on pipeline reliability, fintech domain',
]
