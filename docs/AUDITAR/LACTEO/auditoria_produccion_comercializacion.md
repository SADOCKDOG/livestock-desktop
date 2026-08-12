# Informe de Auditoría: Producción y Comercialización Láctea

**Fecha:** 24 de Julio de 2026
**Ubicación:** `docs/AUDITAR/LACTEO/auditoria_produccion_comercializacion.md`

## 1. Gaps Normativos y Procesos No Contemplados

Tras analizar el *Manual Técnico sobre Controles de la Cadena Alimentaria en el Sector Lácteo de Andalucía* y compararlo con el estado actual del código (especialmente en `wizard-albaran-leche.js`, `comunidades-service.js` y `db.js`), se han detectado los siguientes gaps:

### 1.1. Trazabilidad Oficial (Letra Q vs INFOLAC)
- **Gap Letra Q:** La aplicación utiliza actualmente el término "INFOLAC" estructurado como un trámite de declaración manual por parte del ganadero (con estados borrador/presentado). Esto no refleja el proceso oficial en vigor. El sistema nacional real de trazabilidad se llama **Letra Q** (del MAPA), y el registro de entregas/resultados de autocontrol lo reportan automáticamente los laboratorios interprofesionales y las industrias, no el ganadero mediante una "declaración" aislada.
- **Gap Tanque de Frío:** La base de Letra Q pivota sobre la inscripción de "Contenedores" (tanques de frío y cisternas). La aplicación no modela el tanque de frío como un stock intermedio que acumule la producción de los ordeños (`produccion_leche`) y del cual se extraigan las entregas comerciales (`comercializacion_leche`).

### 1.2. Calidades Higiénico-Sanitarias (Diferenciación por Especie)
- **Gap Umbrales Diferenciados:** Actualmente la lógica en `comunidades-service.js` asume un solo límite de células somáticas y gérmenes (etiquetado para ovino genérico). La normativa exige límites estrictos diferenciados: Vacuno es muy restrictivo (100.000 UFC/mL en gérmenes) frente al ovino/caprino (1.500.000 UFC/mL). Las somáticas sólo tienen límite legal estricto comercial en vacuno (400.000 cél/mL).
- **Gap Bloqueo de Albarán:** El `wizard-albaran-leche.js` (validación) únicamente bloquea el guardado en caso de positivos de antibióticos (inhibidores). Sin embargo, la normativa tipifica como infracción grave entregar leche a ciertos destinos si se superan los límites de gérmenes/somáticas, lo cual debería traducirse en un bloqueo de la acción en la app (actualmente es sólo un semáforo visual).

### 1.3. Aflatoxina M1 (Plan PIVCA de Andalucía)
- **Gap Control Aflatoxinas:** El manual detalla el control específico de Andalucía bajo el Plan PIVCA. No existe en el sistema ningún campo o reporte de Aflatoxina M1 en las analíticas de leche, ni trazabilidad al registro de proveedores de piensos (SILUM) que garantice el control de la toxina en la alimentación de los animales (Aflatoxina B1).

### 1.4. Incompatibilidad de Clasificación Zootécnica
- **Gap Clasificación:** Según la normativa, un tanque sólo puede registrarse en Letra Q si la clasificación zootécnica de la finca REGA es compatible (Ej: "Reproducción para producción de leche"). La app no valida esto al momento de comercializar la leche.

---

## 2. Propuestas de Adaptación (Modelo de Datos, UI y Lógica de Negocio)

### 2.1. Modelo de Datos (`db.js`)
- **Letra Q y Contenedores:** Reemplazar el esquema de `documentos_legales` tipo `infolac_declaracion` por atributos oficiales estáticos vinculados a la Finca (`codigo_letra_q`). Crear un nuevo store `tanques_leche` (ID, finca_id, codigo_letra_q, capacidad_litros, temp_actual).
- **Inventario Lácteo:** La comercialización no debe ser abstracta. La tabla encriptada `produccion_leche` debe "ingresar" litros al tanque, y `comercializacion_leche` debe "sacar" litros del tanque.
- **Esquema de Calidad:** Modificar `comercializacion_leche` añadiendo campos para `aflatoxina_m1`, y vincular las analíticas de autocontrol a laboratorios homologados reales (como CICAP en Andalucía).
- **Proveedores:** Añadir un boolean flag `tiene_registro_silum` en el ObjectStore de proveedores.

### 2.2. Interfaz de Usuario (UI)
- **Dashboard Producción Láctea:** Crear un panel estilo *Bento Grid* donde el centro sea el "Tanque de frío". Visualizar el nivel de llenado actual (litros), temperatura, y la trazabilidad conectada al código Letra Q, respetando la guía corporativa Neón (borde izquierdo iluminado).
- **Ajustes de Validación Visual:** El helper `calidad-leche.js` debe recibir el parámetro de especie (Vacuno vs Ovino/Caprino) para encender las alertas de calidad sanitaria en el color correspondiente (warning/danger) con los umbrales específicos de la normativa.
- **Recibo de Entrega (Albarán Letra Q):** Modificar la vista final del Wizard, erradicando el término INFOLAC e implementando los 6 campos del recibo Letra Q (productor, REGA, fecha/hora, litros, operador y cisterna, toma de muestra oficial).

### 2.3. Lógica de Negocio
- **Motor de Trazabilidad (`trazabilidad.js` y `wizard-albaran-leche.js`):** Implementar la validación cruzada para evitar que una explotación dada de alta como cárnica emita albaranes de Letra Q.
- **Alertas Severas:** Transformar los warnings de células somáticas y colonias de gérmenes en **errores bloqueantes** cuando el destino de la comercialización no justifique un uso industrial exento, y cuando el registro se aplique sobre vacuno de leche.
- **Lógica de Stock:** Validación en tiempo real del albarán: `Litros declarados en venta <= Stock actual en tanque (Suma Producción Diaria - Ventas Previas)`.

---

## 3. Pasos a seguir (Roadmap Solución Integral)

1. **Refactorización de la Capa de Datos (`db.js` y catálogos):**
   - Eliminar `tasa_INLAC_defecto` y lógicas "Infolac" si no aplican a la declaración del ganadero.
   - Insertar en IndexedDB los nuevos stores `tanques_leche`.
   - Incluir los parámetros diferenciados por especie en `comunidades-service.js`.

2. **Integración del Inventario Lácteo (Producción vs Comercialización):**
   - Desarrollar la lógica en `produccion.js` que consolide las entradas de los ordeños (`motivo_tarea: 'produccion_leche'`) en los registros del tanque, para crear un *balance lácteo diario*.

3. **Modificación de Formularios (Wizards):**
   - Actualizar `wizard-albaran-leche.js` aplicando la diferenciación por especie para el bloqueo sanitario, añadiendo control de Aflatoxina M1, y selección de tanque de origen.

4. **Diseño de Módulo Producción (Dashboards):**
   - Desplegar una UI con los KPI de *Control Lechero* (Rendimiento por lactación vinculado a los eventos de partos en el módulo de Reproducción) y la métrica de eficiencia del ordeño según los litros netos recogidos en el albarán Letra Q.
