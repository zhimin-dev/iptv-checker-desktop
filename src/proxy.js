// 桌面端代理：配置代理后，客户端所有 HTTP 请求（接口 + 播放 + 快照）
// 均通过 tauri http 插件转发，支持 http/https/socks5 代理。

import axios from 'axios'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'

const LS_PROXY = 'iptv-player.proxy'

export function getProxyUrl() {
  return localStorage.getItem(LS_PROXY) || ''
}

export function setProxyUrl(url) {
  const u = (url || '').trim()
  if (u) localStorage.setItem(LS_PROXY, u)
  else localStorage.removeItem(LS_PROXY)
}

export function hasProxy() {
  return !!getProxyUrl()
}

/** 经 tauri http 插件（带代理）发请求，返回 Web Response */
export async function proxyFetch(url, options) {
  const proxy = getProxyUrl()
  return tauriFetch(url, {
    ...options,
    proxy: proxy ? { all: proxy } : undefined,
  })
}

/** 序列化 axios params 为查询字符串（自定义 adapter 不会自动拼参数） */
function buildQueryString(url, params) {
  if (!params) return url
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    qs.append(k, v)
  })
  const s = qs.toString()
  if (!s) return url
  return url + (url.includes('?') ? '&' : '?') + s
}

/** AxiosHeaders → 普通对象（防止插件无法序列化内部结构导致请求失败） */
function plainHeaders(configHeaders) {
  if (!configHeaders) return undefined
  const src = typeof configHeaders.toJSON === 'function' ? configHeaders.toJSON() : configHeaders
  const out = {}
  Object.entries(src || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') out[k] = v
  })
  return out
}

/** axios 自定义 adapter：代理模式下所有 API 请求走插件；插件失败时直连兜底 */
async function proxyAxiosAdapter(config) {
  const url = buildQueryString(config.url, config.params)
  const method = (config.method || 'get').toUpperCase()
  const headers = plainHeaders(config.headers)
  const body = config.data
    ? typeof config.data === 'string'
      ? config.data
      : JSON.stringify(config.data)
    : undefined
  let resp
  try {
    resp = await proxyFetch(url, { method, headers, body })
  } catch (e) {
    // 插件请求失败（作用域受限 / 代理不可用等）时，退回系统直连再试一次
    resp = await fetch(url, {
      method,
      headers,
      body,
      signal: AbortSignal.timeout(config.timeout || 30000),
    })
  }
  const ct = (resp.headers.get('content-type') || '').toLowerCase()
  let data
  if (ct.includes('json')) data = await resp.json()
  else data = await resp.text()
  const response = {
    data,
    status: resp.status,
    statusText: resp.statusText,
    headers: Object.fromEntries(resp.headers.entries()),
    config,
  }
  if (resp.status >= 400) {
    const err = new Error('Request failed with status code ' + resp.status)
    err.response = response
    throw err
  }
  return response
}

/** 最小 XHR 实现（供 video.js/VHS 使用），请求经代理 */
class ProxyXHR {
  constructor() {
    this.readyState = 0
    this.status = 0
    this.responseType = ''
    this.responseText = ''
    this.response = null
    this.onreadystatechange = null
    this.onload = null
    this.onerror = null
    this._headers = {}
    this._respHeaders = {}
    this._method = 'GET'
    this._url = ''
    this._aborted = false
  }
  open(method, url) {
    this._method = (method || 'GET').toUpperCase()
    this._url = url
    this._aborted = false
    this.readyState = 1
    this._emit()
  }
  setRequestHeader(k, v) {
    this._headers[k] = v
  }
  getResponseHeader(name) {
    return this._respHeaders[String(name).toLowerCase()] || null
  }
  getAllResponseHeaders() {
    return Object.entries(this._respHeaders)
      .map(([k, v]) => k + ': ' + v)
      .join('\r\n')
  }
  abort() {
    this._aborted = true
  }
  send(body) {
    const self = this
    ;(async () => {
      try {
        const resp = await proxyFetch(this._url, {
          method: this._method,
          headers: this._headers,
          body: body || undefined,
        })
        if (self._aborted) return
        self.status = resp.status
        self._respHeaders = {}
        resp.headers.forEach((v, k) => {
          self._respHeaders[k.toLowerCase()] = v
        })
        self.readyState = 2
        self._emit()
        const buf = await resp.arrayBuffer()
        if (self._aborted) return
        if (self.responseType === 'arraybuffer') {
          self.response = buf
        } else {
          self.responseText = new TextDecoder().decode(buf)
          self.response = self.responseText
        }
        self.readyState = 4
        self._emit()
        if (self.onload) self.onload({ target: self })
      } catch (e) {
        self.readyState = 4
        self._emit()
        if (self.onerror) self.onerror({ target: self })
      }
    })()
  }
  _emit() {
    if (this.onreadystatechange) this.onreadystatechange()
  }
}

/** 代理模式下，通过 fetch 获取图片并转 blob URL（img 标签不走 XHR，需手动加载） */
export async function fetchAsBlobUrl(url) {
  try {
    const resp = await proxyFetch(url, { method: 'GET' })
    if (!resp.ok) return ''
    const blob = await resp.blob()
    return URL.createObjectURL(blob)
  } catch (e) {
    return ''
  }
}

/** 应用代理设置：有代理时覆写 axios adapter 与全局 XHR */
export function setupProxy() {
  if (!hasProxy()) return
  if (!window.__TAURI_INTERNALS__) return
  axios.defaults.adapter = proxyAxiosAdapter
  window.XMLHttpRequest = ProxyXHR
}
