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
 * - 播放栏集成两个自定义按钮：清晰度选择（QualityMenuButton）、流畅模式开关（RelayToggleButton）
 */

function ensureComponents() {
  const MenuButton = videojs.getComponent('MenuButton')
  const MenuItem = videojs.getComponent('MenuItem')
  const Button = videojs.getComponent('Button')

  if (!videojs.getComponent('QualityMenuButton')) {
    class QualityMenuButton extends MenuButton {
      constructor(player, options) {
        super(player, options)
        this.addClass('vjs-visible-text')
        this.addClass('vjs-quality-menu')
        this.options_.uiData = (options && options.uiData) || {}
      }
      createItems() {
        const { variants = [], current = '', onChange, autoLabel = '自动' } = this.options_.uiData
        const items = []
        const auto = new MenuItem(this.player_, { label: autoLabel, selectable: true, selected: current === '' })
        auto.on('click', () => onChange && onChange(''))
        items.push(auto)
        ;(variants || []).forEach((v) => {
          const label = (v.label || '') + (v.resolution ? ' · ' + v.resolution : '')
          const item = new MenuItem(this.player_, { label, selectable: true, selected: current === v.url })
          item.on('click', () => onChange && onChange(v.url))
          items.push(item)
        })
        return items
      }
    }
    videojs.registerComponent('QualityMenuButton', QualityMenuButton)
  }

  if (!videojs.getComponent('RelayToggleButton')) {
    class RelayToggleButton extends Button {
      constructor(player, options) {
        super(player, options)
        this.addClass('vjs-visible-text')
        this.addClass('vjs-relay-toggle')
        const opts = options || {}
        this.controlText(opts.text || '')
        this.on('click', () => opts.onClick && opts.onClick())
        this.on('touchstart', (e) => {
          e.preventDefault()
          opts.onClick && opts.onClick()
        })
      }
    }
    videojs.registerComponent('RelayToggleButton', RelayToggleButton)
  }
}

/**
 * quality: { variants: [], current: '', autoLabel, onChange(url) }
 * relay:   { text: '', onClick() }
 */
export default function VideoPlayer({ src, onReady, onStall, onError, onPlaying, quality, relay }) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const qualityBtnRef = useRef(null)
  const relayBtnRef = useRef(null)
  const srcRef = useRef(src)
  srcRef.current = src
  const onStallRef = useRef(onStall)
  onStallRef.current = onStall
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const onPlayingRef = useRef(onPlaying)
  onPlayingRef.current = onPlaying
  const qualityRef = useRef(quality)
  qualityRef.current = quality
  const relayRef = useRef(relay)
  relayRef.current = relay

  useEffect(() => {
    try {
      ensureComponents()
    } catch (e) {
      console.log('videojs component registration error', e)
    }
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
          // 不启用 http-source-selector 插件的清晰度按钮，使用自定义 QualityMenuButton 避免重复
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

  // 播放栏自定义按钮：随清晰度/流畅模式状态变化更新（用序列化 key 做依赖，避免每帧重建）
  const qualityKey = JSON.stringify([(quality && quality.variants) || [], (quality && quality.current) || '', (quality && quality.autoLabel) || ''])
  const relayKey = JSON.stringify([(relay && relay.text) || '', (relay && relay.state) || ''])
  useEffect(() => {
    const player = playerRef.current
    if (!player) return
    try {
      updateControlBar()
    } catch (e) {
      console.log('videojs custom controls error', e)
    }
  }, [qualityKey, relayKey])

  function updateControlBar() {
    const player = playerRef.current
    if (!player) return
    const bar = player.controlBar
    const q = qualityRef.current || {}
    const r = relayRef.current || {}

    // 流畅模式按钮
    if (!relayBtnRef.current) {
      relayBtnRef.current = bar.addChild('RelayToggleButton', {
        text: r.text || '',
        onClick: () => r.onClick && r.onClick(),
      })
    }
    if (r.text !== undefined && relayBtnRef.current.controlText() !== r.text) {
      relayBtnRef.current.controlText(r.text)
    }

    // 清晰度按钮（多分辨率才显示）
    const hasQuality = !!(q.variants && q.variants.length > 1)
    if (hasQuality) {
      if (!qualityBtnRef.current) {
        qualityBtnRef.current = bar.addChild('QualityMenuButton', {
          uiData: {
            variants: q.variants || [],
            current: q.current || '',
            autoLabel: q.autoLabel || '自动',
            onChange: (url) => q.onChange && q.onChange(url),
          },
        })
      } else {
        // 更新 uiData 并重建菜单
        qualityBtnRef.current.options_.uiData = {
          variants: q.variants || [],
          current: q.current || '',
          autoLabel: q.autoLabel || '自动',
          onChange: (url) => q.onChange && q.onChange(url),
        }
        if (qualityBtnRef.current.menu) {
          qualityBtnRef.current.menu.dispose()
          qualityBtnRef.current.menu = null
        }
      }
      const currentLabel = q.current
        ? ((q.variants || []).find((v) => v.url === q.current) || {}).label || q.current
        : q.autoLabel || '自动'
      if (qualityBtnRef.current.controlText() !== currentLabel) {
        qualityBtnRef.current.controlText(currentLabel)
      }
    } else if (qualityBtnRef.current) {
      bar.removeChild(qualityBtnRef.current)
      qualityBtnRef.current.dispose()
      qualityBtnRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose()
        playerRef.current = null
      }
      qualityBtnRef.current = null
      relayBtnRef.current = null
    }
  }, [])

  return (
    <div className="video-area" data-vjs-player>
      <div ref={containerRef} className="video-inner" />
    </div>
  )
}
