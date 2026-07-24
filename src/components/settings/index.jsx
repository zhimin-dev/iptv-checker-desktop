import { useState, useContext, useEffect } from 'react'
import * as React from 'react';
import { MainContext } from './../../context/main';
import { ApiTaskService } from '../../services/apiTaskService';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import LoadingButton from '@mui/lab/LoadingButton';
import FormLabel from '@mui/material/FormLabel';
import Dialog from '@mui/material/Dialog';
import _package from './../../../package';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';
import { useTranslation, initReactI18next } from "react-i18next";
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import { fontSize, fontWeight } from '@mui/system';

function AddSourceDialog(props) {
    const { t } = useTranslation();
    const { onClose, open, saveData } = props;

    const [body, setBody] = useState('')

    const handleClose = () => {
        onClose(false);
    };

    const onChangeBody = (e) => {
        setBody(e.target.value)
    }

    const doSave = () => {
        saveData(body)
    }

    return (
        <Dialog onClose={handleClose} open={open}>
            <DialogTitle>{t('自定义网络源')}</DialogTitle>
            <div style={{
                padding: '20px',
                display: 'flex',
                justifyContent: 'center',
                flexDirection: 'column'
            }}>
                <FormControl style={{ width: '550px' }}>
                    <TextField
                        id="demo-simple-select-standard"
                        value={body}
                        multiline
                        rows={10}
                        onChange={onChangeBody}
                    />
                </FormControl>
                <FormControl style={{ margin: '10px 0' }}>
                    <LoadingButton
                        onClick={doSave}
                        variant="outlined"
                    >
                        {t('保存')}
                    </LoadingButton>
                </FormControl>
                <Box>{t('格式：名称,https://xxxx.m3u + 换行，其中名称需要唯一，如下所示')}</Box>
                <Box>star movies,http://srtarmovies.m3u8</Box>
                <Box>star plus,https://plus.m3u</Box>
            </div>
        </Dialog>
    );
}

const taskService = new ApiTaskService();

export default function Settings() {
    const _mainContext = useContext(MainContext);
    const [showAddSourceDialog, setShowAddSourceDialog] = useState(false)
    const [httpRequestTimeout, setHttpRequestTimeout] = useState(8000);
    const [concurrent, setConcurrent] = useState(1);
    const [language, setLanguage] = useState('zh');
    const [customLink, setCustomLink] = useState([]);
    const [privateHost, setPrivateHost] = useState('')
    const [baseHost, setBaseHost] = useState('')
    const [replaceString, setReplaceString] = useState(false)
    const [replaceMap, setReplaceMap] = useState({})
    const [dialogMsg, setDialogMsg] = useState('');
    const [playerSource, setPlayerSource] = useState('');
    const [githubToken, setGithubToken] = useState('');
    const [channelNameDisplayMode, setChannelNameDisplayMode] = useState(0);
    const [openDialog, setOpenDialog] = useState(false);
    const [newVersion, setNewVersion] = useState('');
    const { t } = useTranslation();

    useEffect(() => {
        let config = _mainContext.settings
        _mainContext.check_version()
        if(_mainContext.nowMod === 1) {
            setNewVersion(_mainContext.configInfo.app_version)
        } else {
            setNewVersion(_mainContext.configInfo.version)
        }
        if (config !== null) {
            setHttpRequestTimeout(config.httpRequestTimeout ?? 1000)
            setCustomLink(config.customLink ?? [])
            setConcurrent(config.concurrent ?? 1)
            setLanguage(config.language ?? 'zh')
            setPrivateHost(config.privateHost ?? '')
            setPlayerSource(config.playerSource ?? 'video/mp2t')
            setGithubToken(config.githubToken ?? '')
            setChannelNameDisplayMode(config.channelNameDisplayMode ?? 0)
        }
    }, [_mainContext])

    useEffect(() => {
        taskService.getBaseConfig().then((data) => {
            setBaseHost(data?.host ?? '')
            setReplaceString(data?.replace_string ?? false)
            setGithubToken(data?.github_token ?? '')
        }).catch(() => {
            setBaseHost('')
            setReplaceString(false)
            setGithubToken('')
        })
    }, [])

    const handleChangeConfigSettings = (e) => {
        const { name, value } = e.target;
        let valueInt = parseInt(e.target.value, 10)
        if (name === 'httpRequestTimeout') {
            setHttpRequestTimeout(valueInt)
        } else if (name === 'concurrent') {
            if (valueInt === 0) {
                valueInt = 1
            }
            setConcurrent(valueInt)
        } else if (name === 'language') {
            setLanguage(e.target.value)
        } else if (name === 'privateHost') {
            setPrivateHost(e.target.value)
        } else if (name === 'playerSource') {
            setPlayerSource(e.target.value)
        } else if (name === 'baseHost') {
            setBaseHost(e.target.value)
        } else if (name === 'replaceString') {
            setReplaceString(e.target.checked)
        } else if (name === 'githubToken') {
            setGithubToken(e.target.value)
        } else if (name === 'channelNameDisplayMode') {
            setChannelNameDisplayMode(valueInt)
        }
    }

    const doSaveConfigSettings = async () => {
        try {
            await taskService.saveBaseConfig({
                host: baseHost,
                replace_string: false,
                github_token: githubToken,
                rename_channel_type: channelNameDisplayMode,
            })
        } catch (e) {
            setDialogMsg(t('保存失败') + (e?.message ? ': ' + e.message : ''))
            setOpenDialog(true)
            return
        }
        _mainContext.onChangeSettings({
            httpRequestTimeout: httpRequestTimeout,
            customLink: customLink,
            concurrent: concurrent,
            language: language,
            privateHost: privateHost,
            playerSource: playerSource,
            githubToken: githubToken,
            channelNameDisplayMode: channelNameDisplayMode,
        })
        _mainContext.changeLanguage(language)
        setOpenDialog(true)
        setDialogMsg(t('保存成功'))
    }

    const handleShowAddSourceDialog = (val) => {
        setShowAddSourceDialog(val)
    }

    const saveSource = (val) => {
        let oriArr = customLink
        let arr = val.split('\n')
        if (arr.length > 0) {
            for (let i = 0; i < arr.length; i++) {
                let one = arr[i].split(',')
                oriArr.push({
                    name: one[0],
                    url: one[1],
                })
            }
            setCustomLink(oriArr)
        }
        setShowAddSourceDialog(false)
    }

    const nowVersion = _package.version;

    const delCustomLink = (i) => {
        setCustomLink(customLink.filter((url, index) => index !== i))
    }

    const handleCloseDialogMsg = () => {
        setOpenDialog(false)
        setDialogMsg('')
    }

    return (
        <Box style={{
            padding: '0 20px'
        }}>
            <AddSourceDialog
                open={showAddSourceDialog}
                onClose={() => handleShowAddSourceDialog(false)}
                saveData={saveSource}
            />
            <Snackbar
                open={openDialog}
                autoHideDuration={3000}
                message={dialogMsg}
                onClose={handleCloseDialogMsg}
            />
            <Box>
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '20px',
                    width: '500px'
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                        <Typography sx={{ width: '150px' }}>{t('全局 Host')}</Typography>
                        <TextField
                            name="baseHost"
                            value={baseHost}
                            onChange={handleChangeConfigSettings}
                            size="small"
                            sx={{ flex: 1 }}
                            placeholder="http://localhost:5173"
                        />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                        <Typography sx={{ width: '150px' }}>{t('频道名称显示方式')}</Typography>
                        <Select
                            name="channelNameDisplayMode"
                            value={channelNameDisplayMode}
                            size="small"
                            sx={{ flex: 1 }}
                            onChange={handleChangeConfigSettings}
                        >
                            <MenuItem value={0}>{t('默认')}</MenuItem>
                            <MenuItem value={1}>{t('频道名 + 分辨率标签 (HD, FHD)')}</MenuItem>
                            <MenuItem value={2}>{t('频道名 + 分辨率数值 (720p, 1080p)')}</MenuItem>
                        </Select>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                        <Typography sx={{ width: '150px' }}>GitHub Token</Typography>
                        <TextField
                            name="githubToken"
                            type="password"
                            value={githubToken}
                            onChange={handleChangeConfigSettings}
                            size="small"
                            sx={{ flex: 1 }}
                            placeholder="ghp_xxxxxxxxxxxx"
                        />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                        <Typography sx={{ width: '150px' }}>{t('语言')}</Typography>
                        <Select
                            name="language"
                            value={language}
                            size="small"
                            sx={{ flex: 1 }}
                            onChange={handleChangeConfigSettings}
                        >
                            {
                                _mainContext.languageList.map((val, index) => (
                                    <MenuItem key={index} value={val.code}>{val.name}</MenuItem>
                                ))
                            }
                        </Select>
                    </Box>
                    {/* <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                        <Typography sx={{ width: '150px' }}>{t('播放平台')}</Typography>
                        <Select
                            name="playerSource"
                            value={playerSource}
                            size="small"
                            sx={{ flex: 1 }}
                            onChange={handleChangeConfigSettings}
                        >
                            {
                                _mainContext.videoPlayTypes.map((val, index) => (
                                    <MenuItem key={index} value={val.value}>{val.name}</MenuItem>
                                ))
                            }
                        </Select>
                    </Box> */}
                    <Box sx={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                        <Box sx={{ width: '150px' }}></Box>
                        <LoadingButton
                            onClick={doSaveConfigSettings}
                            variant="outlined"
                        >
                            {t('保存')}
                        </LoadingButton>
                    </Box>
                </Box>
                <FormControl sx={{ marginTop: '20px',paddingLeft: '20px', }}>
                    <Box>{t('当前版本')}: {nowVersion}</Box>
                    {
                        _mainContext.showNewVersion ? (
                            <Box style={{ color: 'green', fontWeight:"bold" }}>{t('有新版本')}: {newVersion}</Box>
                        ) : ''
                    }
                </FormControl>
            </Box>
        </Box>
    )
}