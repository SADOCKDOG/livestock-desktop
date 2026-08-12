# Blueprint: Arquitectura Ganadera y Contable Consolidada

Este documento define la estructura de datos maestros, el flujo de trabajo y la lógica de imputación del sistema **Livestock Manager Premium**.

## 1. Estructura de Datos Maestros (Core)

### A. Entidades de Explotación (Operativa)
| Maestro | Propósito | Campos Clave |
| :--- | :--- | :--- |
| **Fincas** | Nodo raíz de la explotación. | `id`, `nombre`, `codigo_REGA`, `direccion`. |
| **Zonas** | Parcelas físicas para imputación de pastos. | `nombre`, `aforoMax`, `superficie_ha`, `uso`. |
| **Especies** | Clasificación biológica. | `nombre`, `consumoAguaL`. |
| **Tipos Producción** | Línea de negocio (Maestro de imputación). | `nombre` (Cárnica, Láctea, Mixto, Ibérico). |
| **Rebaños** | Grupos operativos en una Zona y Tipo. | `id`, `nombre`, `especie`, `tipo`, `zonaActual`. |
| **Animales** | Entidades individuales (Crotales). | `id`, `numero_identificacion`, `sexo`, `fec_nac`. |

### B. Maestro de Contabilidad y Configuración
- **Categorías de Gasto:** Alimentación, Sanidad, Fitosanitarios, Electricidad, Personal.
- **Precios de Referencia:** Tabla dinámica de valores de mercado (€/kg, €/L) para valoraciones de inventario.

---

## 2. Registro Maestro de Eventos (La Gran Tabla Unificada)

Se unifican las tablas de pesajes, ventas y producción en un solo **Libro de Eventos de Trazabilidad**:

```typescript
interface EventoPesada {
  id: number;
  fecha: string;
  // --- Identidad ---
  entidad_id: number;      // ID Animal o Rebaño
  tipo_entidad: string;    // 'animal' | 'rebano' | 'tanque'
  
  // --- Trazabilidad (Snapshot) ---
  snap_zona: string;       // Zona donde ocurrió el evento
  snap_tipo: string;       // Tipo de producción en ese momento
  snap_especie: string;    // Especie vinculada
  
  // --- Magnitud Física ---
  peso_bruto?: number;     // Camión cargado
  tara?: number;           // Camión vacío
  valor_neto: number;      // Peso real / Litros (Calculado: Bruto - Tara)
  valor_canal?: number;    // Peso tras sacrificio (Neto Matadero)
  unidad: 'kg' | 'L';
  
  // --- Economía ---
  precio_unitario: number; // €/kg o €/L
  importe_total: number;   // valor_neto * precio_unitario
  rol_contable: string;    // 'VENTA' | 'INVENTARIO' | 'COMPRA'
  
  // --- Logística y Doc ---
  matricula?: string;      // Identificación transporte
  documento_ref?: string;  // Albarán / Factura
  motivo_tarea: string;    // 'expedicion', 'control', 'produccion_leche'
}
```

---

## 3. Workflow de Datos (Flujo de Imputación)

1.  **ENTRADA (Captura):** El usuario lanza el **Wizard Multizona** desde cualquier módulo.
2.  **CONTEXTO (Automático):** El sistema inyecta la Zona, el Rebaño y el Tipo actuales del maestro.
3.  **LOGÍSTICA (Variable):** Si es carga/descarga, se introduce Bruto y Tara. El sistema calcula el Neto.
4.  **CÁLCULO (Motor):**
    *   Si es **Venta**: Genera un apunte positivo en el Balance de la Zona y el Tipo.
    *   Si es **Control**: Actualiza el peso del animal y calcula la GMD (Ganancia Media Diaria).
5.  **RESULTADO (Informes):** Los datos alimentan el Libro Sanitario, el Registro de Movimientos y el Margen Neto por Animal.

---

## 4. Diseño del Wizard Multizona

El asistente se adapta dinámicamente según la llamada:

- **Modo Individual (Desde Animal):** Solo pide Peso Neto.
- **Modo Rebaño (Control):** Muestra tabla de animales para pesos individuales rápidos.
- **Modo Expedición (Lote):**
    - Paso 1: Selección de Animales (vienen de cualquier zona).
    - Paso 2: Báscula (Bruto, Tara, Matrícula).
    - Paso 3: Liquidación (€/kg y Gastos).
    - **Imputación:** El sistema reparte los kilos y euros entre todos los animales seleccionados, guardando en cada registro la zona de procedencia.

---

## 5. Próximos Pasos de Implementación

1.  **Refactorizar `js/db.js`**: Crear el ObjectStore `registro_eventos` y migrar datos antiguos.
2.  **Desarrollar `js/pesajes.js`**: Crear el motor lógico de cálculo de pesos y tara.
3.  **Implementar UI en `js/app.js`**: Sustituir los asistentes antiguos por la llamada al nuevo `Pesajes.abrirWizard()`.
