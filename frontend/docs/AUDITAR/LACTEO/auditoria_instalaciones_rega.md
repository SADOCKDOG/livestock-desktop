# Informe de Auditoría: Instalaciones y Normativa REGA (Sector Lácteo)

*Basado en el análisis de los manuales MT_REGA_2023, vacuno_leche y normativa asociada.*

## 1. Requisitos legales y estructurales faltantes
* **Dimensionamiento y Bienestar Animal:**
  * **Espacio mínimo de descanso:** Se exigen 5-6 m² de área de descanso por animal en estabulación libre.
  * **Comederos:** Es obligatorio un frente de comedero de 60-70 cm lineales por vaca.
  * **Diseño de estabulación:** Falta registrar el tipo de estabulación (ej. libre con cubículos) y el número de cubículos respecto al censo.
* **Trazabilidad y Equipamiento (Letra Q):**
  * La normativa requiere registrar los "contenedores" (tanques de frío y cántaras) vinculados a la explotación en la base de datos oficial (Letra Q, no INFOLAC).
  * Faltan las áreas funcionales de la granja lechera: corrales de espera, sala de ordeño (limpieza de filtros y cambio de pezoneras cada 6 meses) y lechería separada.
* **Evaluación Ambiental y REGA:**
  * Según el manual MT_REGA_2023, las instalaciones que superen las **300 plazas de vacuno de leche** tienen requerimientos especiales (evaluación ambiental y requisitos sobre instalaciones de recogida de estiércol/balsas). Faltan registros sobre la capacidad y características de las balsas de purines.
  * Para registrar tanques de frío, la clasificación zootécnica en REGA debe ser estrictamente "Producción de leche" (o mixta/pastos).

## 2. Discrepancias en el código actual
* El código actual gestiona el registro REGA básico y albaranes de leche, pero asume la trazabilidad bajo un trámite ficticio "INFOLAC" en lugar de "Letra Q".
* **Ausencia de control físico:** El sistema ignora por completo la capacidad física de las instalaciones (plazas totales, m² por animal, cm de comedero), con lo que no emite alertas de hacinamiento o déficit de bienestar animal.
* **Balsas y medio ambiente:** No se realiza ninguna evaluación ambiental en el sistema. No hay advertencias si el censo supera las 300 vacas y no se dispone de datos de balsa de purines.

## 3. Recomendaciones de Arquitectura y Modelado de Datos
* **Nueva entidad `Instalaciones` (o expansión de Zonas):**
  * Subtipos: "Sala de ordeño", "Zona de descanso" (`num_cubiculos`, `m2_totales`), "Comederos" (`metros_lineales`), y "Tanque de Frío" (capacidad, código Letra Q).
* **Campos adicionales en Finca/Explotación:**
  * `plazas_autorizadas_rega`, `sistema_estabulacion`, `capacidad_balsa_purines`.
* **Motor de Alertas (KPIs/Validación) propuesto:**
  * *Alerta de Bienestar Animal:* Validar (Vacas Lecheras Totales * 60 cm) vs (Metros Lineales de Comedero) y (Vacas Totales) vs (Num Cubículos o m² / 5).
  * *Alerta Ambiental:* Si `plazas_autorizadas_rega > 300` y faltan datos de balsa/evaluación.
  * *Alerta de Trazabilidad:* Bloquear venta de leche si `clasificacion_zootecnica` no es "Producción de leche".
