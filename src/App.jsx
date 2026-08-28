import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import CssBaseline from '@mui/material/CssBaseline'
import Box from '@mui/material/Box'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import { I18nProvider, useT } from './i18n'
import ConnectScreen from './screens/ConnectScreen'
import HomeScreen from './screens/HomeScreen'
import PlayerScreen from './screens/PlayerScreen'
import SettingsScreen from './screens/SettingsScreen'
import SearchScreen from './screens/SearchScreen'
import { ackPlayRequest, getPlayRequest, getServerUrl, setServerUrl } from './services/api'
import { buildTheme } from './theme'
import './App.css'

function Shell() {
  const { t } = useT()
  const [server, setServer] = useState(() => getServerUrl())
  const [screen, setScreen] = useState(() => (getServerUrl() ? 'home' : 'connect'))
  const [channel, setChannel] = useState(null)
  // 搜索页保持挂载（播放时隐藏），返回时保留分组/搜索词等状态
  const [searchMounted, setSearchMounted] = useState(false)
  // 网页端播放请求
  const [pendingRequest, setPendingRequest] = useState(null)
  const lastRequestRef = useRef('')
  // 左下角错误提示（全局）：所有屏幕的请求失败都通过 notifyError 弹出
  const [errorToast, setErrorToast] = useState(null)
  const lastErrorRef = useRef({ text: '', at: 0 })
  const notifyError = useCallback((text) => {
    if (!text) return
    const now = Date.now()
    // 4 秒内相同错误不重复弹出，避免轮询/批量请求刷屏
    if (lastErrorRef.current.text === text && now - lastErrorRef.current.at < 4000) return
    lastErrorRef.current = { text, at: now }
    setErrorToast({ key: now + '-' + Math.random(), text })
  }, [])

  const handleConnected = (url) => {
    setServerUrl(url)
    setServer(url)
    setScreen('home')
  }

  const handleOpenChannel = (c) => {
    setChannel(c)
    setScreen('player')
  }

  // 从哪个页面进入的播放页，返回时回到该页面
  const [playerFrom, setPlayerFrom] = useState('home')
  const handleOpenChannelFrom = (c, from) => {
    setPlayerFrom(from || 'home')
    handleOpenChannel(c)
  }

  const handleUpdateServer = (url) => {
    setServer(url)
    setScreen('home')
  }

  const handleOpenSearch = () => {
    setSearchMounted(true)
    setScreen('search')
  }

  // 轮询网页端的播放请求（每 5 秒）
  useEffect(() => {
    if (!server) return
    const poll = async () => {
      try {
        const data = await getPlayRequest(server)
        if (data && data.request && data.request.id && data.request.id !== lastRequestRef.current) {
          lastRequestRef.current = data.request.id
          setPendingRequest(data.request)
        }
      } catch (e) {
        // 服务端不可用时忽略
      }
    }
    poll()
    const timer = setInterval(poll, 5000)
    return () => clearInterval(timer)
  }, [server])

  const handlePlayRequest = async (play) => {
    const req = pendingRequest
    if (!req) return
    if (play) {
      handleOpenChannelFrom({ id: 'web-' + req.id, name: req.name, url: req.url, group: '' }, 'home')
    }
    await ackPlayRequest(server, req.id)
    setPendingRequest(null)
  }

  return (
    <div className="app-shell">
      {screen === 'connect' && (
        <ConnectScreen
          notifyError={notifyError}
          onConnected={handleConnected}
          onOpenSettings={() => setScreen('settings')}
        />
      )}
      {screen === 'home' && (
        <HomeScreen
          server={server}
          notifyError={notifyError}
          onOpenChannel={(c) => handleOpenChannelFrom(c, 'home')}
          onChangeServer={() => setScreen('connect')}
          onOpenSettings={() => setScreen('settings')}
          onOpenSearch={handleOpenSearch}
        />
      )}
      {searchMounted ? (
        <Box sx={{ display: screen === 'search' ? 'block' : 'none', height: '100%' }}>
          <SearchScreen
            server={server}
            notifyError={notifyError}
            onOpenChannel={(c) => handleOpenChannelFrom(c, 'search')}
            onBack={() => setScreen('home')}
          />
        </Box>
      ) : null}
      {screen === 'player' && channel && (
        <PlayerScreen
          server={server}
          channel={channel}
          notifyError={notifyError}
          onSwitchChannel={setChannel}
          onBack={() => setScreen(playerFrom)}
        />
      )}
      {screen === 'settings' && (
        <SettingsScreen
          server={server}
          notifyError={notifyError}
          onUpdateServer={handleUpdateServer}
          onBack={() => setScreen(server ? 'home' : 'connect')}
        />
      )}

      {/* 全局错误提示：左下角弹出，8 秒自动消失 */}
      <Snackbar
        key={errorToast ? errorToast.key : 'none'}
        open={!!errorToast}
        autoHideDuration={8000}
        onClose={() => setErrorToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        sx={{ maxWidth: 560 }}
      >
        <Alert
          severity="error"
          elevation={6}
          onClose={() => setErrorToast(null)}
          sx={{ maxWidth: '70vw', wordBreak: 'break-word' }}
        >
          {errorToast ? errorToast.text : ''}
        </Alert>
      </Snackbar>

      {/* 网页端播放请求：右下角常驻提示，不自动关闭，点击屏幕不消失 */}
      <Snackbar
        open={!!pendingRequest}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ maxWidth: 460 }}
      >
        <Alert
          severity="info"
          elevation={6}
          action={
            <>
              <Button size="small" color="inherit" onClick={() => handlePlayRequest(false)}>
                {t('ignore')}
              </Button>
              <Button size="small" variant="contained" onClick={() => handlePlayRequest(true)}>
                {t('playNow')}
              </Button>
            </>
          }
        >
          {t('playRequestText', { name: pendingRequest ? pendingRequest.name : '' })}
        </Alert>
      </Snackbar>
    </div>
  )
}

export default function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
  const theme = useMemo(() => buildTheme(prefersDarkMode), [prefersDarkMode])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <I18nProvider>
        <Shell />
      </I18nProvider>
    </ThemeProvider>
  )
}
