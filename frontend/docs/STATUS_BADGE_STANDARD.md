# Estándar de Status Badge (Viñeta Iluminada)

Este documento detalla el estándar de implementación para las "etiquetas de estado" o "badges" en el sistema Livestock Manager, siguiendo el patrón de "Neon Branding" y "Aglutinadora".

## 1. Visión General

El Status Badge es un componente visual que comunica el estado actual de una entidad (animal, tratamiento, venta, etc.) mediante codificación de color neón y efecto de retroiluminación.

## 2. Especificación Visual

### 2.1 Estructura HTML Básica
```html
<div style="background:var(--color-semantico)15; 
            color:var(--color-semantico); 
            border:1px solid var(--color-semantico)40; 
            filter: drop-shadow(0 0 4px var(--color-semantico)); 
            padding: 2px 8px; 
            border-radius: 6px; 
            font-size: 0.6rem; 
            font-weight: 900; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
            white-space: nowrap;">
    ESTADO
</div>
```

### 2.2 Valores de Color Semántico
| Estado | Variable CSS | Hex | Ejemplo de Uso |
| :--- | :--- | :--- | :--- |
| Activo / Éxito | `--c-success` | `#10b981` | `<div style="background:var(--c-success)15; ...">ACTIVO</div>` |
| En Tratamiento / Pendiente | `--c-warning` | `#f59e0b` | `<div style="background:var(--c-warning)15; ...">EN TRATAMIENTO</div>` |
| Crítico / Retirada | `--c-danger` | `#ef4444` | `<div style="background:var(--c-danger)15; ...">CRÍTICO</div>` |
| Vendido / Historial | `--c-info` | `#3b82f6` | `<div style="background:var(--c-info)15; ...">VENDIDO</div>` |
| En Proceso | `--c-accent` | `#8b5cf6` | `<div style="background:var(--c-accent)15; ...">EN PROCESO</div>` |

### 2.3 Propiedades CSS Detalladas
- **background**: `var(--color-semantico)15` - 15% de opacidad del color
- **color**: `var(--color-semantico)` - Color sólido para el texto
- **border**: `1px solid var(--color-semantico)40` - 40% de opacidad del color
- **filter**: `drop-shadow(0 0 4px var(--color-semantico))` - Sombra exterior para efecto neón
- **padding**: `2px 8px` - Espaciado interno
- **border-radius**: `6px` - Esquinas redondeadas (forma de cápsula)
- **font-size**: `0.6rem` - Tamaño de texto pequeño pero legible
- **font-weight**: `900` - Peso máximo para buena legibilidad
- **text-transform**: `uppercase` - Siempre en mayúsculas
- **letter-spacing**: `0.5px` - Espaciado ligeramente aumentado entre letras
- **white-space**: `nowrap` - Evita que el texto se envuelva

## 3. Implementación en JavaScript

### 3.1 Helper Function Recomendado
```javascript
function crearStatusBadge(estado, colorVariable) {
    return `<div style="background:${colorVariable}15; 
                           color:${colorVariable}; 
                           border:1px solid ${colorVariable}40; 
                           filter: drop-shadow(0 0 4px ${colorVariable}); 
                           padding: 2px 8px; 
                           border-radius: 6px; 
                           font-size: 0.6rem; 
                           font-weight: 900; 
                           text-transform: uppercase; 
                           letter-spacing: 0.5px; 
                           white-space: nowrap;">
                ${estado.toUpperCase()}
            </div>`;
}
```

### 3.2 Uso en _getAnimalCardProps (ejemplo)
```javascript
_getAnimalCardProps(a, rebano) {
    // Determinar color según estado
    let colorEstado;
    switch (a.estado) {
        case 'activo':
            colorEstado = 'var(--c-success)';
            break;
        case 'en_tratamiento':
        case 'pendiente':
            colorEstado = 'var(--c-warning)';
            break;
        case 'critico':
        case 'retirada':
            colorEstado = 'var(--c-danger)';
            break;
        case 'vendido':
        case 'historial':
            colorEstado = 'var(--c-info)';
            break;
        default:
            colorEstado = 'var(--c-info)'; // fallback
    }
    
    return {
        // ... otras propiedades
        badge: `<div style="background:${colorEstado}15; 
                               color:${colorEstado}; 
                               border:1px solid ${colorEstado}40; 
                               filter: drop-shadow(0 0 4px ${colorEstado}); 
                               padding: 2px 8px; 
                               border-radius: 6px; 
                               font-size: 0.6rem; 
                               font-weight: 900; 
                               text-transform: uppercase; 
                               letter-spacing: 0.5px; 
                               white-space: nowrap;">
                    ${a.estado || 'activo'}
                </div>`
    };
}
```

## 4. Posicionamiento en Card de Registro

Según el estándar de posicionamiento (ver card-registro-positioning-standard.md):

- **Ubicación**: Esquina superior derecha dentro del contenedor card-registro
- **Contenedor Padre**: `<div class="flex flex-col items-end justify-between flex-shrink-0">`
- **Contenedor Inmediato**: `<div class="top-part">` (primer hijo del contenedor padre)
- **Alineación**: Alineado a la derecha y al inicio vertical (items-start)

## 5. Accesibilidad

- **Contraste**: La relación de contraste entre texto y fondo debe cumplir con WCAG AA (4.5:1 para texto normal)
- **Tamaño objetivo táctil**: Mínimo 44x44dp cuando se usa en pantallas táctiles
- **Lectura por pantalla**: El texto debe ser legible por lectores de pantalla (no usar solo colores para transmitir información)

## 6. Ejemplos de Implementación

### 6.1 Animal Aktivo
```html
<div style="background:var(--c-success)15; 
            color:var(--c-success); 
            border:1px solid var(--c-success)40; 
            filter: drop-shadow(0 0 4px var(--c-success)); 
            padding: 2px 8px; 
            border-radius: 6px; 
            font-size: 0.6rem; 
            font-weight: 900; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
            white-space: nowrap;">
    ACTIVO
</div>
```

### 6.2 Tratamiento Pendiente
```html
<div style="background:var(--c-warning)15; 
            color:var(--c-warning); 
            border:1px solid var(--c-warning)40; 
            filter: drop-shadow(0 0 4px var(--c-warning)); 
            padding: 2px 8px; 
            border-radius: 6px; 
            font-size: 0.6rem; 
            font-weight: 900; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
            white-space: nowrap;">
    PENDIENTE
</div>
```

## 7. Mantenimiento y Actualizaciones

Cualquier cambio a este estándar debe:
1. Ser documentado en este archivo
2. Ser consistente con el sistema de diseño general
3. Ser revisado por el equipo de diseño/UI/UX
4. Actualizar todas las instancias existentes en el códigobase