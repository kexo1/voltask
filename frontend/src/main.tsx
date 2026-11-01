// Importuj režim Reactu na vykreslenie aplikácie.
import { StrictMode } from 'react'
// Importuj funkciu, ktorá pripojí React k HTML stránke.
import { createRoot } from 'react-dom/client'
// Načítaj globálne CSS štýly.
import './index.css'
// Importuj hlavnú komponentu aplikácie.
import App from './App.tsx'

// Nájdi koreňový element v index.html a vykresli doň aplikáciu.
createRoot(document.getElementById('root')!).render(
  // StrictMode pomáha počas vývoja odhaliť bežné problémy.
  <StrictMode>
    <App />
  </StrictMode>,
)
