import * as React from 'react';
import { useEffect, useContext, useState } from "react"
import { MainContext } from './../../context/main';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import Box from '@mui/material/Box';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from "react-i18next";
import GetAppIcon from '@mui/icons-material/GetApp';
import PublishIcon from '@mui/icons-material/Publish';
import { ApiTaskService } from '../../services/apiTaskService';
import { TaskForm } from './TaskForm';
import { TaskRow } from './TaskRow';
import { DownloadDialog } from './DownloadDialog';
import { ImportDialog, ExportDialog } from './ImportExportDialog';

const run_type_list = [{ "value": "EveryDay", "name": "每天" }, { "value": "EveryHour", "name": "每小时" }]

const defaultValue = {
    "original": {
        "urls": [],
        "result_name": "",
        "md5": "",
        "run_type": "EveryDay",
        "keyword_dislike": [],
        "keyword_like": [],
        "http_timeout": 20000,
        "check_timeout": 20000,
        "concurrent": 30,
        "sort": false,
        "no_check": false,
        "rename": false,
        "ffmpeg_check": false,
        "not_http_skip": false,
        "same_save_num": 0,
        "fast_sort": false,
    },
    "id": "",
    "create_time": 0,
    "task_info": {
        "run_type": "EveryDay",
        "last_run_time": 0,
        "next_run_time": 0,
        "is_running": false,
        "task_status": "Pending"
    }
}

export default function TaskList() {
    const _mainContext = useContext(MainContext);
    const { t } = useTranslation();
    const [taskService] = useState(() => new ApiTaskService());

    const [formDialog, setFormDialog] = useState(false);
    const [formValue, setFormValue] = useState(null);
    const [taskList, setTaskList] = useState([]);
    const [openAlertBar, setOpenAlertBar] = useState(false);
    const [alertBarMsg, setAlertBarMsg] = useState("");
    const [openDownloadBody, setOpenDownloadBody] = useState(false);
    const [downloadBody, setDownloadBody] = useState({ "content": "", "url": "" });
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [exportBody, setExportBody] = useState('');
    const [nowTaskId, setNowTaskId] = useState('')

    useEffect(() => {
        get_task_list();
    }, []);

    const handleClickOpen = (value) => {
        setFormValue(value);
        setFormDialog(true);
    };

    const handleClose = () => {
        setFormDialog(false);
        setFormValue(null);
    };

    const handleSave = async (value) => {
        try {
            if (value.id === '') {
                await taskService.addTask(getTaskSaveData(value));
            } else {
                await taskService.updateTask(value.id, getTaskSaveData(value));
            }
            get_task_list();
        } catch (e) {
            handleOpenAlertBar(e.message);
        }
    };

    const getTaskSaveData = (value) => {
        return {
            "urls": value.original.urls,
            "result_name": value.original.result_name,
            "md5": "",
            "run_type": value.original.run_type,
            "keyword_dislike": value.original.keyword_dislike,
            "keyword_like": value.original.keyword_like,
            "http_timeout": value.original.http_timeout,
            "check_timeout": value.original.check_timeout,
            "sort": value.original.sort,
            "no_check": value.original.no_check,
            "concurrent": value.original.concurrent,
            "rename": value.original.rename,
            "ffmpeg_check": value.original.ffmpeg_check,
            "not_http_skip": value.original.not_http_skip,
            "same_save_num": value.original.same_save_num,
            "fast_sort": value.original.fast_sort,
        };
    };

    const handleDelete = async (value) => {
        try {
            await taskService.deleteTask(value.id);
            get_task_list();
        } catch (e) {
            handleOpenAlertBar(e.message);
        }
    };

    const get_task_list = async () => {
        try {
            let resp = await taskService.getTaskList();
            setTaskList(resp.list);
            setNowTaskId(resp.now_id);
        } catch (e) {
            setTaskList([]);
            handleOpenAlertBar(t('获取任务失败，请检查服务是否正常启动'));
        }
    };

    const handleOpenAlertBar = (msg) => {
        setAlertBarMsg(msg);
        setOpenAlertBar(true);
    };

    const handleCloseAlertBar = () => {
        setAlertBarMsg("");
        setOpenAlertBar(false);
    };

    const doTaskRightNow = async (id) => {
        try {
            await taskService.runTask(id);
            get_task_list();
        } catch (e) {
            handleOpenAlertBar(t('操作失败'));
        }
    };

    const getDownloadBody = async (id) => {
        // setOpenDownloadBody(true);
        try {
            const data = await taskService.getTaskDetail(id);
            setOpenDownloadBody(true);
            setDownloadBody({ "task_id": id, "check_result": data.check_result, "original": data });
        } catch (e) {
            handleOpenAlertBar(t('操作失败'));
        }
    };

    const handleDownloadClose = (val) => {
        setOpenDownloadBody(val);
    };

    const refreshList = () => {
        setTaskList([]);
        get_task_list();
    };

    // const handleImportDialog = (val) => {
    //     setShowImportDialog(val);
    // };

    // const handleExportDialog = async (val) => {
    //     if (val) {
    //         try {
    //             const data = await taskService.exportTasks();
    //             setShowExportDialog(true);
    //             setExportBody(JSON.stringify(data));
    //         } catch (e) {
    //             handleOpenAlertBar(t('获取失败'));
    //         }
    //     } else {
    //         setShowExportDialog(false);
    //     }
    // };

    // const handleSaveImportData = async (val) => {
    //     try {
    //         const data = JSON.parse(val);
    //         await taskService.importTasks(data);
    //         setShowImportDialog(false);
    //         refreshList();
    //     } catch (e) {
    //         handleOpenAlertBar(t('保存失败'));
    //     }
    // };

    return (
        <Box style={{ padding: '0 20px' }}>
            <Box style={{
                marginBottom: '10px',
                display: 'flex',
                justifyContent: 'space-between'
            }}>
                <Box>
                    <Button
                        variant="contained"
                        size='small'
                        startIcon={<AddIcon />}
                        onClick={() => handleClickOpen(null)}
                        style={{ marginRight: '10px' }}
                    >
                        {t('新增')}
                    </Button>
                    <Button
                        variant="outlined"
                        size='small'
                        startIcon={<RefreshIcon />}
                        onClick={refreshList}
                        style={{ marginRight: '10px' }}
                    >
                        {t('刷新列表')}
                    </Button>
                </Box>
                {/* <Box>
                    <Button
                        variant="outlined"
                        size='small'
                        startIcon={<PublishIcon />}
                        style={{ marginRight: '10px' }}
                        onClick={() => handleImportDialog(true)}
                    >
                        {t('任务导入')}
                    </Button>
                    <Button
                        variant="outlined"
                        size='small'
                        startIcon={<GetAppIcon />}
                        onClick={() => handleExportDialog(true)}
                    >
                        {t('任务导出')}
                    </Button>
                </Box> */}
            </Box>
            <Snackbar
                open={openAlertBar}
                autoHideDuration={6000}
                onClose={handleCloseAlertBar}
                message={alertBarMsg}
            />
            <TaskForm
                taskService={taskService}
                formValue={formValue}
                open={formDialog}
                onClose={handleClose}
                handleSave={handleSave}
                handleDelete={handleDelete}
                checkType="server"
            />
            <DownloadDialog
                formValue={downloadBody}
                open={openDownloadBody}
                onClose={handleDownloadClose}
            />
            {/* <ImportDialog
                open={showImportDialog}
                onClose={handleImportDialog}
                onSave={handleSaveImportData}
            /> */}
            {/* <ExportDialog
                open={showExportDialog}
                formValue={exportBody}
                onClose={handleExportDialog}
            /> */}
            <Paper sx={{ overflow: 'hidden' }}>
                <TableContainer>
                    <Table aria-label="simple table">
                        <TableHead>
                            <TableRow>
                                <TableCell>{t('任务id')}</TableCell>
                                <TableCell align="right">{t('运行时间')}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {taskList.map((row) => (
                                <TaskRow
                                    key={row.id}
                                    row={row}
                                    doTaskRightNow={doTaskRightNow}
                                    showDownloadDialog={getDownloadBody}
                                    clickTask={() => handleClickOpen(row)}
                                    source="task"
                                    isNowHandle={row.id===nowTaskId}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
}