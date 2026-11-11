import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { pedirAlmacenamientoPersistente } from './cola.js'
import './estilos.css'

pedirAlmacenamientoPersistente()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
