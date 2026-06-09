import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import 'highlight.js/styles/github.css'
import 'tippy.js/dist/tippy.css'
import './styles/document.css'
import './styles/app.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
