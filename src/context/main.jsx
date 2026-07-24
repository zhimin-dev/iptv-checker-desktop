import { useState, createContext, useEffect, useRef } from "react"
import axios from "axios"
export const MainContext = createContext();
import ParseM3u from '../utils/utils'
import { invoke } from '@tauri-apps/api/core'
import i18n from "i18next";
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { overrideGlobalXHR } from 'tauri-xhr'
import { LogicalSize } from '@tauri-apps/api/window';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { save } from '@tauri-apps/plugin-dialog';
import { downloadDir } from '@tauri-apps/api/path';
import { type } from '@tauri-apps/plugin-os';
import CryptoJS from 'crypto-js'
import _package from './../../package';
const config_url = 'https://static.zmis.me/public/iptv-checker/init.json'

export const MainContextProvider = function ({ children }) {
    const headerHeight = 145
    const [originalM3uBody, setOriginalM3uBody] = useState('');//原始的m3u信息
    // const [uGroups, setUGroups] = useState([])//当前分组
    const [exportData, setExportData] = useState([])//待导出数据json
    const [exportDataStr, setExportDataStr] = useState('')//导出数据的str
    const [videoResolution, setVideoResolution] = useState([])//视频分辨率筛选
    const [needFastSource, setNeedFastSource] = useState(false)// 是否选择最快的源, false否， true是
    const [nowMod, setNowMod] = useState(0);// 当前运行模式 0服务端模式 1客户端模式
    const [nowPlatform, setNowPlatform] = useState('')
    const [showWindowsTopBar, setShowWindowsTopBar] = useState(true)
    const [checkHistory, setCheckHistory] = useState([])// 检测历史
    const [showNewVersion, setShowNewVersion] = useState(false)//是否显示新版本
    const [ffmepgCheck, setFffmepgCheck] = useState(0)// 是否可以ffmepeg检查
    const [configInfo, setConfigInfo] = useState({
        "version": "",
        "sponsor": [],
    })

    const [detailMd5, setDetailMd5] = useState('')
    const [detailQuery, setDetailQuery] = useState(null)
    const [detailMenu, setDetailMenu] = useState({
        "groups": ["央视"],
        "videoRevolution": []
    })
    const [detailOriginal, setDetailOriginal] = useState(null)
    const [detailList, setDetailList] = useState([])//列表展示的数据
    const [subCheckMenuList, setSubCheckMenuList] = useState([])//子菜单
    const videoPlayTypes = [
        {
            "name": "mac",
            "value": "application/x-mpegURL"
        }
        , {
            "name": "windows",
            "value": "video/mp2t"
        }
    ]

    const languageList = [{
        'code': 'zh',
        "name": "中文"
    }, {
        'code': 'en',
        "name": "English"
    }]

    const [settings, setSettings] = useState({
        checkSleepTime: 300,// 检查下一次请求间隔(毫秒)
        httpRequestTimeout: 8000,// http请求超时,0表示 无限制
        customLink: [],//自定义配置
        concurrent: 1,//并发数
        language: 'zh',//语言
        privateHost: '',//私有host
        playerSource: "application/x-mpegURL",// 视频播放平台
        githubToken: '',// GitHub Token
        channelNameDisplayMode: 0,// 频道名称显示方式 0默认 1HD/FHD 2 720p/1080p
    })

    let debugMode = true

    const log = (...args) => {
        if (debugMode) {
            console.log(...args)
        }
    }

    const changeLanguage = (val) => {
        i18n.changeLanguage(val)
    }

    const getYearMonthDayHour = () => {
        // 创建一个 Date 对象
        const date = new Date();

        // 获取年份
        const year = date.getFullYear();

        // 获取月份（注意：月份从 0 开始，所以需要加 1）
        const month = date.getMonth() + 1;

        // 获取日期
        const day = date.getDate();

        // 小时
        const hour = date.getHours()

        return `${year}${month}${day}${hour}`
    }

    const init_config_info = () => {
        axios.get(config_url + "?date=" + getYearMonthDayHour()).then((response) => {
            if (response.status === 200) {
                try {
                    setConfigInfo(response.data)
                } catch (err) {
                    console.log(err)
                }
            }
        })
    }

    const check_version = () => {
        let version = configInfo.version
        if(nowMod === 1) {
            version = configInfo.app_version
        }
        if (compareVersion(version, _package.version) > 0) {
            setShowNewVersion(true)
        } else {
            setShowNewVersion(false)
        }
    }

    const compareVersion = (version1, version2) => {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);

        const maxLength = Math.max(v1Parts.length, v2Parts.length);

        for (let i = 0; i < maxLength; i++) {
            const v1Part = v1Parts[i] || 0;  // 如果该部分为空，默认值为0
            const v2Part = v2Parts[i] || 0;  // 如果该部分为空，默认值为0

            if (v1Part > v2Part) return 1;  // version1 > version2
            if (v1Part < v2Part) return -1; // version1 < version2
        }

        return 0;  // version1 == version2
    }

    const checkFFmpeg = () => {
        invoke("check_ffmpeg").then((result) => {
            if (result) {
                setFffmepgCheck(1)
                console.log("FFmpeg is installed");
            }
        }).catch(e => {
            console.log("invoke error",e)
        })
    }

    const initControlBar = (appWindow, pageLabel) => {
        document
            .getElementById('titlebar-minimize')
            ?.addEventListener('click', () => appWindow.minimize());
        document
            .getElementById('titlebar-maximize')
            ?.addEventListener('click', () => {
                appWindow.isFullscreen().then((isFull) => {
                    console.log("isfull", isFull);
                    if (isFull) {
                        appWindow.setSize(new LogicalSize(1024, 800)).then(() => { })
                    } else {
                        appWindow.setTitleBarStyle('transparent')
                        appWindow.setFullscreen(true)
                        appWindow.center()
                        setShowWindowsTopBar(false)
                    }
                })
            });
        document
            .getElementById('titlebar-close')
            ?.addEventListener('click', () => appWindow.close());
    }

    const initTitleBar = () => {
        const appWindow = getCurrentWebviewWindow()
        initControlBar(appWindow)
    }

    const clientSaveFile = async (data, fullSuffix) => {
        const downloadDirPath = await downloadDir();
        let download_name = downloadDirPath + '/iptv-checker-file-' + new Date().getTime() + "." + fullSuffix
        let body = ''
        if (fullSuffix === 'txt') {
            body = m3uObjectToTxtBody(data)
        } else {
            body = m3uObjectToM3uBody(data)
        }
        const filePath = await save({
            defaultPath: download_name,
            filters: [{
                name: download_name,
                extensions: [fullSuffix]
            }]
        });
        console.log("filePath---", filePath)
        filePath && await writeTextFile(filePath, body)
    }

    const webSaveFile = async (data, fullSuffix) => {
        var a = document.createElement('a')
        let blob_data = ""
        if (fullSuffix === 'txt') {
            blob_data = m3uObjectToTxtBody(data)
        } else {
            blob_data = m3uObjectToM3uBody(data)
        }
        var blob = new Blob([blob_data])
        var url = window.URL.createObjectURL(blob)
        a.href = url
        a.download = 'iptv-checker-' + (new Date()).getTime() + "." + fullSuffix
        a.click()
    }

    const toMd5 = (data) => {
        return CryptoJS.MD5(data).toString()
    }

    useEffect(() => {
        checkFFmpeg()
        init_config_info()//初始化配置文件
        initCheckHistory()//初始化检查历史
        initSubCheckMenuList() //初始化子菜单
        invoke('now_mod', {}).then((response) => {
            setNowMod(response)
            initTitleBar()
            console.log("now mod", response)
            let os_type = type()
            if (os_type !== '') {
                console.log("now os type", os_type)
                setNowPlatform(os_type)
            }
        }).catch(e => {
            console.log("invoke---",e)
        })
        let setting = localStorage.getItem('settings') ?? ''
        if (setting !== '') {
            try {
                let data = JSON.parse(setting)
                changeLanguage(data.language)
                setSettings(data)
            } catch (e) {
                console.log(e)
            }
        }
    }, [])

    const onChangeNeedFastSource = (val) => {
        setNeedFastSource(val)
    }

    // 解析m3u8文件， 类似：https://xxxx.m3u8, https://xxx2.m3u8
    const getBodyTypeM3u8List = async (body) => {
        let rows = body.split(',');
        let result = [];
        for (let i = 0; i < rows.length; i++) {
            if (isValidUrl(rows[i]) && rows[i].includes(".m3u8")) {
                let name = 'channel ' + i
                let originalData = `#EXTINF:-1 tvg-id="" tvg-logo="" group-title="Undefined",` + name + `\n` + rows[i]
                let raw = `#EXTINF:-1 tvg-id="" tvg-logo="" group-title="Undefined",` + name + `\n` + rows[i]
                let data = ParseM3u.buildM3uBaseObject(i, rows[i],
                    "Undefined", "", "", "", "",
                    name, originalData, raw)
                result.push(data)
            }
        }
        if (result.length === 0) {
            return []
        }
        return combine_m3u_list(result)
    }

    const combine_m3u_list = (rows) => {
        let body = [];
        for (let i = 0; i < rows.length; i++) {
            body.push(rows[i].raw)
        }
        return body
    }

    const isValidUrl = (url) => {
        const pattern = new RegExp('^(https?:\\/\\/)?' + // 协议
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // 域名
            '((\\d{1,3}\\.){3}\\d{1,3}))' + // 或者IP地址
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // 端口和路径
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // 查询字符串
            '(\\#[-a-z\\d_]*)?$', 'i'); // 锚点
        return pattern.test(url);
    }

    // 解析m3u文件，类似 https://xxxx.m3u, https://xxxx.m3u
    const getBodyTypeM3uList = async (body) => {
        let rows = body.split(',');
        let urls = []
        for (let i = 0; i < rows.length; i++) {
            if (isValidUrl(rows[i]) && rows[i].includes(".m3u")) {
                urls.push(rows[i])
            }
        }
        let allRequest = [];
        for (let i = 0; i < urls.length; i++) {
            let _url = getM3uBody(urls[i])
            allRequest.push(axios.get(_url, { timeout: settings.httpRequestTimeout }))
        }
        const results = await Promise.allSettled(allRequest);

        let bodies = []
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const response = result.value.data;
                try {
                    let values = ParseM3u.parseOriginalBodyToList(response)
                    for (let i = 0; i < values.length; i++) {
                        bodies.push(values[i])
                    }
                } catch (err) {
                    console.log('err', err)
                }
            }
        })
        return combine_m3u_list(bodies)
    }

    // 解析text文件，类似 xxxx, https://xxx.m3u8
    const getBodyTypeText = async (body) => {
        try {
            let result = ParseM3u.parseQuoteFormat(body)
            return combine_m3u_list(result)
        } catch (e) {
            return []
        }
    }

    const get_m3u8_info_by_m3u_ori_data = (body) => {
        try {
            return ParseM3u.parseOriginalBodyToList(body)
        } catch (e) {
            return []
        }
    }

    const getBodyType = async (body) => {
        let arr = [
            getBodyTypeM3u8List,
            getBodyTypeM3uList,
            getBodyTypeText,
        ]
        let result = [];
        let hitValue = false
        for (const element of arr) {
            if (!hitValue) {
                let value = await element(body);
                if (value.length > 0) {
                    hitValue = true
                    result = value
                }
            }
        }
        if (result.length > 0) {
            let resultStr = '#EXTM3U\n'
            return resultStr + result.join('\n')
        } else {
            return body
        }
    }

    const onChangeSettings = (value) => {
        localStorage.setItem("settings", JSON.stringify(value))
        setSettings(value);
    }

    const changeVideoResolution = (val) => {
        setVideoResolution(val)
    }

    const clearDetailData = () => {
        setExportDataStr('')
        setDetailList([])
        setOriginalM3uBody('')
    }

    const contains = (str, substr) => {
        return str.indexOf(substr) !== -1;
    }

    const deleteShowM3uRow = (indexArr) => {
        let result = []
        for (let i = 0; i < detailList.length; i++) {
            let isSave = true
            for (let j = 0; j < indexArr.length; j++) {
                if (indexArr[j] === detailList[i].index) {
                    isSave = false
                }
            }
            if (isSave) {
                result.push(detailList[i])
            }
        }
        setDetailList(prev => prev.filter(function (v, i) {
            for (let j = 0; j < indexArr.length; j++) {
                if (indexArr[j] === v.index) {
                    return false
                }
            }
            return true
        }))

        console.log("detailList---", result, detailList)
        let data = get_detail_from_ori(detailMd5)
        if (data !== null) {
            data.data = result
            console.log("updateOriginalData data---", data)
            updateOriginalData(data)
        }
    }

    const get_detail_from_ori = (md5Str) => {
        for (let i = 0; i < subCheckMenuList.length; i++) {
            if (subCheckMenuList[i].md5 === md5Str) {
                return subCheckMenuList[i]
            }
        }
        return null
    }

    const updateOriginalData = (data) => {
        let list = []
        for (let i = 0; i < subCheckMenuList.length; i++) {
            let save = subCheckMenuList[i]
            if (subCheckMenuList[i].md5 === detailMd5) {
                save = data
            }
            list.push(save)
        }
        saveSubCheckMenuList(list)
    }

    // const getSelectedGroupTitle = () => {
    //     let row = []
    //     for (let i = 0; i < uGroups.length; i++) {
    //         if (uGroups[i].checked) {
    //             row.push(uGroups[i].key)
    //         }
    //     }
    //     return row
    // }

    const inArray = (arr, val) => {
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] === val) {
                return true
            }
        }
        return false
    }

    // const videoResolutionGetChecked = () => {
    //     let save = []
    //     for (let i = 0; i < videoResolution.length; i++) {
    //         if (videoResolution[i].checked) {
    //             save.push(videoResolution[i].value)
    //         }
    //     }
    //     return save
    // }

    const filterM3u = (filterNames, selectedGroupTitles, videoResArr) => {
        console.log("filterM3u", filterNames, selectedGroupTitles, videoResArr)
        // let selectedGroupTitles = getSelectedGroupTitle()
        // let videoResArr = videoResolutionGetChecked()
        if (filterNames.length === 0 && selectedGroupTitles.length === 0 && videoResArr.length === 0) {
            return
        }
        let temp = getNowDeatil()
        console.log("temp", temp)
        let rows = [];
        let _index = 1
        for (let i = 0; i < temp.length; i++) {
            // 检查当前视频清晰度是否命中
            let hitVideoRes = true
            if (videoResArr.length > 0 && temp[i].videoType !== "") {
                hitVideoRes = false
                for (let v = 0; v < videoResArr.length; v++) {
                    if (temp[i].videoType === videoResArr[v]) {
                        hitVideoRes = true
                    }
                }
            }
            // 搜索名称是否命中
            let hitTitleSearch = true
            if (filterNames.length > 0) {
                hitTitleSearch = false
                for (let j = 0; j < filterNames.length; j++) {
                    if (contains(temp[i].sName, filterNames[j].toLowerCase())) {
                        hitTitleSearch = true
                    }
                }
            }
            // group是否命中
            let hitGroup = true
            if (selectedGroupTitles.length > 0) {
                hitGroup = false
                if (inArray(selectedGroupTitles, temp[i].groupTitle)) {
                    hitGroup = true
                }
            }
            if (hitGroup && hitVideoRes && hitTitleSearch) {
                let one = temp[i]
                one.index = _index
                rows.push(one);
                _index++
            }
        }
        log("setShowM3uBody---", rows)
        setDetailList(rows)
    }

    const strToCsv = (body) => {
        let _res = ParseM3u.parseOriginalBodyToList(body)
        let csvBodyArr = []
        csvBodyArr.push(["名称", "链接", "分组", "台标"])
        for (let i = 0; i < _res.length; i++) {
            csvBodyArr.push([_res[i].name, _res[i].url, _res[i].groupTitle, _res[i].tvgLogo])
        }
        return csvBodyArr
    }

    const changeOriginalM3uBody = (body) => {
        clearDetailData()
        setOriginalM3uBody(body);
        let _res = ParseM3u.parseOriginalBodyToList(body)
        setDetailList(_res)
        // parseGroup(_res)
    }

    // const parseGroup = (groupList) => {
    //     let _group = {}
    //     for (let i = 0; i < groupList.length; i++) {
    //         _group[groupList[i].groupTitle] = groupList[i].groupTitle
    //     }
    //     let _tempGroup = []
    //     for (let i in _group) {
    //         _tempGroup.push({
    //             key: _group[i],
    //             checked: false
    //         })
    //     }
    //     setUGroups(_tempGroup)
    // }

    const addGroup = (name) => {
        let exists = false
        for (let i = 0; i < detailMenu['groups'].length; i++) {
            if (detailMenu['groups'][i] === name) {
                exists = true
            }
        }
        if (!exists) {
            let row = deepCopyJson(detailMenu['groups'])
            row.push(name)
            setDetailMenu({
                ...detailMenu,
                "groups": row,
            })
        }
    }

    const changeOriginalM3uBodies = (bodies) => {
        let res = []
        let bodyStr = ''
        let index = 1;
        for (let i = 0; i < bodies.length; i++) {
            bodyStr += bodies[i] + "\n"
            let one = ParseM3u.parseOriginalBodyToList(bodies[i])
            for (let j = 0; j < one.length; j++) {
                one[j].index = index
                res.push(one[j])
                index++
            }
        }
        clearDetailData()
        setDetailList(res)
        // parseGroup(res)
        setOriginalM3uBody(bodyStr);
    }

    const deepCopyJson = (obj) => {
        return JSON.parse(JSON.stringify(obj))
    }

    const setShowM3uBodyStatusByOri = (data, index, status, videoObj, audioObj, delay) => {
        console.log("data", data)
        for (let i = 0; i < data.length; i++) {
            if (data[i].index === index) {
                let videoType = ''
                if (videoObj !== null) {
                    videoType = ParseM3u.getVideoResolution(videoObj.width, videoObj.height)
                }
                let item = {
                    ...data[i],
                    status: status,
                    video: videoObj,
                    audio: audioObj,
                    videoType: videoType,
                    delay: delay,
                };
                data[i] = item
            }
        }
        return data
    }

    const onExportValidM3uData = () => {
        let _export = []
        for (let i = 0; i < detailList.length; i += 1) {
            if (detailList[i].checked) {
                _export.push(detailList[i])
            }
        }
        setExportData(_export)
    }

    const changeDialogBodyData = () => {
        let data = getNowDeatil(detailMd5)
        setExportDataStr(m3uObjectToM3uBody(data))
    }

    const getNowDeatil = () => {
        let data = null
        for (let i = 0; i < subCheckMenuList.length; i++) {
            if (subCheckMenuList[i].md5 === detailMd5) {
                data = subCheckMenuList[i].data
            }
        }
        return data;
    }

    const onSelectedRow = (index) => {
        let updatedList = [...detailList]
        const objIndex = updatedList.findIndex(obj => obj.index === index);
        updatedList[objIndex].checked = !updatedList[objIndex].checked;
        setDetailList(updatedList)
    }

    const findM3uBodyByIndexByOri = (data, index) => {
        let updatedList = [...data]
        const objIndex = updatedList.findIndex(obj => obj.index === index);
        return data[objIndex]
    }

    const onSelectedOrNotAll = (mod) => {
        //mod = 1选择 0取消选择
        if (mod === 1) {
            setDetailList(prev => prev.map((item, _) =>
                ({ ...item, checked: true })
            ))
        } else {
            setDetailList(prev => prev.map((item, _) =>
                ({ ...item, checked: false })
            ))
        }
    }

    const getCheckUrl = (url, timeout) => {
        if (nowMod === 1) {
            return url
        }
        let _timeout = parseInt(timeout, 10)
        return '/check/url-is-available?url=' + url + "&timeout=" + (isNaN(_timeout) ? '-1' : _timeout)
    }

    const getM3uBody = (url, timeout) => {
        if (nowMod === 1) {
            return url
        }
        let _timeout = parseInt(timeout, 10)
        log(url, _timeout)
        return '/fetch/m3u-body?url=' + url + "&timeout=" + (isNaN(_timeout) ? '-1' : _timeout)
    }

    const chunkArray = (arr, chunkSize) => {
        const chunkedArray = [];
        for (let i = 0; i < arr.length; i += chunkSize) {
            chunkedArray.push(arr.slice(i, i + chunkSize));
        }
        return chunkedArray;
    }

    const doNewCheck = async (data, settings, func) => {
        let videoInfoMap = {};
        let videoFastNameMap = {};
        let arr = chunkArray(data, settings.concurrent)
        if (nowMod === 1) {
            console.log("start check")
            for (let i = 0; i < arr.length; i++) {
                let nowData = [];
                let allRequest = [];
                for (let j = 0; j < arr[i].length; j++) {
                    let nowItem = arr[i][j]
                    let getData = findM3uBodyByIndexByOri(deepCopyJson(data), nowItem.index)
                    if (getData.status !== 0) {
                        log("do check status != 0")
                        continue
                    }
                    nowData.push(arr[i][j])
                    allRequest.push(axios.get(arr[i][j].url, { timeout: settings.httpRequestTimeout }))
                }
                if (allRequest.length === 0) {
                    continue
                }
                const results = await Promise.allSettled(allRequest);
                results.forEach((result, index) => {
                    let one = nowData[index];
                    if (result.status === 'fulfilled') {
                        const response = result.value;
                        let delay = -1;
                        videoInfoMap[one.url] = {
                            "video": null,
                            "audio": null,
                            "videoType": null,
                            "status": 1,
                            'delay': delay,
                        }
                        if (videoFastNameMap[one.sName] === undefined || videoFastNameMap[one.sName] === null) {
                            videoFastNameMap[one.sName] = {
                                index: one.index,
                                delay: delay
                            }
                        } else {
                            if (videoFastNameMap[one.sName].delay >= delay) {
                                videoFastNameMap[one.sName] = {
                                    index: one.index,
                                    delay: delay
                                }
                            }
                        }
                        data = setShowM3uBodyStatusByOri(data, one.index, 1, null, null, delay)
                        func(200, one.index)
                    } else {
                        videoInfoMap[one.url] = {
                            "status": 2,
                        }
                        data = setShowM3uBodyStatusByOri(data, one.index, 2, null, null, 0)
                        func(500, one.index)
                    }
                });
            }
            console.log("end check")
        } else {
            console.log("start server check")
            for (let i = 0; i < arr.length; i++) {
                console.log("----now", arr[i])
                let nowData = [];
                let allRequest = [];

                for (let j = 0; j < arr[i].length; j++) {
                    let nowItem = arr[i][j]
                    let getData = findM3uBodyByIndexByOri(data, nowItem.index)
                    if (getData.status !== 0) {
                        log("do check status != 0")
                        continue
                    }
                    nowData.push(arr[i][j])
                    let _url = getCheckUrl(arr[i][j].url, settings.httpRequestTimeout)
                    allRequest.push(axios.get(_url, { timeout: settings.httpRequestTimeout }))
                }
                if (allRequest.length === 0) {
                    continue
                }
                const results = await Promise.allSettled(allRequest);
                results.forEach((result, index) => {
                    let one = nowData[index];
                    if (result.status === 'fulfilled') {
                        const res = result.value;
                        console.log("resp", res);
                        let delay = res.data.delay;
                        videoInfoMap[one.url] = {
                            "video": res.data.video,
                            "audio": res.data.audio,
                            "videoType": ParseM3u.getVideoResolution(res.data.video.width, res.data.video.height),
                            "status": 1,
                            'delay': res.data.delay,
                        }
                        if (videoFastNameMap[one.sName] === undefined || videoFastNameMap[one.sName] === null) {
                            videoFastNameMap[one.sName] = {
                                index: one.index,
                                delay: delay
                            }
                        } else {
                            if (videoFastNameMap[one.sName].delay >= delay) {
                                videoFastNameMap[one.sName] = {
                                    index: one.index,
                                    delay: delay
                                }
                            }
                        }
                        data = setShowM3uBodyStatusByOri(data, one.index, 1, res.data.video, res.data.audio, res.data.delay)
                        func(200, one.index)
                    } else {
                        videoInfoMap[one.url] = {
                            "status": 2,
                        }
                        data = setShowM3uBodyStatusByOri(data, one.index, 2, null, null, 0)
                        func(500, one.index)
                    }
                });
            }
        }
        return data
    }

    const doFastCheck = async (data, settings, totalFunc, func) => {
        let copyData = deepCopyJson(data)
        totalFunc(copyData.length)
        return await doNewCheck(copyData, settings, func)
    }

    const onChangeExportData = (value) => {
        setDetailList(value)
    }

    const onChangeExportStr = () => {
        setExportDataStr(_toOriginalStr(detailList))
    }

    const m3uObjectToM3uBody = (data) => {
        return _toOriginalStr(data)
    }

    const m3uObjectToTxtBody = (data) => {
        let list = [];
        for (let i = 0; i < data.length; i++) {
            list.push(data[i].name + "," + data[i].url)
        }
        return list.join("\n")
    }

    const batchChangeGroupName = (selectArr, groupName) => {
        updateDataByIndex(selectArr, { "groupTitle": groupName })
    }

    const addGroupName = (name) => {
        addGroup(name)
    }

    const updateDataByIndex = (indexArr, mapData) => {
        let row = deepCopyJson(detailList)
        if (mapData["groupTitle"] !== undefined && mapData["groupTitle"] !== null) {
            addGroup(mapData["groupTitle"])
        }
        for (let i = 0; i < row.length; i++) {
            if (inArray(indexArr, row[i].index)) {
                for (let j in mapData) {
                    if (j === 'name') {
                        row[i]['sName'] = mapData[j]
                    }
                    row[i][j] = mapData[j]
                }
            }
        }
        let data = detailList
        for (let i = 0; i < data.length; i++) {
            if (inArray(indexArr, data[i].index)) {
                for (let j in mapData) {
                    if (j === 'name') {
                        data[i]['sName'] = mapData[j].toLowerCase()
                    }
                    data[i][j] = mapData[j]
                }
            }
        }
        setDetailList(row)
    }

    const _toOriginalStr = (data) => {
        let body = `#EXTM3U\n`;
        for (let i = 0; i < data.length; i += 1) {
            body += `#EXTINF:-1 tvg-name="${data[i].tvgName}" tvg-id="${data[i].tvgId}" tvg-logo="${data[i].tvgLogo}" group-title="${data[i].groupTitle}",${data[i].name}\n${data[i].url}\n`
        }
        return body
    }

    const saveDataToHistory = (urls) => {
        let md5Str = toMd5(JSON.stringify(urls))
        let needSaveData = { "urls": urls, "md5": md5Str }
        let data = deepCopyJson(checkHistory);
        // 检查md5是否已经存在
        let isExits = false
        for (let i = 0; i < data.length; i++) {
            if (data[i].md5 === md5Str) {
                isExits = true
            }
        }
        if (isExits) {
            return
        }
        if (data.length >= 5) {
            data.splice(0, 1)
            data.push(needSaveData)
        } else {
            data.push(needSaveData);
        }
        saveCheckHistory(data)
    }

    const local_key_check_history = "checkHistory"
    const local_key_sub_check_menu_list = "subCheckMenuList"

    const initCheckHistory = () => {
        let data = localStorage.getItem(local_key_check_history);
        try {
            let list = JSON.parse(data) ?? []
            setCheckHistory(list)
        } catch (e) {
            console.log('read checkHistory from local error')
        }
    }

    const saveCheckHistory = (data) => {
        setCheckHistory(data);
        localStorage.setItem(local_key_check_history, JSON.stringify(data))
    }

    const sortByField = (a, b) => {
        const regex = /(\D+)(\d+)/; // 匹配字母和数字部分
        if (a === null || b === null) {
            return -1
        }
        console.log("----a", a)
        console.log("----b", b)
        let lettersA = '';
        let numbersA = '';
        let lettersB = -1;
        let numbersB = -1;
        let regA = a.sName.match(regex);
        if (regA && regA.length >= 3) {
            lettersA = regA[1]
            numbersA = regA[2]
        }

        let regB = b.sName.match(regex);
        if (regB && regB.length >= 3) {
            lettersB = regB[1]
            numbersB = regB[2]
        }

        // 首先比较字母部分
        if (lettersA < lettersB) return -1;
        if (lettersA > lettersB) return 1;

        // 如果字母相同，则比较数字部分
        return parseInt(numbersA) - parseInt(numbersB);
    };

    const addDetail = (data, urls, isLocal, check, sort) => {
        if (sort) {
            console.log("addDetail----sort----", data)
            data.sort(sortByField);
        }
        let dataList = deepCopyJson(subCheckMenuList);
        console.log("dataList--", dataList)
        let md5Str = toMd5(JSON.stringify(urls))
        let exists = false
        for (let i = 0; i < dataList.length; i++) {
            if (dataList[i].md5 === md5Str) {
                exists = true
            }
        }
        if (exists) {
            return md5Str
        }
        dataList.push({
            "md5": md5Str,
            "data": data,
            "original": {
                "urls": urls,
                "local": isLocal,//是否本地
                "ffmpeg": 0,//是否使用ffmpeg
                "sort": sort,//是否需要排序
                "check": check,//是否需要检查
            },
            "menu": {
                "groups": get_groups(data)
            },
            "query": {
                "needFast": false,//是否需要选择最快的源
                "searchName": [],//搜索名称
                "group": "",// 分组
            }
        })
        saveSubCheckMenuList(dataList)
        return md5Str
    }

    const initSubCheckMenuList = () => {
        let data = localStorage.getItem(local_key_sub_check_menu_list);
        try {
            let list = JSON.parse(data) ?? []
            setSubCheckMenuList(list)
        } catch (e) {
            console.log('read checkHistory from local error')
        }
    }

    const saveSubCheckMenuList = (data) => {
        setSubCheckMenuList(data);
        localStorage.setItem(local_key_sub_check_menu_list, JSON.stringify(data))
    }

    const get_groups = (data) => {
        let groupMap = {}
        for (let i = 0; i < data.length; i++) {
            if (data[i].groupTitle !== "") {
                groupMap[data[i].groupTitle] = data[i].groupTitle
            }
        }
        let saveList = []
        for (let i in groupMap) {
            saveList.push(groupMap[i])
        }
        return saveList
    }

    const get_m3u_body = async (data) => {
        let allRequest = [];
        for (let i = 0; i < data.length; i++) {
            let _url = getM3uBody(data[i].url)
            allRequest.push(axios.get(_url, { timeout: settings.httpRequestTimeout }))
        }
        const results = await Promise.allSettled(allRequest);
        results.forEach((result, index) => {
            let isError = true
            let body = ""
            if (result.status === 'fulfilled') {
                const response = result.value.data;
                if (valid_m3u_file(response)) {
                    isError = false
                    body = response
                } else {
                    isError = true
                    body = response
                }
            } else {
                isError = true
                body = result.reason.message
            }
            if (isError) {
                data[index].status = 500
            } else {
                data[index].status = 200
            }
            data[index].body = body
        })
        return data
    }

    const valid_m3u_file = (content) => {
        return content.substr(0, 7) === "#EXTM3U"
    }

    const delDetailData = (md5Str) => {
        let list = []
        for (let i = 0; i < subCheckMenuList.length; i++) {
            if (subCheckMenuList[i].md5 !== md5Str) {
                list.push(subCheckMenuList[i])
            }
        }
        saveSubCheckMenuList(list);
        clear_detail_data()
    }

    const updateDetailMd5 = (detailMd5Str) => {
        setDetailMd5(detailMd5Str)
        let data = get_detail_from_ori(detailMd5Str)
        if (data) {
            setDetailList(data.data)
            setDetailQuery(data.query)
            setDetailMenu(data.menu)
            setDetailOriginal(data)
        }
    }

    const clear_detail_data = () => {
        setDetailMd5("")
        setDetailList([])
        setDetailQuery(null)
        setDetailMenu(null)
        setDetailOriginal([])
    }

    return (
        <MainContext.Provider value={{
            originalM3uBody, changeOriginalM3uBody,
            exportDataStr, setExportDataStr,
            exportData, onChangeExportData,
            videoResolution, changeVideoResolution,
            settings, onChangeSettings,
            headerHeight,
            filterM3u,
            deleteShowM3uRow, onExportValidM3uData,
            onSelectedRow, onSelectedOrNotAll,
            changeDialogBodyData,
            changeOriginalM3uBodies, updateDataByIndex,
            onChangeExportStr, batchChangeGroupName, addGroupName, getCheckUrl,
            strToCsv, clearDetailData,
            getM3uBody,
            needFastSource, onChangeNeedFastSource, nowMod, getBodyType,
            changeLanguage, languageList, clientSaveFile,
            nowPlatform, videoPlayTypes, initControlBar, showWindowsTopBar,
            doFastCheck,
            subCheckMenuList, checkHistory, saveDataToHistory,
            addDetail, get_m3u_body, get_m3u8_info_by_m3u_ori_data,
            m3uObjectToM3uBody, m3uObjectToTxtBody, webSaveFile,
            detailList, detailQuery, detailMenu, ffmepgCheck,
            detailOriginal, updateDetailMd5, delDetailData,
            detailMd5, configInfo, showNewVersion,check_version
        }}>
            {children}
        </MainContext.Provider>
    )
}