import React, { useCallback, useEffect, useRef, useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import TextField from '@mui/material/TextField'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import ListSubheader from '@mui/material/ListSubheader'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SpeedIcon from '@mui/icons-material/Speed'
import LinkIcon from '@mui/icons-material/Link'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay'
import EqualizerIcon from '@mui/icons-material/Equalizer'
import EventNoteIcon from '@mui/icons-material/EventNote'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import { useT } from '../i18n'
import {
  addFavourite,
  buildProxyUrl,
  checkFavourite,
  describeError,
  getEpg,
  getVariants,
  recordPlay,
  relayHeartbeat,
  relayStatus,
  removeFavourite,
  startRelay,
  stopRelay,
} from '../services/api'
import VideoPlayer from '../components/VideoPlayer'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function progTitle(p) {
  if (!p) return ''
  const titles = p.titles || []
  const zh = titles.find((x) => x.lang === 'zh' || x.lang === 'zh-cn' || x.lang === 'zh_CN')
  return (zh || titles[0] || {}).value || ''
}

export default function PlayerScreen({ server, channel, notifyError, onBack, onSwitchChannel }) {
  const { t } = useT()
  // 同名频道的多个源：播放失败时自动尝试下一个
  const sources = channel.alternates && channel.alternates.length > 0 ? channel.alternates : [channel]
  const [sourceIndex, setSourceIndex] = useState(0)
  const current = sources[Math.min(sourceIndex, sources.length - 1)]
  // 多分辨率变体：variantUrl 为空 = 自动（直接用源地址）
  const [variants, setVariants] = useState([])
  const [variantUrl, setVariantUrl] = useState('')
  const directUrl = buildProxyUrl(server, variantUrl || current.url, current.user_agent)
  const [sourceUrl, setSourceUrl] = useState(directUrl)
  const [playError, setPlayError] = useState(false)
  const [showUrlDialog, setShowUrlDialog] = useState(false)
  const [copiedField, setCopiedField] = useState('')
  const [relayState, setRelayState] = useState('off') // off | starting | on | error
  const [relayInfo, setRelayInfo] = useState(null)
  const [relayError, setRelayError] = useState('')
  const [stallHint, setStallHint] = useState(false)
  const [epg, setEpg] = useState({ now: null, next: null })
  const [epgList, setEpgList] = useState([])
  const [showEpgDialog, setShowEpgDialog] = useState(false)
  const [favId, setFavId] = useState(null)
  const [playlistOpen, setPlaylistOpen] = useState(false)
  // 分类播放列表（从分类进入播放时携带）
  const categoryList = channel.categoryList && channel.categoryList.length > 1 ? channel.categoryList : null

  const sidRef = useRef('')
  const reportedRef = useRef('')
  const relayStateRef = useRef('off')
  relayStateRef.current = relayState
  const stallCount = useRef(0)
  const stallWindow = useRef(0)

  // ---------- 中继会话控制 ----------

  const stopCurrentRelay = useCallback(async () => {
    const sid = sidRef.current
    sidRef.current = ''
    if (sid) await stopRelay(server, sid)
  }, [server])

  // 离开页面时清理中继会话
  useEffect(() => {
    return () => {
      stopCurrentRelay()
    }
  }, [stopCurrentRelay])

  // 切换频道（播放列表快速切换）时重置播放状态
  useEffect(() => {
    setSourceIndex(0)
    setPlayError(false)
    setStallHint(false)
    setRelayState('off')
    setRelayInfo(null)
    setRelayError('')
    reportedRef.current = ''
    stopCurrentRelay()
  }, [channel.id])

  const enableRelay = async (urlOverride) => {
    if (relayStateRef.current === 'starting' || relayStateRef.current === 'on') return
    setStallHint(false)
    setPlayError(false)
    setRelayState('starting')
    setRelayError('')
    try {
      const headers = {}
      if (current.user_agent) headers['User-Agent'] = current.user_agent
      const data = await startRelay(server, {
        url: urlOverride || current.url,
        headers,
      })
      sidRef.current = data.sid

      // 等待服务端拉出第一个分片（最多 25s）
      const deadline = Date.now() + 25000
      let status = null
      while (Date.now() < deadline) {
        await sleep(1000)
        try {
          status = await relayStatus(server, data.sid)
        } catch (e) {
          continue
        }
        if (status && status.playlist_ready) break
        if (status && !status.alive && status.last_error) break
      }
      if (!status || !status.playlist_ready) {
        const reason = status && status.last_error ? status.last_error : 'playlist not ready'
        throw new Error(reason)
      }
      setRelayInfo({
        sid: data.sid,
        hlsTime: data.hls_time,
        keepSegments: data.keep_segments,
        segmentCount: status.segment_count,
      })
      setSourceUrl(server + status.playlist_url)
      setRelayState('on')
    } catch (e) {
      const msg = (e.response && e.response.data && e.response.data.msg) || e.message || ''
      setRelayError(msg)
      setRelayState('error')
      if (notifyError) notifyError(t('relayFailed') + ' · ' + describeError(e))
      await stopCurrentRelay()
    }
  }

  const disableRelay = async () => {
    setRelayState('off')
    setRelayInfo(null)
    await stopCurrentRelay()
    setSourceUrl(directUrl)
  }

  // 中继播放期间轮询状态（分片数 / 进程存活）并上报播放心跳
  useEffect(() => {
    if (relayState !== 'on') return
    const timer = setInterval(async () => {
      const sid = sidRef.current
      if (!sid) return
      try {
        const st = await relayStatus(server, sid)
        if (!st.alive) {
          // 中继意外中断，自动退回直连
          setRelayState('off')
          setRelayInfo(null)
          sidRef.current = ''
          setSourceUrl(directUrl)
          return
        }
        setRelayInfo((prev) =>
          prev ? { ...prev, segmentCount: st.segment_count, idleSecs: st.idle_secs } : prev
        )
      } catch (e) {
        // 会话被服务端自动回收（404）时退回直连；普通网络抖动不打断播放
        if (e && e.response && e.response.status === 404) {
          setRelayState('off')
          setRelayInfo(null)
          sidRef.current = ''
          setSourceUrl(directUrl)
        }
      }
    }, 6000)
    // 播放心跳：每 20 秒上报一次，服务端 60 秒收不到心跳会自动停止该会话
    relayHeartbeat(server, sidRef.current)
    const hb = setInterval(() => relayHeartbeat(server, sidRef.current), 20000)
    return () => {
      clearInterval(timer)
      clearInterval(hb)
    }
  }, [relayState, server, directUrl])

  // ---------- 卡顿检测 ----------

  const onStall = useCallback(() => {
    const now = Date.now()
    if (now - stallWindow.current > 30000) {
      stallWindow.current = now
      stallCount.current = 0
    }
    stallCount.current += 1
    if (relayStateRef.current === 'off' && stallCount.current >= 3) {
      setStallHint(true)
    }
  }, [])

  // ---------- 收藏状态 ----------

  useEffect(() => {
    setFavId(null)
    checkFavourite(server, current.url)
      .then((d) => {
        if (d && d.favourited) setFavId(d.id)
      })
      .catch(() => {})
  }, [server, current.url])

  const toggleFavourite = async () => {
    try {
      if (favId) {
        await removeFavourite(server, favId)
        setFavId(null)
      } else {
        const item = await addFavourite(server, current.name, current.url)
        if (item && item.id) setFavId(item.id)
      }
    } catch (e) {
      console.log('toggle favourite failed', e)
      if (notifyError) notifyError(describeError(e))
    }
  }

  // ---------- 播放上报（可播放标识） ----------

  // 切换源后重置上报标记，让新源可以重新上报
  useEffect(() => {
    reportedRef.current = ''
  }, [current.url])

  // 查询当前源的多分辨率变体列表（非多码率源返回空）
  useEffect(() => {
    setVariants([])
    setVariantUrl('')
    if (!current.url) return
    getVariants(server, current.url, current.user_agent)
      .then((d) => setVariants((d && d.list) || []))
      .catch(() => {})
  }, [current.url, server])

  const onPlaying = useCallback(() => {
    const key = current.url
    if (reportedRef.current === key) return
    reportedRef.current = key
    recordPlay(server, current.name, current.url, true)
  }, [server, current.name, current.url])

  // ---------- EPG ----------

  useEffect(() => {
    setEpg({ now: null, next: null })
    setEpgList([])
    if (!channel || !channel.epg_id) return
    getEpg(server, channel.epg_id)
      .then((list) => {
        const all = list || []
        setEpgList(all)
        const nowUnix = Date.now() / 1000
        const nowProg = all.find((p) => p.start_unix <= nowUnix && p.stop_unix > nowUnix)
        const nextProg = all.find((p) => p.start_unix > nowUnix)
        setEpg({ now: nowProg || null, next: nextProg || null })
      })
      .catch(() => {})
  }, [channel, server])

  /** 播放失败：尝试同名频道的下一个源；全部失败才显示错误 */
  const lastSwitchRef = useRef(0)
  const handlePlayError = useCallback(() => {
    const now = Date.now()
    // 换源过渡期（旧源请求失败）的误报直接忽略
    if (now - lastSwitchRef.current < 5000) return
    lastSwitchRef.current = now
    // 上报当前源不可播放
    const key = current.url
    if (reportedRef.current !== key) {
      reportedRef.current = key
      recordPlay(server, current.name, current.url, false)
    }
    if (sourceIndex < sources.length - 1) {
      setPlayError(false)
      setSourceIndex((i) => i + 1)
      setRelayState('off')
      setRelayInfo(null)
      stopCurrentRelay()
    } else {
      setPlayError(true)
    }
  }, [sourceIndex, sources.length, stopCurrentRelay, server, current.name, current.url])

  // 当前源变化时切换播放地址（sourceIndex / relay 状态变化都会触发）
  useEffect(() => {
    if (relayState === 'off') {
      setSourceUrl(directUrl)
    }
  }, [directUrl, relayState])

  /** 播放栏流畅模式开关：开/关切换 */
  const handleRelayToggle = () => {
    if (relayStateRef.current === 'on' || relayStateRef.current === 'starting') {
      disableRelay()
    } else {
      enableRelay()
    }
  }

  /** 切换分辨率：直连模式直接换源；流畅模式以选中分辨率重新启动中继 */
  const handleVariantChange = (url) => {
    setVariantUrl(url)
    const wasRelay = relayStateRef.current === 'on' || relayStateRef.current === 'starting'
    if (wasRelay) {
      relayStateRef.current = 'off'
      setRelayState('off')
      setRelayInfo(null)
      stopCurrentRelay().then(() => enableRelay(url))
    }
  }

  const handleBack = () => {
    stopCurrentRelay()
    onBack()
  }

  /** 播放列表快速切换频道 */
  const handlePlaylistSwitch = (c) => {
    setPlaylistOpen(false)
    if (onSwitchChannel) {
      onSwitchChannel({ ...c, categoryList: categoryList || undefined })
    }
  }

  const handleCopy = async (field, value) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      setTimeout(() => setCopiedField(''), 1500)
    } catch (e) {
      // WebView 无剪贴板权限时忽略
    }
  }

  const delaySecs = relayInfo ? relayInfo.hlsTime * relayInfo.keepSegments : 0

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar position="static" color="inherit" elevation={1}>
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <IconButton edge="start" onClick={handleBack} title={t('back')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="subtitle1" noWrap sx={{ flexGrow: 1 }}>
            {channel.name}
          </Typography>
          {sources.length > 1 ? (
            <Chip
              size="small"
              variant="outlined"
              label={t('sourceIndex', { i: Math.min(sourceIndex, sources.length - 1) + 1, n: sources.length })}
            />
          ) : null}
          {relayState === 'on' && relayInfo ? (
            <Chip
              size="small"
              color="success"
              variant="outlined"
              label={t('relayBadge') + ' · ' + t('relayDelay', { s: delaySecs })}
            />
          ) : null}
          {relayState === 'starting' ? (
            <Chip
              size="small"
              color="info"
              variant="outlined"
              icon={<CircularProgress size={14} />}
              label={t('relayStarting')}
            />
          ) : null}
          {relayState === 'error' ? (
            <Chip size="small" color="error" variant="outlined" label={t('relayFailed')} title={relayError} />
          ) : null}
          <IconButton
            onClick={toggleFavourite}
            title={favId ? t('unfavourite') : t('favourite')}
            color={favId ? 'error' : 'default'}
          >
            {favId ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
          {categoryList ? (
            <IconButton onClick={() => setPlaylistOpen(true)} title={t('playlistTitle')}>
              <PlaylistPlayIcon />
            </IconButton>
          ) : null}
          <IconButton onClick={() => setShowUrlDialog(true)} title={t('showPlayUrl')}>
            <LinkIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ position: 'relative', flex: 1, minHeight: 0, bgcolor: '#000' }}>
        <VideoPlayer
          src={sourceUrl}
          onStall={onStall}
          onError={handlePlayError}
          onPlaying={onPlaying}
          quality={{
            variants,
            current: variantUrl,
            autoLabel: t('qualityAuto'),
            onChange: handleVariantChange,
          }}
          relay={{
            state: relayState,
            text:
              relayState === 'starting'
                ? t('relayShortStarting')
                : relayState === 'on'
                  ? t('relayShortOff')
                  : t('relayShortOn'),
            onClick: handleRelayToggle,
          }}
        />

        {relayState === 'starting' ? (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(0,0,0,0.82)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              zIndex: 30,
            }}
          >
            <CircularProgress size={40} />
            <Typography color="common.white">{t('relayStarting')}</Typography>
            <Typography variant="body2" color="grey.500">
              {t('buffering')}
            </Typography>
          </Box>
        ) : null}

        {playError && relayState !== 'starting' ? (
          <Box sx={{ position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 25 }}>
            <Alert
              severity="error"
              elevation={6}
              action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="contained" onClick={enableRelay}>
                    {t('tryRelay')}
                  </Button>
                  <Button size="small" onClick={handleBack}>
                    {t('backToList')}
                  </Button>
                </Box>
              }
            >
              <Typography variant="subtitle2">{t('allSourcesFailed')}</Typography>
              <Typography variant="body2">{t('relayErrorHint')}</Typography>
            </Alert>
          </Box>
        ) : null}

        {stallHint && relayState === 'off' ? (
          <Box sx={{ position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 25 }}>
            <Alert
              severity="warning"
              elevation={6}
              action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="contained" onClick={enableRelay}>
                    {t('enableNow')}
                  </Button>
                  <Button size="small" onClick={() => setStallHint(false)}>
                    {t('dismiss')}
                  </Button>
                </Box>
              }
            >
              <Typography variant="subtitle2">{t('stallDetected')}</Typography>
              <Typography variant="body2">{t('stallHint')}</Typography>
            </Alert>
          </Box>
        ) : null}
      </Box>

      <Box sx={{ bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', px: 2, py: 1.5 }}>
        {epg.now || epg.next ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1 }}>
            {epg.now ? (
              <Typography variant="body2" noWrap sx={{ maxWidth: '46vw' }}>
                <Box component="span" color="text.secondary">
                  {t('nowPlaying')}：
                </Box>
                {progTitle(epg.now)}
              </Typography>
            ) : null}
            {epg.next ? (
              <Typography variant="body2" noWrap sx={{ maxWidth: '46vw' }}>
                <Box component="span" color="text.secondary">
                  {t('upNext')}：
                </Box>
                {progTitle(epg.next)}
              </Typography>
            ) : null}
          </Box>
        ) : null}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {relayState === 'on' && relayInfo ? (
            <Typography variant="body2" color="success.main">
              {t('relaySegments', { n: relayInfo.segmentCount })} · {t('relayDelay', { s: delaySecs })}
            </Typography>
          ) : null}
          {relayState === 'off' ? (
            <Typography variant="body2" color="text.secondary">
              {t('relayOffHint')}
            </Typography>
          ) : null}
          {relayState === 'error' ? (
            <Typography variant="caption" color="error.main" sx={{ wordBreak: 'break-all' }}>
              {t('relayFailed')}
              {relayError ? '：' + relayError : ''} · {t('relayErrorHint')}
            </Typography>
          ) : null}
          {epgList.length > 0 ? (
            <Button size="small" variant="text" startIcon={<EventNoteIcon fontSize="small" />} onClick={() => setShowEpgDialog(true)}>
              {t('epgGuide')}
            </Button>
          ) : null}
        </Box>
      </Box>

      <Dialog open={showEpgDialog} onClose={() => setShowEpgDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{channel.name} · {t('epgGuide')}</DialogTitle>
        <DialogContent sx={{ maxHeight: 420, overflowY: 'auto' }}>
          <List dense disablePadding>
            {epgList.map((p, idx) => {
              const nowUnix = Date.now() / 1000
              const isNow = p.start_unix <= nowUnix && p.stop_unix > nowUnix
              const title = progTitle(p) || '-'
              return (
                <ListItem key={idx} divider sx={{ bgcolor: isNow ? 'action.selected' : 'inherit' }}>
                  <ListItemText
                    primary={title}
                    secondary={
                      (p.start_unix ? new Date(p.start_unix * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '') +
                      ' - ' +
                      (p.stop_unix ? new Date(p.stop_unix * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')
                    }
                    primaryTypographyProps={{ fontSize: 14, fontWeight: isNow ? 600 : 400 }}
                    secondaryTypographyProps={{ fontSize: 12 }}
                  />
                  {isNow ? <Chip size="small" color="primary" label={t('nowPlaying')} /> : null}
                </ListItem>
              )
            })}
          </List>
        </DialogContent>
      </Dialog>

      <Dialog open={showUrlDialog} onClose={() => setShowUrlDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('showPlayUrl')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('currentPlayUrl')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                value={sourceUrl}
                InputProps={{ readOnly: true }}
              />
              <IconButton onClick={() => handleCopy('play', sourceUrl)} title={t('copy')}>
                {copiedField === 'play' ? (
                  <Typography variant="caption" color="success.main">
                    {t('copied')}
                  </Typography>
                ) : (
                  <ContentCopyIcon fontSize="small" />
                )}
              </IconButton>
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('originSourceUrl')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                value={current.url}
                InputProps={{ readOnly: true }}
              />
              <IconButton onClick={() => handleCopy('origin', current.url)} title={t('copy')}>
                {copiedField === 'origin' ? (
                  <Typography variant="caption" color="success.main">
                    {t('copied')}
                  </Typography>
                ) : (
                  <ContentCopyIcon fontSize="small" />
                )}
              </IconButton>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Drawer anchor="right" open={playlistOpen} onClose={() => setPlaylistOpen(false)}>
        <Box sx={{ width: 320, maxWidth: '86vw', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <ListSubheader>
            {t('playlistTitle')}
            {categoryList ? ' · ' + categoryList.length : ''}
          </ListSubheader>
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            <List dense disablePadding>
              {(categoryList || []).map((c) => (
                <ListItemButton
                  key={c.id || c.url}
                  selected={c.url === current.url}
                  onClick={() => handlePlaylistSwitch(c)}
                >
                  <ListItemText
                    primary={c.name}
                    primaryTypographyProps={{ noWrap: true, fontSize: 14 }}
                  />
                  {c.url === current.url ? <EqualizerIcon color="primary" fontSize="small" /> : null}
                </ListItemButton>
              ))}
            </List>
          </Box>
        </Box>
      </Drawer>
    </Box>
  )
}
