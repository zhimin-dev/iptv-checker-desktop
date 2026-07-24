import * as React from 'react';
import { useState, useContext, useEffect, useRef } from 'react'
import { MainContext } from '../../context/main';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FormLabel from '@mui/material/FormLabel';
import Button from '@mui/material/Button';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import LoadingButton from '@mui/lab/LoadingButton';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import UploadIcon from '@mui/icons-material/Upload';
import { useNavigate } from 'react-router-dom';
import { useTranslation, initReactI18next } from "react-i18next";
import Input from '@mui/material/Input';
import DeleteIcon from '@mui/icons-material/Delete';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CountryJson from './../../assets/api/country.json'
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DownloadIcon from '@mui/icons-material/Download';

export default function Fast() {

    const [open, setOpen] = useState(false);
    const [scroll, setScroll] = useState('paper');

    const { t } = useTranslation();
    const navigate = useNavigate();
    const _mainContext = useContext(MainContext);
    const [loading, setLoading] = useState(false);
    const [selectFileNames, setSelectFileNames] = useState([]);//上传的文件
    const [needSort, setNeedSort] = useState('true');//是否需要排序
    const [nowStatus, setNowStatus] = useState(0)// 0未检查 1待校验 2可检查 3检查中 4已结束
    const [total, setTotal] = useState(0)
    const [checkCount, setCheckCount] = useState(0)
    const [successCount, setSuccessCount] = useState(0)
    const [failedCount, setFailedCount] = useState(0)
    const [urls, setUrls] = useState([])
    const [needCheck, setNeedCheck] = useState('true')
    const [needFfmpeg, setNeedFfmpeg] = useState('false')
    const [needFastestOne, setNeedFastestOne] = useState('false')
    const [oneUri, setOneUri] = useState('')
    const [selectedType, setSelectedType] = useState(0)// 选择类型 0本地 1网络
    const [checkData, setCheckData] = useState([])
    const [showBody, setShowBody] = useState('')
    const [checkConcurrent, setCheckConcurrent] = useState(1)//并发数
    const [checkTimeout, setCheckTimeout] = useState(1)//超时

    const urlsRef = useRef([])//当前操作类型

    const handlePrepare = async () => {
        if (selectedType === 1) {
            if (urls.length === 0) {
                return
            }
            let fetch_body_data = await _mainContext.get_m3u_body(urls)
            setUrls(fetch_body_data)
            urlsRef.current = fetch_body_data
        }
        setNowStatus(2)
    }

    const handleConfirm = async () => {
        let checkOriData = [];
        if (selectedType === 0) {
            checkOriData = selectFileNames
        } else {
            checkOriData = urls
        }
        let get_valid_m3u8_data = []
        for (let i = 0; i < checkOriData.length; i++) {
            if (checkOriData[i].status === 200) {
                get_valid_m3u8_data.push(checkOriData[i])
            }
        }
        if (get_valid_m3u8_data.length === 0) {
            return
        }
        if (selectedType === 1) {
            let historyUrls = []
            for (let i = 0; i < get_valid_m3u8_data.length; i++) {
                historyUrls.push(get_valid_m3u8_data[i].url)
            }
            _mainContext.saveDataToHistory(historyUrls)
        }
        setNowStatus(3)
        let i = 0
        let s = 0
        let f = 0
        let totalData = 0
        let data = [];
        for (let i = 0; i < get_valid_m3u8_data.length; i++) {
            let list = _mainContext.get_m3u8_info_by_m3u_ori_data(get_valid_m3u8_data[i].body)
            for (let j = 0; j < list.length; j++) {
                data.push(list[j])
            }
        }
        if (needCheck === 'true') {
            let resultData = await _mainContext.doFastCheck(data, _mainContext.settings, function (total) {
                setTotal(total);
                totalData = total;
            }, function (code, index) {
                console.log(total)
                i++
                if (code === 200) {
                    s++
                } else {
                    f++
                }
                setCheckCount(i)
                setFailedCount(f)
                setSuccessCount(s)
                if (i === totalData) {
                    setNowStatus(4)
                }
            })
            setCheckData(resultData)
        } else {
            setTotal(data.length);
            setNowStatus(4)
            setCheckData(data)
        }
    }

    const handleDetail = () => {
        let data = [];
        if (selectedType === 0) {
            data = selectFileNames
        } else {
            data = urls
        }
        let saveData = []
        if(needCheck === 'true') {
            for(let i = 0;i<checkData.length;i++) {
                if(checkData[i].status === 1) {
                    saveData.push(checkData[i])
                }
            }
        }else{
            saveData = checkData
        }
        let md5Str = _mainContext.addDetail(saveData, data, selectedType === 0, needCheck === 'true' ? 1 : 0, needSort === 'true' ? 1 : 0)
        navigate("/detail?md5=" + md5Str)
    }

    const readFileContent = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            // 文件读取成功时的回调
            reader.onload = () => {
                resolve(reader.result); // 返回文件内容
            };

            // 文件读取出错时的回调
            reader.onerror = () => {
                reject(reader.error); // 返回错误信息
            };

            // 根据需要的读取方法启动 FileReader
            reader.readAsText(file); // 读取文件为文本
        });
    }

    const handleFileUpload = async (e) => {
        let rows = []
        for (let i = 0; i < e.target.files.length; i++) {
            let body = await readFileContent(e.target.files[i])
            console.log(body)
            rows.push({
                "body": body,
                "url": e.target.files[i].name,
                "status": 200,
            })
        }
        setSelectFileNames(rows)
    }

    const handleSelectedType = (e) => {
        let selectType = parseInt(e.target.value, 10);
        setSelectedType(selectType);
    }

    const handleClickUriDelete = (i) => {
        let kw = [...urls]
        kw.splice({
            "body": "",
            "url": i,
            "status": 0,
        }, 1)
        setUrls(kw);
        urlsRef.current = kw
    }

    const handleClickFilesDelete = (i) => {
        let kw = [...selectFileNames]
        kw.splice(i, 1)
        setSelectFileNames(kw);
    }

    const handleChangeSortValue = (e) => {
        setNeedSort(e.target.value)
    }

    const handleChangeNeedCheck = (e) => {
        setNeedCheck(e.target.value)
    }

    const handleChangeNeedFfmpeg = (e) => {
        setNeedFfmpeg(e.target.value)
    }

    const handleChangeNeedFastestOne = (e) => {
        setNeedFastestOne(e.target.value)
    }

    const handleClickUriAdd = (e) => {
        const newUrls = [...urls]; // 创建urls数组的副本
        newUrls.push({
            "body": "",
            "url": oneUri,
            "status": 0,
        }); // 在指定索引处设置新的值
        setUrls(newUrls)
        urlsRef.current = newUrls
        setOneUri("")
    }

    const changeOneUri = (e) => {
        setOneUri(e.target.value)
    }

    const getFileNameAndExtension = (url) => {
        try {
            // 创建一个 URL 对象
            const urlObj = new URL(url);
            // 获取路径名
            const pathname = urlObj.pathname;
            // 获取文件名（带后缀）
            const fileNameWithExtension = pathname.substring(pathname.lastIndexOf('/') + 1);
            // 获取文件名（不带后缀）
            const fileName = fileNameWithExtension.substring(0, fileNameWithExtension.lastIndexOf('.'));
            // 获取文件后缀
            const fileExtension = fileNameWithExtension.substring(fileNameWithExtension.lastIndexOf('.') + 1);
            return fileName + "." + fileExtension
        } catch (e) {
            return ""
        }
    }

    const fillThisData = (e) => {
        let data = [];
        for (let i = 0; i < e.urls.length; i++) {
            data.push({
                "url": e.urls[i],
                "status": 0,
                "body": ''
            })
        }
        setUrls(data)
        urlsRef.current = data
        setNeedCheck(e.needCheck ?? 'true')
        setNeedFastestOne(e.needFastestOne ?? 'false')
        setSelectedType(1)
        setNowStatus(0)
        setNeedSort(e.needSort ?? 'true')
    }

    const handleClickOpen = (body) => () => {
        setOpen(true);
        setScroll('paper');
        setShowBody(body)
    };

    const handleClose = () => {
        setOpen(false);
    };

    const descriptionElementRef = useRef(null);

    useEffect(() => {
        if (open) {
            const { current: descriptionElement } = descriptionElementRef;
            if (descriptionElement !== null) {
                descriptionElement.focus();
            }
        }
    }, [open]);

    useEffect(() => {
        if (selectedType === 0) {
            setNowStatus(2)
        } else {
            setNowStatus(0)
        }
    }, [selectedType]);

    const handleDownload = (extention) => {
        let saveData = [];
        console.log("---checkData",checkData)
        if(needCheck === 'true') {
            for(let i = 0;i<checkData.length;i++) {
                if(checkData[i].status === 1) {
                    saveData.push(checkData[i])
                }
            }
        }else{
            saveData = checkData
        }
        if (_mainContext.nowMod === 1) {
            _mainContext.clientSaveFile(saveData, extention === 'txt' ? 'txt' : 'm3u')
        } else {
            _mainContext.webSaveFile(saveData, extention === 'txt' ? 'txt' : 'm3u')
        }
    }

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                scroll={scroll}
                aria-labelledby="scroll-dialog-title"
                aria-describedby="scroll-dialog-description"
            >
                <DialogContent dividers={scroll === 'paper'}>
                    <DialogContentText
                        id="scroll-dialog-description"
                        ref={descriptionElementRef}
                        tabIndex={-1}
                    >
                        <TextField
                            id="standard-multiline-static"
                            multiline
                            rows={10}
                            value={showBody}
                            variant="standard"
                            style={{ width: '800px' }}
                        />
                    </DialogContentText>
                </DialogContent>
            </Dialog>
            <Box style={{
                padding: '0 20px',
            }}>
                <Box style={{ width: '700px' }}>
                    {
                        nowStatus >= 3 ? (
                            <Box>
                                <div>{t('总')}：{total} {t('条记录')}</div>
                                {
                                    needCheck === 'true' ? (
                                        <div>{t('正在检查')}: {t('成功')}{successCount}{t('条记录')} / {t('失败')}{failedCount}{t('条记录')}</div>
                                    ) : ''
                                }
                            </Box>
                        ) : ''
                    }
                    {
                        nowStatus === 0 || nowStatus === 1 || nowStatus === 2 ? (
                            <>
                                <FormControl fullWidth>
                                    <FormLabel id="demo-controlled-radio-buttons-group">{t('文件类型')}</FormLabel>
                                    <RadioGroup
                                        aria-labelledby="demo-controlled-radio-buttons-group"
                                        name="controlled-radio-buttons-group"
                                        value={selectedType}
                                        row
                                        onChange={handleSelectedType}
                                    >
                                        <FormControlLabel value={0} control={<Radio />} label={t('本地')} />
                                        <FormControlLabel value={1} control={<Radio />} label={t('网络')} />
                                    </RadioGroup>
                                </FormControl>
                                {
                                    selectedType === 0 ? (
                                        <>
                                            <FormControl fullWidth style={{ width: '400px' }}>
                                                <Button variant="outlined" component="label" startIcon={<UploadIcon />}>
                                                    {t('请选择检测文件')}
                                                    <input hidden accept=".m3u,.txt" multiple type="file" onChange={handleFileUpload} />
                                                </Button>
                                                <span>({t('仅支持')} <b>.m3u</b> {t('以及')} <b>.txt</b> {t('文件格式')})</span>
                                            </FormControl>
                                            <div>
                                                {
                                                    selectFileNames.map((value, index) => (
                                                        <FormControl fullWidth style={{ width: '400px' }} key={"files" + index}>
                                                            <div style={{ display: 'flex', width: '600px' }}>
                                                                <Input
                                                                    disabled
                                                                    style={{ width: '400px' }}
                                                                    value={value.url}
                                                                    endAdornment={
                                                                        <InputAdornment position="end">
                                                                            <IconButton
                                                                                onClick={() => handleClickFilesDelete(index)}
                                                                            >
                                                                                <DeleteIcon />
                                                                            </IconButton>
                                                                        </InputAdornment>
                                                                    }
                                                                />
                                                                {
                                                                    value.status === 200 ? (
                                                                        <IconButton aria-label="delete" onClick={handleClickOpen(value.body)} color="primary">
                                                                            <CheckCircleIcon />
                                                                        </IconButton>
                                                                    ) : ''
                                                                }
                                                            </div>
                                                        </FormControl>
                                                    ))
                                                }
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <FormControl fullWidth style={{ width: '400px' }}>
                                                <Input
                                                    value={oneUri}
                                                    key={10000000000}
                                                    id="standard-adornment-input"
                                                    onChange={changeOneUri}
                                                    placeholder={t('请输入链接,仅支持.m3u以及.txt后缀链接')}
                                                    endAdornment={
                                                        <InputAdornment position="end">
                                                            <IconButton
                                                                onClick={handleClickUriAdd}
                                                            >
                                                                <AddCircleOutlineIcon />
                                                            </IconButton>
                                                        </InputAdornment>
                                                    }
                                                />
                                            </FormControl>
                                            <div style={{ marginTop: '20px' }}>
                                                {
                                                    urlsRef.current.map((value, index) => (
                                                        <FormControl fullWidth key={"urls" + index}>
                                                            <div style={{ display: 'flex', width: '600px' }}>
                                                                <Input
                                                                    disabled
                                                                    value={value.url}
                                                                    style={{ width: '400px' }}
                                                                    endAdornment={
                                                                        <InputAdornment position="end">
                                                                            <IconButton
                                                                                onClick={() => handleClickUriDelete(index)}
                                                                            >
                                                                                <DeleteIcon />
                                                                            </IconButton>
                                                                        </InputAdornment>
                                                                    }
                                                                />
                                                                {
                                                                    value.status === 200 ? (
                                                                        <IconButton aria-label="delete" onClick={handleClickOpen(value.body)} color="primary">
                                                                            <CheckCircleIcon />
                                                                        </IconButton>
                                                                    ) : ''
                                                                }
                                                                {
                                                                    value.status === 500 ? (
                                                                        <IconButton aria-label="delete" onClick={handleClickOpen(value.body)} color="error">
                                                                            <ErrorIcon />
                                                                        </IconButton>
                                                                    ) : ''
                                                                }
                                                            </div>
                                                        </FormControl>
                                                    ))
                                                }
                                            </div>
                                        </>
                                    )
                                }
                                <FormControl fullWidth style={{
                                    margin: "10px 0 10px",
                                }}>
                                    <FormLabel id="demo-row-radio-buttons-group-label">{t('是否需要检查')}</FormLabel>
                                    <RadioGroup
                                        row
                                        aria-labelledby="demo-row-radio-buttons-group-label"
                                        name="row-radio-buttons-group"
                                        value={needCheck}
                                        onChange={handleChangeNeedCheck}
                                    >
                                        <FormControlLabel value="false" control={<Radio />} label={t('否')} />
                                        <FormControlLabel value="true" control={<Radio />} label={t('是')} />
                                    </RadioGroup>
                                </FormControl>
                                <FormControl fullWidth style={{
                                    margin: "10px 0 10px",
                                }}>
                                    <FormLabel id="demo-row-radio-buttons-group-label">{t('ffmpeg慢速检查')}</FormLabel>
                                    <RadioGroup
                                        row
                                        aria-labelledby="demo-row-radio-buttons-group-label"
                                        name="row-radio-buttons-group"
                                        value={needFfmpeg}
                                        onChange={handleChangeNeedFfmpeg}
                                    >
                                        <FormControlLabel value="false" control={<Radio />} label={t('否')} />
                                        <FormControlLabel value="true" control={<Radio />} label={t('是')} />
                                    </RadioGroup>
                                </FormControl>
                                {/* {
                                    _mainContext.nowMod === 0 ? (
                                        <FormControl fullWidth style={{
                                            margin: "10px 0 10px",
                                        }}>
                                            <FormLabel id="demo-row-radio-buttons-group-label">{t('自动匹配最快的源')}</FormLabel>
                                            <RadioGroup
                                                row
                                                aria-labelledby="demo-row-radio-buttons-group-label"
                                                name="row-radio-buttons-group"
                                                value={needFastestOne}
                                                onChange={handleChangeNeedFastestOne}
                                            >
                                                <FormControlLabel value="false" control={<Radio />} label={t('否')} />
                                                <FormControlLabel value="true" control={<Radio />} label={t('是')} />
                                            </RadioGroup>
                                        </FormControl>
                                    ) : ''
                                } */}
                                <FormControl fullWidth style={{
                                    margin: "10px 0 10px",
                                }}>
                                    <FormLabel id="demo-row-radio-buttons-group-label">{t('是否需要排序')}</FormLabel>
                                    <RadioGroup
                                        row
                                        aria-labelledby="demo-row-radio-buttons-group-label"
                                        name="row-radio-buttons-group"
                                        value={needSort}
                                        onChange={handleChangeSortValue}
                                    >
                                        <FormControlLabel value="false" control={<Radio />} label={t('否')} />
                                        <FormControlLabel value="true" control={<Radio />} label={t('是')} />
                                    </RadioGroup>
                                </FormControl>
                            </>
                        ) : ''
                    }
                    <Box sx={{
                        display: 'flex',
                        marginTop: '5px'
                    }}>
                        {
                            nowStatus === 0 ? (
                                <>
                                    <LoadingButton
                                        size="small"
                                        onClick={handlePrepare}
                                        loading={loading}
                                        variant="contained"
                                        startIcon={<NavigateNextIcon />}
                                    >
                                        {t('数据准备')}
                                    </LoadingButton>
                                </>
                            ) : ''
                        }
                        {
                            nowStatus === 2 ? (
                                <>
                                    <LoadingButton
                                        size="small"
                                        onClick={handleConfirm}
                                        loading={loading}
                                        variant="contained"
                                        startIcon={<NavigateNextIcon />}
                                    >
                                        {t('开始检测')}
                                    </LoadingButton>
                                </>
                            ) : ''
                        }
                        {
                            nowStatus === 4 ? (
                                <>
                                    <LoadingButton
                                        size="small"
                                        onClick={handleDetail}
                                        loading={loading}
                                        style={{marginRight: '5px'}}
                                        variant="contained"
                                        startIcon={<NavigateNextIcon />}
                                    >
                                        {t('去编辑')}
                                    </LoadingButton>
                                    <LoadingButton
                                        size="small"
                                        onClick={() => handleDownload('m3u')}
                                        loading={loading}
                                        variant="contained"
                                        style={{marginRight: '5px'}}
                                        startIcon={<DownloadIcon />}
                                    >
                                        {t('下载结果.m3u格式')}
                                    </LoadingButton>
                                    <LoadingButton
                                        size="small"
                                        onClick={() => handleDownload('txt')}
                                        loading={loading}
                                        variant="outlined"
                                        startIcon={<DownloadIcon />}
                                    >
                                        {t('下载结果.txt格式')}
                                    </LoadingButton>
                                </>
                            ) : ''
                        }
                    </Box>
                </Box>
                {
                    _mainContext.checkHistory.length > 0 ? (
                        <Box style={{ margin: '30px 0 20px 0' }}>
                            {t('检测历史')}：
                            <Box style={{ display: 'flex' }}>
                                {
                                    _mainContext.checkHistory.map((value, index) => (
                                        <Card sx={{ width: 200, marginRight: 2 }} key={index}>
                                            <CardContent>
                                                {
                                                    value.urls.map((uv, ui) => (
                                                        <Typography key={ui}>{getFileNameAndExtension(uv)}</Typography>
                                                    ))
                                                }
                                            </CardContent>
                                            <CardActions>
                                                <Button size="small" onClick={() => fillThisData(value)}>{t('再次检测')}</Button>
                                            </CardActions>
                                        </Card>
                                    ))
                                }
                            </Box>
                        </Box>
                    ) : ''
                }
                <Box style={{ margin: '10px 0 20px 0' }}>
                    {t('公共源')}+{t('自定义网络源')}：
                    <Box style={{ display: 'flex' }}>
                        {
                            CountryJson.map((value, index) => (
                                <Card sx={{ width: 200, marginRight: 2 }} key={index}>
                                    <CardContent>
                                        {
                                            value.url.map((uv, ui) => (
                                                <Typography key={ui}>{getFileNameAndExtension(uv)}</Typography>
                                            ))
                                        }
                                    </CardContent>
                                    <CardActions>
                                        <Button size="small" onClick={() => fillThisData({ "urls": value.url })}>{t('检测')}</Button>
                                    </CardActions>
                                </Card>
                            ))
                        }
                    </Box>
                </Box>
            </Box>
        </>
    )
}