import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
//import App from './pages/App.tsx'
//import S_Ranking1 from './pages/S_Ranking1.tsx'
import S_Dashboard from './pages/S_Dashboard.tsx'
import Router from './Router.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router />
  </StrictMode>,
)
