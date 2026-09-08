import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Register Vazirmatn font
const font = document.createElement('link')
font.rel = 'stylesheet'
font.href = 'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v30.1.0/dist/font-face.css'
document.head.appendChild(font)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)