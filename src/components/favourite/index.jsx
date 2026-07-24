import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import { useTranslation } from "react-i18next";
import { ApiTaskService } from '../../services/apiTaskService';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

export default function FavoriteSettings() {
    const { t } = useTranslation();
    const [config, setConfig] = useState({
        favorite_rules: []
    });
    const taskService = new ApiTaskService();
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMsg, setSnackbarMsg] = useState('');

    const [newName, setNewName] = useState('');
    const [newMode, setNewMode] = useState('include');

    const [showFileDialog, setShowFileDialog] = useState(false);
    const [fileTitle, setFileTitle] = useState('');
    const [fileContent, setFileContent] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await taskService.getFavourite();
            if (response) {
                const rules = [];
                (response.like || []).forEach(name => rules.push({ name, match_mode: 'include' }));
                (response.equal || []).forEach(name => rules.push({ name, match_mode: 'exact' }));
                
                setConfig(prev => ({
                    ...prev,
                    favorite_rules: rules,
                    all_channel_url: response.all_channel_url,
                    liked_channel_url: response.liked_channel_url,
                    checked_liked_channel_url: response.checked_liked_channel_url
                }));
            }
        } catch (error) {
            console.error('Error fetching config:', error);
        }
    };

    const handleAddRule = () => {
        if (!newName.trim()) {
            setSnackbarMsg(t('请输入频道名称'));
            setOpenSnackbar(true);
            return;
        }
        setConfig(prev => ({
            ...prev,
            favorite_rules: [
                { name: newName, match_mode: newMode },
                ...prev.favorite_rules
            ]
        }));
        setNewName('');
    };

    const handleRemoveRule = (index) => {
        setConfig(prev => ({
            ...prev,
            favorite_rules: prev.favorite_rules.filter((_, i) => i !== index)
        }));
    };

    const handleOpenFile = async (title, url) => {
        try {
            const content = await taskService.openUrl( url);
            setFileTitle(title);
            setFileContent(typeof content === 'string' ? content : JSON.stringify(content, null, 2));
            setShowFileDialog(true);
        } catch (error) {
            console.error('Error opening file:', error);
            setSnackbarMsg(t('打开文件失败'));
            setOpenSnackbar(true);
        }
    };

    const handleSave = async () => {
        const like = [];
        const equal = [];
        config.favorite_rules.forEach(r => {
            if (!r.name || !r.name.trim()) return;
            if (r.match_mode === 'include') like.push(r.name.trim());
            else if (r.match_mode === 'exact') equal.push(r.name.trim());
        });

        try {
            await taskService.saveFavourite({ like, equal });
            setSnackbarMsg(t('保存成功'));
            setOpenSnackbar(true);
        } catch (err) {
            console.error('Error saving config:', err);
            setSnackbarMsg(t('保存失败'));
            setOpenSnackbar(true);
        }
    };

    const rulesWithIndex = config.favorite_rules.map((r, i) => ({ ...r, originalIndex: i }));
    const includeRules = rulesWithIndex.filter(r => r.match_mode === 'include');
    const exactRules = rulesWithIndex.filter(r => r.match_mode === 'exact');

    const renderRuleList = (rules, title) => (
        <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', borderLeft: '4px solid #1976d2', pl: 1 }}>
                {title} ({rules.length})
            </Typography>
            {rules.length === 0 ? (
                <Typography variant="body2" color="textSecondary" sx={{ pl: 2 }}>{t('暂无数据')}</Typography>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {rules.map((rule) => (
                        <Card key={rule.originalIndex} variant="outlined">
                            <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', p: '8px 16px !important' }}>
                                <Typography sx={{ flexGrow: 1 }}>{rule.name}</Typography>
                                <IconButton onClick={() => handleRemoveRule(rule.originalIndex)} color="error" size="small">
                                    <DeleteIcon />
                                </IconButton>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            )}
        </Box>
    );

    return (
        <Box style={{ padding: '0 20px', width: '100%', maxWidth: '800px' }}>
             <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={() => setOpenSnackbar(false)}
                message={snackbarMsg}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 4 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography>{t('爬取的全部频道列表')}：</Typography>
                    <Typography 
                        component="span" 
                        sx={{ cursor: 'pointer', color: 'primary.main', textDecoration: 'underline' }}
                        onClick={() => handleOpenFile(t('爬取的全部频道列表'), (config.all_channel_url?.startsWith('http') ? config.all_channel_url : window.document.location.origin + config.all_channel_url))}
                    >
                        {(config.all_channel_url?.startsWith('http') ? config.all_channel_url : window.document.location.origin + config.all_channel_url) || t('暂无链接')}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography>{t('喜欢的频道列表')}：</Typography>
                    <Typography
                        component="span"
                        sx={{ cursor: 'pointer', color: 'primary.main', textDecoration: 'underline' }}
                        onClick={() => handleOpenFile(t('喜欢的频道列表'), (config.liked_channel_url?.startsWith('http') ? config.liked_channel_url : window.document.location.origin + config.liked_channel_url))}
                    >
                        {(config.liked_channel_url?.startsWith('http') ? config.liked_channel_url : window.document.location.origin + config.liked_channel_url) || t('暂无链接')}
                    </Typography>
                </Box>
                <Box sx={{ fontSize: '12px', color: 'text.secondary' }}>
                    {t('上述链接内容经过繁体转简体以及特殊字符替换')}
                </Box>
                <Box sx={{ fontSize: '12px', color: 'text.secondary' }}>
                    {t('下面的关键词直接输入简体中文即可，无需担心原始源有繁体字问题而导致搜索不到')}
                </Box>
                <Box sx={{ fontSize: '12px', color: 'text.secondary' }}>
                    {t('记得保存')}😄
                </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 4, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <TextField 
                    label={t('频道名称')} 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)}
                    size="small"
                    sx={{ flexGrow: 1, bgcolor: 'white' }}
                    placeholder={t('输入想看的频道名称')}
                />
                <FormControl size="small" sx={{ minWidth: 150, bgcolor: 'white' }}>
                    <InputLabel>{t('匹配逻辑')}</InputLabel>
                    <Select
                        value={newMode}
                        label={t('匹配逻辑')}
                        onChange={(e) => setNewMode(e.target.value)}
                    >
                        <MenuItem value="include">{t('包含')}</MenuItem>
                        <MenuItem value="exact">{t('完全相等')}</MenuItem>
                    </Select>
                </FormControl>
                <Button 
                    variant="contained" 
                    color="success" 
                    startIcon={<AddIcon />} 
                    onClick={handleAddRule}
                    disabled={!newName.trim()}
                >
                    {t('添加想看的频道名')}
                </Button>
            </Box>
            
            {renderRuleList(includeRules, t('包含匹配'))}
            {renderRuleList(exactRules, t('完全匹配'))}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pb: 4 }}>
                <Button variant="contained" color="primary" onClick={handleSave} size="large">
                    {t('保存配置')}
                </Button>
            </Box>

            <Dialog open={showFileDialog} onClose={() => setShowFileDialog(false)} maxWidth="lg" fullWidth>
                <DialogTitle>{fileTitle}</DialogTitle>
                <DialogContent>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '60vh', overflow: 'auto' }}>{fileContent}</pre>
                </DialogContent>
            </Dialog>
        </Box>
    );
}
