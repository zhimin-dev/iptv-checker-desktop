//! iptv-checker-player —— Jellyfin 风格的 IPTV 播放客户端。
//!
//! 本 crate 只是 Tauri 壳：所有业务逻辑都在前端（src/）中，
//! 前端通过 HTTP 直连用户配置的 iptv-checker 服务端。

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // http 插件：支持桌面端代理（客户端请求经代理访问服务端）
        .plugin(tauri_plugin_http::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
