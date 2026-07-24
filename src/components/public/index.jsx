import { useState, useContext, useEffect } from 'react'
import { MainContext } from './../../context/main';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import LoadingButton from '@mui/lab/LoadingButton';
import Divider from '@mui/material/Divider';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import CountryJson from './../../assets/api/country.json'
import MenuItem from '@mui/material/MenuItem';
import CheckIcon from '@mui/icons-material/Check';
import utils from './../../utils/common'
import axios from 'axios'
import { useNavigate } from 'react-router-dom';
import { useTranslation, initReactI18next } from "react-i18next";

export default function Public() {

    const { t } = useTranslation();
    const _mainContext = useContext(MainContext);
    const navigate = useNavigate();
    const [selectedUrl, setSelectedUrl] = useState([])
    const [commonLinks, setCommonLinks] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        let config = _mainContext.settings
        if(config !== null) {
            fetchCommonLink(config.customLink)
        }
    }, [_mainContext])

    useEffect(() => {
        initCountry()
    }, [])

    const handleSelectedCountry = (e) => {
        setSelectedUrl(e.target.value)
    }

    const initCountry = () => {
        let rows = JSON.parse(JSON.stringify(CountryJson))
        setCommonLinks(rows)
    }

    const fetchCommonLink = async (link) => {
        let rows = [];
        for(let i = 0;i<link.length;i++) {
            rows.push({
                "country":link[i].name,
                "url":[link[i].url]
            })
        }
        setCommonLinks(rows)
    }

    const parseOnlineData = async (selectedUrl) => {
        let targetUrl = selectedUrl;
        let bodies = []
        if (targetUrl.length == 0) {
          return bodies
        }
        for (let i = 0; i < targetUrl.length; i++) {
          if (utils.isValidUrl(targetUrl[i])) {
            let res = await axios.get(_mainContext.getM3uBody(targetUrl[i]))
            if (res.status === 200) {
              bodies.push(res.data)
            }
          }
        }
        return bodies
      }

    const handleConfirm = async () => { 
        setLoading(true);
        try {
            let str = selectedUrl.join(',')
            let bodyStr = await _mainContext.getBodyType(str)
            _mainContext.changeOriginalM3uBody(bodyStr)
            navigate("/detail")
        } catch (e) {
            console.log(e)
            setLoading(false);
        }
    }

    return (
        <Box style={{
            padding: '0 20px'
        }}>
            <Box style={{ width: '550px' }}>
                <FormControl sx={{ width: 550 }}>
                    <InputLabel id="demo-simple-select-label">{t('请选择源')}</InputLabel>
                    <Select
                        labelId="demo-simple-select-label"
                        id="demo-simple-select"
                        value={selectedUrl}
                        label={t('请选择源')}
                        onChange={handleSelectedCountry}
                    >
                        {
                            commonLinks.map((value, index) => (
                                <MenuItem value={value.url} key={index}>{value.country}</MenuItem>
                            ))
                        }
                    </Select>
                </FormControl>
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginTop: '20px'
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
            <Box>{t('当前源来自github的iptv-org，如您有相关源链接，请至设置中添加')}</Box>
        </Box>
    )
}