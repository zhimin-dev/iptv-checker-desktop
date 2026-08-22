import React, { useState } from 'react'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'
import { useT } from '../i18n'

/**
 * 自定义播放：输入任意 m3u8 地址直接播放
 * 放在主页/搜索页顶栏，点击弹出输入框，确认后交给播放页
 */
export default function CustomPlayButton({ onPlay }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState(false)

  const handlePlay = () => {
    const u = url.trim()
    if (!/^https?:\/\//i.test(u)) {
      setError(true)
      return
    }
    let channelName = name.trim()
    if (!channelName) {
      try {
        channelName = new URL(u).host
      } catch (e) {
        channelName = u
      }
    }
    setOpen(false)
    setUrl('')
    setName('')
    setError(false)
    onPlay({ id: 'custom-' + Date.now(), name: channelName, url: u, group: '' })
  }

  return (
    <>
      <IconButton onClick={() => setOpen(true)} title={t('customPlay')}>
        <PlayCircleOutlineIcon />
      </IconButton>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('customPlay')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField
            fullWidth
            size="small"
            label={t('customUrlLabel')}
            placeholder="https://example.com/live/playlist.m3u8"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setError(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePlay()
            }}
          />
          <TextField
            fullWidth
            size="small"
            label={t('customNameLabel')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePlay()
            }}
          />
          {error ? (
            <Alert severity="error" variant="outlined">
              {t('invalidUrl')}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('dismiss')}</Button>
          <Button variant="contained" onClick={handlePlay} disabled={!url.trim()}>
            {t('playNow')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
