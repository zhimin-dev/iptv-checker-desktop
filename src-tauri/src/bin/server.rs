//! Headless server binary — used for Docker/deployment without GUI.
//! Build: cargo build --bin server --no-default-features

use log::info;

const DEFAULT_HTTP_PORT: u16 = 8089;

#[actix_web::main]
async fn main() {
    // Read port from environment, fall back to 8089
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(DEFAULT_HTTP_PORT);

    // Shared initialization
    iptv_checker_lib::server_startup::init_all();
    iptv_checker_lib::server_startup::init_file_log();

    info!("Starting server on 0.0.0.0:{}", port);
    iptv_checker_lib::web::start_web(port).await;
}
