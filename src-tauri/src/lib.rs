// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// ── Module declarations ──
mod common;
mod config;
mod r#const;
mod epg_xml;
mod epg_mapping;
mod live;
mod search;
mod utils;
mod server_startup;
pub mod web;

use std::net::TcpListener;
use std::process::Command;
use std::sync::Arc;
use std::sync::Mutex;
use tauri::State;

// ── App State ──

struct AppState {
    server_port: Mutex<u16>,
    ffmpeg_path: Mutex<String>,
    ffprobe_path: Mutex<String>,
}

// ── Tauri Commands ──

/// Returns the port the embedded actix-web server is listening on.
/// Frontend calls this on startup to configure apiTaskService baseUrl.
#[tauri::command]
fn get_server_port(state: State<AppState>) -> u16 {
    *state.server_port.lock().unwrap()
}

#[tauri::command]
fn now_mod() -> i32 {
    1 // Always client/Tauri mode
}

fn find_ffmpeg_path() -> Result<(String, String), String> {
    // Try to find ffmpeg and ffprobe in PATH
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

#[tauri::command]
fn check_ffmpeg(state: State<AppState>) -> Result<bool, String> {
    let ffmpeg_path = state.ffmpeg_path.lock().unwrap();
    let output = Command::new(&*ffmpeg_path)
        .arg("-version")
        .output()
        .map_err(|e| format!("Error executing FFmpeg command: {}", e))?;

    Ok(output.status.success())
}

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

// ── Tauri Entry Point ──

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Shared initialization (config files, folders, EPG, translate)
    server_startup::init_all();
    server_startup::init_console_log();

    // Find ffmpeg/ffprobe paths
    let (ffmpeg_path, ffprobe_path) = find_ffmpeg_path().unwrap_or_default();

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // ── Start embedded actix-web server on random port ──
            let listener = TcpListener::bind("127.0.0.1:0")
                .expect("Failed to bind to random port");
            let port = listener.local_addr().unwrap().port();

            log::info!("Embedded server starting on 127.0.0.1:{}", port);

            // Build the server (scheduler + task_manager)
            use crate::web::TaskManager;
            let task_manager = Arc::new(TaskManager {});
            let scheduler: Arc<Mutex<clokwerk::Scheduler>> =
                Arc::new(Mutex::new(clokwerk::Scheduler::with_tz(chrono::Local)));

            // Spawn scheduler thread
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

            // Schedule periodic tasks
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
                // Check tasks every 30 seconds
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
                web::configure_app(scheduler.clone(), Arc::clone(&task_manager))
            })
            .workers(16)
            .listen(listener)
            .expect("Failed to listen on TcpListener")
            .run();

            // Store port in app state for frontend discovery
            app.manage(AppState {
                server_port: Mutex::new(port),
                ffmpeg_path: Mutex::new(ffmpeg_path.clone()),
                ffprobe_path: Mutex::new(ffprobe_path.clone()),
            });

            // Spawn the server in the background; Tauri lifecycle handles shutdown
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
