#[cfg(feature = "desktop")]
fn main() {
    tauri_build::build()
}

#[cfg(not(feature = "desktop"))]
fn main() {
    // No build script needed for server-only build
}
