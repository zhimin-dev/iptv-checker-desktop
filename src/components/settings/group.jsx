import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Snackbar from '@mui/material/Snackbar';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import { useTranslation } from "react-i18next";
import { ApiTaskService } from '../../services/apiTaskService';

export default function GroupMappingSettings() {
    const { t } = useTranslation();
    const [taskService] = useState(() => new ApiTaskService());
    const [groups, setGroups] = useState([]);
    const [mapping, setMapping] = useState({});
    const [unmappedList, setUnmappedList] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [newGroupName, setNewGroupName] = useState('');
    const [newChannelName, setNewChannelName] = useState('');
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMsg, setSnackbarMsg] = useState('');
    const [saving, setSaving] = useState(false);
    const [unmappedOpen, setUnmappedOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await taskService.getGroupMapping();
            setGroups(data.groups || []);
            setMapping(data.mapping || {});
        } catch (e) {
            console.error('Failed to fetch group mappings:', e);
        }
        fetchUnmapped();
    };

    const fetchUnmapped = async () => {
        try {
            const data = await taskService.getUnmappedEpgChannels();
            setUnmappedList(data.list || []);
        } catch (e) {
            setUnmappedList([]);
        }
    };

    const saveToServer = async (newGroups, newMapping) => {
        setSaving(true);
        try {
            await taskService.saveGroupMapping({ groups: newGroups, mapping: newMapping });
            setGroups(newGroups);
            setMapping(newMapping);
            fetchUnmapped();
            setSnackbarMsg(t('已保存'));
            setOpenSnackbar(true);
        } catch (e) {
            setSnackbarMsg(t('保存失败'));
            setOpenSnackbar(true);
        } finally {
            setSaving(false);
        }
    };

    const handleAddGroup = async () => {
        const name = newGroupName.trim();
        if (!name) return;
        if (groups.includes(name)) {
            setSnackbarMsg(t('分组已存在'));
            setOpenSnackbar(true);
            return;
        }
        const newGroups = [...groups, name].sort();
        await saveToServer(newGroups, mapping);
        setSelectedGroup(name);
        setNewGroupName('');
    };

    const handleDeleteGroup = async () => {
        if (!selectedGroup) return;
        const newGroups = groups.filter(g => g !== selectedGroup);
        const newMapping = {};
        for (const [k, v] of Object.entries(mapping)) {
            if (v !== selectedGroup) newMapping[k] = v;
        }
        await saveToServer(newGroups, newMapping);
        setSelectedGroup(null);
    };

    const handleAddChannel = async () => {
        const name = newChannelName.trim();
        if (!name || !selectedGroup) return;
        if (mapping[name]) {
            setSnackbarMsg(t('该频道已在分组') + ' ' + mapping[name] + ' ' + t('中'));
            setOpenSnackbar(true);
            return;
        }
        const newMapping = { ...mapping, [name]: selectedGroup };
        await saveToServer(groups, newMapping);
        setNewChannelName('');
    };

    const handleDeleteChannel = async (tvName) => {
        const newMapping = { ...mapping };
        delete newMapping[tvName];
        await saveToServer(groups, newMapping);
    };

    const handleMapUnmapped = async (tvName, groupTitle) => {
        const newMapping = { ...mapping, [tvName]: groupTitle };
        // Ensure group exists
        const newGroups = groups.includes(groupTitle) ? groups : [...groups, groupTitle].sort();
        await saveToServer(newGroups, newMapping);
    };

    const channelsForGroup = (() => {
        if (!selectedGroup) return [];
        return Object.entries(mapping)
            .filter(([, g]) => g === selectedGroup)
            .map(([tvName]) => tvName)
            .sort();
    })();

    return (
        <Box style={{ padding: '0 20px', width: '100%', maxWidth: '1000px' }}>
            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={() => setOpenSnackbar(false)}
                message={snackbarMsg}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h6">{t('频道分组映射')}</Typography>
                {saving && <CircularProgress size={18} />}
            </Box>

            {/* 新增分组 */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                    <TextField
                        label={t('新增分组名称')}
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        size="small"
                        sx={{ width: 260 }}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
                    />
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddGroup}>
                        {t('新增分组')}
                    </Button>
                    <Button variant="outlined" sx={{ ml: 2 }} onClick={() => { fetchUnmapped(); setUnmappedOpen(true); }}>
                        {t('EPG 未映射频道')} ({unmappedList.length > 0 ? unmappedList.length : '?'})
                    </Button>
                </Box>
            </Paper>

            {/* 主体：左侧分组列表 + 右侧频道列表 */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Paper sx={{ width: 220, flexShrink: 0 }}>
                    <Box sx={{ p: 1.5, fontWeight: 'bold', borderBottom: '1px solid #eee' }}>
                        {t('分组列表')} ({groups.length})
                    </Box>
                    <List dense sx={{ maxHeight: 500, overflow: 'auto' }}>
                        {groups.map((g) => (
                            <ListItemButton
                                key={g}
                                selected={selectedGroup === g}
                                onClick={() => setSelectedGroup(g)}
                            >
                                <ListItemText primary={g} />
                            </ListItemButton>
                        ))}
                        {groups.length === 0 && (
                            <Box sx={{ p: 2, color: 'text.secondary', fontSize: '14px' }}>
                                {t('暂无分组')}
                            </Box>
                        )}
                    </List>
                </Paper>

                <Paper sx={{ flex: 1, p: 2 }}>
                    {!selectedGroup ? (
                        <Box sx={{ color: 'text.secondary', py: 4, textAlign: 'center' }}>
                            {t('请从左侧选择一个分组')}
                        </Box>
                    ) : (
                        <>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle1">
                                    {selectedGroup} ({channelsForGroup.length})
                                </Typography>
                                <Button color="error" size="small" onClick={handleDeleteGroup}>
                                    {t('删除分组')}
                                </Button>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-end' }}>
                                <TextField
                                    label={t('频道名 (tvg-name)')}
                                    value={newChannelName}
                                    onChange={(e) => setNewChannelName(e.target.value)}
                                    size="small"
                                    sx={{ flex: 1 }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddChannel()}
                                />
                                <Button variant="contained" size="small" onClick={handleAddChannel}>
                                    {t('添加')}
                                </Button>
                            </Box>

                            <TableContainer sx={{ maxHeight: 400 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>{t('频道名')}</TableCell>
                                            <TableCell width={80}>{t('操作')}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {channelsForGroup.map((name) => (
                                            <TableRow key={name}>
                                                <TableCell>{name}</TableCell>
                                                <TableCell>
                                                    <IconButton size="small" color="error"
                                                        onClick={() => handleDeleteChannel(name)}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {channelsForGroup.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={2} sx={{ color: 'text.secondary' }}>
                                                    {t('该分组下暂无频道')}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    )}
                </Paper>
            </Box>

{/* EPG 未映射频道弹框 */}
            <UnmappedDialog
                open={unmappedOpen}
                onClose={() => setUnmappedOpen(false)}
                unmappedList={unmappedList}
                groups={groups}
                onMap={handleMapUnmapped}
                t={t}
            />
        </Box>
    );
}

function UnmappedDialog({ open, onClose, unmappedList, groups, onMap, t }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {t('EPG 未映射频道')} ({unmappedList.length})
            </DialogTitle>
            <DialogContent dividers>
                {unmappedList.length === 0 ? (
                    <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
                        {t('所有 EPG 频道都已映射，或 EPG 数据尚未抓取。')}
                    </Typography>
                ) : (
                    <TableContainer sx={{ maxHeight: '60vh' }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t('频道名')}</TableCell>
                                    <TableCell>{t('EPG ID')}</TableCell>
                                    <TableCell width={220}>{t('选择分组')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {unmappedList.map((ch) => (
                                    <TableRow key={ch.name}>
                                        <TableCell>{ch.name}</TableCell>
                                        <TableCell>{ch.channel}</TableCell>
                                        <TableCell>
                                            <FormControl size="small" fullWidth>
                                                <Select
                                                    value=""
                                                    displayEmpty
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            onMap(ch.name, e.target.value);
                                                        }
                                                    }}
                                                >
                                                    <MenuItem value="" disabled>
                                                        {t('选择分组...')}
                                                    </MenuItem>
                                                    {groups.map((g) => (
                                                        <MenuItem key={g} value={g}>{g}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
        </Dialog>
    );
}
