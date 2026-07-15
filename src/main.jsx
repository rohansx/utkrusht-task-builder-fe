import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// No <StrictMode>: its dev-only double-invoke would start two sessions and two
// SSE streams. The app already guards its one-time init.
createRoot(document.getElementById('root')).render(<App />)
