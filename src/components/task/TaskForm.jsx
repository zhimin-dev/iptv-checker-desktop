import * as React from 'react';
import { useEffect, useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { MainContext } from './../../context/main';
import {
    Dialog,
    Box,
    Stepper,
    Step,
    StepLabel,
    Typography,
    Button,
    FormControl,
    TextField,
    Select,
    MenuItem,
    InputLabel,
    OutlinedInput,
    InputAdornment,
    FormHelperText,
    Stack,
    Chip,
    RadioGroup,
    FormControlLabel,
    Radio,
    IconButton,
    DialogTitle,
    DialogActions,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import MoodBadIcon from '@mui/icons-material/MoodBad';
import PublicIcon from '@mui/icons-material/Public';
import UploadIcon from '@mui/icons-material/Upload';
import AddIcon from '@mui/icons-material/Add';

const run_type_list = [{ "value": "EveryDay", "name": "每天" }, { "value": "EveryHour", "name": "每小时" }];
const output_extenion = ".m3u";

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
};

export const TaskForm = ({ onClose, formValue, open, onSave, handleSave, handleDelete, taskService, checkType }) => {
    const { t } = useTranslation();
    const _mainContext = useContext(MainContext);
    const [task, setTask] = useState(defaultValue);
    const [filterFavKeyword, setFilterFavKeyword] = useState('');
    const [filterDisKeyword, setFilterDisKeyword] = useState('');
    const [keywordType, setKeywordType] = useState('like'); // 'like' or 'dislike'
    const [activeStep, setActiveStep] = useState(0);
    const [delOpen, setDelOpen] = useState(false);

    const steps = ['基础配置', '个性化配置', '检查配置'];

    useEffect(() => {
        if (!open) {
            let default_data = JSON.parse(JSON.stringify(defaultValue));
            if (default_data.original.result_name === '') {
                default_data.original.result_name = randomString(10);
            }
            setTask(default_data);
            setFilterDisKeyword('');
            setFilterFavKeyword('');
            setKeywordType('like');
            setActiveStep(0);
            setDelOpen(false);
        }
    }, [open]);

    useEffect(() => {
        setActiveStep(0);
        if (formValue !== null) {
            const processedFormValue = {
                ...formValue,
                original: {
                    ...formValue.original,
                    result_name: formValue.original.result_name,
                    http_timeout: formValue.original.http_timeout ?? 0,
                    check_timeout: formValue.original.check_timeout ?? 0,
                    concurrent: formValue.original.concurrent ?? 0,
                    sort: formValue.original.sort ?? false,
                    no_check: formValue.original.no_check ?? false,
                    ffmpeg_check: formValue.original.ffmpeg_check ?? false,
                    not_http_skip: formValue.original.not_http_skip ?? false,
                    same_save_num: formValue.original.same_save_num ?? 0,
                    fast_sort: formValue.original.fast_sort ?? false,
                }
            };
            setTask(processedFormValue);
            // 根据已有数据设置keywordType
            if (processedFormValue.original.keyword_like && processedFormValue.original.keyword_like.length > 0) {
                setKeywordType('like');
            } else if (processedFormValue.original.keyword_dislike && processedFormValue.original.keyword_dislike.length > 0) {
                setKeywordType('dislike');
            } else {
                setKeywordType('like');
            }
        } else {
            let default_data = JSON.parse(JSON.stringify(defaultValue));
            if (default_data.original.result_name === '') {
                default_data.original.result_name = randomString(10);
            }
            setTask(default_data);
            setKeywordType('like');
        }
    }, [formValue]);

    const randomString = (len) => {
        len = len || 32;
        const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
        const maxPos = chars.length;
        let pwd = '';
        for (let i = 0; i < len; i++) {
            pwd += chars.charAt(Math.floor(Math.random() * maxPos));
        }
        return pwd;
    };

    const handleNext = () => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleSaveClick = () => {
        if(task.original.urls.length === 0) {
            let msg = t('基础配置为空')
            alert(msg)
        } else{
            handleSave(task);
            onClose();
        }
    };

    const handleDeleteClick = () => {
        handleDelete(task);
        handleDelClose();
        onClose();
    };

    const addNewM3uLinkByUrl = (url) => {
        const newUrls = [...task.original.urls, url];
        setTask({
            ...task,
            original: {
                ...task.original,
                urls: newUrls
            }
        });
    }

    const parseUrlId = (input_name) => {
        return parseInt(input_name.replace("url-", ""), 10)
    }

    const addNewM3uLink = () => {
        addNewM3uLinkByUrl("")
    }

    const handleDelClickOpen = () => {
        setDelOpen(true);
    };

    const handleDelClose = () => {
        setDelOpen(false);
    };

    // const handleAddUrl = () => {
    //     if (filterKeyword.trim() !== '') {
    //         setTask(prev => ({
    //             ...prev,
    //             original: {
    //                 ...prev.original,
    //                 urls: [...prev.original.urls, filterKeyword.trim()]
    //             }
    //         }));
    //         setFilterKeyword('');
    //     }
    // };

    const handleDeleteUrl = (index) => {
        setTask(prev => ({
            ...prev,
            original: {
                ...prev.original,
                urls: prev.original.urls.filter((_, i) => i !== index)
            }
        }));
    };

    // const handleAddKeyword = (type) => {
    //     if (filterKeyword.trim() !== '') {
    //         setTask(prev => ({
    //             ...prev,
    //             original: {
    //                 ...prev.original,
    //                 [type]: [...prev.original[type], filterKeyword.trim()]
    //             }
    //         }));
    //         setFilterKeyword('');
    //     }
    // };

    const changeCheckTimeout = (e) => {
        setTask({
            ...task,
            original: {
                ...task.original,
                check_timeout: parseInt(e.target.value, 10)
            }
        });
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // 上传文件到服务器
            const formData = new FormData();
            formData.append('file', file);
            let response = await taskService.uploadFile(formData);

            // 添加文件链接到任务
            addNewM3uLinkByUrl(response.url);
        } catch (error) {
            console.error('文件处理失败', error);
        }
    }

    const changeHttpTimeout = (e) => {
        setTask({
            ...task,
            original: {
                ...task.original,
                http_timeout: parseInt(e.target.value, 10)
            }
        });
    }

    const addKeyword = (type) => {
        if (type === 1 && filterFavKeyword != '') {
            let kw = task.original.keyword_like ?? [];
            kw.push(filterFavKeyword)
            setTask({
                ...task,
                original: {
                    ...task.original,
                    keyword_like: uniqueArr(kw)
                }
            });
            setFilterFavKeyword('')
        } else if (type === 2 && filterDisKeyword != '') {
            let kw = task.original.keyword_dislike ?? [];
            kw.push(filterDisKeyword)
            setTask({
                ...task,
                original: {
                    ...task.original,
                    keyword_dislike: uniqueArr(kw)
                }
            });
            setFilterDisKeyword('')
        }
    }

    const uniqueArr = (array) => {
        return array.filter((item, index) => array.indexOf(item) === index)
    }

    const changeFilterFavKeyword = (e) => {
        setFilterFavKeyword(e.target.value)
    }

    const changeFilterDisKeyword = (e) => {
        setFilterDisKeyword(e.target.value)
    }

    const changeUrls = (e) => {
        const index = parseUrlId(e.target.name);
        const newUrls = [...task.original.urls]; // 创建urls数组的副本
        newUrls[index] = e.target.value; // 在指定索引处设置新的值

        const updatedTask = { ...task, original: { ...task.original, urls: newUrls } }; // 创建包含更新后的urls数组的新task对象
        setTask(updatedTask); // 设置更新后的task对象为新的状态值
    }

    const changeResultName = (e) => {
        setTask({
            ...task,
            original: {
                ...task.original,
                result_name: e.target.value
            }
        });
    }

    const handleChangeRunType = (e) => {
        setTask({
            ...task,
            original: {
                ...task.original,
                run_type: e.target.value
            }
        });
    }

    const handleDeleteKeyword = (type, index) => {
        setTask(prev => ({
            ...prev,
            original: {
                ...prev.original,
                [type]: prev.original[type].filter((_, i) => i !== index)
            }
        }));
    };

    const handleInputChange = (field, value) => {
        setTask(prev => ({
            ...prev,
            original: {
                ...prev.original,
                [field]: value
            }
        }));
    };

    const changeConcurrent = (e) => {
        setTask({
            ...task,
            original: {
                ...task.original,
                concurrent: parseInt(e.target.value, 10)
            }
        });
    }

    const handleChangeSortValue = (e, value) => {
        setTask({
            ...task,
            original: {
                ...task.original,
                sort: value === "true"
            }
        });
    }

    const changeSameSaveNum = (e) => {
        setTask({
            ...task,
            original: {
                ...task.original,
                same_save_num: parseInt(e.target.value, 10)
            }
        });
    }

    const handleChangeNotHttpSkip = (e, value) => {
        setTask({
            ...task,
            original: {
                ...task.original,
                not_http_skip: value === "true"
            }
        });
    }

    const handleChangeFfmepgCheck = (e, value) => {
        setTask({
            ...task,
            original: {
                ...task.original,
                ffmpeg_check: value === "true"
            }
        });
    }

    const handleChangeNoCheckValue = (e, value) => {
        setTask({
            ...task,
            original: {
                ...task.original,
                no_check: value === "true"
            }
        });
    }

    const renderStepContent = (step) => {
        switch (step) {
            case 0:
                return (
                    <Box sx={{ mt: 2 }}>
                        {
                            task.original.urls.length > 0 ? (
                                <FormControl fullWidth style={{
                                    padding: "0 0 20px",
                                }}>
                                    <Typography variant="subtitle1" component="div">{t('检查文件列表')}</Typography>
                                    {
                                        task.original.urls.map((value, index) => (
                                            <Stack direction="row" spacing={1} key={index}>
                                                <TextField style={{ width: '100%' }} disabled={value.startsWith("static") || value.startsWith("localstorage")} id="standard-basic" variant="standard" name={"url-" + index} value={value} onChange={changeUrls} />
                                                <IconButton aria-label="delete" onClick={() => handleDeleteUrl(index)}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Stack>
                                        ))
                                    }
                                </FormControl>
                            ) : ''
                        }
                        <FormControl fullWidth style={{
                            padding: "20px 0 20px", display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between'
                        }}>
                            <Button variant="outlined" onClick={() => addNewM3uLink()} startIcon={<PublicIcon />}>{t('在线链接')}</Button>
                            <Button variant="contained" component="label" startIcon={<UploadIcon />}>
                                {t('本地文件')}
                                <input hidden accept="*" multiple type="file" onChange={handleFileUpload} />
                            </Button>
                        </FormControl>
                        {
                            checkType === 'server' ? (
                                <FormControl fullWidth style={{
                                    margin: "0 0 20px",
                                }}>
                                    <InputLabel id="demo-simple-select-standard-label">{t('定时检查时间')}</InputLabel>
                                    <Select
                                        labelId="demo-simple-select-standard-label"
                                        id="demo-simple-select-standard"
                                        value={task.original.run_type}
                                        label={t('定时检查时间')}
                                        onChange={handleChangeRunType}
                                    >
                                        {
                                            run_type_list.map((value, index) => (
                                                <MenuItem value={value.value} key={index}>{t(value.name)}</MenuItem>
                                            ))
                                        }
                                    </Select>
                                </FormControl>
                            ) : ''
                        }
                        {
                            checkType === 'server' ? (
                                <FormControl fullWidth style={{
                                    margin: "20px 0 20px",
                                }}>
                                    <InputLabel htmlFor="outlined-adornment-amount">{t('自定义id')}</InputLabel>
                                    <OutlinedInput
                                        style={{ width: '100%' }}
                                        name="resultName"
                                        aria-describedby="outlined-weight-helper-text"
                                        label={t('自定义id')}
                                        value={task.original.result_name}
                                        onChange={changeResultName}
                                    />
                                    <FormHelperText sx={{ fontSize: '0.75rem', mt: 0.5 }}>
                                        请确保这个id不重复，如果重复，则数据会被覆盖
                                    </FormHelperText>
                                </FormControl>
                            ) : ''}

                    </Box>
                );
            case 1:
                return (
                    <Box sx={{ mt: 2 }}>
                        <FormControl fullWidth style={{
                            margin: "10px 0 20px",
                        }}>
                            <Typography variant="subtitle1" component="div" sx={{ mb: 2 }}>{t('频道名称过滤方式')}</Typography>
                            <RadioGroup
                                row
                                value={keywordType}
                                onChange={(e) => {
                                    const newType = e.target.value;
                                    setKeywordType(newType);
                                    // 切换类型时清空另一个选项的数据
                                    if (newType === 'like') {
                                        setTask(prev => ({
                                            ...prev,
                                            original: {
                                                ...prev.original,
                                                keyword_dislike: []
                                            }
                                        }));
                                        setFilterDisKeyword('');
                                    } else {
                                        setTask(prev => ({
                                            ...prev,
                                            original: {
                                                ...prev.original,
                                                keyword_like: []
                                            }
                                        }));
                                        setFilterFavKeyword('');
                                    }
                                }}
                            >
                                <FormControlLabel value="like" control={<Radio />} label={t('喜欢频道名称')} />
                                <FormControlLabel value="dislike" control={<Radio />} label={t('不喜欢频道名称')} />
                            </RadioGroup>
                        </FormControl>

                        {keywordType === 'like' ? (
                            <>
                                <FormControl fullWidth style={{
                                    margin: "10px 0 15px",
                                }}>
                                    <Stack direction="row" spacing={1} alignItems="flex-end">
                                        <TextField
                                            id="standard-basic"
                                            label={t('喜欢频道名称')}
                                            variant="standard"
                                            fullWidth
                                            value={filterFavKeyword} onChange={changeFilterFavKeyword} />
                                        <IconButton
                                            color="primary"
                                            onClick={() => addKeyword(1)}
                                            sx={{ mb: 0.5 }}
                                        >
                                            <AddIcon />
                                        </IconButton>
                                    </Stack>
                                </FormControl>
                                {
                                    task.original.keyword_like !== null && task.original.keyword_like.length > 0 ? (
                                        <FormControl fullWidth style={{
                                            padding: "0 0 20px",
                                        }}>
                                            <Typography variant="subtitle1" component="div">{t('只看频道关键词')}</Typography>
                                            <Stack direction="row" spacing={1} style={{
                                                display: "flex",
                                                flexWrap: "wrap"
                                            }}>
                                                {
                                                    task.original.keyword_like !== null && task.original.keyword_like.map((value, i) => (
                                                        <Chip
                                                            label={value}
                                                            onDelete={() => handleDeleteKeyword('keyword_like', i)}
                                                            variant="outlined"
                                                            key={i}
                                                            style={{ margin: '5px' }}
                                                        />
                                                    ))
                                                }
                                            </Stack>
                                        </FormControl>
                                    ) : ''
                                }
                            </>
                        ) : (
                            <>
                                <FormControl fullWidth style={{
                                    margin: "10px 0 20px",
                                }}>
                                    <Stack direction="row" spacing={1} alignItems="flex-end">
                                        <TextField
                                            id="standard-basic"
                                            label={t('不喜欢频道名称')}
                                            variant="standard"
                                            fullWidth
                                            value={filterDisKeyword} onChange={changeFilterDisKeyword} />
                                        <IconButton
                                            color="primary"
                                            onClick={() => addKeyword(2)}
                                            sx={{ mb: 0.5 }}
                                        >
                                            <AddIcon />
                                        </IconButton>
                                    </Stack>
                                </FormControl>
                                {
                                    task.original.keyword_dislike !== null && task.original.keyword_dislike.length > 0 ? (
                                        <FormControl fullWidth style={{
                                            padding: "0 0 10px",
                                        }}>
                                            <Typography variant="subtitle1" component="div">{t('不看频道关键词')}</Typography>
                                            <Stack direction="row" spacing={1} style={{
                                                display: "flex",
                                                flexWrap: "wrap"
                                            }}>
                                                {
                                                    task.original.keyword_dislike.map((value, i) => (
                                                        <Chip
                                                            label={value}
                                                            variant="outlined"
                                                            onDelete={() => handleDeleteKeyword('keyword_dislike', i)}
                                                            key={i}
                                                            style={{ margin: '5px' }}
                                                        />
                                                    ))
                                                }
                                            </Stack>
                                        </FormControl>
                                    ) : ''
                                }
                            </>
                        )}
                    </Box>
                );
            case 2:
                return (
                    <Box sx={{ mt: 2 }}>
                        <FormControl fullWidth style={{
                            margin: "20px 0 20px",
                        }}>
                            <Typography variant="subtitle1" component="div">{t('http超时(毫秒ms)')}</Typography>
                            <TextField id="standard-basic" variant="standard" value={task.original.http_timeout} onChange={changeHttpTimeout} />
                        </FormControl>
                        <FormControl fullWidth style={{
                            margin: "20px 0 20px",
                        }}>
                            <Typography variant="subtitle1" component="div">{t('检查超时(毫秒ms)')}</Typography>
                            <TextField id="standard-basic" variant="standard" value={task.original.check_timeout} onChange={changeCheckTimeout} />
                        </FormControl>


                        <FormControl fullWidth style={{
                            margin: "10px 0 20px",
                        }}>
                            <Typography variant="subtitle1" component="div">{t('是否需要检查')}</Typography>
                            <RadioGroup
                                row
                                aria-labelledby="demo-row-radio-buttons-group-label"
                                name="row-radio-buttons-group"
                                value={task.original.no_check}
                                onChange={handleChangeNoCheckValue}
                            >
                                <FormControlLabel value={false} control={<Radio />} label={t('是')} />
                                <FormControlLabel value={true} control={<Radio />} label={t('否')} />
                            </RadioGroup>
                        </FormControl>
                        {
                            task.original.no_check === false ? (
                                <>
                                    <FormControl fullWidth style={{
                                        margin: "10px 0 20px",
                                    }}>
                                        <Typography variant="subtitle1" component="div">{t('检查并发数')}</Typography>
                                        <TextField id="standard-basic" variant="standard" value={task.original.concurrent} onChange={changeConcurrent} />
                                    </FormControl>
                                    <FormControl fullWidth style={{
                                        margin: "10px 0 20px",
                                    }}>
                                        <Typography variant="subtitle1" component="div">{t('检查方式')}</Typography>
                                        <RadioGroup
                                            row
                                            aria-labelledby="demo-row-radio-buttons-group-label"
                                            name="row-radio-buttons-group"
                                            value={task.original.ffmpeg_check}
                                            onChange={handleChangeFfmepgCheck}
                                        >
                                            <FormControlLabel value={false} control={<Radio />} label={t('http快速检查')} />
                                            <FormControlLabel value={true} disabled={_mainContext.ffmepgCheck == 0 && _mainContext.nowMod === 1} control={<Radio />} label={t('ffmpeg慢速检查')} />
                                        </RadioGroup>
                                    </FormControl>
                                    {
                                        task.original.ffmpeg_check === false ? (
                                            <FormControl fullWidth style={{
                                                margin: "10px 0 20px",
                                            }}>
                                                <Typography variant="subtitle1" component="div">{t('如果非http链接则跳过')}</Typography>
                                                <RadioGroup
                                                    row
                                                    aria-labelledby="demo-row-radio-buttons-group-label"
                                                    name="row-radio-buttons-group"
                                                    value={task.original.not_http_skip}
                                                    onChange={handleChangeNotHttpSkip}
                                                >
                                                    <FormControlLabel value={false} control={<Radio />} label={t('否')} />
                                                    <FormControlLabel value={true} control={<Radio />} label={t('是')} />
                                                </RadioGroup>
                                            </FormControl>
                                        ) : ''
                                    }
                                </>
                            ) : ''
                        }
                        <FormControl fullWidth style={{
                            margin: "10px 0 20px",
                        }}>
                            <Typography variant="subtitle1" component="div">{t('是否需要排序')}</Typography>
                            <RadioGroup
                                row
                                aria-labelledby="demo-row-radio-buttons-group-label"
                                name="row-radio-buttons-group"
                                value={task.original.sort}
                                onChange={handleChangeSortValue}
                            >
                                <FormControlLabel value={false} control={<Radio />} label={t('否')} />
                                <FormControlLabel value={true} control={<Radio />} label={t('是')} />
                            </RadioGroup>
                        </FormControl>
                        <FormControl fullWidth style={{
                            margin: "10px 0 20px",
                        }}>
                            <Typography variant="subtitle1" component="div">{t('相同名称保存条数(默认0全部保存， 设置大于0则保存相应数量频道)')}</Typography>
                            <TextField id="standard-basic" variant="standard" value={task.original.same_save_num} onChange={changeSameSaveNum} />
                        </FormControl>
                        <FormControl fullWidth style={{
                            margin: "10px 0 20px",
                        }}>
                            <Typography variant="subtitle1" component="div">{t('按网速最快的前N个输出')}</Typography>
                            <FormHelperText sx={{ mb: 1 }}>
                                {t('开启后，将按响应速度排序，配合上方"相同名称保存条数"使用，仅保留每组中网速最快的N个频道')}
                            </FormHelperText>
                            <RadioGroup
                                row
                                aria-labelledby="demo-row-radio-buttons-group-label"
                                name="row-radio-buttons-group"
                                value={task.original.fast_sort}
                                onChange={(e, value) => handleInputChange('fast_sort', value)}
                            >
                                <FormControlLabel value={false} control={<Radio />} label={t('否')} />
                                <FormControlLabel value={true} control={<Radio />} label={t('是')} />
                            </RadioGroup>
                        </FormControl>

                    </Box>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <Dialog
                open={delOpen}
                onClose={handleDelClose}
                aria-describedby="alert-dialog-slide-description"
            >
                <DialogTitle>{"确定要删除吗？删除后不可恢复"}</DialogTitle>
                <DialogActions>
                    <Button onClick={handleDelClose}>No</Button>
                    <Button onClick={handleDeleteClick}>Yes</Button>
                </DialogActions>
            </Dialog>
            <Dialog
                onClose={onClose}
                open={open}
                disableEnforceFocus
                disableAutoFocus
                disableRestoreFocus
            >
                <Box sx={{ width: '100%', padding: '40px' }}>
                    <Stepper activeStep={activeStep}>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{t(label)}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    <React.Fragment>
                        {renderStepContent(activeStep)}
                        <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
                            {activeStep !== 0 && (
                                <Button
                                    color="inherit"
                                    onClick={handleBack}
                                    sx={{ mr: 1 }}
                                >
                                    {t('上一页')}
                                </Button>
                            )}
                            {activeStep === 0 && task.id !== '' && (
                                <Button
                                    color="error"
                                    onClick={handleDelClickOpen}
                                    startIcon={<DeleteIcon />}
                                >
                                    {t('删除')}
                                </Button>
                            )}
                            <Box sx={{ flex: '1 1 auto' }} />
                            {activeStep === steps.length - 1 ? (
                                checkType === 'server' || task.id === '' ? (
                                    <Button onClick={handleSaveClick}>
                                        {t('保存')}
                                    </Button>
                                ) : ''
                            ) : (
                                <Button onClick={handleNext}>
                                    {t('下一页')}
                                </Button>
                            )}
                        </Box>
                    </React.Fragment>
                </Box>
            </Dialog>
        </>
    );
};