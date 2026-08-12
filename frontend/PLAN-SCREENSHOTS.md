# Plan de Captura de Screenshots para Manuales

## Herramientas disponibles

### 1. **Headless Chrome (Recomendado)**
Captura automática sin interfaz gráfica, ideal para flujos largos.

```bash
# Instalar chrome-remote-interface
npm install chrome-remote-interface

# Script de captura
node screenshot-generator.js
```

### 2. **Puppeteer (Node.js)**
Control total de navegación, clicks, esperas.

```bash
npm install puppeteer
# Ver: scripts/capture-screenshots.js
```

### 3. **Manual con DevTools**
- F12 → Ctrl+Shift+P → Screenshot (fullpage)
- Exportar en PNG a `www/manual/img/`

---

## Screenshots por Manual (Total: 35 imágenes)

### Manual de Compradores (8 screenshots)
| Nº | Nombre | Descripción |
|---|---|---|
| compr-01 | Acceso a Compradores | Vista listado con KPIs |
| compr-02 | Nuevo Comprador (form paso 1) | Nombre, NIF, tipo_comprador |
| compr-03 | Nuevo Comprador (form paso 2) | Dirección, ciudad, condiciones pago |
| compr-04 | Cárnicas Extremeñas (detalle) | Ficha completa con historial |
| compr-05 | Historial Ventas (Cárnicas) | Tabla con ternero2 |
| compr-06 | Lácteos La Serena (detalle) | Ficha con 0 entregas (para demo) |
| compr-07 | Contratos (panel dentro de detalle) | CT-2026-001 activo |
| compr-08 | KPIs (panel global) | TOTAL, CÁRNICOS, LÁCTEOS, INGRESOS |

### Manual de Proveedores (8 screenshots)
| Nº | Nombre | Descripción |
|---|---|---|
| prov-01 | Acceso a Proveedores | Vista listado con filtrado |
| prov-02 | Nuevo Proveedor (form paso 1) | Nombre, NIF, categorías checkbox |
| prov-03 | Nuevo Proveedor (form paso 2) | Email, teléfono, condiciones pago |
| prov-04 | Piensos El Trébol (detalle) | KPIs y desglose por categoría |
| prov-05 | Historial de Gastos | 2 registros asociados |
| prov-06 | VetPlus (detalle) | Categoría Sanidad, 1 gasto |
| prov-07 | Maquinaria La Vega (detalle) | Categoría Amortizacion, 2 gastos |
| prov-08 | Panel KPIs (global) | PROVEEDORES, GASTO ASIGNADO, GASTOS |

### Manual de Transportistas (8 screenshots)
| Nº | Nombre | Descripción |
|---|---|---|
| trans-01 | Acceso a Transportistas | Listado con filtros (Activos/Inactivos) |
| trans-02 | Nuevo Transportista (form) | Nombre, NIF, matrícula, tipo_vehiculo |
| trans-03 | Tipo Vehículo (select) | Opciones: camion, furgoneta, remolque, cisterna |
| trans-04 | Certificado Bienestar (checkbox) | Cómo aparece en form |
| trans-05 | Transporte Ganaderos (detalle) | Ficha camión, expediciones |
| trans-06 | Logística Láctea (detalle) | Ficha cisterna, condiciones termoneutrales |
| trans-07 | KPIs (panel detalle) | Expediciones, peso vivo total |
| trans-08 | Panel KPIs (listado) | TOTAL, ACTIVOS, INACTIVOS |

### Manual de Animales y Rebaños (11 screenshots)
| Nº | Nombre | Descripción |
|---|---|---|
| anim-01 | Estructura Finca → Zonas | Árbol de zonas |
| anim-02 | Zonas (listado) | 3 parcelas con superficie |
| anim-03 | Rebaños (listado) | 3 rebaños: Vacas, Terneros, Ovejas |
| anim-04 | Nuevo Rebaño (form) | Nombre, especie, tipo, zona, capacidad |
| anim-05 | Animales en Rebaño | Vaca1, Vaca2, Vaca3 (Vacas Frisonas) |
| anim-06 | Nuevo Animal (form paso 1) | Crotal, especie, sexo, raza |
| anim-07 | Nuevo Animal (form paso 2) | Fecha nacimiento, peso inicial, DIB |
| anim-08 | Escáner de Crotal | Cómo escanear crotales con QR |
| anim-09 | Vaca1 (detalle animal) | Ficha completa, pesajes, eventos |
| anim-10 | Vinculación Madre-Cría | Ternero1 y Ternero2 con madre_id=Vaca1 |
| anim-11 | KPIs (panel listado) | TOTAL, ACTIVOS, INACTIVOS |

### Manual de Contratos (3 screenshots) — BONUS
| Nº | Nombre | Descripción |
|---|---|---|
| contr-01 | Acceso (desde Compradores detalle) | Panel de contratos |
| contr-02 | Nuevo Contrato (form) | número_contrato, tipo, fechas, IVA |
| contr-03 | Tabla de Precios (en contrato) | Producto, precio_unitario, unidad |

### Manual de Sanitarios (5 screenshots) — BONUS
| Nº | Nombre | Descripción |
|---|---|---|
| san-01 | Acceso (desde rebaño) | Listado de tratamientos |
| san-02 | Nuevo Sanitario (form) | Tipo tratamiento, medicamento, tiempos espera |
| san-03 | Tipos de Tratamiento (select) | 8 opciones disponibles |
| san-04 | Registro con Alerta | Antibiótico prohibido para leche |
| san-05 | Historial Sanitario | 3 registros cronológicos |

### Manual de Reproducción (5 screenshots) — BONUS
| Nº | Nombre | Descripción |
|---|---|---|
| rep-01 | Acceso (desde animal detalle) | Línea temporal de eventos |
| rep-02 | Nuevo Evento (form) | Tipo evento, fecha, animalId |
| rep-03 | Tipos de Evento (select) | 8 opciones |
| rep-04 | Ciclo Completo (vaca1) | 4 eventos: Celo → IA → Diagnóstico → Parto |
| rep-05 | Genealogía (madre-cría) | Árbol de descendencia |

---

## Procedimiento de Captura

### Paso 1: Preparar ambiente
```bash
cd C:\livestock-manager
npm install puppeteer chrome-remote-interface

# Asegurarse de tener cargada la demo CHAMORRO
# En la app: Ajustes → Cargar Demo CHAMORRO
```

### Paso 2: Crear directorio de imágenes
```bash
mkdir -p www/manual/img/compr www/manual/img/prov www/manual/img/trans www/manual/img/anim
```

### Paso 3: Ejecutar captura automatizada
```bash
# Ver archivo: scripts/capture-screenshots.js (crear si no existe)
node scripts/capture-screenshots.js
```

### Paso 4: Verificar y ajustar
- Revisar cada imagen en `www/manual/img/`
- Redimensionar si es necesario (ancho máximo 900px)
- Comprimir PNGs con TinyPNG u optipng

### Paso 5: Insertar en manuales HTML
En cada archivo `manual-*.html`, buscar comentarios como:
```html
<!-- IMAGEN: compr-01 -->
<figure>
  <img src="img/compr-01.png" alt="Acceso a Compradores">
  <figcaption>Listado de compradores con KPIs globales</figcaption>
</figure>
```

---

## Consideraciones Técnicas

### Resolución
- Ancho: 1280px (desktop estándar)
- Alto: variable (fullpage)
- Ratio: 16:9 preferentemente

### Formato
- PNG (mejor compresión que JPG para UI)
- Máx 500KB por imagen

### Elementos a evitar
- Información sensible (NIFs completos → ocultar últimas 2 cifras)
- Timestamps reales → usar fechas fijas en la demo
- IDs de DB → usar nombres descriptivos

### Timing
- Esperar 500ms entre navegaciones
- Esperar 300ms para que se renderice el contenido
- Hacer scroll si es necesario (fullpage screenshots)

---

## Script base (Puppeteer)

```javascript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  
  // Cargar demo
  await page.evaluate(() => window.SeedData.run());
  
  // Navegar a Compradores
  await page.goto('http://localhost:3000#/compradores', { waitUntil: 'networkidle2' });
  
  // Capturar
  await page.screenshot({ 
    path: 'www/manual/img/compr-01.png',
    fullPage: true 
  });
  
  await browser.close();
})();
```

---

## Timeline

- **Semana 1**: Captura Compradores + Proveedores (16 imágenes)
- **Semana 2**: Captura Transportistas + Animales (19 imágenes)
- **Semana 3**: Integración en manuales + ajustes + compresión

**Total estimado: 3 semanas de captura + 1 semana de integración**

---

## Checklist Final

- [ ] 35 imágenes capturadas
- [ ] Todas comprimidas (< 500KB c/u)
- [ ] Nombres de archivos coherentes
- [ ] Integradas en manuales HTML
- [ ] Manuales PDF generados (Print as PDF)
- [ ] Validadas en 3 resoluciones (mobile, tablet, desktop)
- [ ] Imágenes guardadas en control de versiones
