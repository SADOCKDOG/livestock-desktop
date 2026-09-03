//! Puente hacia WinRT para la Microsoft Store.
//!
//! Unica superficie nativa del proyecto. El pago lo hace la Digital Goods API
//! dentro del WebView2 y la verificacion la hace el Worker; aqui solo se acuna
//! la Store ID key, que es lo unico que el WebView2 no puede conseguir solo.
//!
//! Requiere identidad de paquete: sin MSIX, StoreContext no funciona.

#[cfg(windows)]
pub mod imp {
    use windows::core::{Interface, HSTRING};
    use windows::Services::Store::StoreContext;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::Shell::IInitializeWithWindow;

    /// Acuna una Store ID key valida 30 dias para el usuario que ha iniciado
    /// sesion en la Store en esta maquina.
    pub fn obtener_clave(
        hwnd: isize,
        ticket: &str,
        publisher_user_id: &str,
    ) -> Result<String, String> {
        let contexto = StoreContext::GetDefault()
            .map_err(|e| format!("No se pudo abrir la Microsoft Store: {e}"))?;

        // Sin esto WinRT lanza en aplicaciones de escritorio: necesita saber
        // sobre que ventana mostrar sus dialogos.
        let init: IInitializeWithWindow = contexto
            .cast()
            .map_err(|e| format!("La Store no acepta la ventana: {e}"))?;
        unsafe {
            init.Initialize(HWND(hwnd as *mut _))
                .map_err(|e| format!("No se pudo asociar la ventana a la Store: {e}"))?;
        }

        let operacion = contexto
            .GetCustomerCollectionsIdAsync(
                &HSTRING::from(ticket),
                &HSTRING::from(publisher_user_id),
            )
            .map_err(|e| format!("No se pudo pedir la clave a la Store: {e}"))?;
        let clave = operacion
            .get()
            .map_err(|e| format!("La Store no devolvio la clave: {e}"))?
            .to_string();

        if clave.is_empty() {
            // Pasa cuando no hay sesion iniciada en la Store o la app no tiene
            // identidad de paquete. Sin clave no hay verificacion posible.
            return Err(
                "La Microsoft Store no devolvio ninguna clave. Inicia sesion en la Store \
                 con la cuenta que compro el soporte."
                    .to_string(),
            );
        }
        Ok(clave)
    }
}

#[cfg(not(windows))]
pub mod imp {
    pub fn obtener_clave(
        _hwnd: isize,
        _ticket: &str,
        _publisher_user_id: &str,
    ) -> Result<String, String> {
        Err("La compra en Microsoft Store solo esta disponible en Windows.".to_string())
    }
}
