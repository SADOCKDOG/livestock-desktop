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
    para_compras: bool,
) -> Result<String, String> {
    // `hwnd()` solo existe en Windows. Fuera de el no hay ventana que pasarle a
    // la Store, y la implementacion de `store_winrt` ya devuelve el error.
    #[cfg(windows)]
    let hwnd = ventana
        .hwnd()
        .map_err(|e| format!("No se pudo obtener la ventana: {e}"))?
        .0 as isize;
    #[cfg(not(windows))]
    let hwnd = {
        let _ = &ventana;
        0isize
    };
    tauri::async_runtime::spawn_blocking(move || {
        store_winrt::imp::obtener_clave(hwnd, &ticket, &publisher_user_id, para_compras)
    })
    .await
    .map_err(|e| format!("Fallo interno al pedir la clave: {e}"))?
}

/// Abre el dialogo de compra de la Store para el complemento indicado.
///
/// El WebView2 de Tauri no es una app instalada desde la Store, asi que la
/// Digital Goods API rechaza con «unsupported context»: la unica via de compra
/// disponible aqui es WinRT.
#[tauri::command]
async fn comprar_complemento(ventana: tauri::Window, store_id: String) -> Result<String, String> {
    #[cfg(windows)]
    let hwnd = ventana
        .hwnd()
        .map_err(|e| format!("No se pudo obtener la ventana: {e}"))?
        .0 as isize;
    #[cfg(not(windows))]
    let hwnd = {
        let _ = &ventana;
        0isize
    };
    tauri::async_runtime::spawn_blocking(move || {
        store_winrt::imp::comprar_complemento(hwnd, &store_id)
    })
    .await
    .map_err(|e| format!("Fallo interno al abrir la compra: {e}"))?
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![obtener_store_id_key, comprar_complemento])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
