import React, { useEffect, useMemo, useRef, useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import RefreshIcon from '@mui/icons-material/Refresh'
import SettingsIcon from '@mui/icons-material/Settings'
import SearchIcon from '@mui/icons-material/Search'
import TvIcon from '@mui/icons-material/Tv'
import FavoriteIcon from '@mui/icons-material/Favorite'
import { useT } from '../i18n'
import { getCachedChannels, getChannels, getFavourites, getSnapInterval, getSnapshots, getSnapshotsConfig, recordSearch, removeFavourite, setCachedChannels } from '../services/api'
import CustomPlayButton from '../components/CustomPlayButton'
import { fetchAsBlobUrl, hasProxy } from '../proxy'

const GRID_PAGE = 60
const SNAP_CHUNK = 24
const CARD_WIDTH = 300

export default function HomeScreen({ server, onOpenChannel, onChangeServer, onOpenSettings, onOpenSearch }) {
  const { t } = useT()
  const [tab, setTab] = useState('checked')
  const [channels, setChannels] = useState(null)
  const [favourites, setFavourites] = useState([])
  const [favPage, setFavPage] = useState(0)
  const [favTotal, setFavTotal] = useState(0)
  const [favLoadingMore, setFavLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [cacheSavedAt, setCacheSavedAt] = useState(0)
  const [activeGroup, setActiveGroup] = useState('')
  const [gridLimit, setGridLimit] = useState(GRID_PAGE)
  const [favLimit, setFavLimit] = useState(GRID_PAGE)
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
  const showSnapshotsRef = useRef(showSnapshots)
  showSnapshotsRef.current = showSnapshots

  /** 点击频道：把同名频道的所有源一起带给播放页（自动切换备用源），并记录搜索历史 */
  const handleOpenChannel = (c) => {
    recordSearch(server, c.name)
    const sameName = (channels || []).filter((x) => x.name === c.name)
    onOpenChannel(sameName.length > 0 ? { ...c, alternates: sameName } : c)
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
      // 已检查无数据但收藏有数据时，默认展示收藏 tab
      setChannels((prev) => {
        if ((prev === null || prev.length === 0) && (favData.list || []).length > 0) {
          setTab('fav')
        }
        return prev
      })
    } catch (e) {
      console.log('favourites load failed', e)
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
    setFavLimit(GRID_PAGE)
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

  /** 抓取全部频道画面（不只当前窗口显示的频道） */
  const loadSnapshots = async (force) => {
    if (!channels || channels.length === 0) return
    setSnapshotLoading(true)
    try {
      const map = await fetchSnapChunks(channels, !!force, false)
      setSnapshots((prev) => ({ ...prev, ...map }))
      // 刷新后递增版本号，附加到图片 URL 上强制浏览器重新加载
      setSnapVersion((v) => v + 1)
    } catch (e) {
      console.log('snapshots failed', e)
    } finally {
      setSnapshotLoading(false)
    }
  }

  /** 刷新页面后立即展示上次抓取的画面（不重新抓帧），后台再异步补抓 */
  const loadExistingSnapshots = async () => {
    if (!channels || channels.length === 0) return
    try {
      const map = await fetchSnapChunks(channels, false, true)
      setSnapshots((prev) => ({ ...prev, ...map }))
      setSnapVersion((v) => v + 1)
    } catch (e) {
      console.log('existing snapshots failed', e)
    }
  }

  /** 已收藏频道画面（手动刷新按钮传 force） */
  const loadFavSnapshots = async (force) => {
    if (!favourites || favourites.length === 0) return
    setFavSnapLoading(true)
    try {
      const map = await fetchSnapChunks(favourites, !!force, false)
      setFavSnapshots((prev) => ({ ...prev, ...map }))
      setSnapVersion((v) => v + 1)
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

  // 按设定间隔自动刷新全部频道画面（5/10/30/60 分钟）
  useEffect(() => {
    if (!showSnapshots) return
    const ms = Math.max(1, snapInterval) * 60 * 1000
    const timer = setInterval(() => {
      if (showSnapshotsRef.current) loadSnapshots(true)
    }, ms)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSnapshots, snapInterval])

  // 画面时间角标：每 30 秒重算一次“多久之前”
  useEffect(() => {
    const timer = setInterval(() => setTick((v) => v + 1), 30000)
    return () => clearInterval(timer)
  }, [])

  const grouped = useMemo(() => {
    if (!channels) return []
    const map = new Map()
    for (const c of channels) {
      const g = c.group || t('noGroup')
      if (!map.has(g)) map.set(g, [])
      map.get(g).push(c)
    }
    return Array.from(map.entries()).map(([group, list]) => ({ group, list }))
  }, [channels, t])

  const visibleGroups = useMemo(() => {
    if (!activeGroup) return grouped
    return grouped.filter((g) => g.group === activeGroup)
  }, [grouped, activeGroup])

  const visibleChannels = useMemo(() => {
    const list = []
    visibleGroups.forEach((g) => g.list.forEach((c) => list.push(c)))
    return list
  }, [visibleGroups])

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
          <IconButton onClick={onOpenSettings} title={t('settings')}>
            <SettingsIcon />
          </IconButton>
        </Toolbar>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="fullWidth">
          <Tab value="checked" label={t('sourceChecked') + '（' + (channels ? channels.length : 0) + '）'} />
          <Tab value="fav" label={t('favouriteTitle') + '（' + favTotal + '）'} />
        </Tabs>
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

        {tab === 'checked' ? (
          <>
            {!loading && !error && channels && channels.length === 0 ? (
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

            {channels && channels.length > 0 ? (
              <>
                {/* 刷新画面按钮 + 分组筛选放在同一行；分组很多时自动上下换行，不横向滑动 */}
                <Box sx={{ mt: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {showSnapshots ? (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={snapshotLoading ? <CircularProgress size={14} /> : <RefreshIcon fontSize="small" />}
                      disabled={snapshotLoading}
                      onClick={() => loadSnapshots(true)}
                    >
                      {t('refreshSnapshots')}
                    </Button>
                  ) : null}
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
                  {grouped.map((g) => (
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
                      key={c.id || c.url}
                      channel={c}
                      snapshotMeta={showSnapshots ? snapshots[c.url] : null}
                      version={snapVersion}
                      tick={tick}
                      server={server}
                      onClick={() => handleOpenChannel(c)}
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
              </>
            ) : null}
          </>
        ) : (
          <>
            {showSnapshots && favourites.length > 0 ? (
              <Box sx={{ mt: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={favSnapLoading ? <CircularProgress size={14} /> : <RefreshIcon fontSize="small" />}
                  disabled={favSnapLoading}
                  onClick={() => loadFavSnapshots(true)}
                >
                  {t('refreshSnapshots')}
                </Button>
              </Box>
            ) : null}
            {favourites.length === 0 && !favLoadingMore ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="body1" color="text.secondary">
                  {t('favouriteEmptyHint')}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
                {favourites.slice(0, favLimit).map((f) => (
                  <ChannelCard
                    key={f.id}
                    channel={{ id: f.id, name: f.name, url: f.url, group: '' }}
                    snapshotMeta={showSnapshots ? favSnapshots[f.url] : null}
                    version={snapVersion}
                    tick={tick}
                    server={server}
                    onClick={() => handleOpenChannel({ id: f.id, name: f.name, url: f.url, group: '' }) }
                    action={
                      <IconButton size="small" onClick={(e) => handleRemoveFavourite(e, f.id)} title={t('unfavourite')}>
                        <FavoriteIcon fontSize="small" color="error" />
                      </IconButton>
                    }
                  />
                ))}
              </Box>
            )}
            {favourites.length < favTotal ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <Button size="small" onClick={loadMoreFavourites} disabled={favLoadingMore}>
                  {favLoadingMore ? t('loading') : t('loadMore') + ' (' + favourites.length + '/' + favTotal + ')'}
                </Button>
              </Box>
            ) : null}
          </>
        )}
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

/** 统一尺寸的小电视卡片：固定 300 宽，16:9 画面区，固定高度名称行 */
function ChannelCard({ channel, snapshotMeta, server, onClick, action, version, tick }) {
  const { t } = useT()
  const snapshot = snapshotMeta && snapshotMeta.snapshot ? snapshotMeta.snapshot : ''
  const ageText = snapshot ? fmtSnapAge(snapshotMeta.captured_at, t) : ''
  return (
    <Card
      sx={{
        cursor: 'pointer',
        width: CARD_WIDTH,
        flexShrink: 0,
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
          height: CARD_WIDTH * 9 / 16,
          bgcolor: '#0d0d0d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px 4px 0 0',
        }}
      >
        {snapshot ? (
          <SnapshotImage src={server + snapshot + '?v=' + (version || 0)} alt={channel.name} useBlob={hasProxy()} />
        ) : channel.logo ? (
          <img
            src={channel.logo}
            alt={channel.name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          />
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

/** 快照图片：代理模式下用 fetch 拉取转 blob URL */
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
