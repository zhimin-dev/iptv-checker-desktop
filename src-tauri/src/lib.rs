// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// ── Module declarations (shared by both targets) ──
mod common;
mod config;
mod r#const;
mod epg_xml;
mod epg_mapping;
mod live;
mod search;
mod utils;
pub mod server_startup;
pub mod web;

// ── Tauri-specific code (only compiled with --features desktop) ──

#[cfg(feature = "desktop")]
use std::net::TcpListener;
#[cfg(feature = "desktop")]
use std::process::Command;
#[cfg(feature = "desktop")]
use std::sync::Arc;
#[cfg(feature = "desktop")]
use std::sync::Mutex;
#[cfg(feature = "desktop")]
use tauri::{Manager, State};

/// Global to bridge the embedded server port from setup() to the command handler.
/// Avoids Tauri State complexity — OnceLock is set once during setup, read by command.
#[cfg(feature = "desktop")]
static SERVER_PORT: std::sync::OnceLock<u16> = std::sync::OnceLock::new();

#[cfg(feature = "desktop")]
struct AppState {
    ffmpeg_path: Mutex<String>,
    ffprobe_path: Mutex<String>,
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn get_server_port() -> u16 {
    SERVER_PORT.get().copied().unwrap_or(0)
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn now_mod() -> i32 {
    1
}

#[cfg(feature = "desktop")]
fn find_ffmpeg_path() -> Result<(String, String), String> {
    let ffmpeg_output = Command::new("which")
        .arg("ffmpeg")
        .output()
        .map_err(|e| format!("Error finding ffmpeg: {}", e))?;

    let ffprobe_output = Command::new("which")
        .arg("ffprobe")
        .output()
        .map_err(|e| format!("Error finding ffprobe: {}", e))?;

    if !ffmpeg_output.status.success() || !ffprobe_output.status.success() {
        return Err("FFmpeg or FFprobe not found in PATH".to_string());
    }

    let ffmpeg_path = String::from_utf8_lossy(&ffmpeg_output.stdout)
        .trim()
        .to_string();
    let ffprobe_path = String::from_utf8_lossy(&ffprobe_output.stdout)
        .trim()
        .to_string();

    Ok((ffmpeg_path, ffprobe_path))
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn check_ffmpeg(state: State<AppState>) -> Result<bool, String> {
    let ffmpeg_path = state.ffmpeg_path.lock().unwrap();
    let output = Command::new(&*ffmpeg_path)
        .arg("-version")
        .output()
        .map_err(|e| format!("Error executing FFmpeg command: {}", e))?;

    Ok(output.status.success())
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn get_video_info(url: String, state: State<AppState>) -> Result<serde_json::Value, String> {
    let ffprobe_path = state.ffprobe_path.lock().unwrap();
    let output = Command::new(&*ffprobe_path)
        .args(&[
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            &url,
        ])
        .output()
        .map_err(|e| format!("Error executing FFprobe command: {}", e))?;

    if output.status.success() {
        let json_str = String::from_utf8(output.stdout)
            .map_err(|e| format!("Invalid UTF-8 sequence: {}", e))?;

        serde_json::from_str(&json_str).map_err(|e| format!("Error parsing JSON: {}", e))
    } else {
        let error = String::from_utf8_lossy(&output.stderr);
        Err(format!("FFprobe error: {}", error))
    }
}

#[cfg(feature = "desktop")]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    server_startup::init_all();
    server_startup::init_console_log();

    let (ffmpeg_path, ffprobe_path) = find_ffmpeg_path().unwrap_or_default();

    // Clone for the move closure
    let ffmpeg_clone = ffmpeg_path.clone();
    let ffprobe_clone = ffprobe_path.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(move |app| {
            let listener = TcpListener::bind("127.0.0.1:0")
                .expect("Failed to bind to random port");
            let port = listener.local_addr().unwrap().port();

            log::info!("Embedded server starting on 127.0.0.1:{}", port);

            use crate::common::task::TaskManager;
            let task_manager = Arc::new(TaskManager {});
            let scheduler: Arc<Mutex<clokwerk::Scheduler>> =
                Arc::new(Mutex::new(clokwerk::Scheduler::with_tz(chrono::Local)));

            use std::sync::atomic::{AtomicBool, Ordering};
            let shutdown_flag = Arc::new(AtomicBool::new(false));
            let sched_ref = Arc::clone(&scheduler);
            let shutdown_ref = Arc::clone(&shutdown_flag);
            std::thread::spawn(move || {
                while !shutdown_ref.load(Ordering::Relaxed) {
                    let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                        let mut s = sched_ref.lock().unwrap_or_else(|e| e.into_inner());
                        s.run_pending();
                    }));
                    std::thread::sleep(std::time::Duration::from_secs(30));
                }
            });

            {
                use crate::config::{get_all_tasks, get_task};
                use crate::search::init_search_data;
                let mut s = scheduler.lock().unwrap();
                s.every(clokwerk::TimeUnits::hours(1)).run(|| {
                    let rt = tokio::runtime::Builder::new_current_thread()
                        .enable_all().build().unwrap();
                    rt.block_on(async { let _ = init_search_data().await; });
                });
                s.every(clokwerk::TimeUnits::hours(1)).run(|| {
                    let rt = tokio::runtime::Builder::new_current_thread()
                        .enable_all().build().unwrap();
                    rt.block_on(async { let _ = crate::search::init_epg_data().await; });
                });
                s.every(clokwerk::TimeUnits::seconds(30)).run(move || {
                    if let Ok(tasks) = get_all_tasks() {
                        for (id, _) in tasks {
                            if let Ok(Some(mut task)) = get_task(&id) {
                                task.run();
                            }
                        }
                    }
                });
            }

            let server = actix_web::HttpServer::new(move || {
                actix_web::App::new()
                    .wrap(actix_cors::Cors::permissive())
                    .configure(web::configure_routes)
                    .app_data(actix_web::web::Data::new(scheduler.clone()))
                    .app_data(actix_web::web::Data::new(Arc::clone(&task_manager)))
                    .wrap(actix_web::middleware::Logger::default())
            })
            .workers(16)
            .listen(listener)
            .expect("Failed to listen on TcpListener")
            .run();

            // Store port globally for get_server_port command
            SERVER_PORT.set(port).ok();

            app.manage(AppState {
                ffmpeg_path: Mutex::new(ffmpeg_clone),
                ffprobe_path: Mutex::new(ffprobe_clone),
            });

            tauri::async_runtime::spawn(async move {
                let _ = server.await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            now_mod,
            get_server_port,
            check_ffmpeg,
            get_video_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
