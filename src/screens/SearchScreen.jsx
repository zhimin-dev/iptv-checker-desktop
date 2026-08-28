import React, { useEffect, useMemo, useRef, useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CategoryIcon from '@mui/icons-material/Category'
import TvIcon from '@mui/icons-material/Tv'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import DeleteIcon from '@mui/icons-material/Delete'
import { useT } from '../i18n'
import {
  addFavourite,
  deletePlayHistory,
  describeError,
  getCachedChannels,
  getChannels,
  getPlayHistory,
  recordSearch,
  setCachedChannels,
} from '../services/api'
import CustomPlayButton from '../components/CustomPlayButton'

const CAT_PAGE = 30
const LIST_PAGE = 50

export default function SearchScreen({ server, notifyError, onOpenChannel, onBack }) {
  const { t } = useT()
  // 数据源：all=全部 / like=喜欢 / checked=已检查 / history=播放历史
  const [source, setSource] = useState('all')
  const [query, setQuery] = useState('')
  // 搜索模式：name=频道名 / group=分组
  const [searchMode, setSearchMode] = useState('name')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [channels, setChannels] = useState(null)
  const [history, setHistory] = useState(null)
  const [onlyPlayable, setOnlyPlayable] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [faved, setFaved] = useState({})
  // 分页展示数量（避免一次渲染过多导致卡顿）
  const [catLimit, setCatLimit] = useState(CAT_PAGE)
  const [resultLimit, setResultLimit] = useState(LIST_PAGE)
  const [groupLimit, setGroupLimit] = useState(LIST_PAGE)
  const searchTimer = useRef(0)

  const load = async (force) => {
    setLoading(true)
    setError('')
    try {
      if (source === 'history') {
        const data = await getPlayHistory(server, onlyPlayable, '', 500)
        setHistory(data.list || [])
      } else {
        const cached = await getCachedChannels(source)
        if (cached && cached.server === server && !force) {
          setChannels(cached.list)
        } else {
          const data = await getChannels(server, source, !!force)
          setChannels(data.list || [])
          setCachedChannels(data.list || [], server, source)
        }
      }
    } catch (e) {
      const msg = (e.response && e.response.data && e.response.data.msg) || e.message || ''
      setError(msg)
      if (notifyError) notifyError(t('loadFailed') + ' · ' + describeError(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setChannels(null)
    setHistory(null)
    setError('')
    setSelectedGroup('')
    setCatLimit(CAT_PAGE)
    setResultLimit(LIST_PAGE)
    setGroupLimit(LIST_PAGE)
    load(false)
  }, [server, source, onlyPlayable])

  const handleQueryChange = (val) => {
    setQuery(val)
    setResultLimit(LIST_PAGE)
    setCatLimit(CAT_PAGE)
    clearTimeout(searchTimer.current)
    const name = val.trim()
    if (name) {
      searchTimer.current = setTimeout(() => recordSearch(server, name), 900)
    }
  }

  const handleOpen = (c) => {
    recordSearch(server, c.name)
    onOpenChannel(c)
  }

  /** 从分类详情进入播放：点击的频道放首位，其余同名源作备用；带上该分类完整列表方便快速切换 */
  const handleOpenFromCategory = (c) => {
    recordSearch(server, c.name)
    const sameName = groupChannels.filter((x) => x.name === c.name && x.url !== c.url)
    onOpenChannel({
      ...c,
      alternates: [c, ...sameName],
      categoryList: groupChannels,
    })
  }

  const handleFavourite = async (e, item) => {
    e.stopPropagation()
    try {
      await addFavourite(server, item.name, item.url)
      setFaved((prev) => ({ ...prev, [item.id || item.url]: true }))
    } catch (err) {
      console.log('favourite failed', err)
    }
  }

  const handleDeleteHistory = async (e, id) => {
    e.stopPropagation()
    try {
      await deletePlayHistory(server, id)
      setHistory((prev) => (prev || []).filter((h) => h.id !== id))
    } catch (err) {
      console.log('delete history failed', err)
    }
  }

  const searching = query.trim() !== ''

  // 分类统计（保持服务端排序）
  const categories = useMemo(() => {
    const list = channels || []
    const map = new Map()
    for (const c of list) {
      const g = c.group || t('noGroup')
      if (!map.has(g)) map.set(g, { group: g, count: 0 })
      map.get(g).count += 1
    }
    return Array.from(map.values())
  }, [channels, t])

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = channels || []
    if (!q) return []
    return list.filter((c) => c.name.toLowerCase().indexOf(q) >= 0)
  }, [query, channels])

  // 分组搜索：按分组名过滤分类
  const groupSearchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return categories.filter((g) => g.group.toLowerCase().indexOf(q) >= 0)
  }, [query, categories])

  const groupChannels = useMemo(() => {
    if (!selectedGroup) return []
    return (channels || []).filter((c) => (c.group || t('noGroup')) === selectedGroup)
  }, [channels, selectedGroup, t])

  const historyFiltered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = history || []
    if (!q) return list
    return list.filter((h) => h.name.toLowerCase().indexOf(q) >= 0)
  }, [query, history])

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="inherit" elevation={1}>
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <IconButton edge="start" onClick={onBack} title={t('back')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>{t('searchTitle')}</Typography>
          <CustomPlayButton onPlay={onOpenChannel} />
        </Toolbar>
        <Tabs value={source} onChange={(e, v) => setSource(v)} variant="scrollable" scrollButtons="auto">
          <Tab value="all" label={t('sourceAll')} />
          <Tab value="like" label={t('sourceLike')} />
          <Tab value="checked" label={t('sourceChecked')} />
          <Tab value="history" label={t('sourceHistory')} />
        </Tabs>
      </AppBar>

      <Box sx={{ px: 2, pt: 1.5, display: 'flex', gap: 1.5, alignItems: 'center' }}>
        {source !== 'history' ? (
          <Select
            size="small"
            value={searchMode}
            onChange={(e) => {
              setSearchMode(e.target.value)
              setSelectedGroup('')
            }}
            sx={{ minWidth: 96 }}
          >
            <MenuItem value="name">{t('searchByName')}</MenuItem>
            <MenuItem value="group">{t('searchByGroup')}</MenuItem>
          </Select>
        ) : null}
        <TextField
          fullWidth
          size="small"
          placeholder={searchMode === 'group' ? t('searchGroupPlaceholder') : t('searchPlaceholder')}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
        />
        {source === 'history' ? (
          <FormControlLabel
            control={
              <Switch size="small" checked={onlyPlayable} onChange={(e) => setOnlyPlayable(e.target.checked)} />
            }
            label={t('onlyPlayable')}
            sx={{ whiteSpace: 'nowrap' }}
          />
        ) : null}
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
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

        {!loading && !error && source === 'history' ? (
          historyFiltered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body1" color="text.secondary">
                {t('historyEmpty')}
              </Typography>
            </Box>
          ) : (
            <List dense disablePadding sx={{ mt: 1 }}>
              {historyFiltered.map((item) => {
                const c = { id: item.id, name: item.name, url: item.url, playable: item.playable }
                const key = c.id || c.url
                return (
                  <ListItemButton key={key} onClick={() => handleOpen(c)} sx={{ borderRadius: 1 }}>
                    <ListItemAvatar>
                      <Avatar variant="rounded" sx={{ bgcolor: 'action.hover', width: 44, height: 44 }}>
                        <TvIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={c.name}
                      primaryTypographyProps={{ noWrap: true, fontSize: 15 }}
                      secondary={c.url}
                      secondaryTypographyProps={{ noWrap: true, fontSize: 11 }}
                    />
                    {c.playable ? (
                      <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
                    ) : (
                      <CancelIcon color="disabled" fontSize="small" sx={{ mr: 0.5 }} />
                    )}
                    {!faved[key] ? (
                      <IconButton size="small" onClick={(e) => handleFavourite(e, c)} title={t('favourite')}>
                        <FavoriteBorderIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                    <IconButton size="small" onClick={(e) => handleDeleteHistory(e, c.id)} title={t('delete')}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemButton>
                )
              })}
            </List>
          )
        ) : null}

        {!loading && !error && source !== 'history' ? (
          searching ? (
            searchMode === 'group' ? (
              // 分组搜索模式：展示匹配的分类，点击进入分类详情
              groupSearchResults.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body1" color="text.secondary">
                    {t('noChannels')}
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <List dense disablePadding sx={{ mt: 1 }}>
                    {groupSearchResults.slice(0, catLimit).map((g) => (
                      <ListItemButton
                        key={g.group}
                        onClick={() => {
                          setSelectedGroup(g.group)
                          setQuery('')
                          setGroupLimit(LIST_PAGE)
                        }}
                        sx={{ borderRadius: 1 }}
                      >
                        <ListItemAvatar>
                          <Avatar variant="rounded" sx={{ bgcolor: 'action.hover', width: 40, height: 40 }}>
                            <CategoryIcon fontSize="small" />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={g.group}
                          primaryTypographyProps={{ fontSize: 15 }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                          {g.count}
                        </Typography>
                        <ChevronRightIcon color="action" />
                      </ListItemButton>
                    ))}
                  </List>
                  {groupSearchResults.length > catLimit ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                      <Button size="small" onClick={() => setCatLimit((n) => n + CAT_PAGE)}>
                        {t('loadMore')} ({catLimit}/{groupSearchResults.length})
                      </Button>
                    </Box>
                  ) : null}
                </Box>
              )
            ) : (
              // 频道名搜索模式：展示匹配的频道
              searchResults.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body1" color="text.secondary">
                    {t('noChannels')}
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <List dense disablePadding sx={{ mt: 1 }}>
                    {searchResults.slice(0, resultLimit).map((c) => (
                      <ChannelRow key={c.id || c.url} c={c} onOpen={() => handleOpen(c)} />
                    ))}
                  </List>
                  {searchResults.length > resultLimit ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                      <Button size="small" onClick={() => setResultLimit((n) => n + LIST_PAGE)}>
                        {t('loadMore')} ({resultLimit}/{searchResults.length})
                      </Button>
                    </Box>
                  ) : null}
                </Box>
              )
            )
          ) : selectedGroup ? (
            // 分类详情模式
            <Box>
              <ListItemButton onClick={() => setSelectedGroup('')} sx={{ borderRadius: 1, mt: 1 }}>
                <ListItemAvatar>
                  <Avatar variant="rounded" sx={{ bgcolor: 'action.hover', width: 36, height: 36 }}>
                    <ArrowBackIcon fontSize="small" />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={t('backToCategories')}
                  primaryTypographyProps={{ fontSize: 14 }}
                />
              </ListItemButton>
              <Typography variant="subtitle2" color="text.secondary" sx={{ px: 1, mt: 1, mb: 0.5 }}>
                {selectedGroup} ({groupChannels.length})
              </Typography>
              <List dense disablePadding>
                {groupChannels.slice(0, groupLimit).map((c) => (
                  <ChannelRow key={c.id || c.url} c={c} onOpen={() => handleOpenFromCategory(c)} />
                ))}
              </List>
              {groupChannels.length > groupLimit ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                  <Button size="small" onClick={() => setGroupLimit((n) => n + LIST_PAGE)}>
                    {t('loadMore')} ({groupLimit}/{groupChannels.length})
                  </Button>
                </Box>
              ) : null}
            </Box>
          ) : (
            // 默认：只展示分类
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', px: 1, pt: 1 }}>
                {t('searchHint')}
              </Typography>
              <List dense disablePadding sx={{ mt: 1 }}>
                {categories.slice(0, catLimit).map((g) => (
                  <ListItemButton
                    key={g.group}
                    onClick={() => {
                      setSelectedGroup(g.group)
                      setGroupLimit(LIST_PAGE)
                    }}
                    sx={{ borderRadius: 1 }}
                  >
                    <ListItemAvatar>
                      <Avatar variant="rounded" sx={{ bgcolor: 'action.hover', width: 40, height: 40 }}>
                        <CategoryIcon fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={g.group}
                      primaryTypographyProps={{ fontSize: 15 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                      {g.count}
                    </Typography>
                    <ChevronRightIcon color="action" />
                  </ListItemButton>
                ))}
              </List>
              {categories.length > catLimit ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                  <Button size="small" onClick={() => setCatLimit((n) => n + CAT_PAGE)}>
                    {t('loadMore')} ({catLimit}/{categories.length})
                  </Button>
                </Box>
              ) : null}
            </Box>
          )
        ) : null}
      </Box>
    </Box>
  )
}

function ChannelRow({ c, onOpen }) {
  const [logoFailed, setLogoFailed] = useState(false)
  return (
    <ListItemButton onClick={onOpen} sx={{ borderRadius: 1 }}>
      <ListItemAvatar>
        <Avatar variant="rounded" sx={{ bgcolor: 'action.hover', width: 44, height: 44 }}>
          {c.logo && !logoFailed ? (
            <img
              src={c.logo}
              alt=""
              loading="lazy"
              onError={() => setLogoFailed(true)}
              style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
            />
          ) : (
            <TvIcon />
          )}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={c.name}
        primaryTypographyProps={{ noWrap: true, fontSize: 15 }}
        secondary={c.group || ''}
        secondaryTypographyProps={{ noWrap: true, fontSize: 11 }}
      />
      <PlayArrowIcon color="action" />
    </ListItemButton>
  )
}
