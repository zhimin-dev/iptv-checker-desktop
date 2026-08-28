import axios from 'axios'

const LS_SERVER = 'iptv-player.server'

// ---------- 服务端地址 ----------

/** 把 axios 错误转成可展示的简短描述（含请求路径与 HTTP 状态） */
export function describeError(e) {
  if (e && e.response) {
    const status = e.response.status
    let msg = ''
    const d = e.response.data
    if (d && typeof d === 'object' && d.msg) msg = String(d.msg)
    else if (typeof d === 'string') msg = d.slice(0, 200)
    const url = (e.config && e.config.url) || ''
    const path = url.replace(/^https?:\/\/[^/]+/, '')
    return path + ' → HTTP ' + status + (msg ? ' · ' + msg : '')
  }
  if (e && e.code === 'ECONNABORTED') {
    const url = (e.config && e.config.url) || ''
    return url.replace(/^https?:\/\/[^/]+/, '') + ' timeout'
  }
  return (e && e.message) || String(e)
}

export function normalizeServerUrl(input) {
  let url = (input || '').trim()
  if (!url) return ''
  if (!/^https?:\/\//i.test(url)) url = 'http://' + url
  return url.replace(/\/+$/, '')
}

export function getServerUrl() {
  return localStorage.getItem(LS_SERVER) || ''
}

export function setServerUrl(url) {
  localStorage.setItem(LS_SERVER, url)
}

export function clearServerUrl() {
  localStorage.removeItem(LS_SERVER)
}

// 直连播放统一走服务端透明代理（服务端拉源并重写 playlist），客户端无 CORS 问题
export function buildProxyUrl(base, url, userAgent) {
  let u = base + '/api/player/proxy?url=' + encodeURIComponent(url)
  if (userAgent) u += '&ua=' + encodeURIComponent(userAgent)
  return u
}

// ---------- 服务端接口 ----------

export async function testServer(base) {
  const resp = await axios.get(base + '/system/info', { timeout: 6000 })
  return resp.data
}

// source: all=全部爬取 | like=喜欢 | checked=定时检查过的
export async function getChannels(base, source, refresh) {
  const resp = await axios.get(base + '/api/player/channels', {
    params: { source: source || 'checked', refresh: refresh ? '1' : undefined },
    timeout: 180000,
  })
  return resp.data
}

// ---------- 搜索历史（服务端记录，用于收藏页推荐） ----------

export async function recordSearch(base, name) {
  try {
    await axios.post(base + '/api/player/search-history', { name }, { timeout: 8000 })
  } catch (e) {
    // 记录失败不影响主流程
  }
}

export async function getSearchHistory(base, keyword, limit) {
  const resp = await axios.get(base + '/api/player/search-history', {
    params: { keyword: keyword || '', limit: limit || 20 },
    timeout: 10000,
  })
  return resp.data
}

// ---------- 多分辨率变体 ----------

/** 查询频道 m3u8 的多码率变体列表（非 master playlist 时返回空列表） */
export async function getVariants(base, url, ua) {
  const resp = await axios.get(base + '/api/player/variants', {
    params: { url, ua: ua || undefined },
    timeout: 25000,
  })
  return resp.data
}

// ---------- 播放历史（后台播放列表） ----------

export async function recordPlay(base, name, url, playable) {
  try {
    await axios.post(
      base + '/api/player/play-history',
      { name, url, playable: !!playable },
      { timeout: 10000 }
    )
  } catch (e) {
    // 上报失败不影响播放
  }
}

export async function getPlayHistory(base, playable, keyword, limit) {
  const resp = await axios.get(base + '/api/player/play-history', {
    params: {
      playable: playable === undefined ? '' : playable ? '1' : '0',
      keyword: keyword || '',
      limit: limit || 200,
    },
    timeout: 15000,
  })
  return resp.data
}

export async function deletePlayHistory(base, id) {
  const resp = await axios.delete(base + '/api/player/play-history/' + id, { timeout: 10000 })
  return resp.data
}

export async function clearPlayHistory(base) {
  const resp = await axios.delete(base + '/api/player/play-history', { timeout: 10000 })
  return resp.data
}

// ---------- 频道收藏（具体频道，主页展示） ----------

export async function getFavourites(base, page, pageSize) {
  const resp = await axios.get(base + '/api/player/favourites', {
    params: { page: page || 0, page_size: pageSize || 20 },
    timeout: 15000,
  })
  return resp.data
}

export async function addFavourite(base, name, url) {
  const resp = await axios.post(base + '/api/player/favourites', { name, url }, { timeout: 10000 })
  return resp.data
}

export async function removeFavourite(base, id) {
  const resp = await axios.delete(base + '/api/player/favourites/' + id, { timeout: 10000 })
  return resp.data
}

export async function checkFavourite(base, url) {
  const resp = await axios.get(base + '/api/player/favourites/check', {
    params: { url },
    timeout: 10000,
  })
  return resp.data
}

// 收藏订阅 m3u8 地址
export function getFavouritesM3uUrl(base) {
  return base + '/api/player/favourites.m3u8'
}

// ---------- 频道画面快照 ----------

export async function getSnapshots(base, urls, refresh, existingOnly) {
  const resp = await axios.post(
    base + '/api/player/snapshots',
    { urls, refresh: !!refresh, existing_only: !!existingOnly },
    { timeout: 90000 }
  )
  return resp.data
}

// ---------- 频道画面自动刷新间隔（分钟） ----------

const LS_SNAP_INTERVAL = 'iptv-player.snapInterval'

export function getSnapInterval() {
  const v = Number(localStorage.getItem(LS_SNAP_INTERVAL) || 10)
  return [5, 10, 30, 60].includes(v) ? v : 10
}

export function setSnapInterval(min) {
  localStorage.setItem(LS_SNAP_INTERVAL, String(min))
}

export async function getSnapshotsConfig(base) {
  const resp = await axios.get(base + '/api/player/snapshots/config', { timeout: 8000 })
  return resp.data
}

// ---------- 网页端 → 桌面端播放请求 ----------

export async function getPlayRequest(base) {
  const resp = await axios.get(base + '/api/player/play-request', { timeout: 8000 })
  return resp.data
}

export async function ackPlayRequest(base, id) {
  try {
    await axios.post(base + '/api/player/play-request/ack', { id }, { timeout: 8000 })
  } catch (e) {
    // 忽略
  }
}

// ---------- 频道列表本地缓存（IndexedDB，容量远大于 localStorage） ----------

const DB_NAME = 'iptv-player'
const STORE_NAME = 'channels'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function cacheKey(source) {
  return 'channels:' + (source || 'checked')
}

export async function getCachedChannels(source) {
  try {
    const db = await openDb()
    const data = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(cacheKey(source))
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
    db.close()
    if (data && Array.isArray(data.list)) return data
    return null
  } catch (e) {
    return null
  }
}

export async function setCachedChannels(list, server, source) {
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put({ list, server, savedAt: Date.now() }, cacheKey(source))
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch (e) {
    // 缓存失败不影响主流程
  }
}

export async function clearLocalChannelsCache() {
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete('channels')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch (e) {
    // 忽略
  }
}

// ---------- 频道缓存（服务端） ----------

export async function clearChannelsCache(base) {
  const resp = await axios.delete(base + '/api/player/channels/cache', { timeout: 10000 })
  return resp.data
}

export async function getCacheConfig(base) {
  const resp = await axios.get(base + '/api/player/cache-config', { timeout: 10000 })
  return resp.data
}

export async function setCacheConfig(base, ttlHours) {
  const resp = await axios.post(
    base + '/api/player/cache-config',
    { ttl_hours: ttlHours },
    { timeout: 10000 }
  )
  return resp.data
}

// 分片参数（分片时长/保留分片数）统一由服务端后台配置，桌面端不再下发
// 引擎：http（纯 HTTP 下载 TS 直传，默认）或 ffmpeg（转码切片，探测失败时服务端自动回退）
export async function startRelay(base, { url, headers, mode }) {
  const resp = await axios.post(
    base + '/api/player/relay/start',
    {
      url,
      headers: headers || {},
      mode: mode || 'http',
    },
    { timeout: 20000 }
  )
  return resp.data
}

// 播放心跳：播放期间周期性上报，服务端 60 秒收不到心跳会自动停止会话
export async function relayHeartbeat(base, sid) {
  if (!sid) return
  try {
    await axios.post(base + '/api/player/relay/' + sid + '/heartbeat', {}, { timeout: 8000 })
  } catch (e) {
    // 会话可能已被服务端自动清理，忽略
  }
}

export async function relayStatus(base, sid) {
  const resp = await axios.get(base + '/api/player/relay/' + sid + '/status', {
    timeout: 8000,
  })
  return resp.data
}

export async function stopRelay(base, sid) {
  if (!sid) return
  try {
    await axios.delete(base + '/api/player/relay/' + sid, { timeout: 8000 })
  } catch (e) {
    // 会话可能已被服务端自动清理，忽略错误
  }
}

export async function getEpg(base, epgId) {
  const resp = await axios.get(base + '/epg', {
    params: { channel: epgId },
    timeout: 10000,
  })
  return resp.data
}
