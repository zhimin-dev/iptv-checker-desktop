import * as React from 'react';
import { useEffect, useState, useContext } from "react"
import { useNavigate, useLocation, useMatches } from 'react-router-dom';
import { Outlet } from "react-router-dom";
import './menu.css'
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import LaptopIcon from '@mui/icons-material/Laptop';
import LoadingButton from '@mui/lab/LoadingButton';
import PublicIcon from '@mui/icons-material/Public';
import { MainContext } from './../../context/main';
import icon from './../../assets/icon.png';
import Box from '@mui/material/Box';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import BoltIcon from '@mui/icons-material/Bolt';
import SettingsIcon from '@mui/icons-material/Settings';
import AdjustIcon from '@mui/icons-material/Adjust';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import SearchIcon from '@mui/icons-material/Search';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import Collapse from '@mui/material/Collapse';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import HomeIcon from '@mui/icons-material/Home';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import HubIcon from '@mui/icons-material/Hub';
import TvIcon from '@mui/icons-material/Tv';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import _package from './../../../package';
import { useTranslation, initReactI18next } from "react-i18next";
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import Divider from '@mui/material/Divider';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import DehazeIcon from '@mui/icons-material/Dehaze';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import CssBaseline from '@mui/material/CssBaseline';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import { fontSize } from '@mui/system';
import { routes } from '../../router/routes';

const detailUri = '/detail'
const drawerWidth = 240;

// 过滤出菜单项
const menuList = routes.filter(r => !r.hideInMenu);

export default function Layout() {
    const { t } = useTranslation();
    let location = useLocation();
    const matches = useMatches();
    const _mainContext = useContext(MainContext);
    const navigate = useNavigate();
    
    const [nowSelectedMenu, setNowSelectedMenu] = useState(menuList[0])
    const [openSubCheckedMenu, setOpenSubCheckedMenu] = useState(false)
    const [openSettings, setOpenSettings] = useState(false)
    const [nowSelectedCheckedMenu, setNowSelectedCheckedMenu] = useState(null)
    const [showDonate, setShowDonate] = useState(false);
    const [openDrawer, setOpenDrawer] = useState(true);
    const [showSponsor, setShowSponsor] = useState(false);
    const [nowSelectSponsor, setNowSelectSponsor] = useState('')
    const [sponsorInfo, setSponsorInfo] = useState(null)

    // 获取当前路由的 Layout 配置
    const currentMatch = matches.find(m => m.handle?.showHeader !== undefined) || matches[matches.length - 1];
    const layoutConfig = currentMatch?.handle || { showHeader: true, showSidebar: true };

    useEffect(() => {
        if (location.pathname == detailUri) {
            // setNowSelectedMenu({ 'showHeader': false }) // 已废弃，由 handle 控制
        } else {
            _mainContext.updateDetailMd5("")
            // 查找当前选中的菜单
            // 这里逻辑保持原样用于高亮，或者可以优化
            for (let i = 0; i < menuList.length; i++) {
                if (location.pathname == menuList[i].path || location.pathname == menuList[i].uri) {
                    if (!menuList[i].children) {
                        setNowSelectedMenu(menuList[i])
                    }
                }
                if (menuList[i].children) {
                    for (let j = 0; j < menuList[i].children.length; j++) {
                         // 兼容旧 uri 和新 path
                        const path = menuList[i].children[j].path || menuList[i].children[j].uri;
                        if (location.pathname == path) {
                            setNowSelectedMenu(menuList[i].children[j])
                            if (menuList[i].path === '/settings') {
                                setOpenSettings(true)
                            }
                        }
                    }
                }
            }
        }
    }, [location, menuList])

    const changePath = (e) => {
        const uri = e.path || e.uri;
        if (uri === detailUri) {
            setOpenSubCheckedMenu(!openSubCheckedMenu)
        } else if (e.children) {
            if (e.path === '/settings') {
                setOpenSettings(!openSettings)
            }
        } else {
            setNowSelectedMenu(e)
            navigate(uri)
        }
    }


    const changeCheckedPath = (e) => {
        setNowSelectedCheckedMenu(e)
        navigate(detailUri + "?md5=" + e.md5)
    }

    const goToGithub = () => {
        window.open(_package.homepage_url)
    }

    const toggleDrawer = (newOpen) => () => {
        setOpenDrawer(newOpen);
    };

    const handleShowSponsor = (nowSelectSponsor) => {
        setShowSponsor(true)
        let data = null
        for (let i = 0; i < _mainContext.configInfo.sponsor.length; i++) {
            if (_mainContext.configInfo.sponsor[i].name === nowSelectSponsor) {
                data = _mainContext.configInfo.sponsor[i]
            }
        }
        setSponsorInfo(data)
    }

    const handleCloseSponsor = () => {
        setShowSponsor(false)
    }

    const changeSponsorType = (e) => {
        setNowSelectSponsor(e.target.value)
        handleShowSponsor(e.target.value)
    }

    const showDonateData = () => {
        setShowDonate(!showDonate)
    }

    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    const theme = React.useMemo(
        () =>
            createTheme({
                palette: {
                    mode: prefersDarkMode ? 'dark' : 'light',
                    sideBarBgColor: {
                        dark: '#021d2a',
                        light: 'antiquewhite'
                    }
                },
            }),
        [prefersDarkMode],
    );

    const DrawerList = (
        <Box className="side-bar" style={{ backgroundColor: theme.palette.sideBarBgColor[prefersDarkMode ? 'dark' : 'light'] }} sx={{ width: drawerWidth }} role="presentation">
            <List>
                <Box className="side-bar-logo">
                    <Box className='side-bar-logo-item'>
                        <img src={icon} height="60"></img>
                        <Box className='go-github'>iptv-checker
                            {
                                _mainContext.showNewVersion ? (
                                    <a href='/#/settings' style={{ color: 'green' }}>{t('有新版本')}</a>
                                ) : ''
                            }
                        </Box>
                    </Box>
                </Box>
                {
                    menuList.map((value, index) => (
                        value.handle?.showMod?.includes(_mainContext.nowMod) ? (
                            <Box key={index}>
                                {
                                    (value.path !== detailUri || (value.path === detailUri && _mainContext.subCheckMenuList.length > 0)) ? (
                                        <>
                                            <ListItem key={index} disablePadding onClick={() => changePath(value)}>
                                                <ListItemButton>
                                                    <ListItemIcon>
                                                        {
                                                            value.icon === 'LaptopIcon' ? <LaptopIcon /> : ''
                                                        }
                                                        {
                                                            value.icon === 'SettingsIcon' ? <SettingsIcon /> : ''
                                                        }
                                                        {
                                                            value.icon === 'AdjustIcon' ? <AdjustIcon /> : ''
                                                        }
                                                    
                                                        {
                                                            value.icon === 'CloudQueueIcon' ? <CloudQueueIcon /> : ''
                                                        }
                                                        {
                                                            value.icon === 'RemoveRedEyeIcon' ? <RemoveRedEyeIcon /> : ''
                                                        }
                                                        {
                                                            value.icon === 'BoltIcon' ? <BoltIcon /> : ''
                                                        }
                                                        {
                                                            value.icon === 'PublicIcon' ? <PublicIcon /> : ''
                                                        }
                                                        {
                                                            value.icon === 'StickyNote2Icon' ? <StickyNote2Icon /> : ''
                                                        }
                                                        {
                                                            value.icon === 'TvIcon' ? <TvIcon /> : ''
                                                        }
                                                        {
                                                            value.icon === 'FavoriteIcon' ? <FavoriteIcon /> : ''
                                                        }
                                                        {
                                                            value.icon === 'FavoriteBorderIcon' ? <FavoriteBorderIcon /> : ''
                                                        }
                                                        {
                                                            value.icon === 'LiveTvIcon' ? <LiveTvIcon /> : ''
                                                        }
                                                        {
                                                            value.icon === 'HomeIcon' ? <HomeIcon /> : ''
                                                        }
                                                        {
                                                            value.icon === 'HomeOutlinedIcon' ? <HomeOutlinedIcon /> : ''
                                                        }
                                                        {
                                                            value.icon === 'SettingsOutlinedIcon' ? <SettingsOutlinedIcon /> : ''
                                                        }
                                                        {
                                                            value.icon === 'SettingsBackupRestoreIcon' ? <SettingsBackupRestoreIcon /> : ''
                                                        }
                                                    </ListItemIcon>
                                                    <ListItemText primary={t(value.name)} />
                                                    {
                                                        value.path === detailUri ? (
                                                            openSubCheckedMenu ? <ExpandLess /> : <ExpandMore />
                                                        ) : ''
                                                    }
                                                    {
                                                        value.children ? (
                                                            openSettings ? <ExpandLess /> : <ExpandMore />
                                                        ) : ''
                                                    }
                                                </ListItemButton>
                                            </ListItem>
                                            {
                                                value.children ? (
                                                    <Collapse in={value.path === '/settings' && openSettings} timeout="auto" unmountOnExit>
                                                        <List component="div" disablePadding>
                                                            {value.children.map((child, cIndex) => (
                                                                !child.hideInMenu && (
                                                                    <ListItemButton key={cIndex} sx={{ pl: 4 }} onClick={() => changePath(child)}>
                                                                        <ListItemIcon>
                                                                            {child.icon === 'PublicIcon' ? <PublicIcon /> : ''}
                                                                            {child.icon === 'StickyNote2Icon' ? <StickyNote2Icon /> : ''}
                                                                            {child.icon === 'TvIcon' ? <TvIcon /> : ''}
                                                                            {child.icon === 'SettingsIcon' ? <SettingsIcon /> : ''}
                                                                            {child.icon === 'SearchIcon' ? <SearchIcon /> : ''}
                                                                            {child.icon === 'ManageSearchIcon' ? <ManageSearchIcon /> : ''}
                                                                            {child.icon === 'PhotoLibraryIcon' ? <PhotoLibraryIcon /> : ''}
                                                                            {child.icon === 'FavoriteIcon' ? <FavoriteIcon /> : ''}
                                                                            {child.icon === 'FavoriteBorderIcon' ? <FavoriteBorderIcon /> : ''}
                                                                            {child.icon === 'LiveTvIcon' ? <LiveTvIcon /> : ''}
                                                                            {child.icon === 'VolunteerActivismIcon' ? <VolunteerActivismIcon /> : ''}
                                                                            {child.icon === 'SettingsBackupRestoreIcon' ? <SettingsBackupRestoreIcon /> : ''}
                                                                            {child.icon === 'HubIcon' ? <HubIcon /> : ''}
                                                                        </ListItemIcon>
                                                                        <ListItemText primary={t(child.name)} />
                                                                    </ListItemButton>
                                                                )
                                                            ))}
                                                        </List>
                                                    </Collapse>
                                                ) : ''
                                            }
                                        </>
                                    ) : ''
                                }
                            </Box>
                        ) : ''
                    ))}
            </List>
        </Box>
    );

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <SimpleDialog
                open={showSponsor}
                sponsorInfo={sponsorInfo}
                onClose={handleCloseSponsor}
            />
            <Box className="layout">
                {layoutConfig.showSidebar && (
                    <Drawer sx={{
                        '.MuiPaper-root': {
                            borderTopLeftRadius: '12px',
                            borderBottomLeftRadius: '12px',
                            backgroundColor: 'transparent'
                        },
                    }} open={openDrawer} anchor="left" variant={openDrawer ? "permanent" : 'temporary'}>
                        {DrawerList}
                    </Drawer>
                )}
                <Box className="container-inner" style={{
                    marginLeft: (layoutConfig.showSidebar && openDrawer) ? drawerWidth + "px" : '',
                }}>
                    <Box data-tauri-drag-region style={{ width: '100%', height: '20px' }}></Box>
                    {
                        layoutConfig.showHeader && (
                            <Box style={{
                                padding: '0 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                height: '60px',
                            }}>
                                <Box style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    height: '60px',
                                    width: '100%'
                                }}>
                                    <Box style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}>
                                        {layoutConfig.showSidebar && (
                                            // <Box>
                                            //     <IconButton aria-label="delete" size="small" onClick={toggleDrawer(!openDrawer)}>
                                            //         <DehazeIcon />
                                            //     </IconButton>
                                            // </Box>
                                            <></>
                                        )}
                                        <Box style={{ fontWeight: 'bold', fontSize: '20px' }}>{
                                            nowSelectedMenu.name !== null && nowSelectedMenu.name !== undefined ?
                                                t(nowSelectedMenu.name) : _mainContext.detailMd5
                                        }</Box>
                                    </Box>
                                    <Box data-tauri-drag-region style={{
                                        display: _mainContext.nowMod === 1 ? 'flex' : 'none',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}>
                                        <Box className="titlebar-button" id="titlebar-minimize">
                                            <img
                                                src="https://api.iconify.design/mdi:window-minimize.svg"
                                                alt="minimize"
                                            />
                                        </Box>
                                        <Box className="titlebar-button" id="titlebar-close">
                                            <img src="https://api.iconify.design/mdi:close.svg" alt="close" />
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        )
                    }
                    <Box style={{ width: '100%', height: '20px' }}></Box>
                    <Divider style={{ marginBottom: '10px' }} />
                    <Outlet />
                </Box>
            </Box>
        </ThemeProvider>
    )
}

function SimpleDialog(props) {
    const { t } = useTranslation();
    const { onClose, sponsorInfo, open } = props;

    const handleClose = () => {
        onClose();
    }

    return (
        <Dialog onClose={handleClose} open={open}>
            <DialogTitle>{t('支持开发者开发继续维护该项目')}</DialogTitle>
            {
                sponsorInfo !== null && sponsorInfo.url !== '' ? (
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        <img src={sponsorInfo.url} height="400" />
                    </Box>
                ) : ''
            }
        </Dialog>
    );
}