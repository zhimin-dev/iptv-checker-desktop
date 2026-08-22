import React from 'react'
import ReactDOM from 'react-dom/client'
import 'video.js/dist/video-js.css'
import './index.css'
import App from './App.jsx'
import { setupProxy } from './proxy'

// 应用代理设置（有代理时覆写 axios adapter 与全局 XHR，请求经 tauri http 插件转发）
setupProxy()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
