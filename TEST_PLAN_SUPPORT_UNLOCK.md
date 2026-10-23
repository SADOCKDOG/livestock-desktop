# Test Plan: Verificación de Soporte Unlock en 4.11.22

## Objetivo
Verificar que la compra del complemento `support_unlock` y el flujo de incidencias
funcionan en la app de escritorio publicada en Microsoft Store, con el
complemento configurado como gratuito para pruebas.

## Versión bajo prueba

| Dato | Valor |
|---|---|
| Versión de la app | **4.11.22** |
| Ficheros que la declaran | `frontend/js/app-version.js`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` |
| Paquete | `Livestock Manager PREMIUM_4.11.22.0.msixbundle` |
| Identidad | `SdogFarmSoftwareFactory.LIVESTOCKMANAGER` |
| Store ID del complemento | `9P4577W3B0D2` |

### Por qué cada paquete lleva una versión nueva

Partner Center rechaza un paquete cuyo nombre completo
(`SdogFarmSoftwareFactory.LIVESTOCKMANAGER <versión> X64`) ya exista en el envío con
otro contenido. El paquete **4.11.19.0 ya aparece cargado en Partner Center** (leído
en «Current packages» el 16 oct 2026) y esta compilación incluye cambios
posteriores; por eso la versión de prueba se incrementó a **4.11.22** (`versionCode`
545). No se debe enviar otro paquete con la identidad y versión 4.11.19.0.

No usar `npm run build:msix` para este paquete: ejecuta `sync` y elimina
`src-tauri/target/msix`; además, la configuración Tauri vuelve a ejecutar `sync`
durante el build. Esa sincronización puede reemplazar cambios propios de Desktop.

Para construir desde el checkout integrado:
1. Respaldar los artefactos existentes de `src-tauri/target/msix`.
2. Ejecutar `npm run prebuild:premium`.
3. Quitar temporalmente `build.beforeBuildCommand` de `src-tauri/tauri.conf.json`
   para omitir `npm run sync` durante el build.
4. Ejecutar `npm run tauri:windows:build -- --verbose`.
5. Restaurar `build.beforeBuildCommand` y comprobar que `tauri.conf.json` quedó limpio.

## Requisitos previos

1. `support_unlock` publicado en la Store (envío gratuito de pruebas ya certificado).
2. Paquete 4.11.22 generado e instalado desde el vuelo piloto
   (`SdogFarmSoftwareFactory.LIVESTOCKMANAGER`), no desde producción.
3. Sesión iniciada en la Microsoft Store con la cuenta que va a "comprar".
4. Sin licencia de soporte activa en esa cuenta.

### Generar el paquete 4.11.22

Seguir el procedimiento sin `sync` descrito arriba. `prebuild:premium` fija
`FREE_MODE=false`, que es el modo correcto para la Store. El artefacto que se debe
probar es `src-tauri/target/msix/Livestock Manager PREMIUM_4.11.22.0.msixbundle`;
antes de subirlo, comprobar en su manifiesto la versión `4.11.22.0` y el idioma `es-es`.

## Paso a paso

### 1. Preparación
- [ ] Instalar el paquete 4.11.22 desde el vuelo piloto.
- [ ] Verificar que el pie de la app muestra **V4.11.22**.
- [ ] Confirmar que no hay licencia de soporte activa.

### 2. Activación del soporte
- [ ] Ir a **Ayuda y Soporte → Soporte técnico**.
- [ ] Comprobar que aparece la pantalla de licencia con el aviso de que el soporte
      con IA es un servicio aparte de la aplicación.
- [ ] Pulsar **Activar soporte**.
- [ ] Comprobar que **se abre el diálogo de compra de Microsoft Store**
      (no un aviso de que el sistema de pago no está disponible).
- [ ] Completar la compra (0,00 € en pruebas).
- [ ] Comprobar que aparece **"Soporte activado. Ya puedes abrir incidencias."**

### 3. Verificación de la activación
- [ ] El aviso de "soporte no activado" desaparece.
- [ ] Se puede entrar en **Soporte técnico** y en **Mis incidencias**.
- [ ] En **Ajustes**, la tarjeta de licencia muestra estado activo con fecha
      de renovación (la suscripción es mensual).
- [ ] En el panel flotante de soporte, la pestaña **Licencia** muestra Estado,
      Vigencia, Tipo y Correo, y **Comprobar ahora** responde sin error.

### 3 bis. Ventana flotante de tickets
- [ ] Pulsar **Maximizar**: el panel ocupa toda la ventana, sin franja a la derecha,
      y el botón pasa a **Restaurar**.
- [ ] Cerrar la app por completo y reabrirla: el panel vuelve maximizado.
- [ ] Pulsar **Restaurar**: vuelve acoplado a la derecha (unos 400 px).
- [ ] Minimizar y volver a abrir: conserva el tamaño anterior.

### 4. Alta del correo de contacto
- [ ] En **Ajustes**, pulsar el botón de editar el **correo para soporte**.
- [ ] Escribir un correo válido y aceptar.
- [ ] Comprobar que aparece **"Correo guardado."** y que la tarjeta lo refleja.

> Este punto solo funciona tras la fusión: en escritorio faltaba
> `registrarCorreoSoporte`, así que el guardado fallaba con "No se pudo guardar el correo."

### 5. Crear una incidencia
- [ ] En Soporte técnico, pulsar "Contar una incidencia".
- [ ] Describir un problema de prueba y continuar.
- [ ] Revisar el borrador que devuelve el Worker y pulsar "Enviar incidencia".
- [ ] Comprobar el mensaje de incidencia enviada.

### 6. Historial
- [ ] Entrar en **Mis incidencias**.
- [ ] La incidencia de prueba aparece con su estado.
- [ ] Abrir el detalle y, opcionalmente, añadir un mensaje.

### 7. Persistencia entre arranques
- [ ] Cerrar la app por completo y volver a abrirla.
- [ ] Entrar en Soporte técnico: no debe pedir activación otra vez.
- [ ] Pulsar **"Ya la tengo"** y comprobar que se procesa sin error.

### 8. Revalidación de la clave
La clave que acuña WinRT caduca a los 30 días. No hace falta esperar: basta con
comprobar en consola que en cada arranque se revalida sin errores.

- [ ] Abrir la consola de desarrollo y confirmar que **no** aparece
      `ReferenceError: BASE is not defined`.
- [ ] Confirmar que **no** hay peticiones a `/auth/register-installation`
      (ese endpoint no existe en el Worker; antes devolvía un 404 en cada arranque).
- [ ] Confirmar que la revalidación pide primero `POST /auth/ms/ticket-compras`
      (responde 200), luego acuña la clave con WinRT y termina en
      `POST /auth/verify-purchase` (200).

## Criterios de aceptación

- La compra abre el diálogo real de la Store y concede licencia al confirmarla.
- "Soporte no activado" desaparece y ambas vistas quedan accesibles.
- El correo de contacto se guarda desde Ajustes.
- La licencia sobrevive a cerrar y reabrir la app.
- La pestaña Licencia refleja el estado real y el panel conserva su tamaño entre arranques.
- Se puede crear una incidencia y verla en el historial.
- La consola no muestra `ReferenceError` ni 404 de `register-installation`.

## Señales de que la prueba no es válida

- El pie no dice V4.11.22 → el paquete instalado no es el que toca.
- Al pulsar "Activar soporte" sale **"El sistema de pago no está disponible ahora mismo."**
  → se está ejecutando la rama de Android dentro de la app de escritorio.
- Al pulsar "Activar soporte" sale **"La compra de soporte solo está disponible en la
  app instalada desde la Microsoft Store."** → `window.SoporteStore` no está cargado.
- El paquete declara `en-us` en su manifiesto → es un artefacto construido antes del
  arreglo de idioma (`4c4b127`), no el del vuelo.

## Notas

- No usar los códigos de `TESTER_LICENSE (1).tsv` para validar `support_unlock`:
  pertenecen al producto principal y son credenciales sensibles.
- Si en algún punto se pide un pago real, detenerse: el complemento debería seguir
  en gratuito y el paquete tiene que venir del vuelo piloto.
- Anotar el paso exacto y el mensaje literal de cualquier fallo.

## Después de la verificación

1. Comunicar el resultado.
2. Devolver `support_unlock` a su precio (6,99 €) y dejar que certifique el cambio.
3. Preparar la siguiente actualización.
