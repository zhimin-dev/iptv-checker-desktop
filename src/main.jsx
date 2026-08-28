import React from 'react'
import ReactDOM from 'react-dom/client'
import 'video.js/dist/video-js.css'
import './index.css'
import App from './App.jsx'
import { setupNetwork } from './proxy'

// 网络层：Tauri 环境始终启用 —— 本机/内网地址直连（不受系统代理影响），外网按应用代理设置走
setupNetwork()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
