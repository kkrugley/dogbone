import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App'

const rootEl = document.getElementById('root')

function showStartupError(error: unknown) {
  const container = document.createElement('div')
  container.className = 'p-10 font-sans'
  const heading = document.createElement('h1')
  heading.textContent = 'Unable to start DogBone'
  const message = document.createElement('p')
  message.textContent = 'Please reload the page. Your source files have not been changed.'
  container.append(heading, message)
  if (import.meta.env.DEV) {
    const details = document.createElement('pre')
    details.textContent = error instanceof Error ? error.stack ?? error.message : String(error)
    container.append(details)
  }
  if (rootEl) rootEl.replaceChildren(container)
  else document.body.replaceChildren(container)
}

if (!rootEl) {
  showStartupError(new Error('Missing application root'))
} else {
  try {
    createRoot(rootEl).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    )
  } catch (error) {
    console.error('Application startup failed', error)
    showStartupError(error)
  }
}
