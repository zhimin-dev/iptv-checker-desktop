import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import CssBaseline from '@mui/material/CssBaseline'
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
  // 网页端播放请求
  const [pendingRequest, setPendingRequest] = useState(null)
  const lastRequestRef = useRef('')

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
      {screen === 'connect' && <ConnectScreen onConnected={handleConnected} />}
      {screen === 'home' && (
        <HomeScreen
          server={server}
          onOpenChannel={(c) => handleOpenChannelFrom(c, 'home')}
          onChangeServer={() => setScreen('connect')}
          onOpenSettings={() => setScreen('settings')}
          onOpenSearch={() => setScreen('search')}
        />
      )}
      {screen === 'search' && (
        <SearchScreen
          server={server}
          onOpenChannel={(c) => handleOpenChannelFrom(c, 'search')}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'player' && channel && (
        <PlayerScreen
          server={server}
          channel={channel}
          onSwitchChannel={setChannel}
          onBack={() => setScreen(playerFrom)}
        />
      )}
      {screen === 'settings' && (
        <SettingsScreen
          server={server}
          onUpdateServer={handleUpdateServer}
          onBack={() => setScreen(server ? 'home' : 'connect')}
        />
      )}

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
