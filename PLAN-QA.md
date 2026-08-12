# Plan de Testing y QA — Livestock Manager

## Objetivo
Validar el flujo completo de la aplicación mediante 7 niveles de testing que verifiquen carga de datos, integridad, CRUD, flujos transversales, trazabilidad, validaciones y performance.

---

## NIVEL 1 — Carga de Seed (Smoke Test)
**Duración**: 5 min | **Criterio**: 0 errores en consola

1. Abre Ajustes → Cargar Demo CHAMORRO
2. Monitorea consola para `[SEED] Error ...`
3. Verifica KPI dashboard

**Expected**:
- Fincas.list() → 1 finca (CHAMORRO)
- Rebanos.list() → 3 rebaños
- Animales.list() → 9 animales
- Compradores.list() → 3 compradores
- Proveedores.list() → 3 proveedores
- Transportistas.list() → 2 transportistas
- Contratos.list() → 2 contratos
- Sanitarios.list() → 3 registros
- Reproduccion.listEventos() → 4 eventos

---

## NIVEL 2 — Integridad de Datos

### Compradores
- ✅ Cárnicas Extremeñas: tipo=cárnico, 1 contrato activo
- ✅ Lácteos La Serena: tipo=láctico, 1 contrato activo
- ✅ Ganados del Oeste: tipo=híbrido

### Proveedores
- ✅ Piensos El Trébol: categorias=['Alimentacion'], 2 gastos asociados
- ✅ VetPlus: categorias=['Sanidad'], 1 gasto
- ✅ Maquinaria La Vega: categorias=['Amortizacion'], 2 gastos

### Transportistas
- ✅ Transporte Ganaderos: tipo=camion, certificado_bienestar=true
- ✅ Logística Láctea: tipo=cisterna, condiciones_termoneutrales=true

### Animales
- ✅ Todos los numero_identificacion siguen /^[A-Z]{2}\d{12}$/
- ✅ Vaca1 (ES123456789012): madre de ternero1 y ternero2

### Sanitarios
- ✅ 3 registros: Vacunación, Desparasitación, Antibiótico
- ✅ Antibiótico: prohibidoLeche=true, tiempo_espera_carne_dias=28

### Reproducción
- ✅ 4 eventos vaca1: Celo → IA → Diagnóstico → Parto (cronológico)
- ✅ Parto: crias_vivas=1

---

## NIVEL 3 — Operaciones CRUD

### 3.1 Crear Comprador
1. Navegua a Compradores → Nuevo
2. Rellena: Nombre "Test Buyer", NIF "B99999999", tipo=cárnico
3. Guarda
4. **Expected**: Aparece en lista, ID > 0

### 3.2 Crear Gasto
1. Gastos → Registrar → Alimentacion, monto=100, rebanoId=rebVacas
2. **Expected**: Aparece en Gastos → Alimentación; KPI se actualiza

### 3.3 Editar Proveedor
1. Proveedores → proveedor → Editar
2. Cambiar nombre y categorías
3. **Expected**: Cambios persisten en lista

### 3.4 Eliminar Transportista
1. Transportistas → transportista test → Eliminar
2. **Expected**: Ya no aparece; KPI "TOTAL" disminuye

---

## NIVEL 4 — Flujos Transversales

### 4.1 Pesaje Individual Carne
1. Producción → Cárnica → Registrar
2. Busca ternero1, peso=250kg
3. **Expected**: Aparece en Cárnica; registro_eventos.valor_neto=250, motivo_tarea=control

### 4.2 Control Lechero Individual
1. Producción → Láctea → Registrar
2. Busca vaca1, litros=22, grasa=3.7%, proteína=3.3%
3. **Expected**: Aparece en Láctea; produccion_leche.cantidad_litros=22

### 4.3 Pesaje por Lote Carne
1. Producción → Cárnica, rebaño Terneros (2 animales)
2. Pesaje: ternero1=260kg, ternero2=305kg
3. Finaliza
4. **Expected**: 2 eventos, NO hay duplicados, crotales normativos

### 4.4 Venta Masiva
1. Comercial → Carne → Registrar
2. Animal: ternero2, peso_vivo=300kg, peso_canal=168kg, comprador=Cárnicas
3. **Expected**: precio_total=856.80€, ternero2.estado='vendido', DIMOE generado

### 4.5 Albarán de Leche
1. Comercial → Leche → Registrar
2. Cantidad=1850L, laboratorio grasa=6.2%, proteína=5.1%, comprador=Lácteos
3. **Expected**: importe_total calculado, MOFA calculado, estado="Validado"

---

## NIVEL 5 — Coherencia y Trazabilidad

### 5.1 Comprador → Historial
- Compradores → Cárnicas: debe mostrar ≥1 venta (ternero2)
- Peso canal y precio coinciden con registro

### 5.2 Proveedor → Gastos
- Proveedores → Piensos: historial ≥2 gastos
- Desglose por categoría suma correctamente

### 5.3 Animal → Trazabilidad
- Animales → vaca1: pesajes + eventos reproductivos + madre-cría visible
- Sin lagunas en historial

### 5.4 Informes Coherencia
- Informes → Cárnica: suma de kg = suma en registro_eventos
- Informes → Láctea: suma de litros = suma en registro_eventos

---

## NIVEL 6 — Validaciones

### 6.1 Crotal Normativo
- Intenta crear animal con "INVALIDO"
- **Expected**: Error "Debe seguir formato ES + 12 dígitos"

### 6.2 Tipo Comprador
- Intenta crear con tipo_comprador="otro"
- **Expected**: Error o silenciosamente mapea a híbrido

### 6.3 Contrato Vencido
- Contrato con fecha_fin = HOY - 1 día
- Usa en Venta Masiva
- **Expected**: Aviso o no aparece en dropdown

---

## NIVEL 8 — SIGGAN (Sistema Integrado de Gestión Ganadera)

Suite automatizada dedicada en `js/qa-siggan.js`. Ejecución desde la consola
del navegador (DevTools) con la app abierta:

```js
await SigganQA.runAll();          // todos los tests SIGGAN
await SigganQA.run("movimientos"); // un test individual
await SigganQA.cleanup();          // eliminar datos de prueba
```

### 8.1 Validación REGA (`rega`)
- Normaliza `ES 04.123.0000123` → `ES041230000123`
- Acepta formato oficial (ES + 2 prov. INE + 3 muni + 7 secuencial)
- Rechaza provincia ajena a la comunidad, formato incorrecto y vacío

### 8.2 Catálogos SIGGAN (`catalogos`)
- Campañas de saneamiento, vías de administración, motivos de tratamiento,
  motivos de movimiento y tipos de explotación REGA
- Etiquetas legibles y configuración por comunidad (Andalucía=SIGGAN,
  Extremadura=BADIGEX)

### 8.3 Libro de Movimientos (`movimientos`)
- Alta de guía de origen y sanidad pecuaria con REGA normalizado
- Plataforma SIGGAN asignada por comunidad
- Trazabilidad por animal + evento en cuaderno (`registro_eventos`)
- Rechaza REGA inválido y exige certificar desinsectación en Andalucía

### 8.4 Libro de Saneamientos (`saneamientos`)
- Alta de campaña (tuberculosis, calificación indemne)
- Etiqueta legible de campaña y calificación sanitaria actual de la finca
- Rechaza positivos > examinados y campaña vacía

### 8.5 Libro de Tratamientos Veterinarios (`tratamientos`)
- Persistencia de vía de administración, motivo y tiempos de espera
- Etiquetas legibles + marca de supresión (prohibidoLeche)

### 8.6 Exportación REGA/SIA (`export`)
- Censo REGA (CSV), explotación REGA (XML) y movimientos SIA (CSV) con
  cabeceras correctas

### 8.7 Cuaderno Digital (`cuaderno`)
- Renderiza las secciones del libro de registro sin errores de consola

### 8.8 Rendimiento (`rendimiento`)
- Inserta 50 movimientos y mide la consulta filtrada (< 1500 ms)

---

## NIVEL 7 — Performance

### 7.1 Listados Grandes
- Genera 100 pesajes más
- Producción → Cárnica debe ser rápida (< 1 seg)

### 7.2 Filtrado
- Filtro por fecha, por comprador
- **Expected**: Instantáneo, sin lag

---

## Criterios de Aceptación

| Nivel | Criterio | Status |
|-------|----------|--------|
| 1 | Seed sin errores | ✅ |
| 2 | Integridad datos | ✅ |
| 3 | CRUD básico | ✅ |
| 4 | Flujos transversales | ✅ |
| 5 | Trazabilidad | ✅ |
| 6 | Validaciones | ✅ |
| 7 | Performance | ✅ |
| 8 | SIGGAN (REGA, libros, export, cuaderno) | ✅ |

**GLOBAL: READY FOR PRODUCTION**

