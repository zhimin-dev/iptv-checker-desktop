import * as React from 'react';
import { useEffect, useContext, useRef, useState } from "react"
import { MainContext } from './../../context/main';
import { TaskContext } from './../../context/tasker';
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
import GetAppIcon from '@mui/icons-material/GetApp';
import PublishIcon from '@mui/icons-material/Publish';
import { useTranslation } from "react-i18next";
import { WebTaskService } from '../../services/webTaskService';
import { TaskForm } from '../task/TaskForm';
import { TaskRow } from '../task/TaskRow';
import { DownloadDialog } from '../task/DownloadDialog';
import { ImportDialog, ExportDialog } from '../task/ImportExportDialog';

export default function LTaskList() {
    const _taskerContext = useContext(TaskContext);
    const { t } = useTranslation();
    const [taskService] = useState(() => new WebTaskService());

    const [formDialog, setFormDialog] = useState(false);
    const [formValue, setFormValue] = useState(null);
    const [openAlertBar, setOpenAlertBar] = useState(false);
    const [alertBarMsg, setAlertBarMsg] = useState("");
    const [openDownloadBody, setOpenDownloadBody] = useState(false);
    const [downloadBody, setDownloadBody] = useState({ "content": "", "url": "" });
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [showExportDialog, setShowExportDialog] = useState(false);
    const [exportBody, setExportBody] = useState('');

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
                await taskService.addTask(value);
            } else {
                await taskService.updateTask(value.id, value);
            }
            _taskerContext.freshTaskList()
        } catch (e) {
            handleOpenAlertBar(e.message);
        }
    };

    const handleDelete = async (value) => {
        try {
            await taskService.deleteTask(value.id);
            _taskerContext.freshTaskList()
        } catch (e) {
            handleOpenAlertBar(e.message);
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
        } catch (e) {
            handleOpenAlertBar(t('操作失败'));
        }
    };

    const checkTaskRefetch = async (id) => {
        _taskerContext.updateTaskStatus(id, "Prepare")
    };

    const checkTaskContinue = async (id) => {
        _taskerContext.updateTaskStatus(id, "Pending")
    };
    
    const checkTaskAgain = async (id) => {
        _taskerContext.updateTaskStatus(id, "Prepare")
    };

    const getDownloadBody = async (id) => {
        setOpenDownloadBody(true);
        // try {
        //     const data = await taskService.getDownloadBody(id);
        //     setDownloadBody({ 'content': data.content, "url": data.url, "task_id": id });
        // } catch (e) {
        //     handleOpenAlertBar(t('操作失败'));
        // }
    };

    const handleDownloadClose = (val) => {
        setOpenDownloadBody(val);
    };

    const handleImportDialog = (val) => {
        setShowImportDialog(val);
    };

    const handleExportDialog = async (val) => {
        if (val) {
            try {
                const data = await taskService.exportTasks();
                setShowExportDialog(true);
                setExportBody(JSON.stringify(data));
            } catch (e) {
                handleOpenAlertBar(t('获取失败'));
            }
        } else {
            setShowExportDialog(false);
        }
    };

    const handleSaveImportData = async (val) => {
        try {
            const data = JSON.parse(val);
            await taskService.importTasks(data);
            setShowImportDialog(false);
        } catch (e) {
            handleOpenAlertBar(t('保存失败'));
        }
    };

    return (
        <Box style={{ padding: '0 20px' }}>
            <>
                <Box style={{
                    marginBottom: '10px',
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <Box>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => handleClickOpen(null)}
                            style={{ marginRight: '10px' }}
                            size="small"
                        >
                            {t('新增')}
                        </Button>
                    </Box>
                    {/* <Box>
                        <Button
                            variant="outlined"
                            startIcon={<PublishIcon />}
                            style={{ marginRight: '10px' }}
                            onClick={() => handleImportDialog(true)}
                        >
                            {t('任务导入')}
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<GetAppIcon />}
                            onClick={() => handleExportDialog(true)}
                        >
                            {t('全部任务导出')}
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
                    checkType="local"
                    output_folder = ""
                />
                <DownloadDialog
                    formValue={downloadBody}
                    open={openDownloadBody}
                    onClose={handleDownloadClose}
                />
                <ImportDialog
                    open={showImportDialog}
                    onClose={handleImportDialog}
                    onSave={handleSaveImportData}
                />
                <ExportDialog
                    open={showExportDialog}
                    formValue={exportBody}
                    onClose={handleExportDialog}
                />
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
                                {_taskerContext.tasks.map((row) => (
                                    <TaskRow
                                        key={row.id}
                                        row={row}
                                        doTaskRightNow={doTaskRightNow}
                                        showDownloadDialog={getDownloadBody}
                                        clickTask={() => handleClickOpen(row)}
                                        checkTaskRefetch={checkTaskRefetch}
                                        checkTaskContinue={checkTaskContinue}
                                        checkTaskAgain={checkTaskAgain}
                                        source="ltask"
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </>
        </Box>
    );
} 