import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import Hub from './Hub.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/hub" element={<Hub />} />
        <Route path="/:repo" element={<App />} />
        <Route path="/" element={<Navigate to="/hub" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
