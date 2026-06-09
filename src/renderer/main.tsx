import ReactDOM from 'react-dom/client'
import App from './App'
import 'highlight.js/styles/github.css'
import './styles/document.css'
import './styles/app.css'

// NOTE: React.StrictMode is intentionally NOT used here. Its double-invocation
// in development duplicates IME (Korean/Japanese/Chinese) composition input in
// the ProseMirror editor (e.g. "김" typed as "ㄱㄱ ㅣㅣ ㅁㅁ").
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
