import React from 'react'
import ReactDOM from 'react-dom/client'
import AppShell from './AppShell'
import '../index.css'
import 'shadcn-theme-menu/themes.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>,
)
