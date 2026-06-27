import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App'

const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML =
    '<div style="color:red;padding:40px;font-family:monospace">FATAL: #root element not found</div>'
} else {
  window.addEventListener('error', (event) => {
    if (event.filename?.includes('main.tsx') || event.filename?.includes('App')) {
      const div = document.createElement('div')
      div.style.cssText =
        'position:fixed;bottom:0;left:0;right:0;background:#fff0f0;color:red;padding:16px;font-family:monospace;font-size:13px;z-index:99999;border-top:2px solid red;max-height:50vh;overflow:auto'
      div.textContent = `Runtime Error: ${event.message}`
      document.body.appendChild(div)
    }
  })

  try {
    createRoot(rootEl).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    )
  } catch (e) {
    const err = e as Error
    rootEl.innerHTML = `
      <div style="padding:40px;color:red;font-family:monospace;background:#fff5f5;min-height:100vh">
        <h1 style="font-size:24px;margin-bottom:16px">Render Error</h1>
        <pre style="white-space:pre-wrap;background:#fff;padding:16px;border-radius:8px;margin-bottom:16px;font-size:14px">${err.message}</pre>
        <pre style="white-space:pre-wrap;background:#f0f0f0;padding:16px;border-radius:8px;font-size:11px;max-height:400px;overflow:auto">${err.stack}</pre>
      </div>
    `
  }
}