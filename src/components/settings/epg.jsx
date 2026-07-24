import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import { useTranslation } from 'react-i18next';
import { ApiTaskService } from '../../services/apiTaskService';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import LoadingButton from '@mui/lab/LoadingButton';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';

/** 将 GET /epg/sources 的多种返回形态规范为 URL 字符串数组 */
function normalizeEpgUrlList(data) {
    if (data == null) return [];
    let raw = [];
    if (Array.isArray(data)) raw = data;
    else if (data.data && Array.isArray(data.data.list)) raw = data.data.list;
    else if (Array.isArray(data.list)) raw = data.list;
    return raw.map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && item.url != null) return String(item.url);
        return '';
    });
}

/** @returns {{ urls: string[], status: boolean | null }} `status` 仅当响应含布尔 `status` 时有值 */
function parseEpgSourcesResponse(data) {
    if (data == null) return { urls: [], status: null };
    
    // Unwrap if wrapped in { code, data }
    const payload = data.data && data.code ? data.data : data;

    if (Array.isArray(payload)) {
        return { urls: normalizeEpgUrlList(payload), status: null };
    }
    return {
        urls: normalizeEpgUrlList(payload),
        status: typeof payload.status === 'boolean' ? payload.status : null,
    };
}

export default function EpgSettings() {
    const { t } = useTranslation();
    const [urls, setUrls] = useState([]);
    const [sourcesStatus, setSourcesStatus] = useState(null);
    const [taskService] = useState(() => new ApiTaskService());
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMsg, setSnackbarMsg] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [clearingCache, setClearingCache] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    useEffect(() => {
        fetchSources();
    }, []);

    const fetchSources = async () => {
        try {
            const data = await taskService.getEpgSources();
            const { urls: next, status } = parseEpgSourcesResponse(data);
            setUrls(next);
            setSourcesStatus(status);
        } catch (error) {
            console.error('Error fetching EPG sources:', error);
            setSnackbarMsg(t('EPG 加载失败'));
            setOpenSnackbar(true);
        }
    };

    const handleChange = (index, value) => {
        setUrls((prev) => {
            const copy = [...prev];
            copy[index] = value;
            return copy;
        });
    };

    const handleAddRow = () => {
        setUrls((prev) => [...prev, '']);
    };

    const handleRemoveRow = (index) => {
        setUrls((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        const list = urls.map((u) => (u == null ? '' : String(u).trim())).filter(Boolean);
        try {
            await taskService.saveEpgSources({ list });
            setSnackbarMsg(t('保存成功'));
            setOpenSnackbar(true);
        } catch (err) {
            console.error('Error saving EPG sources:', err);
            setSnackbarMsg(t('保存失败'));
            setOpenSnackbar(true);
        }
    };

    const handleRefreshEpg = async () => {
        setRefreshing(true);
        try {
            await taskService.refreshEpg();
            setSnackbarMsg(t('EPG 更新已触发'));
            setOpenSnackbar(true);
            await fetchSources();
        } catch (err) {
            console.error('Error refreshing EPG:', err);
            setSnackbarMsg(t('EPG 更新失败'));
            setOpenSnackbar(true);
        } finally {
            setRefreshing(false);
        }
    };

    const handleClearCache = async () => {
        setClearingCache(true);
        try {
            await taskService.clearEpgCache();
            setSnackbarMsg(t('清除 EPG 缓存成功'));
            setOpenSnackbar(true);
        } catch (err) {
            console.error('Error clearing EPG cache:', err);
            setSnackbarMsg(t('清除 EPG 缓存失败'));
            setOpenSnackbar(true);
        } finally {
            setClearingCache(false);
        }
    };

    const openConfirmDialog = () => {
        setConfirmDialogOpen(true);
    };

    const closeConfirmDialog = () => {
        setConfirmDialogOpen(false);
    };

    const handleConfirmClearCache = () => {
        closeConfirmDialog();
        handleClearCache();
    };

    return (
        <Box style={{ padding: '0 20px', width: '800px' }}>
            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={() => setOpenSnackbar(false)}
                message={snackbarMsg}
            />
            <Box sx={{ mb: 2, fontSize: '12px', color: '#666' }}>
                <p style={{ margin: 0 }}>{t('EPG 配置说明')}</p>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button variant="contained" onClick={handleAddRow}>
                    {t('添加 EPG 源')}
                </Button>
                {sourcesStatus === true ? (
                    <LoadingButton
                        variant="outlined"
                        color="error"
                        loading={clearingCache}
                        disabled={refreshing}
                        onClick={openConfirmDialog}
                    >
                        {t('清除已爬取的 EPG 信息')}
                    </LoadingButton>
                ) : null}
                {sourcesStatus === false ? (
                    <LoadingButton
                        variant="outlined"
                        loading={refreshing}
                        disabled={clearingCache}
                        onClick={handleRefreshEpg}
                    >
                        {t('立即更新 EPG')}
                    </LoadingButton>
                ) : null}
            </Box>

            <Box sx={{ maxHeight: 'calc(100vh - 320px)', overflow: 'auto', py: 1 }}>
                {urls.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                        {t('暂无数据')}
                    </Typography>
                ) : (
                    urls.map((url, idx) => (
                        <Box
                            key={idx}
                            sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}
                        >
                            <TextField
                                label={t('EPG URL')}
                                value={url}
                                onChange={(e) => handleChange(idx, e.target.value)}
                                size="small"
                                fullWidth
                                placeholder="https://..."
                            />
                            <IconButton aria-label="delete" onClick={() => handleRemoveRow(idx)}>
                                <DeleteIcon />
                            </IconButton>
                        </Box>
                    ))
                )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1, py: 2, alignItems: 'center' }}>
                <Button variant="contained" color="success" onClick={handleSave}>
                    {t('保存配置')}
                </Button>
            </Box>

            <Dialog
                open={confirmDialogOpen}
                onClose={closeConfirmDialog}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    {t('确认清除 EPG 缓存？')}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description">
                        {t('清除后将需要重新爬取 EPG 数据，可能会花费一些时间。您确定要继续吗？')}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeConfirmDialog} color="primary">
                        {t('取消')}
                    </Button>
                    <Button onClick={handleConfirmClearCache} color="error" autoFocus>
                        {t('确认')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
