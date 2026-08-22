import React, { useEffect, useRef } from 'react'
import videojs from 'video.js'
import '@videojs/http-streaming'
import 'videojs-contrib-quality-levels'
import 'videojs-http-source-selector'

const HLS_TYPE = 'application/x-mpegURL'

/**
 * video.js 播放器封装：
 * - src 变化时自动切换源（直连 ↔ 服务器中继）
 * - 通过 onStall 向上层报告卡顿事件（用于提示切换流畅模式）
 */
export default function VideoPlayer({ src, onReady, onStall, onError, onPlaying }) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const srcRef = useRef(src)
  srcRef.current = src
  const onStallRef = useRef(onStall)
  onStallRef.current = onStall
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const onPlayingRef = useRef(onPlaying)
  onPlayingRef.current = onPlaying

  useEffect(() => {
    if (!playerRef.current) {
      const videoEl = document.createElement('video-js')
      videoEl.classList.add('vjs-big-play-centered')
      containerRef.current.appendChild(videoEl)

      const player = (playerRef.current = videojs(
        videoEl,
        {
          autoplay: true,
          controls: true,
          playsinline: true,
          muted: true,
          responsive: true,
          fluid: true,
          liveui: true,
          html5: {
            vhs: {
              overrideNative: true,
              useBandwidthFromLocalStorage: true,
            },
          },
          sources: [{ src: srcRef.current, type: HLS_TYPE }],
        },
        function () {
          try {
            if (typeof this.httpSourceSelector === 'function') {
              this.httpSourceSelector()
            }
          } catch (e) {
            console.log('httpSourceSelector not available', e)
          }
          if (onReady) onReady(this)
        }
      ))

      player.on('waiting', () => {
        if (onStallRef.current) onStallRef.current()
      })
      player.on('playing', () => {
        if (onPlayingRef.current) onPlayingRef.current()
      })
      player.on('error', () => {
        console.log('videojs error', player.error())
        if (onErrorRef.current) onErrorRef.current(player.error())
      })
      return
    }

    const player = playerRef.current
    player.src({ src: srcRef.current, type: HLS_TYPE })
    player.play().catch(() => {})
  }, [src])

  useEffect(() => {
    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose()
        playerRef.current = null
      }
    }
  }, [])

  return (
    <div className="video-area" data-vjs-player>
      <div ref={containerRef} className="video-inner" />
    </div>
  )
}
