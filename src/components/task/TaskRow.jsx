import * as React from 'react';
import { useState, useContext } from 'react';
import { MainContext } from './../../context/main';
import { useTranslation } from "react-i18next";
import {
    TableRow,
    TableCell,
    IconButton,
    Button,
    Tooltip,
    Collapse,
    Box,
    Table,
} from '@mui/material';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { color, justifyContent } from '@mui/system';

export const TaskRow = ({ isNowHandle, row, clickTask, doTaskRightNow, source, showDownloadDialog, checkTaskRefetch, checkTaskContinue, checkTaskAgain }) => {
    const _mainContext = useContext(MainContext);
    const { t } = useTranslation();

    const handleTaskRightNow = (id) => {
        doTaskRightNow(id);
    };

    const openDownloadDialog = (id) => {
        showDownloadDialog(id);
    };

    const handleTaskRefetch = (id) => {
        console.log("handleTaskRefetch", id);
        checkTaskRefetch(id)
    };

    const handleTaskContinue = (id) => {
        console.log("handleTaskContinue", id);
        checkTaskContinue(id)
    };

    const handleTaskAgain = (id) => {
        console.log("handleTaskContinue", id);
        checkTaskAgain(id)
    }

    const downloadFile = (id, extention) => {
        let saveData = [];
        let saveSameNum = row.original.same_save_num;
        for (let i = 0; i < row.list.length; i++) {
            if (row.list[i].status === 200) {
                saveData.push(row.list[i])
            }
        }
        // saveSameNum >0，相同名称保留saveSameNum个，其他删除
        if (saveSameNum > 0) {
            const nameGroups = {};
            saveData.forEach(item => {
                if (!nameGroups[item.name]) {
                    nameGroups[item.name] = [];
                }
                nameGroups[item.name].push(item);
            });

            // Keep only saveSameNum items per name group
            saveData = Object.values(nameGroups).flatMap(group =>
                group.slice(0, saveSameNum)
            );
        }
        if (source === 'ltask' && _mainContext.nowMod === 1) {
            _mainContext.clientSaveFile(saveData, extention === 'txt' ? 'txt' : 'm3u')
        } else {
            _mainContext.webSaveFile(saveData, extention === 'txt' ? 'txt' : 'm3u')
        }
    }

    return (
        <React.Fragment>
            <TableRow>
                <TableCell width={400}>
                    <Button onClick={() => clickTask()} variant="text">{row.id}</Button>
                    <Box>
                        {
                            source === 'task' ? (
                                <Box>
                                    <Button color="success" onClick={() => openDownloadDialog(row.id)} size="small" startIcon={<RemoveRedEyeIcon />}>
                                        {t('查看')}
                                    </Button>
                                    {
                                        !isNowHandle && row.task_info.next_run_time > 0 &&
                                            row.task_info.next_run_time - new Date().getTime() / 1000 >= 120 ? (
                                            <Button color="success" onClick={() => handleTaskRightNow(row.id)}>{t('立即执行')}</Button>
                                        ) : ''
                                    }
                                </Box>
                            ) : (
                                <Box style={{ display: "flex" }}>
                                    <Button size="small" color="success" startIcon={<FileDownloadIcon />} onClick={() => downloadFile(row.id, 'm3u')}>
                                        .m3u
                                    </Button>
                                    <Button size="small" color="success" startIcon={<FileDownloadIcon />} onClick={() => downloadFile(row.id, 'txt')}>
                                        .txt
                                    </Button>
                                </Box>
                            )
                        }
                    </Box>
                </TableCell>
                <TableCell align='right' width={300}>
                    <div>{t('任务创建时间')}：{row.create_time > 0 ? (new Date(row.create_time * 1000).toLocaleTimeString('zh-CN', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false })) : ''}</div>
                    {
                        row.task_info.last_run_time > 0 ? (
                            <div>{t('最后运行时间')}：{(new Date(row.task_info.last_run_time * 1000).toLocaleTimeString('zh-CN', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false }))}</div>
                        ) : ''
                    }
                    <div>
                        {t('当前状态')}：{isNowHandle?t('正在执行中'):t('待运行')}
                    </div>
                    {
                        source === 'task' && row.task_info.next_run_time > 0 ? (
                            <div>{t('下一次运行时间')}：{new Date(row.task_info.next_run_time * 1000).toLocaleTimeString('zh-CN', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false })}</div>
                        ) : ''
                    }
                    {
                        source === 'task' ? (
                            <div>{t('运行时间')}：{row.task_info.run_type === 'EveryHour' ? t('每小时') : t('每天')}</div>
                        ) : ''
                    }
                    <div>
                        {
                            row.task_info.task_status === "FetchDataError" ? (
                                <Button onClick={() => handleTaskRefetch(row.id)} style={{ color: 'red', cursor: 'pointer' }}>{t('重新获取')}</Button>
                            ) : ''
                        }
                        {
                            row.task_info.task_status === "FetchSomeDataError" ? (
                                <Button onClick={() => handleTaskContinue(row.id)} style={{ color: 'orange', cursor: 'pointer' }}>{t('继续执行')}</Button>
                            ) : ''
                        }
                        {
                            row.task_info.task_status === "Completed" ? (
                                <Button onClick={() => handleTaskAgain(row.id)} style={{ color: 'green', cursor: 'pointer' }}>{t('再次检查')}</Button>
                            ) : ''
                        }
                    </div>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
}; 