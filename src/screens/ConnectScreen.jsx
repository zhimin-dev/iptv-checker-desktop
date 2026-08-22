import React, { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import { useT } from '../i18n'
import { normalizeServerUrl, testServer } from '../services/api'

export default function ConnectScreen({ onConnected }) {
  const { t } = useT()
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  const handleConnect = async () => {
    const url = normalizeServerUrl(input)
    if (!url) {
      setError(true)
      return
    }
    setBusy(true)
    setError(false)
    try {
      await testServer(url)
      onConnected(url)
    } catch (e) {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
        minHeight: 0,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          width: '100%',
          maxWidth: 440,
          padding: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
          textAlign: 'center',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <img src="/icon.png" alt="iptv-checker" width={88} height={88} />
        </Box>
        <Typography variant="h5" fontWeight={600}>
          {t('appName')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('connectSubtitle')}
        </Typography>

        <Box sx={{ textAlign: 'left' }}>
          <TextField
            fullWidth
            label={t('serverAddress')}
            placeholder={t('serverAddressPlaceholder')}
            variant="outlined"
            size="medium"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConnect()
            }}
            helperText={t('serverUrlHint')}
          />
        </Box>

        {error ? (
          <Alert severity="error" variant="outlined">
            {t('connectFailed')}
          </Alert>
        ) : null}

        <Button
          fullWidth
          variant="contained"
          size="large"
          disabled={busy}
          onClick={handleConnect}
          startIcon={busy ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {busy ? t('connecting') : t('connect')}
        </Button>

        <Typography variant="caption" color="text.secondary">
          iptv-checker-desktop · v0.1.0
        </Typography>
      </Paper>
    </Box>
  )
}
