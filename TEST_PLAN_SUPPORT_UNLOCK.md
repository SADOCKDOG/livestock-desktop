# Test Plan: Verificación de Soporte Unlock en 4.11.11

## Objetivo
Verificar que la compra del complemento `support_unlock` y el flujo de incidencias
funcionan en la app de escritorio publicada en Microsoft Store, con el
complemento configurado como gratuito para pruebas.

## Versión bajo prueba

| Dato | Valor |
|---|---|
| Versión de la app | **4.11.11** |
| Ficheros que la declaran | `frontend/js/app-version.js`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` |
| Paquete | `Livestock Manager PREMIUM_4.11.11.0.msixbundle` |
| Identidad | `SdogFarmSoftwareFactory.LIVESTOCKMANAGER` |
| Store ID del complemento | `9P4577W3B0D2` |

### Por qué 4.11.11 y no 4.11.9

El primer intento de subida del 4.11.9 lo rechazó Partner Center: el envío ya contenía
un paquete con el nombre completo
`SdogFarmSoftwareFactory.LIVESTOCKMANAGER 4.11.9.0 X64`, y el paquete nuevo, que sí
lleva los arreglos de licencias, salía con el mismo nombre y contenido distinto. El
nombre completo incluye la versión, así que hubo que incrementarla.

Lección para la próxima vez: **cada paquete nuevo necesita una versión que no se haya
usado antes**, aunque el cambio sea pequeño.

`npm run build:msix` limpia `src-tauri/target/msix` antes de construir, así que no
deberían quedar paquetes de versiones anteriores. Si aparece alguno, borrarlo:

```bash
rm -rf src-tauri/target/msix
```

## Requisitos previos

1. `support_unlock` publicado en la Store (envío gratuito de pruebas ya certificado).
2. Paquete 4.11.11 generado e instalado desde el vuelo piloto
   (`SdogFarmSoftwareFactory.LIVESTOCKMANAGER`), no desde producción.
3. Sesión iniciada en la Microsoft Store con la cuenta que va a "comprar".
4. Sin licencia de soporte activa en esa cuenta.

Generar el paquete:

```bash
npm run build:msix
```

El script encadena `sync` + `prebuild:premium` (que fija `FREE_MODE=false`, el modo
correcto para la Store) y deja el `.msixbundle` en `src-tauri/target/msix/`.

## Paso a paso

### 1. Preparación
- [ ] Instalar el paquete 4.11.11 desde el vuelo piloto.
- [ ] Verificar que el pie de la app muestra **V4.11.11**.
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
      (o "Compra única, sin caducidad" si el Worker no devuelve expiración).

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

## Criterios de aceptación

- La compra abre el diálogo real de la Store y concede licencia al confirmarla.
- "Soporte no activado" desaparece y ambas vistas quedan accesibles.
- El correo de contacto se guarda desde Ajustes.
- La licencia sobrevive a cerrar y reabrir la app.
- Se puede crear una incidencia y verla en el historial.
- La consola no muestra `ReferenceError` ni 404 de `register-installation`.

## Señales de que la prueba no es válida

- El pie no dice V4.11.11 → el paquete instalado no es el que toca.
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
