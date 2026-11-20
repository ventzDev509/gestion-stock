import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthGate } from './components/AuthGate'
import './style.css'
createRoot(document.getElementById('root')!).render(<React.StrictMode><AuthGate>{auth=><App auth={auth}/>}</AuthGate></React.StrictMode>)
if ('serviceWorker' in navigator) window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js') })
