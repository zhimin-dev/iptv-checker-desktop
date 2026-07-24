import React from 'react';
import { Navigate } from 'react-router-dom';
import LTask from '../components/ltask';
import Watch from '../components/watch';
import Task from '../components/task';
import Settings from '../components/settings';
import WatchSingle from '../components/watch/single';
import SearchSettings from '../components/settings/search';
import KeywordSettings from '../components/settings/keywords';
import FavoriteSettings from '../components/favourite';
import EpgChannelSearch from '../components/favourite/epg-search';
import ChannelLogos from '../components/settings/logos';
import Detail from '../components/detail';
import Welcome from '../components/welcome';
import DonateSettings from '../components/settings/donate';
import BackupSettings from '../components/settings/backup';
import EpgSettings from '../components/settings/epg';
import NetworkSettings from '../components/settings/network';
import GroupMapping from '../components/settings/group';

// 路由配置项说明：
// path: 路由路径
// name: 菜单显示名称 (用于侧边栏)
// icon: 图标名称 (用于侧边栏)
// element: 页面组件
// hideInMenu: 是否在侧边栏隐藏
// meta: {
//   showHeader: 是否显示顶部 Header
//   showSidebar: 是否显示侧边栏 (控制 Layout 行为)
//   showMod: 显示模式 [0, 1] 等
// }

export const routes = [
    {
        path: "/",
        name: "欢迎",
        icon: "HomeOutlinedIcon",
        element: <Welcome />,
        handle: {
            showMod: [0,1],
            showHeader: true,
            showSidebar: true
        }
    },
    {
        path: "/local",
        name: "本地任务",
        icon: "LaptopIcon",
        element: <LTask />,
        handle: {
            showMod: [1],
            showHeader: true,
            showSidebar: true
        }
    },
    {
        path: "/watch",
        name: "在线观看",
        icon: "RemoveRedEyeIcon",
        element: <Watch />,
        handle: {
            showMod: [1],
            showHeader: true,
            showSidebar: true
        }
    },
    {
        path: "/task",
        name: "定时检查任务",
        icon: "CloudQueueIcon",
        element: <Task />,
        handle: {
            showMod: [0],
            showHeader: true,
            showSidebar: true
        }
    },
    {
        path: "/favorite",
        name: "想看的频道",
        icon: "FavoriteBorderIcon",
        element: <FavoriteSettings />,
        handle: {
            showMod: [0],
            showHeader: true,
            showSidebar: true
        }
    },
    {
        path: "/epg-channel-search",
        name: "EPG节目单",
        icon: "LiveTvIcon",
        element: <EpgChannelSearch />,
        handle: {
            showMod: [0],
            showHeader: true,
            showSidebar: true
        }
    },
    {
        path: "/favorite/epg-search",
        element: <Navigate to="/epg-channel-search" replace />,
        hideInMenu: true,
        handle: {
            showMod: [0],
            showHeader: true,
            showSidebar: true
        }
    },
    {
        path: "/settings",
        name: "设置",
        icon: "SettingsOutlinedIcon",
        handle: {
            showMod: [0, 1],
            showHeader: true,
            showSidebar: true
        },
        children: [
            {
                path: "/settings",
                index: true,
                element: <Settings />, // 默认显示基础设置，或者重定向
                hideInMenu: true, // 父级菜单点击后的默认行为，这里暂不处理，react-router 会匹配 index
                handle: { showHeader: true, showSidebar: true }
            },
            {
                path: "/settings/basic",
                name: "基础设置",
                icon: "PublicIcon",
                element: <Settings />,
                handle: { showHeader: true, showSidebar: true }
            },
            {
                path: "/settings/keywords",
                name: "特殊字符替换",
                icon: "StickyNote2Icon",
                element: <KeywordSettings />,
                hideInMenu: true,
                handle: { showHeader: true, showSidebar: true }
            },
            {
                path: "/settings/search",
                name: "爬取配置",
                icon: "SearchIcon",
                element: <SearchSettings />,
                handle: { showHeader: true, showSidebar: true }
            },
            {
                path: "/settings/network",
                name: "网络设置",
                icon: "HubIcon",
                element: <NetworkSettings />,
                handle: { showHeader: true, showSidebar: true }
            },
            {
                path: "/settings/logos",
                name: "频道封面配置",
                icon: "PhotoLibraryIcon",
                element: <ChannelLogos />,
                handle: { showHeader: true, showSidebar: true }
            },
            {
                path: "/settings/epg",
                name: "EPG 配置",
                icon: "TvIcon",
                element: <EpgSettings />,
                handle: { showHeader: true, showSidebar: true }
            },
            {
                path: "/settings/group",
                name: "分组映射",
                icon: "StickyNote2Icon",
                element: <GroupMapping />,
                handle: { showHeader: true, showSidebar: true }
            },
            {
                path: "/settings/backup",
                name: "备份与恢复",
                icon: "SettingsBackupRestoreIcon",
                element: <BackupSettings />,
                handle: { showHeader: true, showSidebar: true }
            },
            {
                path: "/settings/donate",
                name: "捐赠",
                icon: "VolunteerActivismIcon",
                element: <DonateSettings />,
                handle: { showHeader: true, showSidebar: true }
            }
        ]
    },
    // 不在菜单中显示的路由
    {
        path: "/detail",
        element: <Detail />,
        hideInMenu: true,
        handle: {
            showHeader: false,
            showSidebar: true
        }
    },
    {
        path: "/watch/single",
        element: <WatchSingle />,
        hideInMenu: true,
        handle: {
            showHeader: false,
            showSidebar: false
        }
    }
];

