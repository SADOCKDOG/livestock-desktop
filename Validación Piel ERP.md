Livestock Desktop · v7.29

Validación física de la piel ERP
Lo que no he podido comprobar desde el navegador: interacción real, ficheros que se generan y comportamiento de la ventana Tauri. Los puntos ya verificados automáticamente van marcados, para que no repitas trabajo salvo que quieras confirmarlos con tus ojos.

0 / 37
Desmarcar todo
Antes de empezar
Abre la app con Ctrl+Shift+R la primera vez: hay cambios de CSS y JS, y sin recarga dura verás la versión anterior en caché.

Trabaja sobre la demo CHAMORRO, no sobre datos reales: varios puntos piden crear y borrar registros.

El progreso se guarda en este navegador. Si abres la lista en otro equipo empezaras de cero, asi que marca desde el mismo sitio.

verificado ya comprobado por mí
tu ojo requiere juicio humano
Arranque y chrome
al abrir la app

El sidebar se pliega y despliega
Botón superior izquierdo o Alt+S. Al plegarse quedan solo iconos; el botón no debe taparse con «Inicio».

El estado plegado se recuerda al reabrir
Cierra y vuelve a abrir la app con el menú plegado.

El pie del menú muestra los cuatro datosverificado
Versión, plan (Free/Premium), fecha de hoy y nombre de la finca activa. Cambia de finca y comprueba que el nombre se actualiza solo.

Barra superior: migas, buscador global y campanatu ojo
Las migas deben seguir la ruta (GeGan › Animales). Busca un crotal real y comprueba que lleva a su ficha.

Sin huecos ni solapes al redimensionar la ventanatu ojo
Prueba a 1280, 1440 y pantalla completa. Los marcos de acciones no deben montarse unos sobre otros.

Por debajo de 1024 px vuelve el aspecto móvil
Estrecha la ventana: deben aparecer los FAB y la barra inferior, y desaparecer el sidebar.
Navegación
menú lateral

Las 77 entradas abren su vistaverificado
Recorridas sin un solo error. Repásalas por encima si quieres confirmarlo.

El grupo y la entrada activos se resaltan
Al entrar por enlace directo, el acordeón debe abrirse hasta la entrada correcta, incluso en Informes (tres niveles).

Rutas cortas recién corregidas
Prueba #/patrimonio y #/sanidad en la barra de direcciones: daban 404.

Los sub-grupos llevan al sitio correcto
Láctea (Dashboard/Tanques/Control/Balance/Gráficos), Finanzas por categoría, Trámites y las cinco categorías de Informes.
Listados
los 18 módulos con tabla
El conmutador, los filtros y el «Ver más» los he probado uno a uno. Lo que falta es el juicio sobre si se leen bien.


Las columnas se leen sin scroll horizontal incómodotu ojo
Mira sobre todo Animales, Documentos y Libro de Ventas, que son las de más columnas.

Los colores de campo significan algotu ojo
Identificador en dorado, alertas en rojo, importes en verde. ¿Ayudan o distraen?

Ordenar por columna funciona en las que importan
Fecha, importe y censo son las más útiles. Comprueba que ordena de verdad, no solo alfabéticamente.

El conmutador Tarjetas / Tabla recuerda tu elecciónverificado
Cambia a Tarjetas en un módulo, navega fuera y vuelve.

Buscador y desplegable filtran de verdadverificado
Comprobado en nueve módulos. El desplegable se oculta si esos registros no tienen categoría: es a propósito.

«Ver más» revela el restoverificado
En Finanzas: 10 de 15 y el pie dice «5 registros más». Requiere estar en modo Tarjetas.
Altas, edición y borrado
escribe en la base de datos
Aquí es donde más falta hace tu prueba: yo he validado las operaciones contra la base de datos, pero no el recorrido completo por los asistentes.


Cada módulo da de alta desde su marco de registro
Animales, Rebaños, Zonas, Compradores, Contratos, Transportistas, Proveedores, Botiquín, Instalaciones, Saneamientos, Subexplotaciones, Silos y Tanques.

El registro nuevo aparece en el listado sin recargar
Y en la tabla, no solo en tarjetas.

Editar carga los datos existentestu ojo
Que no aparezca un formulario en blanco: es el fallo típico y se nota enseguida.

Borrar pide confirmación y no deja rastro
Comprueba que el registro desaparece del listado y de los totales.

Láctea › Control: editar y borrar analíticas
Estos botones faltaban y se han añadido hoy. Es el punto más importante de esta lista.

Láctea › Balance: editar y borrar movimientos
Al cambiar los litros, el stock del tanque debe recalcularse solo. Verificado en base de datos (300 → 400 → 550 → 300), pero confírmalo en pantalla.

El asistente dice «EDITAR», no «NUEVA»
Corregido hoy: el encabezado interno seguía diciendo «Nueva analítica» al editar.

Los registros rápidos del Inicio funcionan
El FAB «Nueva Actividad» y sus siete accesos de producción.
Guías interactivas
botón Guía de cada módulo
Comprobé que los 21 catálogos encuentran su elemento en el DOM, pero no que el recorrido se entienda.


El foco ilumina el elemento del que hablatu ojo
Era el fallo que reportaste al principio. Fíjate en Compradores y Contratos, cuyos pasos re-apunté al menú.

El cartel no tapa lo que resaltatu ojo
Sobre todo con elementos del menú lateral.

Los pasos que apuntan a listados resaltan una fila
Con la tabla activa no hay tarjetas, así que ahora señalan la primera fila.

«No mostrar de nuevo» se respeta
Y la guía sigue disponible desde su botón.
Documentos y exportación
no he podido comprobarlo
Nada de esto es verificable desde el navegador integrado: hay que abrir los ficheros generados.


Informes: PDF, Excel y Completotu ojo
En varias categorías. Que el fichero se genere, se abra y tenga los datos correctos.

Cuaderno: PDF completo, CSV SIGGAN e imprimirtu ojo

Exportar CSV desde las tablas
El botón CSV de la barra de la tabla. Comprueba acentos y separadores al abrirlo en Excel.

Imprimir albaranes y documentos DIMOEtu ojo
Desde Libro de Ventas y Documentos, por fila.

Trámites: guía DIMOE, censo, crotales y traslados
Los cuatro asistentes, hasta generar el documento.
Aplicación de escritorio
solo en Tauri, no en navegador

Arranca sin pantalla en blanco
Y sin quedarse en «Iniciando aplicación…».

Los datos persisten entre sesiones
Crea un registro, cierra del todo y reabre.

Guardar y abrir ficheros usa el diálogo del sistematu ojo
Exportaciones, importar backup e importar PDF del catastro.

El indicador Free/Premium coincide con el build
Corregido hoy: mostraba «Free» siempre, incluso en build Premium.
Marca los puntos según los pruebes; el estado se guarda en este navegador. Lo que falle, anótalo con el módulo y la ruta — con eso puedo reproducirlo sin más contexto.