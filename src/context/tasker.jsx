import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from "axios"
import ParseM3u from '../utils/utils'
import { invoke } from '@tauri-apps/api/core'
import { TaskStorageService } from '../services/taskStorageService';

export const TaskContext = createContext();

export const useTask = () => {
    const context = useContext(TaskContext);
    if (!context) {
        throw new Error('useTask must be used within a TaskProvider');
    }
    return context;
};

export const TaskProvider = ({ children }) => {
    const [nowMod, setNowMod] = useState(0);// 当前运行模式 0服务端模式 1客户端模式
    const [checkConcurrent, setCheckConcurrent] = useState(4)// 后台任务
    const [nowTaskId, setNowTaskId] = useState("")// 正在执行的任务id
    const [taskList, setTaskList] = useState([])// 正在执行的任务列表

    const [tasks, setTasks] = useState([]);
    const [runningTasks, setRunningTasks] = useState(new Set());

    const workersRef = useRef([]);// worker ref
    const tasksCompletedRef = useRef(0);// 完成的任务数 ref
    const taskListRef = useRef([])// 当前正在运行的任务列表 ref
    const nowTaskIdRef = useRef("")//当前正在进行的任务id ref
    const tasksRef = useRef([]);//全部任务ref
    const jobRef = useRef(null);//任务ref
    const nowTaskRef = useRef(null);//当前任务ref
    const nowJobRef = useRef(0);//当前任务ref

    const localCahceTasksKey = "local_tasks"
    const localCahceNowTaskId = "nowTaskId"
    const localCahceNowTaskList = "nowTaskList"

    const saveToLocalStorage = (data, key) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    // 从localstorage加载数据
    const loadFromLocalStorage = () => {
        console.log("start load data")
        freshTaskList()
        freshOneTaskList()
        const nowTaskId = localStorage.getItem(localCahceNowTaskId);
        if (nowTaskId !== '') {
            for(let i = 0; i < tasksRef.current.length; i++) {
                if(tasksRef.current[i].id === nowTaskId) {
                    nowTaskRef.current = tasksRef.current[i]
                }
            }
            updateNowTaskId(nowTaskId, false);
        } else {
            updateNowTaskId("", false);
        }
    };

    const freshTaskList = () => {
        let list = TaskStorageService.getTasks()
        setTasks(list);
        tasksRef.current = list;
    }

    const freshOneTaskList = () => {
        const taskList = localStorage.getItem(localCahceNowTaskList);
        if (taskList) {
            try {
                let list = JSON.parse(taskList);
                updateTaskList(list);
            } catch (e) {
                updateTaskList([]);
            }

        } else {
            updateTaskList([]);
        }
    }

    const m3u8BodyToStructList = (body) => {
        try {
            return ParseM3u.parseM3uBody(body)
        } catch (e) {
            console.log("m3u8BodyToStructList err", e)
            return []
        }
    }

    const taskHasComplate = (taskId, subTaskList) => {
        setTasks(prevTasks => {
            const updatedTasks = prevTasks.map(task => {
                if (task.id === taskId) {
                    const updatedTask = {
                        ...task,
                        task_info: {
                            ...task.task_info,
                            task_status: "Completed",
                        },
                        list: subTaskList
                    };
                    return updatedTask;
                }
                return task;
            });
            saveToLocalStorage(updatedTasks, localCahceTasksKey);
            tasksRef.current = updatedTasks;
            return updatedTasks;
        });
        updateTaskList([]);
        updateNowTaskId("", true);
    }

    const updateTaskList = (list) => {
        setTaskList(list)
        saveToLocalStorage(list, localCahceNowTaskList)
        taskListRef.current = list
    }

    const updateNowTaskId = (nowTaskId, saveLocalstorage) => {
        setNowTaskId(nowTaskId)
        if (saveLocalstorage) {
            localStorage.setItem(localCahceNowTaskId, nowTaskId)
        }
        nowTaskIdRef.current = nowTaskId
    }

    const updateTaskInfo = (taskId, list) => {
        setTasks(prevTasks => {
            const updatedTasks = prevTasks.map(task =>
                task.id === taskId ? { ...task, list } : task
            )
            saveToLocalStorage(updatedTasks, localCahceTasksKey)
            tasksRef.current = updatedTasks
            return updatedTasks
        });
    };

    const startTask = () => {
        if (!jobRef.current) {
            jobRef.current = setInterval(checkTaskIsChecking, 10000); // 每5秒执行一次当前是否还有任务在检查
        }
    }

    const checkUrl = async (task, originalData) => {
        console.log(`Checking URL: ${task.url}`);
        let need_returen = false;
        if(originalData.no_check) {
            need_returen = true
        }
        let result = null;
        if (need_returen) {
            result = {
                'status': 300,
                'audio': null,
                'video': null,
                'error': ''
            };
        }else{
            if(originalData.ffmpeg_check) {
                result = await checkUrlByCmd(task, originalData) 
            }else {
                result = await checkUrlByWeb(task, originalData) 
            }
        }
        console.log("checkUrl result",result)
        return result;
    }

    const checkUrlByCmd = async (task, originalData) => {
        try{
            let result = await invoke("get_video_info",{url:task.url})
            console.log("checkUrlByCmd",result)
            if(result?.streams?.length > 0) {
                let videos = []
                let audios = []
                for(let i = 0; i < result.streams.length; i++) {
                    if(result.streams[i].codec_type === 'video') {
                        videos.push(result.streams[i])
                    }
                }
                for(let i = 0; i < result.streams.length; i++) {
                    if(result.streams[i].codec_type === 'audio') {
                        audios.push(result.streams[i])
                    }
                }
                return {
                    'status': 200,
                    'audio': audios,
                    'video': videos,
                    'error': ''
                };
            }else{
                console.log("checkUrlByCmd error empty")
                return {
                    'status': 500,
                    'audio': null,
                    'video': null,
                    'error': "empty data",
                }; 
            }
        }catch(err){
            console.log("checkUrlByCmd error",err)
            return {
                'status': 500,
                'audio': null,
                'video': null,
                'error': err,
            };
        }
    }

    const checkUrlByWeb = async (task, originalData) => {
        try {
            let need_returen = false;
            // Check if URL starts with http:// or https://
            if (!task.url.startsWith('http://') && !task.url.startsWith('https://')) {
                need_returen = true
            }
            if (need_returen) {
                return {
                    'status': 300,
                    'audio': null,
                    'video': null,
                    'error': ''
                };
            }
            console.log("checkUrlByWeb, task timout ", originalData.http_timeout)
            // Create AbortController to handle timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), originalData.http_timeout);
            
            const response = await fetch(task.url, {
                method: 'HEAD',
                signal: controller.signal,
            });
            // Check if response is streaming and hasn't completed in time
            if (!response.ok || response.bodyUsed) {
                console.log(`Request failed for ${task.url}:`, { ok: response.ok, bodyUsed: response.bodyUsed });
                clearTimeout(timeoutId);
                controller.abort(); // Force abort the ongoing request
                return {
                    'status': 500,
                    'audio': null,
                    'video': null
                };
            }
            
            clearTimeout(timeoutId);
    
            // Check Content-Type header
            const contentType = response.headers.get('content-type');
            console.log(`Content-Type for ${task.url}:`, contentType);
            if (!contentType || !(
                contentType.includes('application/vnd.apple.mpegurl') ||
                contentType.includes('application/x-mpegurl') ||
                contentType.includes('audio/mpegurl') ||
                contentType.includes('audio/x-mpegurl') ||
                contentType.includes('text/plain') ||
                contentType.includes('application/x-mpegURL') ||
                contentType.includes('application/vnd.apple.mpegURL')
            )) {
                return {
                    'status': 500,
                    'audio': null,
                    'video': null,
                    'contentType': contentType
                };
            }else{
                return {
                    'status': 200,
                    'audio': null,
                    'video': null,
                    'contentType': contentType
                };
            }
        } catch (error) {
            console.log(`Error checking ${task.url}:`, error);
            // Request failed
            return {
                'status': 500,
                'audio': null,
                'video': null,
                'contentType': ""
            };
        }
    }

    // 创建并行任务处理器
    const createTaskProcessor = async (taskIndex) => {
        while (true) {
            console.log("createTaskProcessor, nowIndex:", taskIndex)
            // 获取待处理的任务
            let taskToProcess = null;
            for (let i = 0; i < taskListRef.current.length; i++) {
                if (taskListRef.current[i].status === 0) {
                    taskToProcess = taskListRef.current[i];
                    break;
                }
            }

            if (!taskToProcess) {
                break; // 没有待处理的任务了
            }
            taskListRef.current = taskListRef.current.map(task => {
                if(task.index === taskToProcess.index) {
                    return {
                        ...task,
                        status: 1//正在处理
                    }
                }
                return task
            })
            updateTaskListResultWithoutRef(taskListRef.current)

            try {
                // 检查URL
                const result = await checkUrl(taskToProcess, nowTaskRef.current.original);
                console.log("checkUrl result",result)
                console.log(result['status'])
                taskListRef.current = taskListRef.current.map(task => {
                    if(task.index === taskToProcess.index) {
                        return {
                            ...task,
                            status: result['status'],
                            audio: result['audio'],
                            video: result['video'],
                        }
                    }
                    return task
                })
                updateTaskListResultWithoutRef(taskListRef.current)

            } catch (error) {
                console.error(`Task processor ${taskIndex} error:`, error);
                taskListRef.current = taskListRef.current.map(task => {
                    if(task.index === taskToProcess.index) {
                        return {
                            ...task,
                            status: 500//处理失败
                        }
                    }
                    return task
                })
                updateTaskListResultWithoutRef(taskListRef.current)
            }
        }
    };

    const startJobWorker = () => {
        // 启动多个并行任务处理器
        const processors = [];
        console.log("startJobWorker, nowTaskRef.current", nowTaskRef.current)
        if(nowTaskRef.current !== null) {
            nowJobRef.current = 1
            for (let i = 0; i < nowTaskRef.current.original.concurrent; i++) {
                processors.push(createTaskProcessor(i));
            }
            
            // 等待所有处理器完成
            Promise.all(processors).then(() => {
                nowJobRef.current = 0
                console.log("All task processors completed");
                workersRef.current = [];
            }).catch(error => {
                nowJobRef.current = 0
                console.error("Task processor error:", error);
                workersRef.current = [];
            });
        }
    }

    const checkTaskIsChecking = async () => {
        // 先准备数据
        await prepareTaskData()
        let needStartWorker = false
        let tempNowTaskId = ""
        // 检查nowTaskIdRef.current 数据是否正确
        if((nowTaskIdRef.current !== "" && taskListRef.current.length > 0 )|| 
        (nowTaskIdRef.current === "" && taskListRef.current.length > 0)) {
            let exist = false
            for(let i = 0; i < tasksRef.current.length; i++) {
                if(tasksRef.current[i].id === nowTaskIdRef.current) {
                    exist = true
                }
            }
            // 如果任务id不存在或者任务id为空，都认为这个数据有问题，暂时清理掉
            if(!exist || nowTaskIdRef.current === "") {
                updateNowTaskId("", true)
                updateTaskList([])
            }
        }
        // 仅当当前没有任务时，需要取其他任务获取
        if (taskListRef.current.length === 0) {
            // 如果当前待检查列表没有数据，那么需要从待检查列表中获取数据
            let nowId = ''
            let tList = []
            let nowTask = null
            for (let i = 0; i < tasksRef.current.length; i++) {
                if (tasksRef.current[i].task_info.task_status.toLowerCase() === 'pending' && nowId === '' && tasksRef.current[i].id !== tempNowTaskId) {
                    nowId = tasksRef.current[i].id
                    tList = tasksRef.current[i].list
                    nowTask = tasksRef.current[i]
                }
            }
            nowTaskRef.current = nowTask
            console.log("----- task list reset", nowId, tList)
            updateTaskList(tList)
            updateNowTaskId(nowId, true)
            if (tList.length > 0) {
                needStartWorker = true
            }
        } else {
            // 如果当前没有待检查的数据，那么需要将主任务修改为完成
            let noTask = true
            for (let i = 0; i < taskListRef.current.length; i++) {
                if (taskListRef.current[i].status == 0) {
                    noTask = false
                }
            }
            if (noTask) {
                tempNowTaskId = nowTaskIdRef.current
                console.log("set task complate", tempNowTaskId, taskListRef.current)
                taskHasComplate(tempNowTaskId, taskListRef.current)
            } else {
                needStartWorker = true
            }
        }
        console.log("nowTaskIdRef.current", nowTaskIdRef.current)
        if(nowTaskIdRef.current !== "" && nowTaskRef.current !== null) {
            for(let i = 0; i < tasksRef.current.length; i++) {
                if(tasksRef.current[i].id === nowTaskIdRef.current) {
                    nowTaskRef.current = tasksRef.current[i]
                }
            }
        }
        if (needStartWorker && nowJobRef.current === 0) {
            console.log("startJobWorker")
            startJobWorker()
            // if (workersRef.current === null || workersRef.current.length === 0) {
            //     console.log("now task start worker", taskListRef.current)
            //     startWorker()
            // }
        }
    }

    const startWorker = () => {
        // 创建一组 Web Workers
        const createWorkers = (count) => {
            const workers = [];
            for (let i = 0; i < count; i++) {
                const worker = new Worker(new URL('./check-task.js', import.meta.url));
                worker.onmessage = (e) => {
                    const { index, task, result } = e.data;
                    console.log("Worker message received:", { index, task, result });
                    updateTaskListResult(index, task, result);
                };
                worker.onerror = (error) => {
                    console.error("Worker error:", error);
                };
                workers.push(worker);
            }
            return workers;
        };

        workersRef.current = createWorkers(checkConcurrent); // 创建N个 worker

        // 开始处理每个任务
        const processTasks = () => {
            taskListRef.current.forEach(task => {
                if (task.status === 0) {
                    const worker = workersRef.current[tasksCompletedRef.current % workersRef.current.length];
                    worker.postMessage({ index: task.index, nowMod, task, original: nowTaskRef.current }); // 发送任务信息
                    tasksCompletedRef.current++;
                }
            });
        };
        processTasks();
    }

    const stopTask = () => {
        clearWorker()
        if (jobRef.current) {
            clearInterval(jobRef.current);
            jobRef.current = null;
        }
    };

    const clearWorker = () => {
        workersRef.current.forEach(worker => worker.terminate());
    }

    useEffect(() => {
        // loadFromLocalStorage()
        // console.log("-----task start--", tasks, tasksRef.current)
        // 开启worker
        // startTask();
        // // 清理 Worker
        // return () => {
        //     stopTask()
        // };
    }, []);

    const updateTaskListResultWithoutRef = (list) => {
        setTaskList(list);
        saveToLocalStorage(list, localCahceNowTaskList)
    }

    const updateTaskListResult = (index, passTask, result) => {
        setTaskList(prevTasks => {
            const updatedTasks = prevTasks.map(task =>
                task.index === index ? {
                    ...task,
                    status: result['status']
                } : task
            )
            taskListRef.current = updatedTasks
            saveToLocalStorage(updatedTasks, localCahceNowTaskList)
            return updatedTasks
        });
    };

    const updateTaskStatus = (taskId, status) => {
        setTasks(prevTasks => {
            const updatedTasks = prevTasks.map(task => {
                if (task.id === taskId) {
                    if (status === "Prepare") {
                        return {
                            ...task,
                            task_info: {
                                ...task.task_info,
                                task_status: status
                            },
                            list: [],
                            bodies: []
                        }
                    } else {
                        return {
                            ...task,
                            task_info: {
                                ...task.task_info,
                                task_status: status
                            }
                        }
                    }
                }
                return task
            })
            saveToLocalStorage(updatedTasks, localCahceTasksKey)
            tasksRef.current = updatedTasks
            return updatedTasks
        });
    };

    const updateTaskOriginalUrls = (taskId, bodies) => {
        setTasks(prevTasks => {
            const updatedTasks = prevTasks.map(task =>
                task.id === taskId ? {
                    ...task,
                    bodies: bodies
                } : task
            )
            saveToLocalStorage(updatedTasks, localCahceTasksKey)
            tasksRef.current = updatedTasks
            return updatedTasks
        });
    }

    const prepareTaskData = async () => {
        console.log("------prepare")
        for (const task of tasksRef.current) {
            if (task.task_info.task_status === 'Prepare') {
                try {
                    let result = await get_m3u_body(task.original.urls)
                    let status = "Pending"
                    let hasError = false
                    let hasSuccess = false
                    for (let i = 0; i < result.length; i++) {
                        if (result[i].status === 200) {
                            hasSuccess = true
                        }
                        if (result[i].status !== 200) {
                            hasError = true
                        }
                    }
                    if (hasError && hasSuccess) {
                        status = "FetchSomeDataError"//部分失败
                    }
                    if (hasError && !hasSuccess) {
                        status = "FetchDataError"// 全部失败
                    }
                    if (hasSuccess) {
                        let list = [];
                        for (let j = 0; j < result.length; j++) {
                            if (result[j].status === 200) {
                                let parseDataList = m3u8BodyToStructList(result[j].body,task.original.rename)
                                for (let x = 0; x < parseDataList.length; x++) {
                                    list.push(parseDataList[x])
                                }
                            }
                        }
                        // Remove duplicates based on URL
                        list = list.filter((item, index, self) =>
                            index === self.findIndex((t) => t.url === item.url)
                        );
                        updateTaskInfo(task.id, list)
                    }
                    updateTaskOriginalUrls(task.id, result)
                    updateTaskStatus(task.id, status)
                } catch (error) {
                    console.error("Error preparing task:", error)
                }
            }
        }
    }

    const getM3uBody = (url, timeout) => {
        if (nowMod === 0) {
            return url
        }
        let _timeout = parseInt(timeout, 10)
        return '/fetch/m3u-body?url=' + url + "&timeout=" + (isNaN(_timeout) ? '-1' : _timeout)
    }

    const valid_m3u_file = (content) => {
        return content.substr(0, 7) === "#EXTM3U"
    }

    const get_m3u_body = async (data) => {
        let allRequest = [];
        let bodies = []
        for (let i = 0; i < data.length; i++) {
            let _url = data[i];
            if (!_url.startsWith('localstorage/')) {
                let timeout = 2000
                // 从网络读取数据
                _url = getM3uBody(_url, timeout);
                allRequest.push(axios.get(_url, { timeout: timeout }));
            }
        }
        for (let i = 0; i < data.length; i++) {
            let _url = data[i];
            if (_url.startsWith('localstorage/')) {
                // 从 localStorage 读取数据
                const storedData = localStorage.getItem(_url);
                if (storedData) {
                    let _body = {
                        status: 200,
                        url: _url,
                        body: storedData
                    }
                    bodies.push(_body)
                } else {
                    let _body = {
                        status: 404,
                        url: _url,
                        body: 'Data not found in localStorage'
                    }
                    bodies.push(_body)
                }
            }
        }

        // 处理网络请求
        if (allRequest.length > 0) {
            const results = await Promise.allSettled(allRequest);
            results.forEach((result, index) => {
                let isError = true;
                let body = "";
                if (result.status === 'fulfilled') {
                    const response = result.value.data;
                    if (valid_m3u_file(response)) {
                        isError = false;
                        body = response;
                    } else {
                        isError = true;
                        body = response;
                    }
                } else {
                    isError = true;
                    body = result.reason.message;
                }
                let _url = data[index]

                if (isError) {
                    bodies.push({
                        status: 500,
                        url: _url,
                        body: body
                    })
                } else {
                    bodies.push({
                        status: 200,
                        url: _url,
                        body: body
                    })
                }
            });
        }

        return bodies;
    }

    const value = {
        tasks,
        runningTasks,
        freshTaskList,
        updateTaskStatus
    };

    return (
        <TaskContext.Provider value={value}>
            {children}
        </TaskContext.Provider>
    );
};