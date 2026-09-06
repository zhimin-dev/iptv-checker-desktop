import React, { useEffect, useMemo, useRef, useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import RefreshIcon from '@mui/icons-material/Refresh'
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate'
import SettingsIcon from '@mui/icons-material/Settings'
import SearchIcon from '@mui/icons-material/Search'
import TvIcon from '@mui/icons-material/Tv'
import FavoriteIcon from '@mui/icons-material/Favorite'
import { useT } from '../i18n'
import { describeError, getCachedChannels, getChannels, getFavourites, getSnapInterval, getSnapshots, getSnapshotsConfig, recordSearch, removeFavourite, setCachedChannels } from '../services/api'
import CustomPlayButton from '../components/CustomPlayButton'
import { fetchAsBlobUrl, isLocalHost } from '../proxy'

const GRID_PAGE = 60
const SNAP_CHUNK = 24

export default function HomeScreen({ server, notifyError, onOpenChannel, onChangeServer, onOpenSettings, onOpenSearch }) {
  const { t } = useT()
  const [channels, setChannels] = useState(null)
  const [favourites, setFavourites] = useState([])
  const [favPage, setFavPage] = useState(0)
  const [favTotal, setFavTotal] = useState(0)
  const [favLoadingMore, setFavLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cacheSavedAt, setCacheSavedAt] = useState(0)
  // 分组筛选：'' = 全部（已检查 + 已收藏），'__fav__' = 已收藏，其余为具体分组
  const [activeGroup, setActiveGroup] = useState('')
  const [gridLimit, setGridLimit] = useState(GRID_PAGE)
  // 是否展示频道画面：由后台设置控制
  const [showSnapshots, setShowSnapshots] = useState(false)
  // url -> { snapshot, captured_at }
  const [snapshots, setSnapshots] = useState({})
  const [favSnapshots, setFavSnapshots] = useState({})
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [favSnapLoading, setFavSnapLoading] = useState(false)
  const [snapVersion, setSnapVersion] = useState(0)
  // 画面自动刷新间隔（分钟）：5/10/30/60，设置页可改
  const [snapInterval] = useState(() => getSnapInterval())
  // 每 30 秒重渲染一次，更新“画面多久之前”角标
  const [tick, setTick] = useState(0)
  const FAV_PAGE_SIZE = 60
  const channelsRef = useRef(null)
  channelsRef.current = channels
  const favRef = useRef([])
  favRef.current = favourites
  const showSnapshotsRef = useRef(showSnapshots)
  showSnapshotsRef.current = showSnapshots
  // 最近一次成功刷新画面的时间（用于自动刷新到点判断）
  const lastSnapRefreshRef = useRef(0)
  // 防止并发抓帧
  const snapLoadingRef = useRef(false)
  // 始终指向最新的 loadSnapshots / loadFavSnapshots（避免定时器捕获旧闭包）
  const loadSnapshotsRef = useRef(null)
  const loadFavSnapshotsRef = useRef(null)

  /** 点击频道：把点击的频道放在首位，其余同名源作为备用（自动切换），并记录搜索历史 */
  const handleOpenChannel = (c) => {
    recordSearch(server, c.name)
    const allList = (channels || []).concat(favourites.map((f) => ({ id: f.id, name: f.name, url: f.url, group: '' })))
    const sameName = allList.filter((x) => x.name === c.name && x.url !== c.url)
    onOpenChannel({ ...c, alternates: [c, ...sameName] })
  }

  /** 加载：已检查频道（缓存优先）+ 已收藏频道 */
  const load = async (forceServerRefresh) => {
    setError('')
    if (!channelsRef.current) {
      const cached = await getCachedChannels('checked')
      if (cached && cached.server === server) {
        setChannels(cached.list)
        setCacheSavedAt(cached.savedAt || 0)
      }
    }
    if (!channelsRef.current) setLoading(true)
    else setRefreshing(true)
    try {
      const data = await getChannels(server, 'checked', !!forceServerRefresh)
      setChannels(data.list || [])
      setCacheSavedAt(0)
      setCachedChannels(data.list || [], server, 'checked')
    } catch (e) {
      notifyError(t('loadFailed') + ' · ' + describeError(e))
      if (!channelsRef.current) {
        const msg = (e.response && e.response.data && e.response.data.msg) || e.message || ''
        setError(msg)
        setChannels(null)
      } else {
        console.log('channel list refresh failed', e)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
    // 收藏列表
    try {
      const favData = await getFavourites(server, 0, FAV_PAGE_SIZE)
      setFavourites(favData.list || [])
      setFavPage(0)
      setFavTotal(favData.total || 0)
    } catch (e) {
      console.log('favourites load failed', e)
      notifyError(t('loadFailed') + ' · ' + describeError(e))
    }
  }

  /** 收藏加载更多 */
  const loadMoreFavourites = async () => {
    if (favLoadingMore) return
    setFavLoadingMore(true)
    try {
      const next = favPage + 1
      const favData = await getFavourites(server, next, FAV_PAGE_SIZE)
      setFavourites((prev) => [...prev, ...(favData.list || [])])
      setFavPage(next)
      setFavTotal(favData.total || 0)
    } catch (e) {
      console.log('load more favourites failed', e)
    } finally {
      setFavLoadingMore(false)
    }
  }

  useEffect(() => {
    setChannels(null)
    setCacheSavedAt(0)
    setError('')
    setGridLimit(GRID_PAGE)
    setActiveGroup('')
    load(false)
  }, [server])

  const handleRemoveFavourite = async (e, id) => {
    e.stopPropagation()
    try {
      await removeFavourite(server, id)
      setFavourites((prev) => prev.filter((f) => f.id !== id))
      setFavTotal((n) => Math.max(0, n - 1))
    } catch (err) {
      console.log('remove favourite failed', err)
    }
  }

  // ---------- 频道画面快照 ----------

  /** 分块请求快照（按 24 个源一组，避免单次请求超时），返回 url -> {snapshot, captured_at} */
  const fetchSnapChunks = async (list, refresh, existingOnly) => {
    const map = {}
    for (let i = 0; i < list.length; i += SNAP_CHUNK) {
      const urls = list.slice(i, i + SNAP_CHUNK).map((c) => c.url)
      const data = await getSnapshots(server, urls, refresh, existingOnly)
      ;(data.list || []).forEach((item) => {
        map[item.url] = {
          snapshot: item.ok && item.snapshot ? item.snapshot : '',
          captured_at: item.captured_at || 0,
        }
      })
    }
    return map
  }

  /** 抓取全部频道画面（不只当前窗口显示的频道）。用 ref 读取最新频道列表，避免定时器旧闭包问题 */
  const loadSnapshots = async (force) => {
    const list = channelsRef.current
    if (!list || list.length === 0) return
    if (snapLoadingRef.current) return
    snapLoadingRef.current = true
    setSnapshotLoading(true)
    try {
      const map = await fetchSnapChunks(list, !!force, false)
      setSnapshots((prev) => ({ ...prev, ...map }))
      // 刷新后递增版本号，附加到图片 URL 上强制浏览器重新加载
      setSnapVersion((v) => v + 1)
      // 只有强制刷新才推进计时起点（页面打开时的缓存展示不推进），
      // 保证打开应用后 1 分钟内就会强制抓一次最新画面
      if (force) lastSnapRefreshRef.current = Date.now()
    } catch (e) {
      console.log('snapshots failed', e)
      notifyError(describeError(e))
    } finally {
      setSnapshotLoading(false)
      snapLoadingRef.current = false
    }
  }

  /** 刷新页面后立即展示上次抓取的画面（不重新抓帧），后台再异步补抓 */
  const loadExistingSnapshots = async () => {
    const list = channelsRef.current
    if (!list || list.length === 0) return
    try {
      const map = await fetchSnapChunks(list, false, true)
      setSnapshots((prev) => ({ ...prev, ...map }))
      setSnapVersion((v) => v + 1)
    } catch (e) {
      console.log('existing snapshots failed', e)
    }
  }

  /** 已收藏频道画面（手动刷新按钮传 force） */
  const loadFavSnapshots = async (force) => {
    const list = favRef.current
    if (!list || list.length === 0) return
    setFavSnapLoading(true)
    try {
      const map = await fetchSnapChunks(list, !!force, false)
      setFavSnapshots((prev) => ({ ...prev, ...map }))
      setSnapVersion((v) => v + 1)
      if (force) lastSnapRefreshRef.current = Date.now()
    } catch (e) {
      console.log('fav snapshots failed', e)
    } finally {
      setFavSnapLoading(false)
    }
  }

  // 读取后台「显示频道画面」开关
  useEffect(() => {
    getSnapshotsConfig(server)
      .then((d) => setShowSnapshots(!!(d && d.enabled)))
      .catch(() => {})
  }, [server])

  // 开关开启/频道加载后：先用上次抓取的画面立即展示，再后台补抓
  useEffect(() => {
    if (showSnapshots && channels && channels.length > 0) {
      loadExistingSnapshots().then(() => loadSnapshots(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSnapshots, channels && channels.length])

  // 已收藏频道画面：先展示上次画面，再后台补抓
  useEffect(() => {
    if (showSnapshots && favourites.length > 0) {
      fetchSnapChunks(favourites, false, true).then((map) => {
        setFavSnapshots((prev) => ({ ...prev, ...map }))
        setSnapVersion((v) => v + 1)
      })
      loadFavSnapshots(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSnapshots, favourites.length])

  // 始终让 ref 指向最新实现
  loadSnapshotsRef.current = loadSnapshots
  loadFavSnapshotsRef.current = loadFavSnapshots

  // 按设定间隔自动刷新画面（已检查 + 已收藏，5/10/30/60 分钟）。
  // 采用「记录上次成功刷新时间 + 每分钟检查一次」而不是裸 setInterval：
  // 1) 定时器闭包不再捕获旧频道列表（用 ref 读最新值）；
  // 2) 窗口最小化/后台时 WebView 可能节流或冻结定时器，恢复可见后立即补刷新。
  useEffect(() => {
    if (!showSnapshots) return
    const ms = Math.max(1, snapInterval) * 60 * 1000
    const check = () => {
      if (!showSnapshotsRef.current) return
      if (Date.now() - lastSnapRefreshRef.current < ms) return
      const jobs = []
      let anyWork = false
      const checked = channelsRef.current
      if (checked && checked.length > 0) {
        anyWork = true
        jobs.push(loadSnapshotsRef.current ? loadSnapshotsRef.current(true) : Promise.resolve())
      }
      const favs = favRef.current
      if (favs && favs.length > 0) {
        anyWork = true
        jobs.push(loadFavSnapshotsRef.current ? loadFavSnapshotsRef.current(true) : Promise.resolve())
      }
      if (!anyWork) {
        // 没有可刷新的频道时也推进计时起点，避免每分钟空转
        lastSnapRefreshRef.current = Date.now()
        return
      }
      Promise.allSettled(jobs).then((results) => {
        if (results.some((r) => r.status === 'fulfilled')) {
          lastSnapRefreshRef.current = Date.now()
        }
      })
    }
    const timer = setInterval(check, 60000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        // 恢复可见：立即重算画面时间角标并检查是否到点补刷新
        setTick((v) => v + 1)
        check()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSnapshots, snapInterval])

  // 画面时间角标：每 30 秒重算一次“多久之前”
  useEffect(() => {
    const timer = setInterval(() => setTick((v) => v + 1), 30000)
    return () => clearInterval(timer)
  }, [])

  // ---------- 频道列表：全部 = 已检查 + 已收藏（去重合并） ----------

  /** 收藏频道从已检查列表按 url 关联分组（收藏数据本身不带 group） */
  const favGroupOf = useMemo(() => {
    const map = new Map()
    for (const c of channels || []) {
      if (c.url && !map.has(c.url)) map.set(c.url, c.group || '')
    }
    return map
  }, [channels])

  /** 全部频道：已检查在前，未重复的收藏追加在后（按 url 去重） */
  const allChannels = useMemo(() => {
    const seen = new Set()
    const list = []
    for (const c of channels || []) {
      if (c.url && !seen.has(c.url)) {
        seen.add(c.url)
        list.push(c)
      }
    }
    for (const f of favourites) {
      if (f.url && !seen.has(f.url)) {
        seen.add(f.url)
        list.push({ id: f.id, name: f.name, url: f.url, group: favGroupOf.get(f.url) || '', fav: true })
      }
    }
    return list
  }, [channels, favourites, favGroupOf])

  /** 分组聚合（含收藏频道关联的分组），顺序与全部列表一致 */
  const allGrouped = useMemo(() => {
    const map = new Map()
    for (const c of allChannels) {
      const g = c.group || t('noGroup')
      if (!map.has(g)) map.set(g, [])
      map.get(g).push(c)
    }
    return Array.from(map.entries()).map(([group, list]) => ({ group, list }))
  }, [allChannels, t])

  /** 按选中筛选：'' = 全部，'__fav__' = 已收藏，其余为具体分组 */
  const visibleChannels = useMemo(() => {
    if (!activeGroup) return allChannels
    if (activeGroup === '__fav__') return allChannels.filter((c) => c.fav)
    return allChannels.filter((c) => (c.group || t('noGroup')) === activeGroup)
  }, [allChannels, activeGroup, t])

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="inherit" elevation={1}>
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <Typography variant="h6" noWrap sx={{ flexGrow: 0 }}>
            {t('appName')}
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={server}
            onClick={onChangeServer}
            title={t('changeServer')}
            sx={{ maxWidth: 320, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <CustomPlayButton onPlay={onOpenChannel} />
          <IconButton onClick={onOpenSearch} title={t('searchPlaceholder')}>
            <SearchIcon />
          </IconButton>
          <IconButton onClick={() => load(true)} title={t('refresh')} disabled={refreshing}>
            {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
          {/* 右上角：频道画面刷新（已检查 + 已收藏一起刷） */}
          {showSnapshots ? (
            <IconButton
              onClick={() => {
                loadSnapshots(true)
                loadFavSnapshots(true)
              }}
              title={t('refreshSnapshots')}
              disabled={snapshotLoading || favSnapLoading}
            >
              {snapshotLoading || favSnapLoading ? (
                <CircularProgress size={20} />
              ) : (
                <AddPhotoAlternateIcon />
              )}
            </IconButton>
          ) : null}
          <IconButton onClick={onOpenSettings} title={t('settings')}>
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
        {loading && !channels ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : null}

        {!loading && error ? (
          <Box sx={{ textAlign: 'center', py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Alert severity="error" variant="outlined">
              {t('loadFailed')}
              {error ? '：' + error : ''}
            </Alert>
            <Button variant="contained" onClick={() => load(true)}>
              {t('retry')}
            </Button>
          </Box>
        ) : null}

        {!loading && !error && allChannels.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              {t('checkedEmpty')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('checkedEmptyHint')}
            </Typography>
            <Button variant="contained" onClick={() => load(true)}>
              {t('retry')}
            </Button>
          </Box>
        ) : null}

        {allChannels.length > 0 ? (
          <>
            {/* 分组筛选：[全部] [已收藏] [分组...]，分组很多时自动上下换行，不横向滑动 */}
            <Box sx={{ mt: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {cacheSavedAt ? (
                <Typography variant="caption" color="text.secondary">
                  {t('cachedAt')} · {t('cacheSavedAt', { t: new Date(cacheSavedAt).toLocaleString() })}
                </Typography>
              ) : null}
              <Chip
                label={t('allGroups')}
                size="small"
                color={activeGroup === '' ? 'primary' : 'default'}
                variant={activeGroup === '' ? 'filled' : 'outlined'}
                onClick={() => setActiveGroup('')}
              />
              <Chip
                label={t('favouriteTitle') + '（' + favTotal + '）'}
                size="small"
                color={activeGroup === '__fav__' ? 'primary' : 'default'}
                variant={activeGroup === '__fav__' ? 'filled' : 'outlined'}
                onClick={() => setActiveGroup(activeGroup === '__fav__' ? '' : '__fav__')}
              />
              {allGrouped.map((g) => (
                <Chip
                  key={g.group}
                  label={g.group}
                  size="small"
                  color={activeGroup === g.group ? 'primary' : 'default'}
                  variant={activeGroup === g.group ? 'filled' : 'outlined'}
                  onClick={() => setActiveGroup(activeGroup === g.group ? '' : g.group)}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              {visibleChannels.slice(0, gridLimit).map((c) => (
                <ChannelCard
                  key={(c.fav ? 'fav-' : 'ch-') + (c.id || c.url)}
                  channel={c}
                  snapshotMeta={showSnapshots ? (c.fav ? favSnapshots[c.url] : snapshots[c.url]) : null}
                  version={snapVersion}
                  tick={tick}
                  server={server}
                  stretch={visibleChannels.length < 3}
                  onClick={() => handleOpenChannel(c)}
                  action={
                    c.fav ? (
                      <IconButton size="small" onClick={(e) => handleRemoveFavourite(e, c.id)} title={t('unfavourite')}>
                        <FavoriteIcon fontSize="small" color="error" />
                      </IconButton>
                    ) : undefined
                  }
                />
              ))}
            </Box>
            {visibleChannels.length > gridLimit ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <Button size="small" onClick={() => setGridLimit((n) => n + GRID_PAGE)}>
                  {t('loadMore')} ({gridLimit}/{visibleChannels.length})
                </Button>
              </Box>
            ) : null}
            {favourites.length < favTotal ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <Button size="small" onClick={loadMoreFavourites} disabled={favLoadingMore}>
                  {favLoadingMore ? t('loading') : t('loadMore') + ' (' + favourites.length + '/' + favTotal + ')'}
                </Button>
              </Box>
            ) : null}
          </>
        ) : null}
      </Box>
    </Box>
  )
}

/** 把抓帧时间格式化为“刚刚 / X秒前 / X分钟前 / X小时前” */
function fmtSnapAge(ts, t) {
  if (!ts) return ''
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - ts)
  if (diff < 5) return t('snapAgeNow')
  if (diff < 60) return t('snapAgeSec', { s: diff })
  if (diff < 3600) return t('snapAgeMin', { m: Math.floor(diff / 60) })
  return t('snapAgeHour', { h: Math.floor(diff / 3600) })
}

/** 统一尺寸的小电视卡片：常规网格固定宽度（末行与上行宽度一致，小屏保证一排至少 2 个）；
 *  stretch=true（频道不足 3 个）时拉伸撑满整行，避免右侧留白。16:9 画面区，固定高度名称行 */
function ChannelCard({ channel, snapshotMeta, server, onClick, action, version, tick, stretch }) {
  const { t } = useT()
  const snapshot = snapshotMeta && snapshotMeta.snapshot ? snapshotMeta.snapshot : ''
  const ageText = snapshot ? fmtSnapAge(snapshotMeta.captured_at, t) : ''
  return (
    <Card
      sx={{
        cursor: 'pointer',
        // 不足 3 个频道：卡片拉伸平分整行宽度，不残留右侧空白；
        // 常规网格：固定宽度，末行不被 flex-grow 拉伸、与上行宽度一致，
        // 且宽度不超过 (容器宽 - 间距)/2，小屏下保证一排至少放 2 个
        flex: stretch ? '1 1 240px' : '0 0 auto',
        width: stretch ? undefined : 'min(300px, calc((100% - 16px) / 2))',
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.15s ease',
        '&:hover': { transform: 'scale(1.03)' },
      }}
      onClick={onClick}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          bgcolor: '#0d0d0d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px 4px 0 0',
        }}
      >
        {snapshot ? (
          <SnapshotImage src={server + snapshot + '?v=' + (version || 0)} alt={channel.name} useBlob={!!window.__TAURI_INTERNALS__} />
        ) : channel.logo ? (
          <LogoImage src={channel.logo} server={server} alt={channel.name} />
        ) : (
          <TvIcon sx={{ color: 'grey.600', fontSize: 36 }} />
        )}
        {/* 右上角：最后一次抓帧距现在多久 */}
        {ageText ? (
          <Box
            sx={{
              position: 'absolute',
              top: 6,
              right: 6,
              bgcolor: 'rgba(0, 0, 0, 0.68)',
              color: '#fff',
              fontSize: 11,
              lineHeight: 1.4,
              px: 0.8,
              py: 0.2,
              borderRadius: '4px',
              zIndex: 2,
              pointerEvents: 'none',
            }}
          >
            {ageText}
          </Box>
        ) : null}
      </Box>
      <CardContent
        sx={{
          p: '8px 12px',
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          '&:last-child': { pb: '8px !important' },
        }}
      >
        <Typography variant="body2" noWrap sx={{ fontWeight: 500, flexGrow: 1 }}>
          {channel.name}
        </Typography>
        {action || null}
      </CardContent>
    </Card>
  )
}

/** 频道图标：本机/内网地址（含服务端相对路径）经网络层拉取转 blob URL，外网地址直接用 img */
function LogoImage({ src, server, alt }) {
  const tauri = !!window.__TAURI_INTERNALS__
  const [blobUrl, setBlobUrl] = useState('')
  const full = src && src.startsWith('/') ? server + src : src
  useEffect(() => {
    if (!tauri || !full) return
    if (!isLocalHost(full)) return
    let cancelled = false
    fetchAsBlobUrl(full).then((u) => {
      if (!cancelled) setBlobUrl(u)
    })
    return () => {
      cancelled = true
    }
  }, [full, tauri])
  const finalSrc = tauri && blobUrl ? blobUrl : full
  if (!finalSrc) {
    return <TvIcon sx={{ color: 'grey.600', fontSize: 36 }} />
  }
  return (
    <img
      src={finalSrc}
      alt={alt}
      loading="lazy"
      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
    />
  )
}

/** 快照图片：Tauri 环境下用网络层拉取转 blob URL（本机地址直连，不受系统代理影响） */
function SnapshotImage({ src, alt, useBlob }) {
  const [blobUrl, setBlobUrl] = useState('')
  useEffect(() => {
    let cancelled = false
    if (!useBlob) return
    fetchAsBlobUrl(src).then((u) => {
      if (!cancelled) setBlobUrl(u)
    })
    return () => {
      cancelled = true
    }
  }, [src, useBlob])
  const finalSrc = useBlob ? blobUrl || '' : src
  if (!finalSrc) {
    return <TvIcon sx={{ color: 'grey.600', fontSize: 36 }} />
  }
  return (
    <img
      src={finalSrc}
      alt={alt}
      loading="lazy"
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
  )
}
