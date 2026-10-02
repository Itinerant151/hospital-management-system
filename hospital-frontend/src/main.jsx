import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './additions.css'
import './features.css'
import './extras.css'
import App from './App.jsx'
import { ThemeProvider } from './ThemeContext.jsx'
import { ConfirmProvider } from './ConfirmDialog.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </ThemeProvider>
  </StrictMode>,
)