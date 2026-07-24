use crate::common::translate;
use crate::config::init_all_config_files;
use crate::r#const::constant::{
    INPUT_EPG_FOLDER, INPUT_FOLDER, INPUT_LIVE_FOLDER, INPUT_SEARCH_FOLDER, LOGOS_FOLDER,
    LOGS_FOLDER, OUTPUT_FOLDER, OUTPUT_THUMBNAIL_FOLDER, STATIC_FOLDER, UPLOAD_FOLDER,
};
use crate::search::init_epg_data;
use crate::utils::create_folder;
use chrono::Local;
use log::LevelFilter;
use simplelog::{CombinedLogger, Config, WriteLogger};
use std::fs::File;

/// Initialize all data directories
pub fn init_folder() {
    let logos_folder = format!(".{}", LOGOS_FOLDER);
    let folders = vec![
        STATIC_FOLDER,
        INPUT_FOLDER,
        INPUT_LIVE_FOLDER,
        INPUT_SEARCH_FOLDER,
        OUTPUT_FOLDER,
        OUTPUT_THUMBNAIL_FOLDER,
        LOGS_FOLDER,
        logos_folder.as_str(),
        UPLOAD_FOLDER,
        INPUT_EPG_FOLDER,
    ];
    for f in folders {
        create_folder(&f.to_string()).unwrap()
    }
}

/// Initialize logger to stdout (used in desktop/Tauri mode)
pub fn init_console_log() {
    CombinedLogger::init(vec![WriteLogger::new(
        LevelFilter::Debug,
        Config::default(),
        std::io::stdout(),
    )])
    .unwrap();
}

/// Initialize logger to file + stdout (used in server mode)
pub fn init_file_log() {
    create_folder(&LOGS_FOLDER.to_string()).unwrap();
    let log_file = File::create(format!(
        "{}app-{}.log",
        LOGS_FOLDER,
        Local::now().format("%Y%m%d%H:%M").to_string()
    ))
    .unwrap();
    let mut log_config = Config::default();
    log_config.time = Some(simplelog::Level::Debug);
    log_config.time_format = Some("%Y-%m-%d %H:%M:%S%.3f");

    let _ = CombinedLogger::init(vec![
        WriteLogger::new(LevelFilter::Debug, log_config.clone(), log_file),
        WriteLogger::new(LevelFilter::Debug, log_config, std::io::stdout()),
    ]);
}

/// Initialize translation strings
pub fn init_translate() {
    translate::init_from_default_file().unwrap();
}

/// Full initialization shared by both desktop and server
pub fn init_all() {
    init_all_config_files();
    // Rebuild HTTP client to pick up saved proxy/header settings
    crate::common::util::rebuild_http_client();
    init_folder();
    init_translate();
    // Spawn EPG background sync in a dedicated thread with its own Tokio runtime.
    // Uses std::thread (not tokio::spawn) so it works without a pre-existing runtime
    // — needed for Tauri desktop mode where Tokio isn't running at init time.
    std::thread::spawn(|| {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            init_epg_data().await;
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(24 * 3600));
            loop {
                interval.tick().await;
                init_epg_data().await;
            }
        });
    });
}
