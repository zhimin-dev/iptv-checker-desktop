import { useState, useContext, useEffect } from 'react'
import { MainContext } from './../../context/main';
import Dialog from '@mui/material/Dialog';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import LoadingButton from '@mui/lab/LoadingButton';
import PropTypes from 'prop-types';
import GetAppIcon from '@mui/icons-material/GetApp';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import Sort from './sort'
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { useTranslation, initReactI18next } from "react-i18next";

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

export default function SimpleDialog(props) {
  const { t } = useTranslation();
  const _mainContext = useContext(MainContext);

  //mod == 1 下载界面 2预览原始m3u信息
  const { onClose, open, mod, clearSelectedArrFunc, setDialogMod, selectedArr } = props;

  const [showTextAreaLable, setShowTextAreaLable] = useState('')
  const [selectedGroups, setSelectedGroups] = useState('')
  const [groupTab, setGroupTab] = useState(0)
  const [customGroupName, setCustomGroupName] = useState('')

  useEffect(() => {
    setGroupTab(0)
    setSelectedGroups('')
    if (mod === 1) {
      setShowTextAreaLable(t('您所选择的m3u信息'))
    } else if (mod === 2) {
      setShowTextAreaLable(t('原始数据'))
    } else if (mod === 3) {
      setShowTextAreaLable(t('设置'))
    } else if (mod === 4) {
      setShowTextAreaLable(t('排序(数据较多时,可能影响排序列表性能,建议分批操作)'))
    } else if (mod === 5) {
      setShowTextAreaLable(t('更改分组'))
    }
  }, [mod])

  const handleClose = () => {
    onClose();
  };

  const doDownloadM3u = () => {
    // if(_mainContext.nowMod === 1) {
    //   _mainContext.clientSaveFile(_mainContext.exportDataStr, 'm3u')
    // }else{
    //   var a = document.createElement('a')
    //   var blob = new Blob([_mainContext.exportDataStr])
    //   var url = window.URL.createObjectURL(blob)
    //   a.href = url
    //   a.download = 'iptv-checker-' + (new Date()).getTime() + ".m3u"
    //   a.click()
    // }
    if (_mainContext.nowMod === 1) {
      _mainContext.clientSaveFile(_mainContext.detailList, 'm3u')
    } else {
      _mainContext.webSaveFile(_mainContext.detailList, 'm3u')
    }
  }

  const doCsvDownload = () => {
    let csvArr = _mainContext.strToCsv(_mainContext.exportDataStr)
    // 将数据行转换为 CSV 字符串
    const csvContent = csvArr.map(e => e.join(",")).join("\n");
    if (_mainContext.nowMod === 1) {
      _mainContext.clientSaveFile(csvContent, 'csv')
    } else {
      // 创建下载链接并将 CSV 文件下载到本地
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "iptv-checker-" + (new Date()).getTime() + ".csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onClose();
    }
  }

  // const doDoAgain = () => {
  //   _mainContext.changeOriginalM3uBody(_mainContext.exportDataStr)
  //   clearSelectedArrFunc()
  //   onClose();
  // }

  const doNextStep = () => {
    setDialogMod(1)
    _mainContext.onChangeExportStr()
  }

  const doBackward = () => {
    setDialogMod(4)
  }

  const handleChangeGroup = (e) => {
    setSelectedGroups(e.target.value)
  }

  const doTransferGroup = () => {
    if (groupTab === 0) {
      _mainContext.batchChangeGroupName(selectedArr, selectedGroups)
      onClose();
    } else {
      _mainContext.addGroupName(customGroupName)
      setGroupTab(0)
    }
  }

  const handleChangeGroupTab = (event, newValue) => {
    setGroupTab(newValue);
  };

  const changeCustomGroupName = (e) => {
    setCustomGroupName(e.target.value)
  }

  const doDownloadTxt = () => {
    if (_mainContext.nowMod === 1) {
      _mainContext.clientSaveFile(_mainContext.detailList, 'txt')
    } else {
      _mainContext.webSaveFile(_mainContext.detailList, 'txt')
    }
  }

  // const doSaveConfigSettings = () => {
  //   _mainContext.onChangeSettings(configSettings)
  //   onClose();
  // }

  // const handleChangeConfigSettings = (e) => {
  //   const { name, value } = e.target;
  //   let data = value
  //   setConfigSettings(prevData => ({
  //     ...prevData,
  //     [name]: data
  //   }));
  // }

  return (
    <Dialog onClose={handleClose} open={open}>
      <Box style={{ minWidth: mod !== 3 ? '800px' : '', 'paddingTop': '10px', 'overflow': 'hidden' }}>
        <span style={{ paddingLeft: '10px' }}>{showTextAreaLable}</span>
      </Box>
      {mod === 1 || mod === 2 ? (
        <FormControl sx={{ width: 550, margin: '10px' }}>
          <TextField multiline sx={{ fontSize: '11px' }} size="small" id="standard-multiline-static" rows={4} value={_mainContext.exportDataStr} />
        </FormControl>
      ) : ''}
      {
        mod === 4 ? (
          <Box style={{ "padding": '5px' }}>
            <Sort></Sort>
            <Box>
              <FormControl sx={{
                width: 550,
                margin: '10px',
                display: 'flex',
                flexDirection: 'revert'
              }}>
                <LoadingButton
                  size="small"
                  onClick={doNextStep}
                  variant="outlined"
                  style={{ marginRight: '10px' }}
                  startIcon={<SkipNextIcon />}
                >
                  {t('下一步')}
                </LoadingButton>
              </FormControl>
            </Box>
          </Box>
        ) : ''
      }
      {
        mod === 1 ? (
          <FormControl sx={{
            width: 550,
            margin: '10px',
            display: 'flex',
            flexDirection: 'revert'
          }}>
            <LoadingButton
              size="small"
              onClick={doBackward}
              variant="outlined"
              style={{ marginRight: '10px' }}
              startIcon={<SkipPreviousIcon />}
            >
              {t('上一步')}
            </LoadingButton>
            <LoadingButton
              size="small"
              onClick={doDownloadM3u}
              variant="contained"
              style={{ marginRight: '10px' }}
              startIcon={<GetAppIcon />}
            >
              {t('下载m3u文件')}
            </LoadingButton>
            <LoadingButton
              size="small"
              onClick={doDownloadTxt}
              variant="outlined"
              style={{ marginRight: '10px' }}
              startIcon={<GetAppIcon />}
            >
              {t('下载txt文件')}
            </LoadingButton>
            {/* <LoadingButton
              size="small"
              onClick={doCsvDownload}
              variant="outlined"
              style={{ marginRight: '10px' }}
              startIcon={<InsertDriveFileIcon />}
            >
              {t('下载csv文件')}
            </LoadingButton> */}
            {/* <LoadingButton
              size="small"
              onClick={doDoAgain}
              variant="contained"
              startIcon={<AutorenewIcon />}
            >
              {t('再次处理')}
            </LoadingButton> */}
          </FormControl>
        ) : ''
      }
      {
        mod === 5 ? (
          <Box sx={{ width: 550, margin: '10px' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={groupTab} onChange={handleChangeGroupTab} aria-label="basic tabs example">
                <Tab label={t('已有分组')} />
                <Tab label={t('新增分组')} />
              </Tabs>
            </Box>
            <TabPanel value={groupTab} index={0}>
              <FormControl fullWidth>
                <InputLabel id="demo-simple-select-label">{t('更换分组')}</InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={selectedGroups}
                  label={t('更换分组')}
                  onChange={handleChangeGroup}
                >
                  {_mainContext.detailMenu["groups"].map((value, index) => (
                    <MenuItem key={index} value={value}>{value}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </TabPanel>
            <TabPanel value={groupTab} index={1}>
              <FormControl fullWidth>
                <TextField id="standard-basic" label={t('输入新分组名称')} value={customGroupName}
                  variant="standard" onChange={changeCustomGroupName} />
              </FormControl>
            </TabPanel>
            <Box sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '5px'
            }}>
              <Button variant="outlined" onClick={doTransferGroup}>{groupTab === 0 ? t('更改') : t('新增')}</Button>
            </Box>
          </Box>
        ) : ''
      }
    </Dialog>
  );
}

SimpleDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
  mod: PropTypes.number.isRequired,
};