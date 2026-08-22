# iptv-checker-player

Jellyfin 风格的 IPTV 播放客户端：连接 [iptv-checker](https://github.com/zhimin-dev/iptv-checker) 服务端（iptv-checker-rs），浏览频道列表并在线观看直播。

支持平台：

| 平台 | 说明 |
|------|------|
| Windows | Tauri 2 + WebView2 |
| Linux | Tauri 2 + WebKitGTK |
| macOS | Tauri 2 + WKWebView |
| Android | Tauri 2 + Android System WebView |
| iOS | Tauri 2 + WKWebView |

## 功能

- **连接服务端**：像 Jellyfin 一样，首次启动输入 iptv-checker 服务端地址（如 http://192.168.1.100:8089），自动测试连通性并保存。
- **频道浏览**：从服务端拉取当前已有的频道列表（JSON API），按分组展示、支持搜索与台标。
- **在线观看**：内置 video.js 播放器（HLS），支持画质切换（videojs-http-source-selector）。
- **EPG 节目单**：播放页展示当前 / 下一个节目（依赖服务端 EPG 数据）。
- **流畅模式（服务器缓冲中继）**：直连播放卡顿时，一键让服务端“接管”源链接 —— 服务端用 ffmpeg 把 m3u8 拉取到本地切片缓存，客户端改播服务端本地 HLS，保证播放不卡顿（画面会有几十秒延迟，可接受）。
  - 自动卡顿检测：直连模式下连续卡顿 3 次会弹出提示，可一键切换。
  - 中继分片时长、保留分片数（约等于延迟上限）可在设置中调整。
- **中英双语**、深色主题、移动端响应式布局。
- **直连播放走服务端透明代理**：源流经服务端 /api/player/proxy 转发（服务端拉源并重写 playlist），客户端全程同源，无需 CORS 配置，桌面与移动端一致。

## 架构

    +-----------------------------+          HTTP (REST + HLS)
    |  iptv-checker-desktop       |  ------------------------------>  iptv-checker-rs 服务端
    |  (Tauri 2 + React + video.js)|                                   |
    +-----------------------------+          ffmpeg 拉流切片缓存到本地 <--- 流畅模式
            |                                                         |
            +---------------- 直连源站（m3u8/HLS）<--------------------+

- 客户端不内置服务器，只负责连接、浏览与播放。
- 直连模式：客户端直接播放频道源 URL。
- 流畅模式：客户端调用服务端 /api/player/relay/start，服务端把源流下载到本地磁盘并切成 HLS 分片，客户端播放服务端本地 playlist。

## 运行（开发）

前置要求：

- Node.js >= 18、npm
- Rust toolchain（stable）
- Tauri 2 系统依赖（Windows: WebView2；Linux: webkit2gtk-4.1 等；macOS: Xcode CLT）

    npm install
    npm run tauri dev      # 桌面端开发

## 构建安装包

    npm run tauri build    # 生成 .exe / .msi（Windows）、.deb / .AppImage（Linux）、.dmg / .app（macOS）

## 移动端（iOS / Android）

    # Android（需要 Android Studio + SDK + NDK，配置 ANDROID_HOME / NDK_HOME）
    npm run tauri android init
    npm run tauri android dev
    npm run tauri android build   # 生成 APK / AAB

    # iOS（需要 macOS + Xcode）
    npm run tauri ios init
    npm run tauri ios dev
    npm run tauri ios build

移动端注意事项（连接内网 http 服务端）：

- **Android**：tauri android init 后，在 gen/android/app/src/main/AndroidManifest.xml 的 application 节点加上 android:usesCleartextTraffic="true"，允许访问 http:// 服务端。
- **iOS**：tauri ios init 后，在 gen/apple/*/Info.plist 添加：

      <key>NSAppTransportSecurity</key>
      <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
        <key>NSAllowsLocalNetworking</key>
        <true/>
      </dict>

## 服务端要求

- iptv-checker-rs（本仓库同级目录）需要更新到包含 /api/player/* 接口的版本。
- 服务端需已执行过搜索任务（今日频道数据存在）。
- **流畅模式**需要服务端机器安装 ffmpeg，且服务端能访问频道源。

接口文档见 ../iptv-checker-rs/docs/player-api.md。

## 目录结构

    src/
      App.jsx                  # 页面状态机（connect/home/player/settings）
      theme.js                 # MUI 主题（与 web 版一致，跟随系统深色模式）
      i18n.jsx                 # 中英双语
      services/api.js          # 服务端 REST 封装
      screens/
        ConnectScreen.jsx      # 输入服务端地址
        HomeScreen.jsx         # 频道列表（分组/搜索）
        PlayerScreen.jsx       # 播放 + 卡顿检测 + 流畅模式
        SettingsScreen.jsx     # 服务端/语言/中继参数
      components/
        VideoPlayer.jsx        # video.js 封装
    src-tauri/                 # Tauri 2 壳

UI 使用 Material UI（与 iptv-checker-web 相同的 MUI 主题与组件风格）。
