// 桌面端网络层：
// - 本机/内网地址（localhost、127.*、10.*、192.168.*、172.16-31.*、主机名）永远直连，
//   绝不走系统代理或应用代理 —— 解决系统代理（如 Clash）把 127.0.0.1 转发到远端节点导致 502 的问题；
// - 外网地址：配置了应用代理时走应用代理（tauri http 插件），否则走系统网络栈（系统代理照常生效）；
// - 在 Tauri 环境里，axios 与全局 XHR 统一换成下面的实现（网页预览模式不受影响）。

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

/** 是否本机/内网地址：这些地址一律直连，不经过任何代理 */
export function isLocalHost(url) {
  try {
    const u = new URL(url, 'http://127.0.0.1')
    const host = u.hostname.toLowerCase()
    if (host === 'localhost' || host === '::1') return true
    if (/^127\./.test(host)) return true
    if (/^10\./.test(host)) return true
    if (/^192\.168\./.test(host)) return true
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true
    if (host === '0.0.0.0') return true
    if (!host.includes('.')) return true // <local>：无点主机名
    return false
  } catch (e) {
    return false
  }
}

/** 根据地址选择网络路径：
 *  - 本机/内网 → tauri 插件直连（reqwest 默认不读系统代理）
 *  - 外网 + 应用代理 → tauri 插件走代理
 *  - 外网 + 无代理 → 浏览器 fetch（系统代理照常生效）
 */
async function smartFetch(url, options) {
  const method = (options && options.method) || 'GET'
  const headers = (options && options.headers) || undefined
  const body = (options && options.body) || undefined
  if (isLocalHost(url)) {
    return tauriFetch(url, { method, headers, body })
  }
  const proxy = getProxyUrl()
  if (proxy) {
    return tauriFetch(url, { method, headers, body, proxy: { all: proxy } })
  }
  return fetch(url, { method, headers, body, signal: AbortSignal.timeout((options && options.timeout) || 30000) })
}

/** 经网络层发请求，返回 Web Response（供 fetchAsBlobUrl 等使用） */
export async function proxyFetch(url, options) {
  return smartFetch(url, options)
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

/** axios 自定义 adapter：本机直连 / 外网按应用代理设置走插件或系统网络 */
async function proxyAxiosAdapter(config) {
  const url = buildQueryString(config.url, config.params)
  const method = (config.method || 'get').toUpperCase()
  const headers = plainHeaders(config.headers)
  const body = config.data
    ? typeof config.data === 'string'
      ? config.data
      : JSON.stringify(config.data)
    : undefined
  const resp = await smartFetch(url, { method, headers, body, timeout: config.timeout || 30000 })
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

/** 最小 XHR 实现（供 video.js/VHS 使用），请求经网络层 */
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
        const resp = await smartFetch(this._url, {
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

/** 通过网络层获取图片并转 blob URL（本机地址直连，不受系统代理影响） */
export async function fetchAsBlobUrl(url) {
  try {
    const resp = await smartFetch(url, { method: 'GET' })
    if (!resp.ok) return ''
    const blob = await resp.blob()
    return URL.createObjectURL(blob)
  } catch (e) {
    return ''
  }
}

/** 应用网络层：Tauri 环境里始终覆写 axios adapter 与全局 XHR */
export function setupNetwork() {
  if (!window.__TAURI_INTERNALS__) return
  axios.defaults.adapter = proxyAxiosAdapter
  window.XMLHttpRequest = ProxyXHR
}

/** 兼容旧名字 */
export function setupProxy() {
  setupNetwork()
}
