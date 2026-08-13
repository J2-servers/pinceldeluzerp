import React from 'react'
import ReactDOM from 'react-dom/client'
import moment from '@/lib/momentPtBr'
import App from '@/App.jsx'
import '@/index.css'

moment.locale('pt-br')

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
