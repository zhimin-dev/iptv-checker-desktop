import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import { useTranslation } from "react-i18next";
import { ApiTaskService } from '../../services/apiTaskService';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';

export default function KeywordSettings() {
    const { t } = useTranslation();
    const [replaceString, setReplaceString] = useState(false);
    const [replaceMap, setReplaceMap] = useState({});
    const [showList, setShowList] = useState([]);
    const [taskService] = useState(() => new ApiTaskService());
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMsg, setSnackbarMsg] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await taskService.getReplaceList();
            setReplaceString(response.replace_string ?? false);
            setReplaceMap(response.replace_map ?? {});
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    useEffect(() => {
        if (!replaceMap) {
            setShowList([]);
            return;
        }
        if (Array.isArray(replaceMap)) {
            setShowList(replaceMap.map(r => ({ key: r.key ?? '', value: r.value ?? '' })));
        } else if (typeof replaceMap === 'object') {
            setShowList(Object.entries(replaceMap).map(([k, v]) => ({ key: k, value: v ?? '' })));
        } else {
            setShowList([]);
        }
    }, [replaceMap]);

    const handleChange = (index, field, value) => {
        setShowList(prev => {
            const copy = prev.map(r => ({ ...r }));
            copy[index][field] = value;
            return copy;
        });
    };

    const handleAddRow = () => {
        setShowList(prev => [...prev, { key: '', value: '' }]);
    };

    const handleRemoveRow = (index) => {
        setShowList(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        const newReplaceMap = {};
        showList.forEach(row => {
            if (row.key !== undefined && row.key !== '') {
                newReplaceMap[row.key] = row.value ?? '';
            }
        });

        const postData = {
            replace_string: replaceString,
            replace_map: newReplaceMap
        };

        try {
            await taskService.updateReplaceList(postData);
            setReplaceMap(newReplaceMap);
            setSnackbarMsg(t('保存成功'));
            setOpenSnackbar(true);
        } catch (err) {
            console.error('Error saving replace list:', err);
            setSnackbarMsg(t('保存失败'));
            setOpenSnackbar(true);
        }
    };

    return (
        <Box style={{ padding: '0 20px', width: '800px' }}>
            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={() => setOpenSnackbar(false)}
                message={snackbarMsg}
            />
            <div style={{ padding: '0 0 10px', fontSize: '12px', color: '#666' }}>
                <p style={{ padding: '0', margin: '0' }}>{t('网络上的频道名前后经常出现一些特殊字符，可以通过添加该配置将这些字符替换掉，提升频道名的整洁度。')}</p>
                <p style={{ padding: '0', margin: '0' }}>{t('比如频道名中出现“[HD]”，如果需要将这个字符去掉，添加一行：搜索值填写“[HD]”，替换值留空即可。')}</p>
                <p style={{ padding: '0', margin: '0' }}>{t('特殊字符替换的开关在「设置」页中。')}</p>
            </div>

            <div style={{ padding: '10px 0' }}>
                <Button variant="contained" onClick={handleAddRow}>
                    {t('添加')}
                </Button>
            </div>
            <div style={{ padding: '10px 0' }}>
                <div style={{ overflow: 'hidden' }}>
                    <div style={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto', padding: '12px 0' }}>
                        {showList.length === 0 ? (
                            <div style={{ padding: '8px 0', color: '#666' }}>{t('暂无数据')}</div>
                        ) : (
                            showList.map((row, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        gap: 8,
                                        alignItems: 'center',
                                        marginBottom: 8,
                                    }}
                                >
                                    <TextField
                                        label={t('搜索值')}
                                        value={row.key}
                                        onChange={(e) => handleChange(idx, 'key', e.target.value)}
                                        size="small"
                                        style={{ width: 220 }}
                                    />
                                    <TextField
                                        label={t('替换值')}
                                        value={row.value}
                                        onChange={(e) => handleChange(idx, 'value', e.target.value)}
                                        size="small"
                                        style={{ flex: 1 }}
                                    />
                                    <IconButton aria-label="delete" onClick={() => handleRemoveRow(idx)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </div>
                            ))
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 8, padding: '12px 0', alignItems: 'center' }}>
                        <div style={{ flex: 1 }} />

                        <Button variant="contained" color="success" onClick={handleSave}>
                            {t('保存')}
                        </Button>
                    </div>
                </div>
            </div>
        </Box>
    );
}
