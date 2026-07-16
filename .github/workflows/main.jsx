import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { applyTheme } from '@/pages/ThemeSettings'

// Apply saved theme on startup
try {
  const saved = JSON.parse(localStorage.getItem("timepay_theme") || "{}");
  if (Object.keys(saved).length) applyTheme(saved);
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)