// Configure the generated @ngm9/recruiter-client ONCE, and re-export the
// task-builder operation fns App.jsx needs.
//
// baseUrl:'' keeps every request relative so the Vite dev proxy handles it
// same-origin (no CORS). getHeaders attaches the dev testmaker JWT + the
// recruiter token-source header the Flask middleware picks its secret from.
import { configureRecruiterClient } from '@ngm9/recruiter-client'
import { getJwt } from './auth.js'

configureRecruiterClient({
  baseUrl: '',
  getHeaders: async () => {
    const jwt = getJwt()
    return jwt
      ? { Authorization: `Bearer ${jwt}`, 'X-Token-Source': 'recruiter' }
      : { 'X-Token-Source': 'recruiter' }
  },
})

export {
  getTaskBuilderGreeting,
  createTaskBuilderSession,
  listTaskBuilderSessions,
  getTaskBuilderSession,
  createTaskBuilderMessage,
  getTaskBuilderScenarios,
  getTaskBuilderInstructionSuggestions,
  prepareTaskBuilderRun,
  generateTaskBuilderRun,
  getTaskBuilderRun,
} from '@ngm9/recruiter-client'
