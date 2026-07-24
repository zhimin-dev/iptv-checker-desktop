import { useState, useEffect } from 'react'
import * as React from 'react';
import { ApiTaskService } from '../../services/apiTaskService';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import LoadingButton from '@mui/lab/LoadingButton';
import Typography from '@mui/material/Typography';
import Snackbar from '@mui/material/Snackbar';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { useTranslation } from "react-i18next";
import _package from './../../../package';

const taskService = new ApiTaskService();

export default function NetworkSettings() {
    const [proxyUrl, setProxyUrl] = useState('');
    const [useSystemProxy, setUseSystemProxy] = useState(true);
    const [customHeadersStr, setCustomHeadersStr] = useState('');
    const [dialogMsg, setDialogMsg] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [saving, setSaving] = useState(false);
    const { t } = useTranslation();
    const nowVersion = _package.version;

    useEffect(() => {
        taskService.getNetworkConfig().then((data) => {
            setProxyUrl(data?.proxy_url ?? '');
            setUseSystemProxy(data?.use_system_proxy ?? true);
            const headerLines = [];
            if (data?.user_agent && data.user_agent.trim() !== '') {
                headerLines.push(`User-Agent: ${data.user_agent}`);
            }
            if (data?.custom_headers && typeof data.custom_headers === 'object') {
                for (const [k, v] of Object.entries(data.custom_headers)) {
                    headerLines.push(`${k}: ${v}`);
                }
            }
            setCustomHeadersStr(headerLines.join('\n'));
        }).catch(() => {
            setProxyUrl('');
            setUseSystemProxy(true);
            setCustomHeadersStr('');
        });
    }, []);

    const buildCustomHeadersObject = () => {
        const obj = {};
        if (customHeadersStr.trim() !== '') {
            const lines = customHeadersStr.split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
                const colonIdx = line.indexOf(':');
                if (colonIdx > 0) {
                    const key = line.substring(0, colonIdx).trim();
                    const value = line.substring(colonIdx + 1).trim();
                    if (key && value) {
                        obj[key] = value;
                    }
                }
            }
        }
        return obj;
    };

    const doSave = async () => {
        setSaving(true);
        const customHeadersObj = buildCustomHeadersObject();
        const userAgent = customHeadersObj['User-Agent'] || '';

        try {
            await taskService.saveNetworkConfig({
                proxy_url: proxyUrl,
                use_system_proxy: useSystemProxy,
                custom_headers: customHeadersObj,
                user_agent: userAgent,
            });
            setOpenDialog(true);
            setDialogMsg(t('保存成功'));
        } catch (e) {
            setDialogMsg(t('保存失败') + (e?.message ? ': ' + e.message : ''));
            setOpenDialog(true);
        } finally {
            setSaving(false);
        }
    };

    const handleCloseDialogMsg = () => {
        setOpenDialog(false);
        setDialogMsg('');
    };

    return (
        <Box style={{ padding: '0 20px' }}>
            <Snackbar
                open={openDialog}
                autoHideDuration={3000}
                message={dialogMsg}
                onClose={handleCloseDialogMsg}
            />
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                padding: '20px',
                maxWidth: '600px'
            }}>
                {/* 代理模式开关 */}
                <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <Typography sx={{ width: '150px', flexShrink: 0 }}>{t('代理模式')}</Typography>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={useSystemProxy}
                                onChange={(e) => setUseSystemProxy(e.target.checked)}
                            />
                        }
                        label={useSystemProxy ? t('跟随系统代理') : t('自定义代理')}
                    />
                </Box>
                <Typography variant="caption" color="textSecondary" sx={{ mb: 2, ml: '150px', display: 'block' }}>
                    {useSystemProxy
                        ? t('自动使用系统代理（如 Clash、v2ray 等），从环境变量 HTTP_PROXY 读取')
                        : t('使用下方填入的代理地址，忽略系统代理设置')
                    }
                </Typography>

                {/* 自定义代理地址（仅关闭系统代理时显示） */}
                {!useSystemProxy && (
                    <Box sx={{ marginBottom: '20px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography sx={{ width: '150px', flexShrink: 0 }}>HTTP {t('代理')}</Typography>
                            <TextField
                                value={proxyUrl}
                                onChange={(e) => setProxyUrl(e.target.value)}
                                size="small"
                                sx={{ flex: 1 }}
                                placeholder="http://127.0.0.1:7890"
                            />
                        </Box>
                        <Typography variant="caption" color="textSecondary" sx={{ ml: '150px', mt: 0.5, display: 'block' }}>
                            {t('所有网络请求将通过此代理发送，留空则不使用代理')}
                        </Typography>
                    </Box>
                )}

                {/* 自定义请求头 */}
                <Box sx={{ marginBottom: '20px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <Typography sx={{ width: '150px', flexShrink: 0, mt: '8px' }}>{t('自定义请求头')}</Typography>
                        <TextField
                            value={customHeadersStr}
                            onChange={(e) => setCustomHeadersStr(e.target.value)}
                            size="small"
                            multiline
                            rows={6}
                            fullWidth
                            placeholder={`User-Agent: iptv-checker/v${nowVersion}`}
                        />
                    </Box>
                    <Typography variant="caption" color="textSecondary" sx={{ ml: '150px', mt: 0.5, display: 'block' }}>
                        {t('每行一个请求头，格式：Header-Name: Header-Value。默认 User-Agent 为 iptv-checker/v')}{nowVersion}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                    <Box sx={{ width: '150px', flexShrink: 0 }}></Box>
                    <LoadingButton
                        onClick={doSave}
                        variant="outlined"
                        loading={saving}
                    >
                        {t('保存')}
                    </LoadingButton>
                </Box>
            </Box>
        </Box>
    );
}
