import * as React from 'react';
import { useState, useContext, useEffect } from 'react'
import { MainContext } from './../../context/main';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import LoadingButton from '@mui/lab/LoadingButton';
import CheckIcon from '@mui/icons-material/Check';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import { useNavigate } from 'react-router-dom';
import { useTranslation, initReactI18next } from "react-i18next";
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function Check() {

    const { t } = useTranslation();
    const navigate = useNavigate();
    const _mainContext = useContext(MainContext);
    const [body, setBody] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const [showError, setShowError] = useState(false)

    useEffect(()=> {
        _mainContext.clearDetailData()
    }, [])

    const handleChangeContent = (e) => {
        setBody(e.target.value);
    }

    const handleCloseSnackBar = () => {
        setShowError(false)
    }

    const handleConfirm = async () => {
        setLoading(true);
        let bodyStr = body.trim()
        try {
            bodyStr = await _mainContext.getBodyType(bodyStr)
            _mainContext.changeOriginalM3uBody(bodyStr)
            navigate("/detail")
        } catch (e) {
            setShowError(true)
            setErrorMsg(e.message)
            setLoading(false);
        }
    }

    return (
        <Box style={{
            padding: '0 20px',
        }}>
            <Snackbar open={showError} autoHideDuration={6000} onClose={handleCloseSnackBar}>
                <Alert onClose={handleCloseSnackBar} severity="error" sx={{ width: '100%' }}>
                    {errorMsg}
                </Alert>
            </Snackbar>
            <Box style={{ width: '700px' }}>
                <FormControl variant="standard">
                    <TextField style={{ width: '700px' }}
                        multiline id="standard-multiline-static"
                        rows={4} value={body} onChange={handleChangeContent} placeholder={t('Please enter the data to be checked')} />
                </FormControl>
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: '5px'
                }}>
                    <LoadingButton
                        size="small"
                        onClick={handleConfirm}
                        loading={loading}
                        variant="contained"
                        startIcon={<CheckIcon />}
                    >
                        {t('下一步')}
                    </LoadingButton>
                </Box>
            </Box>
            <Box>
                {t('输入框支持下面几种格式')}：
                <ul>
                    <li>{t('支持标准格式的m3u链接，如有多个请用英文逗号做分割符,比如')}：<i>http://startv.m3u,http://starmovies.m3u</i></li>
                    <li>{t('支持类似')}：<i>star movies,http://srtarmovies.com/111.m3u8</i></li>
                    <li>{t('支持类似')}：<i>http://srtarmovies.com/111.m3u8,http://srtarmovies.com/222.m3u8</i></li>
                    <li>{t('支持m3u文件原始内容，类似')}：<i>#EXTM3U\n#EXTINF:-1\nhttp://srtarmovies.com/111.m3u8</i></li>
                </ul>
            </Box>
        </Box>
    )
}