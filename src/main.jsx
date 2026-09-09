import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './lib/authContext.jsx'
import { supabaseConfigOk } from './lib/supabaseClient.js'

if (!supabaseConfigOk) {
  document.getElementById('root').innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5e2c8;color:#17255a;font-family:system-ui;padding:24px;text-align:center">
      <p>Belayo is misconfigured — missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</p>
    </div>`
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <BrowserRouter basename="/Beelayo">
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>,
  )
}
