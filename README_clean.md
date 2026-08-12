p align"center"
  img src"icons/ogo%aplicaci%%n.png" alt"ivestock anager ogo" width""
/p

h align"center"ivestock anager remium/h
h align"center"istema ntegral de estión anadera · v../h

p align"center"
   híbrida (ndroid · apacitor) % offline-first para la gestión profesional de explotaciones ganaderas, con cumplimiento normativo nativo del sistema strong/strong (ndalucía) y strong/strong (xtremadura).
/p

p align"center"
  a href"#multi-explotación"ulti-xplotación/a ·
  a href"#módulos-y-funcionalidades"ódulos/a ·
  a href"#integración-siggan--badigex" / /a ·
  a href"#arquitectura-técnica"rquitectura/a ·
  a href"#instalación-y-desarrollo"nstalación/a
/p

---

## ¿ué es ivestock anager

ivestock anager es una plataforma de gestión ganadera de grado industrial pensada para el día a día del ganadero censo y trazabilidad animal, producción (carne y leche), comercialización, sanidad, finanzas y documentación oficial — todo funcionando **sin conexión** en el terreno, con sincronización y exportación cuando hace falta.

a aplicación no es un  genérico adaptado al sector su modelo de datos y sus flujos de trabajo están construidos directamente sobre la normativa española y autonómica de identificación y movimiento de ganado ( /,  /, eg.  /), con los sistemas oficiales de gestión ganadera de ndalucía y xtremadura como referencia de diseño.

---

## ulti-xplotación

ivestock anager gestiona **varias explotaciones (fincas) de forma simultánea** desde una misma instalación, y cada una es completamente independiente en cuanto a datos y configuración

- **ambio de finca activa** en un clic desde justes, sin perder el contexto de trabajo.
- **ipo de explotación por finca — ácteo / árnico / ambos.** ada finca declara qué produce mediante dos *flags* independientes (`leche`, `carne`) no existe un tercer estado "híbrido" artificial si una finca tiene ambos activos, cada módulo muestra sus secciones de leche y de carne **por separado**, nunca fusionadas.
  - l tipo de explotación se pregunta directamente en el asistente de alta de una finca nueva.
  - oda la interfaz reacciona a ese tipo el ashboard, omercialización, nimales, ebaños, nformes y la barra de navegación ocultan o muestran secciones según lo que esa finca concreta produce — sin tocar nada manualmente en cada módulo.
  - n banner discreto avisa cuando hay registros ocultos por el tipo de explotación configurado (nunca oculta datos de forma silenciosa).
  - as alertas de **seguridad alimentaria** (periodos de supresión sanitaria en leche y carne) se muestran siempre, con independencia del tipo de explotación activo.
- **atos aislados por finca** rebaños, animales, producción, sanidad, comercialización y documentación oficial cuelgan siempre de la finca a la que pertenecen — cambiar de finca activa nunca mezcla datos entre explotaciones.
- **atos / independientes** por finca (código , , , zonas y parcelas, contrato lácteo), lo que permite operar explotaciones en distintas comunidades autónomas (p. ej. una en ndalucía bajo  y otra en xtremadura bajo ) desde la misma app.

---

## ódulos y funcionalidades

a aplicación se organiza en pilares interconectados que cubren todas las áreas críticas de una explotación ganadera profesional

### ashboard
anel de control con s en tiempo real, accesos rápidos y alertas prioritarias. iltra automáticamente según el tipo de explotación activa (leche/carne).

### anadería y nimales
- enso completo con trazabilidad individual (crotal, , pedigree)
- estión de partos, celos y tratamientos reproductivos
- istorial clínico completo por animal
- estión de rebones y lotes

### roducción echera (módulo condicional)
- egistro de ordeños individuales y por lote
- ontrol de calidad leche (grasa, proteína, celulas somáticas)
- estión de cuotas y contratos lácteos
- lertas de periodos de espera post-tratamiento

### roducción árnica (módulo condicional)
- egistro de engorde y conversión alimenticia
- ontrol de prácticas de bienestar animal
- razabilidad completa desde nacimiento hasta sacrificio
- estión de lotes de cebo y fechas de salida previstas

### anidad y ratamientos
- ibro de tratamentos veterninarios con tiempos de espera automáticos
- estión de vacunaciones, desparasitaciones y profilaxis
- lertas de periodos de supresión (/)
- istorial sanitario completo por animal y lote

### 💰 inanzas y astos
- ontrol de ingresos y gastos por categoría
- estión de facturas y albaranes
- ontrol de subvenciones y ayudas 
- nálisis de rentabilidad por producción y animal

### 📦 omercialización
- estión de ventas de animales, leche y subproductos
- estión de compras de ganado y piensos
- ontrol de proveedores y transportistas
- eneración automática de documentación de transporte

### 📄 ocumentación ficial
- eneración automática de guías de movimiento oficiales
- ibro de registro de explotación (registro de eventos)
- ibro de tratamientos veterinarios
- ibro de piensos y medicamentos
- xportación a formatos oficiales /

### 📊 nformes y nalítica
- nformes de producción (leche/carne) por periodo
- nformes sanitarios y tratamientos
- nformes financieros y de rentabilidad
- nformes de cumplimiento normativo
- xportación a / para presentación oficial

### 🧰 erramientas y sistentes
- sistentes guiados (wizards) para operaciones complejas
  - lta de finca y animales
  - ovimientos oficiales (entradas/salidas)
  - raslados internos y aforo de zonas
  - ratamientos veterinarios
  - acimientos y gestiones reproductivas
  - entas masivas y lotes
- anuales de usuario integrados y actualizables

### ⚙️ justes y onfiguración
- estión de múltiples fincas y cambio de contexto
- onfiguración de tipo de explotación (leche/carne)
- estión de usuarios y permisos
- onfiguración de impresión y exportación
- estión de actualizaciones y mantenimiento

---

## ntegración  / 

ivestock anager está diseñado desde cero para cumplir con los requisitos normativos de los sistemas oficiales de gestión ganadera

### ** (ndalucía)**
- ✅ ormato  validado según  /
- ✅ estión completa de movimientos oficiales con guías de origen y sanitarias
- ✅ ibro de tratamientos con tiempos de espera automáticos (carne/leche)
- ✅ estión de zonas,  y carga ganadera
- ✅ xportación oficial de documentos en formatos compatibles
- ✅ lertas de periodos de supresión 
- ✅ razabilidad completa desde nacimiento hasta destino final

### ** (xtremadura)**
- ✅ daptación completa al marco normativo extremeño
- ✅ ormatos de exportación e importación compatibles
- ✅ estión específica de ayudas y controles autonómicos
- ✅ daptación de flujos de trabajo a procedimientos extremeños

### **umplimiento erificado**
onsulte la atriz de umplimiento ](docs/_.md) para un detalle exhaustivo de los flujos normativos validados, con evidencia en código y resultados de la suite  automatizada.

---

## rquitectura écnica

### **nfoque ffline-irst**
- plicación rogressive eb pp () % funcional sin conexión
- incronización inteligente cuando hay conectividad disponible
- ervicio orker con estrategia cache-first para rendimiento offline
- Índice como base de datos local encriptada

### **ecnologías tilizadas**
- **rontend** ,  ( rid/lexbox), avacript +
- **ramework** rquitectura modular propia basada en componentes web nativos
- **ovilidad** apacitor para empaquetado nativo ndroid
- **ase de atos** Índice con esquemas versionados
- **ervicios** ocumentiewer unificado para generación y visualización de s
- **uild ystem** npm scripts con procesamiento de assets y cache-busting

### **rquitectura de apas**
. **resentación** istas modulares con ystem de iseño oral (neón semántico, arco aláctico)
. **ógica de plicación** ervicios compartidos y helpers transversales
. **cceso a atos** apa de abstração de Índice con validación normativa
. **ersistencia** lmacenamiento local encriptado con estrategias de recuperación

### **istema de iseño oral**
- eón semántico para estados y alertas críticas
- arco aláctico para layouts responsivos y consistentes
- omponentes card-registro con posicionamiento estandarizado
- adges retroiluminados estándar para estados y alertas
- ipografía y espaciado basados en tokens de diseño definidos

---

## structura del repositorio

```
├── index.html            # unto de entrada de la 
├── sw.js                 # ervice orker (cache-first)
├── js/
│   ├── app.js             # outer y orquestación de la app
│   ├── views/              # istas por módulo (dashboard, ganadería, comercialización...)
│   │   ├── wizards/          # sistentes de registro a pantalla completa
│   │   └── helpers/           # ógica transversal (modo de explotación, calidad de leche...)
│   └── services/           # ervicios compartidos (, visor de documentos, caché, eventos...)
├── css/                  # istema de diseño y estilos (con preventivo de "grid blowout")
├── manual/               # anuales de usuario interactivos (servidos dentro de la app)
├── docs/                 # ocumentación técnica y normativa del proyecto
├── android/              # royecto nativo apacitor
└── rivate/              # (excluido de git) material interno diseño, legislación de referencia, herramientas de desarrollo
```

---

## nstalación y esarrollo

### rerrequisitos
- ode.js (v+ recommended)
- ndroid tudio (para compilación nativa)
-   o superior
- it

### nstalación y uild

```bash
# . lonar el repositorio
git clone https//github.com/tu-usuario/-.git
cd -

# . nstalar dependencias
npm install

# . ompilar para web (variante  -  finca)
npm run buildfree

# . ompilar para web (variante  - multi-finca)
npm run buildpremium

# . incronizar con el proyecto ndroid ()
npm run capsyncfree

# . incronizar con el proyecto ndroid ()
npm run capsyncpremium

# . brir en ndroid tudio
npm run capopen
```

### cripts isponibles
- `npm run buildfree` - ompila versión  ( finca)
- `npm run buildpremium` - ompila versión  (multi-finca)
- `npm run capsyncfree` - incroniza build  con ndroid
- `npm run capsyncpremium` - incroniza build  con ndroid
- `npm run capopen` - bre proyecto en ndroid tudio
- `npm run testqa` - jecuta suite  de cumplimiento normativo
- `npm run lint` - jecuta linting de código
- `npm run format` - ormatea código con rettier

### rquitectura ree/remium
- **** ersión limitada a una finca activa, funcionalidad completa para gestión individual
- **** ompra única mediante `premium_unlock` en oogle lay, habilita
  - estión ilimitada de fincas
  - xportaciones avanzadas y lotes
  - nformes consolidados multi-finca
  - incronización en la nube opcional

---

## ocumentación dicional

onsulte los siguientes documentos para información técnica y normativa detallada

- _.md](docs/_.md) - atriz de cumplimiento con /
- _.md](docs/_.md) - daptación específica a xtremadura (si aplica)
- _.md](docs/_.md) - atrón de interacción y componentes 
- _.md](docs/_.md) - okens de diseño y sistema de estilo
- __.md](docs/__.md) - stándar de badges retroiluminados
- __.md](docs/__.md) - stándar de botones widget
- --.md](memory/premium-limit-pattern.md) - atrón de límites ree/remium en capa de datos

---

## róximos asos y oadmap

### ersión . (lanificada)
- ntegración con servicios web de / para validación oficial en tiempo real
- ódulo de análisis predictivo de producción y salud
- ntegración con dispositivos o (balanzas, sensores de ambiente, etc.)
- odo multiidioma completo (es/fr/en)
- ejora en sinchronización selectiva y resolución de conflictos

### ejoras ontinuas
- ptimización de rendimiento offline
- xpansión de documentación de usuario interactiva
- ejoras en accesibilidad ( . )
- uevos asistentes guiados para operaciones complejas

---

## icencia y réditos

©  avid suar rteaga · ivestock anager remium.  
odos los derechos reservados. so exclusivo interno.

