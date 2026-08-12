# Guía de Pruebas Manuales - Módulo Lácteo v24

## Prerrequisitos

1. **Instalación limpia** de Livestock Manager en Android Studio
2. **Cargar Demo CHAMORRO** desde el asistente de configuración
3. **Activar herramientas QA** (opcional, para pruebas automatizadas):
   ```javascript
   localStorage.setItem('lm_qa_tools', '1');
   location.reload();
   ```

---

## 🧪 PRUEBA 1: Verificación de Datos Demo

### Paso 1.1: Editar Finca
1. Navegar a **Ajustes** → **Editar Finca**
2. Avanzar hasta **Paso 3 de 3** (Instalaciones Lácteas)
3. **Verificar campos rellenados:**
   - ✅ Código Letra Q: `TIT-21-00456`
   - ✅ Clasificación: `Reproducción para producción de leche`
   - ✅ Plazas vacuno leche: `50`
   - ✅ Superficie descanso: `300` m²
   - ✅ Metros lineales comedero: `3500` cm
   - ✅ Número de cubículos: `45`

### Paso 1.2: Verificar Tanques
1. Navegar a **ExPro** → Pestaña **Láctea** → Sub-pestaña **Tanques**
2. **Verificar 3 tanques:**
   - ✅ **TANQUE PRINCIPAL**: 6000L, 3.5°C, Letra Q: T-21-001234
   - ✅ **TANQUE AUXILIAR**: 3000L, 4.1°C, Letra Q: T-21-001235
   - ✅ **CÁNTARA OVINO**: 500L, tipo cántara, Letra Q: T-21-001236

### Paso 1.3: Verificar Stock
1. En la misma vista de **Tanques**
2. **Verificar stock calculado:**
   - ✅ TANQUE PRINCIPAL: ~660L (11% de 6000L)
   - ✅ TANQUE AUXILIAR: ~375L (12.5% de 3000L)
   - ✅ Barras de progreso visibles con colores (verde/amarillo/rojo)

---

## 🧪 PRUEBA 2: Dashboard Lácteo

### Paso 2.1: Navegar al Dashboard
1. **ExPro** → Pestaña **Láctea** → Sub-pestaña **Dashboard**

### Paso 2.2: Verificar KPIs
- ✅ **Producción Hoy**: valor en litros (≥ 0)
- ✅ **Total Litros**: valor acumulado
- ✅ **Extracto Seco Medio**: valor % o "N/D"
- ✅ **Analíticas**: número (esperado: 5)

### Paso 2.3: Verificar Botones de Acción
- ✅ Botón **"Registrar Ordeño"** (neon-info) → abre wizard
- ✅ Botón **"Nuevo Tanque"** (neon-success) → abre wizard

### Paso 2.4: Verificar Tarjetas de Tanques
- ✅ 3 tarjetas de tanques visibles
- ✅ Cada tarjeta muestra: nombre, Letra Q, stock, temperatura, limpieza
- ✅ Colores semánticos correctos (verde ≤4°C, amarillo 4-6°C, rojo >6°C)

### Paso 2.5: Verificar Última Analítica
- ✅ Tarjeta con datos de analítica más reciente
- ✅ Valores: grasa, proteína, extracto seco, gérmenes, somáticas, inhibidores
- ✅ Badge de estado (validado/alerta/rechazado)

---

## 🧪 PRUEBA 3: Sub-pestaña Tanques

### Paso 3.1: Navegar a Tanques
1. **ExPro** → **Láctea** → **Tanques**

### Paso 3.2: Verificar Lista Completa
- ✅ 3 tanques listados con diseño card-registro
- ✅ Borde izquierdo iluminado (3px solid var(--c-info))
- ✅ Badges de estado (activo/mantenimiento/baja)
- ✅ Badges de tipo (Tanque/Cántara/Cisterna)

### Paso 3.3: Verificar Información por Tanque
Para cada tanque:
- ✅ Nombre y código Letra Q
- ✅ Barra de progreso de stock (con color dinámico)
- ✅ Grid 4 columnas: Temp actual, Temp objetivo, Últ. limpieza, Próx. limpieza
- ✅ Botones: **Editar** y **Registrar Limpieza** (solo si activo)

### Paso 3.4: Probar Botón FAB
- ✅ Botón flotante **"+ Nuevo Tanque"** visible
- ✅ Click abre wizard-tanque.js

### Paso 3.5: Probar Edición
1. Click en **"Editar"** de TANQUE AUXILIAR
2. Cambiar temperatura actual a `3.8°C`
3. Guardar
4. ✅ Verificar temperatura actualizada en lista

### Paso 3.6: Probar Registro de Limpieza
1. Click en **"Registrar Limpieza"** de TANQUE PRINCIPAL
2. ✅ Verificar toast de confirmación
3. ✅ Verificar fecha de próxima limpieza actualizada (+6 meses)

---

## 🧪 PRUEBA 4: Sub-pestaña Control Lechero

### Paso 4.1: Navegar a Control
1. **ExPro** → **Láctea** → **Control**

### Paso 4.2: Verificar Analíticas
- ✅ 5 analíticas listadas
- ✅ Cada analítica muestra:
  - Tipo de muestreo (autocontrol/oficial/contradictorio)
  - Fecha
  - Badge de estado (validado/alerta/rechazado)
  - Grid 3x2: grasa, proteína, E. seco, gérmenes, somáticas, laboratorio

### Paso 4.3: Verificar Controles Oficiales (DHI)
- ✅ 2 controles lecheros listados
- ✅ Cada control muestra:
  - Organismo (CONAFE/ACRIFLOR)
  - Fecha
  - Media litros, grasa, proteína

### Paso 4.4: Verificar Estados
- ✅ Analítica #1 (hace 25d): **validado** (verde) - valores óptimos
- ✅ Analítica #3 (hace 5d): **alerta** (amarillo) - somáticas 410K > 400K
- ✅ Analítica #5 (hace 2d): **alerta** (amarillo) - contradictorio

---

## 🧪 PRUEBA 5: Sub-pestaña Balance

### Paso 5.1: Navegar a Balance
1. **ExPro** → **Láctea** → **Balance**

### Paso 5.2: Verificar Movimientos
- ✅ 9 movimientos listados (entradas y salidas)
- ✅ Cada movimiento muestra:
  - Icono ↓ (entrada) o ↑ (salida)
  - Color verde (entrada) o rojo (salida)
  - Tipo de referencia (produccion_leche/comercializacion_leche)
  - Cantidad en litros
  - Fecha y turno (AM/PM)

### Paso 5.3: Verificar Orden Cronológico
- ✅ Movimientos ordenados del más reciente al más antiguo
- ✅ Fechas coherentes con datos demo (hace 25d, 15d, 5d)

---

## 🧪 PRUEBA 6: Wizard de Ordeño

### Paso 6.1: Abrir Wizard
1. **ExPro** → **Láctea** → **Dashboard**
2. Click en **"Registrar Ordeño"**

### Paso 6.2: Paso 1 - Datos del Ordeño
- ✅ Fecha: hoy (pre-rellenada)
- ✅ Turno: AM o PM (según hora del día)
- ✅ Selector de tanque: TANQUE PRINCIPAL (pre-seleccionado)
- ✅ Temperatura: 4°C (default)
- ✅ Validación: no permite avanzar sin tanque seleccionado

### Paso 6.3: Paso 2 - Producción por Animal
- ✅ Lista de 3 vacas del rebaño lechero
- ✅ Campos de litros editables
- ✅ Total actualizado en tiempo real
- ✅ Validación: no permite avanzar sin al menos 1 animal con producción

**Acción:**
- Asignar: Vaca 1 = 18L, Vaca 2 = 22L, Vaca 3 = 15L
- Total: 55L

### Paso 6.4: Paso 3 - Confirmación
- ✅ Resumen: fecha, turno, tanque, animales ordeñados, total litros
- ✅ Balance del tanque: actual + ordeño = nuevo stock
- ✅ Click en **"Confirmar"**

### Paso 6.5: Verificar Resultado
- ✅ Toast: "Ordeño registrado: 55 L (AM)"
- ✅ Navegar a **Tanques** → verificar stock actualizado (+55L)

---

##  PRUEBA 7: Wizard de Comercialización (Albarán Leche)

### Paso 7.1: Abrir Wizard
1. **CoMer** → Pestaña **Leche**
2. Click en **"Nueva Entrega"**

### Paso 7.2: Paso 1 - Datos de Recogida
- ✅ Fecha: hoy
- ✅ Volumen: 100L
- ✅ **Especie**: selector VACUNO/OVINO/CAPRINO
- ✅ **Tanque origen**: selector con tanques disponibles
- ✅ Stock tanque visible en tiempo real
- ✅ Matrícula cisterna: ABC-1234
- ✅ Temperatura: 4.0°C
- ✅ Muestra Letra Q: M-2026-01-001
- ✅ Hora carga: 14:30
- ✅ Contrato: selector de contratos lácteos
- ✅ Comunidad: Andalucía
- ✅  Cadena de frío cumplida
- ✅ ☑ Ausencia de inhibidores

### Paso 7.3: Paso 2 - Analítica
- ✅ Grasa: 3.8%
- ✅ Proteína: 3.3%
- ✅ Gérmenes: 45000 UFC/mL
- ✅ Somáticas: 180000 cel/mL
- ✅ **Aflatoxina M1**: 15 ng/kg (NUEVO)
- ✅ Método: Kit rápido (NUEVO)
- ✅ Fecha análisis: hoy
- ✅ Laboratorio: CICAP (selector con laboratorios homologados)
- ✅ Precio base: 0.48 €/L
- ✅ Cálculo automático de precio final e importe

### Paso 7.4: Validaciones Bloqueantes

**Prueba 7.4.1: Stock insuficiente**
1. Intentar entregar 999999L
2. ✅ Error: "Litros declarados superan stock del tanque"
3. ✅ Wizard no avanza

**Prueba 7.4.2: Gérmenes sobre límite (vacuno)**
1. Especie: VACUNO
2. Gérmenes: 150000 UFC/mL (> 100000 límite)
3. ✅ Error: "Gérmenes elevados..."
4. ✅ Wizard no permite confirmar

**Prueba 7.4.3: Somáticas sobre límite (vacuno)**
1. Especie: VACUNO
2. Somáticas: 500000 cel/mL (> 400000 límite)
3. ✅ Error: "Células somáticas elevadas..."

**Prueba 7.4.4: Inhibidores detectados**
1. Desmarcar "Ausencia de inhibidores"
2. ✅ Error: "Debes certificar la ausencia de inhibidores"
3. ✅ Wizard no avanza

**Prueba 7.4.5: Temperatura elevada (warning, no bloquea)**
1. Temperatura: 7°C (> 6°C)
2. ✅ Warning: "Temperatura > 6°C detectada"
3. ✅ Wizard SÍ avanza (infracción leve)

**Prueba 7.4.6: Especie ovino (umbrales diferentes)**
1. Especie: OVINO
2. Gérmenes: 1200000 UFC/mL (< 1500000 límite ovino)
3. ✅ Validación pasa (umbrales ovino más permisivos)

### Paso 7.5: Entrega Válida
1. Completar datos válidos (100L, vacuno, gérmenes 45K, somáticas 180K)
2. Click en **"Confirmar"**
3. ✅ Toast: "Salida láctea registrada"
4. ✅ PDF del albarán se abre/descarga
5. ✅ Registro aparece en lista de comercialización
6. ✅ Stock del tanque actualizado (-100L)

---

## 🧪 PRUEBA 8: Wizard de Tanque

### Paso 8.1: Abrir Wizard
1. **ExPro** → **Láctea** → **Tanques**
2. Click en **"+ Nuevo Tanque"** (FAB)

### Paso 8.2: Crear Tanque
- ✅ Nombre: "TANQUE PRUEBA"
- ✅ Código Letra Q: "T-21-99999"
- ✅ Capacidad: 4000L
- ✅ Tipo: Tanque de Frío
- ✅ Temp. objetivo: 4°C
- ✅ Temp. actual: 3.5°C

### Paso 8.3: Validaciones
**Prueba 8.3.1: Código duplicado**
1. Intentar crear con código "T-21-001234" (ya existe)
2. ✅ Error: "Ya existe un tanque con código Letra Q"

**Prueba 8.3.2: Código vacío**
1. Dejar código Letra Q vacío
2. ✅ Error: "Código Letra Q requerido"

### Paso 8.4: Guardar
1. Click en **"Guardar"**
2. ✅ Toast: "Tanque registrado con código Letra Q"
3. ✅ Tanque aparece en lista

---

## 🧪 PRUEBA 9: Validaciones de Bienestar Animal

### Paso 9.1: Verificar Alertas
1. **ExPro** → **Láctea** → **Dashboard**
2. ✅ Sin alertas de bienestar (50 vacas, 300m², 3500cm, 45 cubículos)

### Paso 9.2: Simular Alerta de Cubículos
1. **Ajustes** → **Editar Finca** → **Paso 3**
2. Cambiar cubículos a `40` (menos que 50 vacas)
3. Guardar
4. ✅ Volver al Dashboard
5. ✅ Alerta WARNING: "Cubículos insuficientes: 40 < 50 vacas"

### Paso 9.3: Simular Alerta Ambiental
1. **Ajustes** → **Editar Finca** → **Paso 3**
2. Cambiar plazas a `350` (> 300)
3. Guardar
4. ✅ Alerta DANGER: "Explotación >300 plazas requiere evaluación ambiental"

---

## 🧪 PRUEBA 10: Pruebas Automatizadas

### Paso 10.1: Activar QA Tools
```javascript
localStorage.setItem('lm_qa_tools', '1');
location.reload();
```

### Paso 10.2: Ejecutar Pruebas
1. Abrir consola del navegador (Chrome DevTools)
2. Ejecutar:
   ```javascript
   runLacteoTests();
   ```
3. ✅ Ver resultados en consola:
   - ✅ Aprobadas: ~50
   -  Fallidas: 0

---

##  Checklist Final

Marcar cada prueba completada:

### Datos Demo
- [ ] Paso 1.1: Campos de finca rellenados
- [ ] Paso 1.2: 3 tanques creados
- [ ] Paso 1.3: Stock calculado correctamente

### Dashboard
- [ ] Paso 2.1: Navegación a dashboard
- [ ] Paso 2.2: KPIs visibles
- [ ] Paso 2.3: Botones de acción funcionan
- [ ] Paso 2.4: Tarjetas de tanques
- [ ] Paso 2.5: Última analítica

### Tanques
- [ ] Paso 3.1: Navegación a tanques
- [ ] Paso 3.2: Lista completa
- [ ] Paso 3.3: Información por tanque
- [ ] Paso 3.4: Botón FAB
- [ ] Paso 3.5: Edición de tanque
- [ ] Paso 3.6: Registro de limpieza

### Control Lechero
- [ ] Paso 4.1: Navegación a control
- [ ] Paso 4.2: Analíticas listadas
- [ ] Paso 4.3: Controles DHI
- [ ] Paso 4.4: Estados correctos

### Balance
- [ ] Paso 5.1: Navegación a balance
- [ ] Paso 5.2: Movimientos listados
- [ ] Paso 5.3: Orden cronológico

### Wizard Ordeño
- [ ] Paso 6.1: Abrir wizard
- [ ] Paso 6.2: Paso 1 completado
- [ ] Paso 6.3: Paso 2 con producción
- [ ] Paso 6.4: Paso 3 confirmación
- [ ] Paso 6.5: Stock actualizado

### Wizard Comercialización
- [ ] Paso 7.1: Abrir wizard
- [ ] Paso 7.2: Paso 1 datos recogida
- [ ] Paso 7.3: Paso 2 analítica
- [ ] Paso 7.4.1: Bloqueo stock insuficiente
- [ ] Paso 7.4.2: Bloqueo gérmenes vacuno
- [ ] Paso 7.4.3: Bloqueo somáticas vacuno
- [ ] Paso 7.4.4: Bloqueo inhibidores
- [ ] Paso 7.4.5: Warning temperatura
- [ ] Paso 7.4.6: Umbrales ovino
- [ ] Paso 7.5: Entrega válida

### Wizard Tanque
- [ ] Paso 8.1: Abrir wizard
- [ ] Paso 8.2: Crear tanque
- [ ] Paso 8.3.1: Validación código duplicado
- [ ] Paso 8.3.2: Validación código vacío
- [ ] Paso 8.4: Guardar tanque

### Bienestar Animal
- [ ] Paso 9.1: Sin alertas iniciales
- [ ] Paso 9.2: Alerta cubículos
- [ ] Paso 9.3: Alerta ambiental

### Pruebas Automatizadas
- [ ] Paso 10.1: Activar QA tools
- [ ] Paso 10.2: Ejecutar runLacteoTests()

---

## 🐛 Reporte de Errores

Si encuentras errores, reporta con:

1. **Número de prueba** (ej: 7.4.2)
2. **Paso exacto** donde ocurrió
3. **Mensaje de error** (screenshot o texto)
4. **Logcat** si es crash de Android
5. **Datos de entrada** utilizados

---

## ✅ Criterios de Aceptación

El módulo lácteo v24 se considera **completado** cuando:

- ✅ Todas las pruebas manuales (1-9) pasen sin errores
- ✅ Pruebas automatizadas: ≥ 95% aprobadas
- ✅ UI/UX cumple estándares de diseño (cards, badges, botones neón)
- ✅ Validaciones normativas funcionan (Letra Q, umbrales por especie)
- ✅ Datos demo cargados correctamente
- ✅ Navegación fluida entre sub-pestañas
- ✅ Wizards completan flujos sin crashes

---

**Fin de la guía de pruebas**
