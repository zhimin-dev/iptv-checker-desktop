import React, { useState, useMemo, useEffect } from 'react';
import Box from '@mui/material/Box';
import { useTranslation } from 'react-i18next';
import { ApiTaskService } from '../../services/apiTaskService';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import Divider from '@mui/material/Divider';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';

const parseDate = (val) => {
    if (!val) return new Date(NaN);
    if (typeof val === 'number') {
        // Assume seconds if < 10000000000
        if (val < 10000000000) return new Date(val * 1000);
        return new Date(val);
    }
    if (typeof val === 'string') {
        // Handle "YYYYMMDDHHMMSS +0800" XMLTV format
        const xmltvMatch = val.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})$/);
        if (xmltvMatch) {
            const [_, y, m, d, h, min, s, tz] = xmltvMatch;
            return new Date(`${y}-${m}-${d}T${h}:${min}:${s}${tz}`);
        }
        return new Date(val);
    }
    return new Date(NaN);
};

export default function EpgChannelSearch() {
    const { t } = useTranslation();
    const [taskService] = useState(() => new ApiTaskService());
    const [channelQuery, setChannelQuery] = useState('');
    const [programResult, setProgramResult] = useState(null);
    const [queryLoading, setQueryLoading] = useState(false);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMsg, setSnackbarMsg] = useState('');
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [activeTab, setActiveTab] = useState(0);
    const [channelList, setChannelList] = useState([]);
    const [channelListLoading, setChannelListLoading] = useState(false);
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [listSearchQuery, setListSearchQuery] = useState('');

    useEffect(() => {
        const fetchChannelList = async () => {
            setChannelListLoading(true);
            try {
                const res = await taskService.getEpgChannelList();
                if (res && res.list && Array.isArray(res.list)) {
                    // Sort alphabetically by name
                    const sortedList = [...res.list].sort((a, b) => {
                        const nameA = a.name || a.channel || '';
                        const nameB = b.name || b.channel || '';
                        return nameA.localeCompare(nameB);
                    });
                    setChannelList(sortedList);
                }
            } catch (err) {
                console.error('Error fetching channel list:', err);
                setSnackbarMsg(t('获取频道列表失败'));
                setOpenSnackbar(true);
            } finally {
                setChannelListLoading(false);
            }
        };
        fetchChannelList();

        const timer = setInterval(() => {
            setCurrentTime(Date.now());
        }, 60000); // update every minute
        return () => clearInterval(timer);
    }, []);

    const filteredChannelList = useMemo(() => {
        if (!listSearchQuery.trim()) {
            return channelList;
        }
        const lowerQuery = listSearchQuery.toLowerCase();
        return channelList.filter(ch => {
            const name = ch.name || ch.channel || '';
            return name.toLowerCase().includes(lowerQuery);
        });
    }, [channelList, listSearchQuery]);

    const handleQueryChannel = async (queryOverride) => {
        const q = (queryOverride !== undefined ? queryOverride : channelQuery).trim();
        if (!q) {
            setSnackbarMsg(t('请输入频道名称'));
            setOpenSnackbar(true);
            return;
        }
        setQueryLoading(true);
        setProgramResult(null);
        setActiveTab(0);
        try {
            const data = await taskService.getEpgByChannel(q);
            setProgramResult(data);
        } catch (err) {
            console.error('Error querying EPG:', err);
            setProgramResult({ __error: true, message: err?.message || String(err) });
        } finally {
            setQueryLoading(false);
        }
    };

    const handleChannelClick = (channel) => {
        const channelName = channel.name || channel.channel;
        setSelectedChannel(channel);
        setChannelQuery(channelName);
        handleQueryChannel(channelName);
    };

    const parsedPrograms = useMemo(() => {
        if (!programResult || programResult.__error) return null;
        
        let programs = [];
        if (Array.isArray(programResult)) {
            programs = programResult;
        } else if (programResult.data && Array.isArray(programResult.data)) {
            programs = programResult.data;
        } else if (programResult.programs && Array.isArray(programResult.programs)) {
            programs = programResult.programs;
        } else {
            return null;
        }

        const grouped = {};

        programs.forEach(prog => {
            const startStr = prog.start || prog.startTime;
            const endStr = prog.end || prog.stop || prog.endTime;
            const title = prog.titles?.[0]?.value || prog.title || prog.name || t('未知节目');

            if (!startStr || !endStr) return;

            const startDate = parseDate(startStr);
            const endDate = parseDate(endStr);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;

            const dateKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }

            grouped[dateKey].push({
                title,
                start: startDate,
                end: endDate,
                startStr: `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`,
                endStr: `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`,
                original: prog
            });
        });

        const sortedDates = Object.keys(grouped).sort();
        
        const result = sortedDates.map(date => {
            const sortedPrograms = grouped[date].sort((a, b) => a.start.getTime() - b.start.getTime());
            return {
                date,
                programs: sortedPrograms
            };
        });

        return result.length > 0 ? result : null;
    }, [programResult, t]);

    const renderProgramBlock = () => {
        if (queryLoading) {
            return <Typography color="text.secondary">{t('加载中...')}</Typography>;
        }
        if (programResult == null) {
            return null;
        }
        if (programResult.__error) {
            return (
                <Typography color="error" sx={{ mt: 1 }}>
                    {programResult.message}
                </Typography>
            );
        }

        if (parsedPrograms) {
            const handleTabChange = (event, newValue) => {
                setActiveTab(newValue);
            };

            const activeGroup = parsedPrograms[activeTab];

            return (
                <Box sx={{ mt: 2, maxHeight: '65vh', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                        <Tabs 
                            value={activeTab} 
                            onChange={handleTabChange} 
                            variant="scrollable"
                            scrollButtons="auto"
                            aria-label="epg dates tabs"
                        >
                            {parsedPrograms.map((group, index) => (
                                <Tab key={group.date} label={group.date} id={`epg-tab-${index}`} />
                            ))}
                        </Tabs>
                    </Box>
                    
                    {activeGroup && (
                        <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
                            <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
                                {activeGroup.programs.map((prog, idx) => {
                                    const isPlaying = currentTime >= prog.start.getTime() && currentTime < prog.end.getTime();
                                    return (
                                        <React.Fragment key={idx}>
                                            <ListItem>
                                                <ListItemText
                                                    primary={
                                                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                                            <Typography 
                                                                variant="body2" 
                                                                sx={{ 
                                                                    minWidth: 100, 
                                                                    color: isPlaying ? 'success.main' : 'text.secondary',
                                                                    fontWeight: isPlaying ? 'bold' : 'normal'
                                                                }}
                                                            >
                                                                {prog.startStr} - {prog.endStr}
                                                            </Typography>
                                                            <Typography 
                                                                variant="body1"
                                                                sx={{ 
                                                                    color: isPlaying ? 'success.main' : 'text.primary',
                                                                    fontWeight: isPlaying ? 'bold' : 'normal'
                                                                }}
                                                            >
                                                                {prog.title}
                                                            </Typography>
                                                            {isPlaying && (
                                                                <Typography 
                                                                    variant="caption" 
                                                                    sx={{ 
                                                                        bgcolor: 'success.main', 
                                                                        color: 'white', 
                                                                        px: 1, 
                                                                        py: 0.5, 
                                                                        borderRadius: 1,
                                                                        ml: 1
                                                                    }}
                                                                >
                                                                    {t('正在播放')}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    }
                                                />
                                            </ListItem>
                                            {idx < activeGroup.programs.length - 1 && <Divider />}
                                        </React.Fragment>
                                    );
                                })}
                            </List>
                        </Box>
                    )}
                </Box>
            );
        }

        const text =
            typeof programResult === 'string'
                ? programResult
                : JSON.stringify(programResult, null, 2);
        return (
            <Box
                component="pre"
                sx={{
                    mt: 2,
                    p: 2,
                    bgcolor: '#f5f5f5',
                    borderRadius: 1,
                    maxHeight: '55vh',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: 12,
                }}
            >
                {text || t('暂无节目数据')}
            </Box>
        );
    };

    return (
        <Box style={{ padding: '0 20px', width: '100%', display: 'flex', gap: '20px', height: 'calc(100vh - 120px)' }}>
            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={() => setOpenSnackbar(false)}
                message={snackbarMsg}
            />
            
            {/* Left Column: Channel List */}
            <Box sx={{ width: '250px', borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ mb: 1 }}>{t('频道列表')}</Typography>
                <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                    {channelListLoading ? (
                        <Typography color="text.secondary" sx={{ p: 2 }}>{t('加载中...')}</Typography>
                    ) : filteredChannelList.length === 0 ? (
                        <Typography color="text.secondary" sx={{ p: 2 }}>{t('暂无数据')}</Typography>
                    ) : (
                        <List dense>
                            {filteredChannelList.map((ch, idx) => {
                                const isSelected = selectedChannel && (selectedChannel.name === ch.name || selectedChannel.channel === ch.channel);
                                return (
                                    <ListItem key={idx} disablePadding>
                                        <ListItemButton 
                                            selected={isSelected}
                                            onClick={() => handleChannelClick(ch)}
                                        >
                                            <ListItemText primary={ch.name || ch.channel} />
                                        </ListItemButton>
                                    </ListItem>
                                );
                            })}
                        </List>
                    )}
                </Box>
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                    <TextField
                        size="small"
                        fullWidth
                        label={t('搜索频道')}
                        value={listSearchQuery}
                        onChange={(e) => setListSearchQuery(e.target.value)}
                        placeholder="CCTV1"
                    />
                </Box>
            </Box>

            {/* Right Column: EPG Details */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, pl: 2 }}>
                <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                    {renderProgramBlock()}
                </Box>
            </Box>
        </Box>
    );
}
