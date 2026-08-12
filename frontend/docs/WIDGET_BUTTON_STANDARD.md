# Estándar de Botones de Acción Hub

Este documento detalla el estándar de implementación para los botones de acción hub en el sistema Livestock Manager, siguiendo el patrón de "Neon Branding".

## 1. Visión General

Los Botones de Acción Hub son componentes de gran formato utilizados para acciones primarias de navegación y creación de registros. Se caracterizan por tener un icono SVG encima de una etiqueta de texto, ambos centrados verticalmente.

## 2. Especificación Visual

### 2.1 Estructura HTML Básica
```html
<div class="widget-link-btn--neon [variante-color]">
    <svg class="widget-icon">[ICONO SVG]</svg>
    <span class="widget-label">ETIQUETA DE TEXTO</span>
</div>
```

### 2.2 Variantes de Color
| Variante | Clase CSS | Color Base | Uso Típico |
| :--- | :--- | :--- | :--- |
| Success | `.neon-success` | `--c-success` (#10b981) | Acciones primarias de éxito |
| Danger | `.neon-danger` | `--c-danger` (#ef4444) | Acciones de eliminación o alerta crítica |
| Info | `.neon-info` | `--c-info` (#3b82f6) | Acciones informativas |
| Warning | `.neon-warning` | `--c-warning` (#f59e0b) | Acciones de atención o advertencia |
| Accent | `.neon-accent` | `--c-accent` (#8b5cf6) | Acciones secundarias destacadas |

### 2.3 Propiedades CSS Detalladas
```css
.widget-link-btn--neon {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px; /* Espaciado entre icono y texto */
    padding: 12px;
    min-width: 80px;
    min-height: 80px; /* Área táctil mínima 48px + padding */
    background: transparent;
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
}

/* Estado por defecto (varía por variante) */
.widget-link-btn--neon.neon-success {
    border-color: var(--c-success)30;
    background: var(--c-success)10;
}

.widget-link-btn--neon.neon-success .widget-icon {
    color: var(--c-success)80;
}

.widget-link-btn--neon.neon-success .widget-label {
    color: var(--c-success);
    font-weight: 600;
    font-size: 0.875rem;
    text-transform: uppercase;
}

/* Estados interactivos */
.widget-link-btn--neon:hover {
    background: var(--color-base)20;
    transform: scale(1.05);
}

.widget-link-btn--neon:active {
    transform: scale(0.95);
}

.widget-link-btn--neon:focus-visible {
    outline: 2px solid var(--color-base);
    outline-offset: 2px;
}
```

### 2.4 Especificaciones de Iconos y Texto
- **Icono SVG**: 
  - Tamaño: 24x24px (vista predeterminada)
  - Color: 80% de opacidad del color base
  - Debe ser importado desde `js/icons.js` usando `Icons.nombreDelIcono()`
- **Etiqueta de Texto**:
  - Fuente: Sistema predeterminado (Inter/Outfit)
  - Peso: 600 (Semi-bold)
  - Tamaño: 0.875rem (14px)
  - Transformación: uppercase
  - Color: 100% del color base
  - Máximo de caracteres: Recomendado 12-15 para evitar overflow

## 3. Implementación en JavaScript/HTML

### 3.1 Uso Directo en HTML
```html
<div class="widget-link-btn--neon neon-success" 
     onclick="location.href='/ruta/destino'">
    ${Icons.agregar()}
    <span>Nuevo Registro</span>
</div>
```

### 3.2 Función Helper Recomendada
```javascript
function crearBotonAccionHub(iconoFunc, texto, variante, onclickHandler) {
    const variantesValidas = ['success', 'danger', 'info', 'warning', 'accent'];
    const varianteClase = variantesValidas.includes(variante) 
        ? `neon-${variante}` 
        : 'neon-info'; // fallback
    
    return `
        <div class="widget-link-btn--neon ${varianteClase}" 
             onclick="${typeof onclickHandler === 'function' ? onclickHandler.toString() : onclickHandler}">
            ${typeof iconoFunc === 'function' ? iconoFunc() : iconoFunc}
            <span class="widget-label">${texto.toUpperCase()}</span>
        </div>
    `;
}

// Uso:
// crearBotonAccionHub(Icons.agregar, 'Nuevo Animal', 'success', "location.hash='/animal'");
```

### 3.3 Integración con Contenedor FAB
```html
<div class="fab-container" onclick="location.hash='/animal'">
    <span class="fab-label">Nuevo Animal</span>
    <button class="fab-btn">${Icons.fabPlus()}</button>
</div>
```

## 4. pautas de Uso

### 4.1 Cuándo Usar
- Acciones de navegación principal
- Botones de creación primaria (+)
- Accesos rápidos en pantalla de inicio
- Acciones de confirmación en diálogos

### 4.2 Cuándo No Usar
- Acciones secundarias dentro de formularios (usar botones estándar)
- Acciones que requieren validación previa compleja
- Elementos que no son principalmente de navegación o creación

### 4.3 Tamaños y Espaciado
- **Tamaño Mínimo**: 80x80px (incluye padding para alcanzar 48px área táctil efectiva)
- **Espaciado Interno**: 12px padding en todos los lados
- **Espaciado entre Icono y Texto**: 8px
- **Radio de Esquina**: 8px (consistente con otros componentes)

## 5. Estados Visuales

### 5.1 Estado Normal
- Fondo: 10% de opacidad del color base
- Borde: 2px sólido al 30% de opacidad del color base
- Icono: 80% de opacidad del color base
- Texto: 100% de opacidad del color base

### 5.2 Estado Hover
- Fondo: 20% de opacidad del color base
- Transform: scale(1.05)
- Transición: 0.2s ease

### 5.3 Estado Pressed/Active
- Transform: scale(0.95)
- Transición: 0.1s ease

### 5.4 Estado Enfocado (Keyboard/Accessibility)
- Outline: 2px sólido del color base
- Outline-offset: 2px

## 6. Integración con el Sistema de Diseño

### 6.1 Relación con Otros Componentes
- Consiste con el patrón de bordes y radios del sistema
- Usa los mismos colores semánticos que Status Badge y otros componentes
- Sigue la misma escala de espaciado (múltiplos de 4px)
- Comparte el mismo sistema de transiciones y animaciones

### 6.2 Tokens de Diseño Relacionados
Aunque implementado principalmente mediante clases, los valores se derivan de:
- `--c-success`, `--c-danger`, etc. para colores
- `--space-3` (12px) para padding
- `--space-2` (8px) para gap icono-texto
- `--radius-md` (8px) para border-radius
- `--transition-normal` (250ms) para transiciones

## 7. Ejemplos de Implementación

### 7.1 Botón de Creación Primaria
```html
<div class="widget-link-btn--neon neon-success" 
     onclick="location.hash='/animal'">
    ${Icons.agregar()}
    <span>Nuevo Animal</span>
</div>
```

### 7.2 Botón de Eliminación
```html
<div class="widget-link-btn--neon neon-danger" 
     onclick="eliminarRegistro(id)">
    ${Icons.eliminar()}
    <span>Eliminar</span>
</div>
```

### 7.3 Botón de Información
```html
<div class="widget-link-btn--neon neon-info" 
     onclick="mostrarAyuda()">
    ${Icons.informacion()}
    <span>Ayuda</span>
</div>
```

### 7.4 Botón de Advertencia
```html
<div class="widget-link-btn--neon neon-warning" 
     onclick="reintentarOperacion()">
    ${Icons.advertencia()}
    <span>Reintentar</span>
</div>
```

## 8. Consideraciones de Rendimiento

- Los SVG deben ser importados eficientemente desde `js/icons.js`
- Evitar estilos inline cuando sea posible (usar clases CSS)
- Los event listeners deben ser delegados cuando se usan en listas grandes
- Considerar usar `requestAnimationFrame` para animaciones complejas

## 9. Accesibilidad

- **Roles ARIA**: Cuando no sea un botón nativo, agregar `role="button"`
- **Tabindex**: Asegurar que sea navegable por teclado (`tabindex="0"`)
- **Labels ARIA**: Proveer `aria-label` descriptivo cuando el texto no sea suficiente
- **Contraste**: Asegurar relación de contraste mínima 4.5:1 (WCAG AA)
- **Tamaño objetivo táctil**: Mínimo 48x48dp

## 10. Mantenimiento y Actualizaciones

Cualquier cambio a este estándar debe:
1. Ser documentado en este archivo
2. Mantener compatibilidad hacia atrás cuando sea posible
3. Ser probado en diferentes tamaños de pantalla y dispositivos
4. Incluir actualización de la documentación de componentes relacionados
5. Ser revisado por el equipo de frontend/UX