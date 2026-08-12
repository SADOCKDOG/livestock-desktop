# Patrones de Interacción Estándar

Este documento establece los patrones de interacción consistentes que deben seguirse en toda la aplicación Livestock Manager para garantizar una experiencia de usuario uniforme e intuitiva.

## 1. Visión General

Los patrones de interacción definidos aquí aseguran que los usuarios puedan predecir cómo se comportará la interfaz sin importar en qué módulo se encuentren, reduciendo la carga cognitiva y aumentando la eficiencia.

## 2. Filtrado en Tiempo Real

### 2.1 Implementación Estándar
Todos los campos de búsqueda y filtrado deben seguir este patrón:

```javascript
// En el componente/vista:
_filtroActivo = {
    especie: '',
    sexo: '',
    estado: '',
    // otros filtros según corresponda
};

// Inicialización del filtro
inputBusqueda.addEventListener('input', (e) => {
    this._filtrar(e.target.value);
});

selectFiltro.addEventListener('change', (e) => {
    this._setFiltro(e.target.name, e.target.value);
    this._filtrar(document.getElementById('search-input').value);
});

// Método privado para establecer filtros
_setFiltro(tipo, valor) {
    this._filtroActivo[tipo] = valor;
    // Actualizar UI del select si corresponde
    const select = document.getElementById(`${this.id}-filtro-${tipo}`);
    if (select) select.value = valor || '';
}

// Método privado para aplicar filtros
_filtrar(textoBusqueda) {
    termoBusqueda = textoBusqueda.trim().toLowerCase();
    
    if (!this._cache) return;
    
    const contenedor = document.getElementById(`${this.id}-lista`);
    const mensajeVacio = document.getElementById(`${this.id}-empty-search`);
    
    if (!contenedor) return;
    
    // Aplicar filtros de selección primero
    let resultadosFiltrados = this._aplicarFiltrosSeleccion(this._cache.items);
    
    // Luego aplicar filtro de texto si existe
    if (termoBusqueda) {
        resultadosFiltrados = resultadosFiltrados.filter(item => 
            this._coincideConBusqueda(item, termoBusqueda)
        );
    }
    
    // Actualizar UI
    this._actualizarLista(resultadosFiltrados, contenedor, mensajeVacio);
}

// Aplicar filtros de selección (especie, sexo, estado, etc.)
_aplicarFiltrosSeleccion(items) {
    return items.filter(item => {
        return (!this._filtroActivo.especie || item.especie === this._filtroActivo.especie) &&
               (!this._filtroActivo.sexo || item.sexo === this._filtroActivo.sexo) &&
               (!this._filtroActivo.estado || item.estado === this._filtroActivo.estado);
    });
}

// Verificar coincidencia con término de búsqueda
_coincideConBusqueda(item, termo) {
    return (item.numero_identificacion?.toLowerCase().includes(termo) || 
            item.nombre?.toLowerCase().includes(termo) ||
            item.raza?.toLowerCase().includes(termo) ||
            (item.rebanoId && this._cache.rebanoMap[item.rebanoId]?.nombre.toLowerCase().includes(termo)));
}

// Actualizar la lista mostrada
_actualizarLista(items, contenedor, mensajeVacio) {
    if (items.length === 0) {
        contenedor.style.display = 'none';
        if (mensajeVacio) mensajeVacio.style.display = 'block';
    } else {
        contenedor.style.display = 'grid';
        if (mensajeVacio) mensajeVacio.style.display = 'none';
        contenedor.innerHTML = items.map(item => {
            const props = this._getItemProps(item, this._cache.rebanoMap[item.rebanoId]);
            return this._itemTemplate(props);
        }).join('');
    }
}
```

### 2.2 Componentes de UI para Filtrado
- **Entrada de Búsqueda**: `<input type="search" class="search-input" placeholder="Buscar...">`
- **Selectores**: `<select class="form-select-gold">` para filtrados categóricos
- **Placeholders descriptivos**: Ej: "Buscar por crotal, raza o rebaño..."
- **Indicadores visuales claros** cuando hay filtros activos

### 2.3 Mejores Prácticas
- Debounce no necesario para `input` en búsquedas locales (IndexedDB es rápido)
- Mostrar contador de resultados cuando sea útil: "Mostrando 15 de 234 animales"
- Resetear posición de scroll al aplicar nuevos filtros
- Mantener estado de filtros entre navegaciones cuando tenga sentido

## 3. Navegación de Ficha

### 3.1 Implementación Estándar
Todas las tarjetas de datos deben ser completamente clickeables:

```javascript
// En el renderizado de la tarjeta:
onclick="location.hash='/animal?id=${animal.id}'"

// O en JavaScript:
tarjetaElemento.addEventListener('click', () => {
    location.hash = `/animal?id=${animal.id}`;
});
```

### 3.2 Características Esenciales
- **Cursor**: `cursor: pointer` en todas las tarjetas clickeables
- **Feedback Visual**: Sutil cambio de escala o color al presionar (`transform: scale(0.98)`)
- **Estado de Carga**: Mostrar indicador cuando se navega a detalle
- **Retroceso Navegacional**: Soportar correctamente el botón "atrás" del navegador
- **URL Limpia**: Usar hash params limpios: `#/animal?id=123` no `#/animal/123`

### 3.3 Manejo de Estados
- **Elemento No Encontrado**: Mostrar mensaje apropiado en vista de detalle
- **Acceso No Autorizado**: Redirigir a página de error o solicitar autenticación
- **Datos En Proceso**: Mostrar esqueleto mientras se cargan los datos

## 4. Sistema de Feedback

### 4.1 Toast Notifications
Para notificaciones no bloqueantes y temporales:

```javascript
// Función helper
function mostrarToast(mensaje, tipo = 'info', duracion = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast--${tipo}`;
    toast.textContent = mensaje;
    
    // Estilos basados en tipo
    const estilos = {
        success: { background: 'var(--c-success)20', color: 'var(--c-success)' },
        error: { background: 'var(--c-danger)20', color: 'var(--c-danger)' },
        warning: { background: 'var(--c-warning)20', color: 'var(--c-warning)' },
        info: { background: 'var(--c-info)20', color: 'var(--c-info)' }
    };
    
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: '600',
        zIndex: '1000',
        boxShadow: 'var(--shadow-md)',
        ...(estilos[tipo] || estilos.info)
    });
    
    document.body.appendChild(toast);
    
    // Animación de entrada
    setTimeout(() => toast.style.opacity = '1', 10);
    
    // Remover después de duración
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300); // duración de fade out
    }, duracion);
}

// Uso:
mostrarToast("Pesaje registrado correctamente", "success");
```

### 4.2 Confirmaciones Modales
Para acciones críticas e irreversibles:

```javascript
function mostrarConfirmacion(titulo, mensaje, callbackConfirmar, callbackCancelar) {
    // Crear backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1050;
    `;
    
    // Crear modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        width: 90%;
        max-width: 400px;
        box-shadow: var(--shadow-lg);
        position: relative;
    `;
    
    // Contenido del modal
    modal.innerHTML = `
        <h3 style="margin-top: 0; color: var(--c-danger);">${titulo}</h3>
        <p style="margin: 16px 0; color: var(--text-primary);">${mensaje}</p>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="cancelarBtn" style="
                padding: 8px 16px;
                border: 1px solid var(--border-222);
                background: transparent;
                border-radius: 6px;
                font-weight: 600;
                color: var(--text-s);
            ">Cancelar</button>
            <button id="confirmarBtn" style="
                padding: 8px 16px;
                background: var(--c-danger);
                color: white;
                border: none;
                border-radius: 6px;
                font-weight: 600;
            ">Confirmar</button>
        </div>
    `;
    
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    
    // Manejo de eventos
    const confirmarBtn = modal.querySelector('#confirmarBtn');
    const cancelarBtn = modal.querySelector('#cancelarBtn');
    
    const cerrar = () => {
        backdrop.remove();
        window.removeEventListener('keydown', handleEscape);
    };
    
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            cerrar();
            if (callbackCancelar) callbackCancelar();
        }
    };
    
    confirmarBtn.addEventListener('click', () => {
        cerrar();
        if (callbackConfirmar) callbackConfirmar();
    });
    
    cancelarBtn.addEventListener('click', () => {
        cerrar();
        if (callbackCancelar) callbackCancelar();
    });
    
    window.addEventListener('keydown', handleEscape);
    
    // Enfoque inicial en cancelar por seguridad
    cancelarBtn.focus();
}

// Uso:
mostrarConfirmacion(
    "Eliminar Animal",
    "¿Estás seguro de que deseas eliminar este animal? Esta acción no se puede deshacer.",
    () => { /* lógica de eliminación */ },
    () => { /* lógica de cancelación */ }
);
```

### 4.3 Reglas de Uso
- **Toast**: Operaciones exitosas, advertencias menores, información temporal
- **Modal Confirm**: Eliminaciones, cambios irreversibles, acciones costosas
- **NUNCA** usar `alert()`, `confirm()`, o `prompt()` nativos
- Todos los modales deben ser escapables con `Esc` y clic fuera del modal

## 5. Estados de Carga y Vacío

### 5.1 Estados de Carga
#### 5.1.1 Esqueleto de Carga
```html
<div class="skeleton-loader">
    <div class="skeleton-item" style="height: 20px; width: 60%;"></div>
    <div class="skeleton-item" style="height: 14px; width: 80%; margin: 8px 0;"></div>
    <div class="skeleton-item" style="height: 14px; width: 50%; margin: 4px 0;"></div>
    <div class="skeleton-item" style="height: 14px; width: 70%; margin: 4px 0;"></div>
</div>
```

```css
.skeleton-loader {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px;
}

.skeleton-item {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: pulse 1.5s ease-in-out infinite;
    border-radius: 4px;
}

@keyframes pulse {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
```

#### 5.1.2 Spinner de Carga
```html
<div class="spinner">
    <div class="spinner-dot"></div>
    <div class="spinner-dot"></div>
    <div class="spinner-dot"></div>
</div>
```

```css
.spinner {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 24px;
}

.spinner-dot {
    width: 8px;
    height: 8px;
    background-color: var(--c-info);
    border-radius: 50%;
    margin: 0 4px;
    animation: pulseDelay 1.4s ease-in-out infinite;
}

.spinner-dot:nth-child(1) { animation-delay: 0s; }
.spinner-dot:nth-child(2) { animation-delay: 0.2s; }
.spinner-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes pulseDelay {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
}
```

### 5.2 Estados Vacíos
#### 5.2.1 Estructura Estándar
```html
<div class="empty-state">
    <div class="empty-state-icon">[ICONO]</div>
    <p class="empty-state-text">[MENSAJE CLARO]</p>
    <div class="empty-state-actions" opcional>
        <button class="btn btn-primary">[ACCION PRIMARIA]</button>
    </div>
</div>
```

#### 5.2.2 Estilos
```css
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 32px 16px;
}

.empty-state-icon {
    font-size: 48px;
    color: var(--text-s);
    margin-bottom: 16px;
}

.empty-state-text {
    color: var(--text-primary);
    font-size: 1rem;
    margin-bottom: 24px;
    max-width: 400px;
}

.empty-state-actions {
    display: flex;
    gap: 12px;
}

.empty-state-actions .btn {
    min-width: 100px;
}
```

#### 5.2.3 Directrices de Contenido
- **Icono**: Representativo del contexto (animal, lista, formulario, etc.)
- **Mensaje**: Claro, conciso y orientado a la acción
  - ❌ "No hay datos"
  - ✅ "Aún no hay animales registrados. Agrega tu primeiro animal para comenzar."
- **Acción**: Cuando sea aplicable, incluir botón de acción principal

## 6. Manejo de Errores

### 6.1 Mensajes de Error Amigables
Nunca mostrar errores técnicos directamente al usuario:

```javascript
// ❌ MAL
alert("Error SQL: Constraint foreign_key failed");

// ✅ BIEN
mostrarToast("No se puede eliminar este animal porque tiene registros asociados. Por favor, elimine o transfiera esos registros primero.", "error");

// O para errores críticos:
mostrarConfirmacion(
    "Error",
    "No se puede completar esta acción debido a restricciones del sistema. Por favor, contacte al soporte.",
    () => { /* reintentar */ },
    () => { /* abandonar */ }
);
```

### 6.2 Niveles de Severidad
- **Informativo**: Toasts temporales
- **Advertencia**: Toasts amarillos o modales informativos
- **Error**: Toasts rojos o modales de acción requerida
- **Crítico**: Modales que bloquean flujo hasta resolución

## 7. Accesibilidad en Interacciones

### 7.1 Navegación Teclado
- Todos los elementos interactivos deben ser accesibles vía `Tab`
- Orden lógico de tabulación siguiendo flujo visual
- Uso adecuado de `aria-label`, `aria-labelledby`, `aria-describedby`
- Manejo de `Enter` y `Space` para activar elementos
- Escape para cerrar modales y dropdowns

### 7.2 Lectores de Pantalla
- States dinámicos anunciados mediante `aria-live="polite"`
- Etiquetas claras para todos los controles de formulario
- Indicadores de estado (cargando, vacío, error) claramente comunicados
- Jerarquía de encabezados correcta (h1, h2, h3, etc.)

### 7.3 Contraste y Visual
- Relación de contraste mínima 4.5:1 para texto normal
- Relación de contraste mínima 3:1 para texto grande y componentes UI
- No depender únicamente del color para transmitir información
- Área táctil mínima de 48x48dp

## 8. Rendimiento en Interacciones

### 8.1 Optimizaciones
- **Debouncing**: Para búsquedas que involucran API externas o cálculos costosos
- **Throttling**: Para eventos de scroll o resize que actualizan UI
- **Virtualization**: Para listas largas (>50 elementos)
- **Request Animation Frame**: Para animaciones personalizadas

### 8.2 Prevención de Jank
- Evitar layout thrash (leer/escribir propiedades DOM en bucle)
- Usar `requestIdleCallback` para trabajo de baja prioridad cuando esté disponible
- Minimizar repintados y reflows durante transiciones

## 9. Testing de Interacciones

### 9.1 Casos de Prueba Esenciales
- Flujo feliz: Interacción básica funciona como se espera
- Estados vacíos: Manejo correcto cuando no hay datos
- Estados de error: Recuperación gracia de fallos
- Estados de carga: Transiciones suaves entre cargando y contenido
- Accesibilidad: Navegación por teclado y lectores de pantalla
- Rendimiento: No hay bloqueos notables en interacciones comunes

### 9.2 Herramientas Recomendadas
- Pruebas unitarias de funciones de filtro y transformación
- Pruebas de integración para flujos de usuario completos
- Herramientas de accesibilidad como axe-core
- Profiling de rendimiento con Chrome DevTools

## 10. Ejemplos de Implementación por Módulo

### 10.1 Módulo de Animales (animales-view.js)
Ya implementa correctamente:
- Filtrado en tiempo real con `_filtrar()` y `_setFiltro()`
- Indicadores de búsqueda vacía
- Estado vacío con mensaje accionable
- Navegación de ficha mediante hash

### 10.2 Mejores Prácticas Observadas
- Separación de preocupaciones: filtros vs búsqueda de texto
- Uso de caché para evitar reads repetidos de IndexedDB
- Actualización eficiente del DOM mediante innerHTML en lote
- Estado visual claro para resultados vacíos vs carga

### 10.3 Oportunidades de Mejora
- Añadir indicador visual cuando se aplican filtros activos
- Implementar "limpiar filtros" botón visible cuando hay filtros aplicados
- Considerar historial de búsquedas recientes
- Añadir atajos de teclado (Ej: `/` para enfocar búsqueda)

## 11. Mantenimiento y Evolución

### 11.1 Proceso de Cambio
1. Identificar necesidad de nuevo patrón o mejora
2. Documentar propuesta en este archivo
3. Implementar en componente de referencia
4. Propagar a otros módulos siguiendo el patrón de adopción gradual
5. Actualizar documentación y ejemplos
6. Capacitar al equipo de desarrollo

### 11.2 Versionamiento
Este documento sigue el versionamiento semántico:
- **Cambios mayores** (2.x.0): Rompimiento de patrones existentes
- **Cambios menores** (2.x.1): Nuevos patrones o mejoras significativas
- **Parche** (2.x.y): Correcciones, aclaraciones, ejemplos adicionales

**Versión Actual**: 1.0.0 (Establecimiento de línea base)

### 11.3 Revisión Periódica
Este documento debe revisarse cada:
- 3 meses: Para ajustes menores y aclaraciones
- 6 meses: Para incorporation de nuevos patrones observados en campo
- 12 meses: Para revisión completa y posible versión mayor

---

## Apendice A: Checklist de Implementación

### Para Nuevos Componentes:
[ ] Campo de búsqueda usa `input[type="search"]` con `.search-input`
[ ] Selectores usan `.form-select-gold`
[ ] Evento `oninput` dispara función de filtrado
[ ] Estado de filtros mantenido en objeto dedicado
[ ] Función de filtrado separa lógica de selección y texto
[ ] Mensaje de "no resultados" implementado
[ ] Todas las tarjetas son clickeables con `cursor: pointer`
[ ] Navegación usa hash params limpios (`#/entidad?id=123`)
[ ] Feedback de éxito usa toast verde
[ ] Feedback de error crítico usa modal de confirmación
[ ] Estados de carga muestran esqueleto o spinner
[ ] Estados vacíos incluyen ícono, mensaje y acción cuando aplica
[ ] Ningún uso de `alert()/confirm()/prompt()` nativos
[ ] Todos los elementos interactivos son accesibles por teclado
[ ] Contraste de colores cumple WCAG AA mínimos
[ ] Área táctil mínima 48x48dp respetada

### Para Revisiones de Código Existente:
[ ] Verificar consistencia en implementación de filtrado
[ ] Confirmar que los modales reemplazan alertas nativas
[ ] Validar que los toasts siguen el patrón de color correcto
[ ] Asegurar que los estados de carga están presentes durante async ops
[ ] Revisar que los estados vacíos son informativos y accionables
[ ] Chequear accesibilidad básica (tab order, ARIA cuando necesario)
[ ] Confirmar que no hay dependencias de timing frágil en interacciones