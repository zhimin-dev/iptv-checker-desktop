import * as React from 'react';
import { useEffect, useState, useContext } from "react";
import { useTranslation } from "react-i18next";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Tabs,
    Tab,
    Box,
    FormControl,
    FormGroup,
    FormControlLabel,
    Checkbox,
    InputLabel,
    MenuItem,
    Select,
    CircularProgress
} from '@mui/material';
import { MainContext } from '../../context/main';
import { ApiTaskService } from '../../services/apiTaskService';

export const DownloadDialog = ({ onClose, formValue, open }) => {
    const { t } = useTranslation();
    const [showData, setShowData] = useState([]);
    const [localLogoData, setLocalLogoData] = useState('');
    const [url, setUrl] = useState('');
    const [withLocalLogoUrl, setWithLocalLogoUrl] = useState('');
    const [currentTab, setCurrentTab] = useState(0);
    const [hasLogoType, setHasLogoType] = useState(false);
    const _mainContext = useContext(MainContext);
    const [fileType, setFileType] = useState(0);//默认是0 m3u 1 txt
    const [fileTypeList, setFileTypeList] = useState([{label: 'm3u', value: 0}, {label: 'txt', value: 1}]);
    const [checkResultMap, setCheckResultMap] = useState({});
    const [qualityDialogOpen, setQualityDialogOpen] = useState(false);
    const [selectedQualities, setSelectedQualities] = useState([]);
    const [qualityValue, setQualityValue] = useState(0);
    const [qualityFetchContent, setQualityFetchContent] = useState('');
    const [qualityFetchLoading, setQualityFetchLoading] = useState(false);
    const [qualityFetchError, setQualityFetchError] = useState('');
    const [globalHost, setGlobalHost] = useState('');

    // Load global host from base config
    useEffect(() => {
        const svc = new ApiTaskService();
        svc.getBaseConfig().then(data => {
            const host = (data?.host || '').trim().replace(/\/+$/, '');
            setGlobalHost(host);
        }).catch(() => setGlobalHost(''));
    }, [open]);

    const qualityOptions = [
        { label: '8K', value: '8K' },
        { label: '4K', value: '4K' },
        { label: '2K', value: '2K' },
        { label: '1080P', value: '1080P' },
        { label: '720P', value: '720P' },
        { label: '480P', value: '480P' },
        { label: '360P', value: '360P' },
        { label: '240P', value: '240P' },
    ];

    useEffect(() => {
        if (!open) return; // 对话框未打开时不执行
        
        setCurrentTab(0);
        
        // 重置数据
        setShowData('');
        setLocalLogoData('');
        setUrl('');
        setWithLocalLogoUrl('');
        setHasLogoType(false);
        setQualityDialogOpen(false);
        setSelectedQualities([]);
        setQualityValue(0);
        setQualityFetchContent('');
        setQualityFetchLoading(false);
        setQualityFetchError('');
        
        // 解析 check_result 字段
        const parseCheckResult = () => {
            if (!formValue.check_result || !Array.isArray(formValue.check_result)) {
                // 如果没有 check_result，尝试使用原有的 content 和 url（向后兼容）
                if (formValue.content !== '') {
                    setShowData(formValue.content);
                }
                if (formValue.url) {
                    const host = globalHost || window.document.location.origin;
                    setUrl(host + "/" + formValue.url);
                    setWithLocalLogoUrl(host + "/q?url=/" + formValue.url);
                }
                setCheckResultMap({});
                return;
            }
            
            const nextMap = {};
            // 遍历 check_result 数组
            formValue.check_result.forEach(item => {
                const typeKey = item.type || 'sub';
                if (!nextMap[typeKey]) {
                    nextMap[typeKey] = {};
                }
                if (item.content) {
                    nextMap[typeKey].content = item.content;
                }
                if (item.url) {
                    nextMap[typeKey].url = item.url;
                }
                // 向后兼容：保持原有状态
                if (typeKey === 'sub') {
                    if (item.content) {
                        setShowData(item.content);
                    }
                    if (item.url) {
                        setUrl(item.url);
                    }
                }
            });
            setCheckResultMap(nextMap);
        };
        
        parseCheckResult();
    }, [formValue, open, globalHost]);


    const downloadFile = async () => {
        _mainContext.saveFile();
        if (_mainContext.nowMod === 0) {
            const downloadUrl = currentUrlWithQuality;
            window.open(downloadUrl);
        } else {
            const content = showQualityResult ? qualityFetchContent : currentContent;
            _mainContext.clientSaveFile(content, fileType === 0 ? 'm3u' : 'txt');
        }
    };

    const handleTabChange = (event, newValue) => {
        setCurrentTab(newValue);
    };
    const buildSubUrl = (rawUrl) => {
        if (!rawUrl) return '';
        if (rawUrl.startsWith('http')) return rawUrl;
        // Use global host from base config if configured, else current page origin
        const host = globalHost || window.document.location.origin;
        return `${host}/${rawUrl}&r=${fileType}`;
    };

    const buildQualityValue = (selected) => {
        const bits = qualityOptions
            .map((item) => (selected.includes(item.value) ? '1' : '0'))
            .join('');
        return parseInt(bits || '0', 2);
    };

    const buildQualityUrl = (baseUrl) => {
        if (!baseUrl || qualityValue <= 0) return baseUrl;
        const joiner = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${joiner}q=${qualityValue}`;
    };

    const handleToggleQuality = (value) => {
        setSelectedQualities((prev) => (
            prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
        ));
    };

    const handleConfirmQuality = async () => {
        const newQualityValue = buildQualityValue(selectedQualities);
        setQualityValue(newQualityValue);
        setQualityDialogOpen(false);
        setQualityFetchError('');
        setQualityFetchContent('');
        if (newQualityValue <= 0) return;
        const subData = checkResultMap['sub'] || {};
        const rawUrl = subData.url || url;
        const baseUrl = buildSubUrl(rawUrl);
        const fetchUrl = baseUrl ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}q=${newQualityValue}` : '';
        if (!fetchUrl) return;
        setQualityFetchLoading(true);
        try {
            const timeout = _mainContext?.settings?.httpRequestTimeout || 30000;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            const res = await fetch(fetchUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error(res.statusText || '请求失败');
            const text = await res.text();
            setQualityFetchContent(text);
        } catch (e) {
            setQualityFetchError(e?.message || t('请求失败'));
        } finally {
            setQualityFetchLoading(false);
        }
    };

    const handleCancelQuality = () => {
        setSelectedQualities([]);
        setQualityDialogOpen(false);
    };

    const currentType = currentTab === 0 ? 'sub' : (currentTab === 1 ? 'ipv4' : 'ipv6');
    const currentData = checkResultMap[currentType] || {};
    const currentContent = currentData.content || '';
    const currentUrl = buildSubUrl(currentData.url || url);
    const isFfmpegTask = Boolean(formValue?.original?.ffmpeg_check);
    const hasSameSaveNum = Boolean(formValue?.original?.same_save_num);
    const currentUrlWithQuality = isFfmpegTask && !hasSameSaveNum ? buildQualityUrl(currentUrl) : currentUrl;
    const selectedQualityLabels = qualityOptions
        .filter((item) => selectedQualities.includes(item.value))
        .map((item) => item.label)
        .join(', ');
    const showQualityResult = isFfmpegTask && qualityValue > 0;

    return (
        <Dialog onClose={() => onClose(false)} open={open} maxWidth="lg" fullWidth>
            <Box sx={{ width: '100%', minHeight: '400px' }}>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>{t('文件类型')}</InputLabel>
                            <Select
                                value={fileType}
                                label={t('文件类型')}
                                onChange={(event) => setFileType(event.target.value)}
                            >
                                {fileTypeList.map(item => (
                                    <MenuItem key={item.value} value={item.value}>
                                        {item.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <div>{t('订阅链接')}：<b>{currentUrlWithQuality}</b></div>
                        {isFfmpegTask && !hasSameSaveNum ? (
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setQualityDialogOpen(true)}
                            >
                                {t('继续选择分辨率')}
                            </Button>
                        ) : null}
                    </Box>
                    {isFfmpegTask && selectedQualityLabels ? (
                        <Box sx={{ marginTop: 1, color: 'text.secondary', fontSize: 12 }}>
                            {t('已选择分辨率')}：{selectedQualityLabels}
                        </Box>
                    ) : null}
                </Box>
                
                {!showQualityResult ? (
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={currentTab} onChange={handleTabChange}>
                            <Tab label={t('all')} />
                            <Tab label={t('ipv4')} />
                            <Tab label={t('ipv6')} />
                        </Tabs>
                    </Box>
                ) : null}

                <Box sx={{ p: 2 }}>
                    {showQualityResult ? (
                        qualityFetchLoading ? (
                            <Box sx={{ padding: "60px 0", textAlign: 'center' }}>
                                <CircularProgress />
                                <div style={{ marginTop: 8 }}>{t('加载中...')}</div>
                            </Box>
                        ) : qualityFetchError ? (
                            <Box sx={{ padding: "60px 0", textAlign: 'center', color: 'error.main' }}>
                                <div>{t('请求失败')}：{qualityFetchError}</div>
                            </Box>
                        ) : qualityFetchContent ? (
                            <TextField
                                multiline
                                fullWidth
                                minRows={15}
                                maxRows={25}
                                value={qualityFetchContent}
                                variant="outlined"
                                InputProps={{
                                    readOnly: true,
                                }}
                            />
                        ) : (
                            <Box sx={{ padding: "60px 0", textAlign: 'center' }}>
                                <div>{t('暂未生成')}</div>
                            </Box>
                        )
                    ) : (
                        <>
                            {currentContent !='' ? (
                                <TextField
                                    multiline
                                    fullWidth
                                    minRows={15}
                                    maxRows={25}
                                    value={currentContent}
                                    variant="outlined"
                                    InputProps={{
                                        readOnly: true,
                                    }}
                                />
                            ) : (
                                <Box sx={{ padding: "60px 0", textAlign: 'center' }}>
                                    <div>{t('暂未生成')}</div>
                                </Box>
                            )}
                        </>
                    )}
                </Box>
            </Box>
            <Dialog
                open={qualityDialogOpen}
                onClose={handleCancelQuality}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>{t('选择分辨率')}</DialogTitle>
                <DialogContent>
                    <FormGroup>
                        {qualityOptions.map((item) => (
                            <FormControlLabel
                                key={item.value}
                                control={(
                                    <Checkbox
                                        checked={selectedQualities.includes(item.value)}
                                        onChange={() => handleToggleQuality(item.value)}
                                    />
                                )}
                                label={item.label}
                            />
                        ))}
                    </FormGroup>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelQuality}>{t('取消')}</Button>
                    <Button variant="contained" onClick={handleConfirmQuality}>
                        {t('确定')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
}; 