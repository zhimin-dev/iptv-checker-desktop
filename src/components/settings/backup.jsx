import React, { useState, useContext } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import { useTranslation } from "react-i18next";
import { MainContext } from '../../context/main';
import { ApiTaskService } from '../../services/apiTaskService';

export default function BackupSettings() {
    const { t } = useTranslation();
    const _mainContext = useContext(MainContext);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMsg, setSnackbarMsg] = useState('');
    const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
    const [pendingFile, setPendingFile] = useState(null);
    const fileInputRef = React.useRef(null);
    const [taskService] = useState(() => new ApiTaskService());

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const res = await taskService.exportConfig();
            if (res && res.file) {
                const downloadUrl = res.file.startsWith('http') ? res.file : `${_mainContext.settings.privateHost || ''}${res.file}`;
                window.open(downloadUrl);
                setSnackbarMsg(t('导出成功'));
            } else {
                setSnackbarMsg(t('导出失败：接口未返回文件地址'));
            }
        } catch (error) {
            console.error('Export failed:', error);
            setSnackbarMsg(t('导出失败'));
        } finally {
            setIsExporting(false);
            setOpenSnackbar(true);
        }
    };

    const handleImportClick = () => {
        // 点击导入按钮时，先显示警告对话框
        setOpenConfirmDialog(true);
    };

    const handleConfirmImport = () => {
        // 用户确认后，关闭对话框并触发文件选择
        setOpenConfirmDialog(false);
        // 使用 setTimeout 确保对话框关闭后再打开文件选择
        setTimeout(() => {
            fileInputRef.current?.click();
        }, 100);
    };

    const handleCancelImport = () => {
        setOpenConfirmDialog(false);
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsImporting(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            await taskService.importConfig(formData);
            setSnackbarMsg(t('导入成功，请重启应用或刷新页面'));
        } catch (error) {
            console.error('Import failed:', error);
            setSnackbarMsg(t('导入失败'));
        } finally {
            setIsImporting(false);
            setOpenSnackbar(true);
            e.target.value = ''; // 清空 input
        }
    };

    return (
        <Box sx={{ padding: '20px' }}>
            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={() => setOpenSnackbar(false)}
                message={snackbarMsg}
            />
            
            <Typography variant="h6" gutterBottom>
                {t('数据备份与恢复')}
            </Typography>
            
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                {t('您可以导出当前所有的配置、任务和图标数据，并在需要时重新导入。')}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
                <LoadingButton
                    variant="contained"
                    loading={isExporting}
                    startIcon={<FileDownloadIcon />}
                    onClick={handleExport}
                >
                    {t('导出全部配置')}
                </LoadingButton>

                <Button
                    variant="outlined"
                    startIcon={isImporting ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                    disabled={isImporting}
                    onClick={handleImportClick}
                >
                    {isImporting ? t('正在导入...') : t('导入配置文件')}
                </Button>
                <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept=".zip"
                    onChange={handleFileSelect}
                />
            </Box>

            <Dialog
                open={openConfirmDialog}
                onClose={handleCancelImport}
                aria-labelledby="import-confirm-dialog-title"
                aria-describedby="import-confirm-dialog-description"
            >
                <DialogTitle id="import-confirm-dialog-title">
                    {t('确认导入')}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="import-confirm-dialog-description">
                        {t('导入配置文件将会覆盖当前所有的配置、任务和图标数据。此操作不可恢复，请谨慎处理。')}
                        <br />
                        <strong>{t('确定要继续吗？')}</strong>
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelImport} color="inherit">
                        {t('取消')}
                    </Button>
                    <Button onClick={handleConfirmImport} color="error" variant="contained" autoFocus>
                        {t('选择文件')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
