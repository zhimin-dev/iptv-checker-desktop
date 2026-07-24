import { useState, useContext, useEffect } from 'react'
import * as React from 'react';
import { MainContext } from './../../context/main';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { useNavigate, useLocation } from 'react-router-dom';
import Setting from './setting';
import { VirtualizedTable } from './vtable'
import FormControl from '@mui/material/FormControl';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { useTranslation, initReactI18next } from "react-i18next";
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { emit, listen } from '@tauri-apps/api/event'

export default function Detail() {
  const { t } = useTranslation();
  const location = useLocation();
  const _mainContext = useContext(MainContext);
  const [vTableHeight, setVTableHeight] = useState(550)
  const navigate = useNavigate();
  const [selectedArr, setSelectedArr] = useState([])//已选中的id
  const [showChannelMod, setShowChannelMod] = useState(0)// 0不显示弹框 1展示非编辑 2编辑页面
  const [showDetailObj, setShowDetailObj] = useState(null)// 选中查看对象
  const [showMultiSelect,setShowMultiSelect] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target;
    setShowDetailObj(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const getQueryParam = (location, key) => {
    // 使用 URLSearchParams 获取查询参数
    const params = new URLSearchParams(location.search);

    // 获取对应的值
    return params.get(key);
  }

  useEffect(() => {
    let md5 = getQueryParam(location, "md5")
    if (location.pathname === '/detail') {
      _mainContext.updateDetailMd5(md5)
    }
    console.log("-----",location)
  }, [location])

  const saveEditData = () => {
    _mainContext.updateDataByIndex([showDetailObj.index], {
      name: showDetailObj.name,
      tvgLogo: showDetailObj.tvgLogo,
      url: showDetailObj.url,
      groupTitle: showDetailObj.groupTitle,
    })
    setShowChannelMod(1)
  }

  useEffect(() => {
    setVTableHeight(window.innerHeight - _mainContext.headerHeight - 50)
    const handleResize = (e) => {
      setVTableHeight(e.currentTarget.innerHeight - _mainContext.headerHeight - 50)
    }
    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  // const deleteThisRow = (index, tableIndex) => {
  //   let row = []
  //   for (let i = 0; i < selectedArr.length; i++) {
  //     if (selectedArr[i] !== index) {
  //       row.push(selectedArr[i]);
  //     }
  //   }
  //   setSelectedArr(row)
  //   _mainContext.deleteShowM3uRow(index)
  // }

  const watchThisRow = async (val) => {
    let platform = _mainContext.nowPlatform
    if (_mainContext.nowMod === 1) {
      let label = 'watch'
      let appWindow = await WebviewWindow.getByLabel(label);
      if (appWindow !== null) {
        // 携带负载对象触发 `click` 事件
        emit('changeWatchUrl', {
          data: val,
        })
        return
      }
      const webview = new WebviewWindow(label, {
        url: '/watch/single?platform=' + platform + '&url=' + val.url,
        x: 0,
        y: 0,
        width: 1024,
        height: 600,
        title: val.name,
        center: true,
        maximizable: false,
      })
      console.log("webview", webview)
      // _mainContext.initControlBar(webview, label)
      // since the webview window is created asynchronously,
      // Tauri emits the `tauri://created` and `tauri://error` to notify you of the creation response
      webview.once('tauri://created', function () {
        // webview window successfully created
      })
      webview.once('tauri://error', function (e) {
        console.log('traui error ', e)
      })
    } else {
      console.log("-------22222")
      window.open('/watch/single?platform=' + platform + '&url=' + val.url)
    }
  }

  const handleSelectCheckedAll = () => {
    let mod = 1//选中
    if (selectedArr.length > 0) {
      mod = 0//取消选择
    }
    let temp = []
    if (mod === 1) {
      for (let i = 0; i < _mainContext.detailList.length; i++) {
        temp.push(_mainContext.detailList[i].index)
      }
    }
    _mainContext.onSelectedOrNotAll(mod)
    setSelectedArr(temp)
  }

  const onSelectedThisRow = (index) => {
    _mainContext.onSelectedRow(index)
    let mod = 1//选中
    for (let i = 0; i < selectedArr.length; i++) {
      if (selectedArr[i] === index) {
        mod = 0//取消选择
      }
    }
    if (mod === 1) {
      setSelectedArr(pre => [...pre, index])
    } else {
      setSelectedArr(prev => prev.filter((val) => val !== index))
    }
  }

  const seeDetail = (val) => {
    if (showChannelMod !== 0 && showDetailObj !== null && val.index === showDetailObj.index) {
      setShowChannelMod(0)
      return
    }
    setShowChannelMod(1)
    setShowDetailObj(val)
  }

  const closeShowChangeObj = () => {
    setShowChannelMod(0)
  }

  const changeShowObj = () => {
    setShowChannelMod(2)
  }

  const changeShowMultiSelect = (val) => {
    setShowMultiSelect(val)
  }

  return (
    <Box style={{ padding: '0 20px' }}>
      <Setting 
        setSelectedArr={setSelectedArr} 
        showMultiSelect={showMultiSelect} 
        selectedArr={selectedArr}
        changeShowMultiSelect={changeShowMultiSelect}
      ></Setting>
      <Paper style={{
        height: vTableHeight,
        marginTop: "10px",
      }}>
        <VirtualizedTable
          rowCount={_mainContext.detailList.length}
          rowGetter={({ index }) => _mainContext.detailList[index]}
          originalData={_mainContext.detailList}
          selectAllRow={handleSelectCheckedAll}
          showMultiSelect={showMultiSelect}
          selectRow={onSelectedThisRow}
          seeDetail={seeDetail}
          watchRow={watchThisRow}
          nowMod={_mainContext.nowMod}
          channelNameDisplayMode={_mainContext.settings.channelNameDisplayMode || 0}
          t={() => t}
          selectedArr={selectedArr}
          selectAll={handleSelectCheckedAll}
          columns={[
            {
              width: 80,
              label: 'checkBox',
              dataKey: 'index',
            },
            {
              width: 600,
              label: t('名称'),
              dataKey: 'index',
            },
            {
              width: 100,
              label: t('延迟'),
              dataKey: 'index',
            },
          ]}
        />
      </Paper>
      {
        showChannelMod !== 0 ? (
          <Box sx={{
            'backgroundColor': '#fff',
            borderRadius: '10px',
          }}>
            <Box>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                <FormControl sx={{ marginBottom: '25px', marginTop: '10px' }} fullWidth>
                  <TextField disabled={showChannelMod === 1} sx={{ fontSize: '11px' }} label={t('频道名称')} name="name" size="small" id="standard-multiline-static" value={showDetailObj.name} onChange={handleChange} />
                </FormControl>
                <FormControl sx={{ marginBottom: '25px' }} fullWidth>
                  <TextField disabled={showChannelMod === 1} sx={{ fontSize: '11px' }} label={t('m3u8地址')} name="url" size="small" id="standard-multiline-static" value={showDetailObj.url} onChange={handleChange} />
                </FormControl>
                <FormControl sx={{ marginBottom: '25px' }} fullWidth>
                  <TextField disabled={showChannelMod === 1} sx={{ fontSize: '11px' }} label={t('logoUrl')} name="tvgLogo" size="small" id="standard-multiline-static" value={showDetailObj.tvgLogo} onChange={handleChange} />
                </FormControl>
                <FormControl sx={{ marginBottom: '15px' }} fullWidth>
                  <TextField disabled={showChannelMod === 1} sx={{ fontSize: '11px' }} label={t('分组名称')} name="groupTitle" size="small" id="standard-multiline-static" value={showDetailObj.groupTitle} onChange={handleChange} />
                </FormControl>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {
                    showChannelMod === 2 ? (
                      <Button
                        size="small"
                        onClick={saveEditData}
                        variant="contained"
                        sx={{ marginRight: '5px' }}
                      >
                        {t('保存并关闭')}
                      </Button>
                    ) : ''
                  }
                  {
                    showChannelMod === 1 ? (
                      <Button
                        size="small"
                        onClick={changeShowObj}
                        variant="contained"
                        sx={{ marginRight: '5px' }}
                      >
                        {t('编辑')}
                      </Button>
                    ) : ''}
                  <Button
                    size="small"
                    onClick={closeShowChangeObj}
                    variant="contained"
                  >
                    {t('取消/关闭')}
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        ) : ''}
    </Box>
  )
}