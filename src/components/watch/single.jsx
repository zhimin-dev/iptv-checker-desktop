import * as React from 'react';
import { useContext, useState, useEffect, useRef } from "react"
import VideoJS from './video'
import { MainContext } from './../../context/main';
import _Tabbar from './../layout/tabbar'
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import { LogicalSize,LogicalPosition } from '@tauri-apps/api/window';

export default function Single(props) {
    const _mainContext = useContext(MainContext);
    const {nowPlatform} = props
    const [nowTry, setNowTry] = useState(false)
    const [videoJsOptions, setVideoJsOptions] = useState(null)
    const setVideoOptions = (url) => {
        let os_type = _mainContext.settings["playerSource"]
        console.log(os_type)
        let data = {
            autoplay: true,
            controls: true,
            responsive: true,
            fluid: true,
            muted: true,
            playsinline: true,
            html5: {
                vhs: {
                    // withCredentials: true,
                    overrideNative: true
                }
            },
            sources: [{
                src: url,
                type: os_type
            }]
        }
        setVideoJsOptions(data)
    }
    const playerRef = React.useRef(null);
    const [m3u8Link, setM3u8Link] = useState('')
    const [httpHeaders, setHttpHeaders] = useState([])

    useEffect(() => {
        let paramsObject = {};
        let list = new URLSearchParams(window.location.search).entries();
        for (let [key, value] of list) {
            paramsObject[key] = value;
        }
        if (paramsObject["url"] !== undefined) {
            setM3u8Link(paramsObject["url"])
            onloadM3u8Link(paramsObject["url"])
        }
        const appWindow = getCurrentWebviewWindow()
        const unlistenPromise = listen('changeWatchUrl', (event) => {
            if (event.event === 'changeWatchUrl') {
                setM3u8Link(event.payload.data.url)
                onloadM3u8Link(event.payload.data.url)
                appWindow.setTitle(event.payload.data.name)
            }
        })
        return () => {
            unlistenPromise.then(unlisten => unlisten())
        }
    }, [])

    const onloadM3u8Link = (targetUrl) => {
        setVideoOptions(targetUrl)
        if (playerRef.current !== null) {
            playerRef.current.play()
        }
    }

    const onloadM3u8LinkTry = (targetUrl) => {
        setNowTry( true)
        setVideoOptions(targetUrl, '')
        if (playerRef.current !== null) {
            playerRef.current.play()
        }
    }

    const handlePlayerReady = (player) => {
        console.log('load video')
        playerRef.current = player;

        // You can handle player events here, for example:
        player.on('waiting', () => {
            console.log('player is waiting');
            console.log(playerRef.current)
        });

        player.on('canplay', () => {
            console.log("videojs canplay")
        });

        player.on('dispose', () => {
            console.log('player will dispose');
        });

        player.on('fullscreenchange', (e) => {
            console.log('full s', e)
        })

        player.on('error', (e) => {
            console.log("videojs error", e)
        })

        player.ready(function () {
            console.log(player.controlBar)
            var fullScreenButton = player.controlBar.fullscreenToggle;
            const appWindow = getCurrentWebviewWindow()

            fullScreenButton.on('click', function () {
                console.log("user click full")
                appWindow.isFullscreen().then((isFull) => {
                    console.log("now fullscreen status", isFull, window.screen)
                    if(isFull) {
                        appWindow.setFullscreen(false)
                        console.log("---exit full screen")
                        const videoContainer = player.el().parentElement;
                        videoContainer.style.width = '';
                        videoContainer.style.height = '';
                        videoContainer.style.alignContent = ''
                        videoContainer.style.backgroundColor = ''
                        player.el().style.width = ''
                        player.el().style.height = ''
                    }else{
                        appWindow.setFullscreen(true)
                        const videoContainer = player.el().parentElement;
                        videoContainer.style.width = window.screen.width+"px";
                        videoContainer.style.height = window.screen.height+"px";
                        videoContainer.style.alignContent = 'center';
                        videoContainer.style.backgroundColor = '#000';
                        player.el().style.width = window.screen.width+"px";
                        player.el().style.height = window.screen.height+"px";
                    }
                })
            });
        });
    };

    return (
        <>
            {
                videoJsOptions === null ? "" : (
                    <div>
                        {/* <div>{JSON.stringify(videoJsOptions)}</div> */}
                        <VideoJS options={videoJsOptions} onReady={handlePlayerReady} headers={httpHeaders} />
                    </div>
                )
            }
        </>
    )
}