import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { APIProvider } from '@vis.gl/react-google-maps'
import './index.css'
import App from './App.jsx'
import { getApiKey } from './lib/config.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <APIProvider apiKey={getApiKey()}>
      <App />
    </APIProvider>
  </StrictMode>,
)
