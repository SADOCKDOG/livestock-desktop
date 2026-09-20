//! Puente hacia WinRT para la Microsoft Store.
//!
//! Unica superficie nativa del proyecto. Hace las dos cosas que el WebView2 no
//! puede hacer solo: abrir el dialogo de compra (`comprar_complemento`) y acunar
//! la Store ID key con la que el Worker verifica la licencia (`obtener_clave`).
//!
//! La Digital Goods API no sirve aqui, aunque la spec original la diera por
//! valida: Chromium solo la habilita en aplicaciones instaladas DESDE la Store,
//! y un WebView2 embebido en un host Win32 no lo es — rechaza con «unsupported
//! context». En la PWA empaquetada como MSIX pasaba justo lo contrario.
//!
//! Requiere identidad de paquete: sin MSIX, StoreContext no funciona.

#[cfg(windows)]
pub mod imp {
    use windows::core::{Interface, HSTRING};
    use windows::Foundation::Collections::IIterable;
    use windows::Services::Store::{StoreContext, StorePurchaseStatus};
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::Shell::IInitializeWithWindow;

    /// Comprueba que la Store conoce el complemento antes de abrir el dialogo.
    ///
    /// Un complemento sin publicar hace que `RequestPurchaseAsync` devuelva
    /// `NotPurchased`, que es exactamente el mismo valor que cuando el usuario
    /// cierra el dialogo. Sin esta consulta previa las dos situaciones son
    /// indistinguibles y la compra falla en silencio.
    ///
    /// Solo corta cuando la consulta responde y el producto no aparece. Si la
    /// consulta misma falla se sigue adelante: esto es un diagnostico, y no
    /// debe convertirse en un motivo nuevo por el que no se pueda comprar.
    fn comprobar_disponible(contexto: &StoreContext, store_id: &str) -> Result<(), String> {
        // Los tres tipos de complemento que admite la Store. Las suscripciones
        // van como "Durable"; los otros dos estan por si el add-on cambia de
        // tipo, para que el control no empiece a mentir por eso.
        let tipos: IIterable<HSTRING> = match vec![
            HSTRING::from("Durable"),
            HSTRING::from("Consumable"),
            HSTRING::from("UnmanagedConsumable"),
        ]
        .try_into()
        {
            Ok(v) => v,
            Err(_) => return Ok(()),
        };
        let ids: IIterable<HSTRING> = match vec![HSTRING::from(store_id)].try_into() {
            Ok(v) => v,
            Err(_) => return Ok(()),
        };

        let consulta = match contexto
            .GetStoreProductsAsync(&tipos, &ids)
            .and_then(|operacion| operacion.get())
        {
            Ok(c) => c,
            Err(_) => return Ok(()),
        };

        match consulta
            .Products()
            .and_then(|p| p.HasKey(&HSTRING::from(store_id)))
        {
            Ok(true) => Ok(()),
            Ok(false) => Err(format!(
                "La Microsoft Store no encuentra el complemento {store_id}. Lo normal \
                 es que todavia no este publicado, o que no este disponible para esta \
                 cuenta o en esta region."
            )),
            Err(_) => Ok(()),
        }
    }

    /// Abre el dialogo de compra de la Store para un complemento.
    ///
    /// `store_id` es el Store ID del add-on en Partner Center (p. ej.
    /// 9P4577W3B0D2), no el Product ID: `RequestPurchaseAsync` solo entiende
    /// el primero.
    pub fn comprar_complemento(hwnd: isize, store_id: &str) -> Result<String, String> {
        let contexto = StoreContext::GetDefault()
            .map_err(|e| format!("No se pudo abrir la Microsoft Store: {e}"))?;

        // Igual que al acunar la clave: sin ventana asociada WinRT lanza en
        // aplicaciones de escritorio, y aqui ademas hay dialogo que mostrar.
        let init: IInitializeWithWindow = contexto
            .cast()
            .map_err(|e| format!("La Store no acepta la ventana: {e}"))?;
        unsafe {
            init.Initialize(HWND(hwnd as *mut _))
                .map_err(|e| format!("No se pudo asociar la ventana a la Store: {e}"))?;
        }

        comprobar_disponible(&contexto, store_id)?;

        let resultado = contexto
            .RequestPurchaseAsync(&HSTRING::from(store_id))
            .map_err(|e| format!("No se pudo abrir la compra: {e}"))?
            .get()
            .map_err(|e| format!("La compra no se completo: {e}"))?;

        let estado = resultado
            .Status()
            .map_err(|e| format!("La Store no devolvio el estado de la compra: {e}"))?;

        // AlreadyPurchased cuenta como exito: el usuario tiene derecho aunque no
        // acabe de pagar. Quien decide si hay licencia es el servidor, no esto.
        match estado {
            StorePurchaseStatus::Succeeded => Ok("comprado".to_string()),
            StorePurchaseStatus::AlreadyPurchased => Ok("ya_comprado".to_string()),
            // Cancelar no es un fallo: se distingue por el valor, no por un
            // Err, para que el frontend no lo pinte como error.
            StorePurchaseStatus::NotPurchased => Ok("cancelado".to_string()),
            StorePurchaseStatus::NetworkError => {
                Err("No hay conexion con la Microsoft Store.".to_string())
            }
            StorePurchaseStatus::ServerError => {
                Err("La Microsoft Store devolvio un error. Vuelve a intentarlo.".to_string())
            }
            otro => Err(format!("La Store devolvio un estado inesperado: {otro:?}")),
        }
    }

    /// Acuna una Store ID key valida 30 dias para el usuario que ha iniciado
    /// sesion en la Store en esta maquina.
    ///
    /// La clave la firma Microsoft para un servicio concreto y no vale para el
    /// otro: el de compras valida el emisor y rechaza las de colecciones
    /// (IDX10205). Por eso el servicio se elige aqui, con el ticket que toca.
    pub fn obtener_clave(
        hwnd: isize,
        ticket: &str,
        publisher_user_id: &str,
        para_compras: bool,
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

        let operacion = if para_compras {
            contexto.GetCustomerPurchaseIdAsync(
                &HSTRING::from(ticket),
                &HSTRING::from(publisher_user_id),
            )
        } else {
            contexto.GetCustomerCollectionsIdAsync(
                &HSTRING::from(ticket),
                &HSTRING::from(publisher_user_id),
            )
        }
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
        _para_compras: bool,
    ) -> Result<String, String> {
        Err("La compra en Microsoft Store solo esta disponible en Windows.".to_string())
    }

    pub fn comprar_complemento(_hwnd: isize, _store_id: &str) -> Result<String, String> {
        Err("La compra en Microsoft Store solo esta disponible en Windows.".to_string())
    }
}
