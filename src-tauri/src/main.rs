#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod store_winrt;

/// Acuna la Store ID key que el backend necesita para verificar la compra.
/// Se ejecuta en un hilo aparte: `get()` bloquea, y bloquear el hilo principal
/// congela la ventana.
#[tauri::command]
async fn obtener_store_id_key(
    ventana: tauri::Window,
    ticket: String,
    publisher_user_id: String,
) -> Result<String, String> {
    let hwnd = ventana
        .hwnd()
        .map_err(|e| format!("No se pudo obtener la ventana: {e}"))?
        .0 as isize;
    tauri::async_runtime::spawn_blocking(move || {
        store_winrt::imp::obtener_clave(hwnd, &ticket, &publisher_user_id)
    })
    .await
    .map_err(|e| format!("Fallo interno al pedir la clave: {e}"))?
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![obtener_store_id_key])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
