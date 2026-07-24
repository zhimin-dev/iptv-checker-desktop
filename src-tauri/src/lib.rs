// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::process::Command;
use std::sync::Mutex;
use tauri::State;

struct AppState {
    ffmpeg_path: Mutex<String>,
    ffprobe_path: Mutex<String>,
}

#[tauri::command]
fn now_mod() -> i32 {
    1
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![now_mod])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
