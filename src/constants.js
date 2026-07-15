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

export const STARTERS = [
  'An INTERMEDIATE React + TypeScript task for a frontend engineer, focused on state management, e-commerce domain',
  'A BASIC Java + Kafka task for a backend engineer, focused on consumer groups, logistics domain',
  'An ADVANCED Python task for a data engineer, focused on pipeline reliability, fintech domain',
]
