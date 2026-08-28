import React, { useEffect, useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Alert from '@mui/material/Alert'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import { useT } from '../i18n'
import { getProxyUrl, setProxyUrl } from '../proxy'
import {
  clearChannelsCache,
  clearLocalChannelsCache,
  describeError,
  getCacheConfig,
  getSnapInterval,
  normalizeServerUrl,
  setCacheConfig,
  setSnapInterval,
  testServer,
} from '../services/api'

export default function SettingsScreen({ server, notifyError, onUpdateServer, onBack }) {
  const { t, lang, changeLang } = useT()
  const [urlInput, setUrlInput] = useState(server)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState(false)
  const [ttlHours, setTtlHours] = useState(24)
  const [cacheCleared, setCacheCleared] = useState(false)
  const [proxyInput, setProxyInput] = useState(() => getProxyUrl())
  const [snapInterval, setSnapIntervalState] = useState(() => getSnapInterval())

  // 读取服务端缓存配置
  useEffect(() => {
    getCacheConfig(server)
      .then((data) => {
        if (data && typeof data.ttl_hours === 'number') setTtlHours(data.ttl_hours)
      })
      .catch(() => {})
  }, [server])

  const flashSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSaveServer = async () => {
    const url = normalizeServerUrl(urlInput)
    if (!url) {
      setError(true)
      return
    }
    setSaving(true)
    setError(false)
    try {
      await testServer(url)
      onUpdateServer(url)
      flashSaved()
    } catch (e) {
      setError(true)
      if (notifyError) notifyError(t('connectFailed') + ' · ' + describeError(e))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveProxy = () => {
    setProxyUrl(proxyInput)
    flashSaved()
  }

  /** 关闭代理：清空代理配置（本机/内网地址本来就直连，外网恢复系统直连） */
  const handleDisableProxy = () => {
    setProxyInput('')
    setProxyUrl('')
    flashSaved()
  }

  const handleSaveCacheConfig = async () => {
    const ttl = Math.min(720, Math.max(0, Number(ttlHours) || 0))
    try {
      await setCacheConfig(server, ttl)
      setTtlHours(ttl)
      flashSaved()
    } catch (e) {
      setError(true)
      if (notifyError) notifyError(describeError(e))
    }
  }

  const handleClearCache = async () => {
    try {
      await clearChannelsCache(server)
    } catch (e) {
      // 服务端清理失败也继续清理本地
    }
    await clearLocalChannelsCache()
    setCacheCleared(true)
    setTimeout(() => setCacheCleared(false), 2500)
  }

  const handleCopyServer = async () => {
    try {
      await navigator.clipboard.writeText(server)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      // WebView 无剪贴板权限时忽略
    }
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="inherit" elevation={1}>
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <IconButton edge="start" onClick={onBack} title={t('back')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="subtitle1">{t('settings')}</Typography>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          py: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          maxWidth: 680,
          width: '100%',
          mx: 'auto',
        }}
      >
        <Paper elevation={2} sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {t('serverUrl')}
          </Typography>
          <TextField
            fullWidth
            size="small"
            label={t('serverAddress')}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            helperText={t('serverUrlHint')}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button variant="contained" size="medium" disabled={saving} onClick={handleSaveServer}>
              {t('save')}
            </Button>
            <Button variant="outlined" size="medium" onClick={handleCopyServer}>
              {copied ? t('copied') : t('copy')}
            </Button>
            {saved ? (
              <Typography variant="body2" color="success.main">
                {t('saved')}
              </Typography>
            ) : null}
          </Box>
          {error ? (
            <Alert severity="error" variant="outlined">
              {t('connectFailed')}
            </Alert>
          ) : null}
        </Paper>

        <Paper elevation={2} sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {t('languageLabel')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label="中文"
              color={lang === 'zh' ? 'primary' : 'default'}
              variant={lang === 'zh' ? 'filled' : 'outlined'}
              onClick={() => changeLang('zh')}
            />
            <Chip
              label="English"
              color={lang === 'en' ? 'primary' : 'default'}
              variant={lang === 'en' ? 'filled' : 'outlined'}
              onClick={() => changeLang('en')}
            />
          </Box>
        </Paper>

        <Paper elevation={2} sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {t('proxyTitle')}
          </Typography>
          <TextField
            size="small"
            label={t('proxyUrl')}
            placeholder="http://127.0.0.1:7890 或 socks5://127.0.0.1:1080"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={proxyInput}
            onChange={(e) => setProxyInput(e.target.value)}
            helperText={t('proxyHint')}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button variant="contained" size="medium" onClick={handleSaveProxy}>
              {t('save')}
            </Button>
            <Button
              variant="outlined"
              color="error"
              size="medium"
              disabled={!proxyInput}
              onClick={handleDisableProxy}
            >
              {t('proxyOff')}
            </Button>
            {saved ? (
              <Typography variant="body2" color="success.main">
                {t('saved')}
              </Typography>
            ) : null}
          </Box>
          <Typography variant="caption" color={proxyInput ? 'success.main' : 'text.secondary'}>
            {proxyInput ? t('proxyOnState') : t('proxyOffState')}
          </Typography>
        </Paper>

        <Paper elevation={2} sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {t('snapIntervalTitle')}
          </Typography>
          <Select
            size="small"
            value={snapInterval}
            onChange={(e) => {
              const v = e.target.value
              setSnapIntervalState(v)
              setSnapInterval(v)
              flashSaved()
            }}
            sx={{ maxWidth: 260 }}
          >
            <MenuItem value={5}>{t('every5min')}</MenuItem>
            <MenuItem value={10}>{t('every10min')}</MenuItem>
            <MenuItem value={30}>{t('every30min')}</MenuItem>
            <MenuItem value={60}>{t('every1hour')}</MenuItem>
          </Select>
          <Typography variant="caption" color="text.secondary">
            {t('snapIntervalHint')}
          </Typography>
          {saved ? (
            <Typography variant="body2" color="success.main">
              {t('saved')}
            </Typography>
          ) : null}
        </Paper>

        <Paper elevation={2} sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {t('channelCache')}
          </Typography>
          <TextField
            size="small"
            type="number"
            label={t('cacheTtl')}
            helperText={t('cacheTtlHint')}
            value={ttlHours}
            onChange={(e) => setTtlHours(e.target.value)}
            inputProps={{ min: 0, max: 720 }}
            sx={{ maxWidth: 260 }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button variant="contained" size="medium" onClick={handleSaveCacheConfig}>
              {t('saveCache')}
            </Button>
            <Button variant="outlined" size="medium" color="error" onClick={handleClearCache}>
              {t('clearCache')}
            </Button>
            {saved ? (
              <Typography variant="body2" color="success.main">
                {t('saved')}
              </Typography>
            ) : null}
            {cacheCleared ? (
              <Typography variant="body2" color="success.main">
                {t('cacheCleared')}
              </Typography>
            ) : null}
          </Box>
        </Paper>

        <Paper elevation={2} sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {t('about')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('aboutText')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('version')}：0.1.0 · {t('server')}：{server}
          </Typography>
        </Paper>
      </Box>
    </Box>
  )
}
