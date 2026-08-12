# Tokens de Diseño

Este documento define los tokens de diseño (CSS Custom Properties) utilizados en todo el sistema Livestock Manager para asegurar consistencia visual y facilitar actualizaciones temáticas.

## 1. Visión General

Los tokens de diseño son variables CSS que almacenan valores de diseño reutilizables como colores, espaciado, tipografía, sombras, etc. Este enfoque centraliza las decisiones de diseño y permite cambios globales fáciles.

## 2. Tokens de Color

### 2.1 Colores Semánticos (Base)
```css
/* Colores primarios semánticos */
--c-success: #10b981;   /* Éxito, acciones primarias */
--c-danger: #ef4444;    /* Peligro, eliminación, alertas */
--c-warning: #f59e0b;   /* Advertencia, atención */
--c-info: #3b82f6;      /* Información, datos técnicos */
--c-accent: #8b5cf6;    /* Acento secundario, sanidad, genética */
--p-gold: #fbbf24;      /* Oro maestro, identificadores primarios */
--c-orange: #f97316;    /* Variantes de naranja para específicas especies */

/* Texto y neutrales */
--text-primary: #111827;     /* Texto principal */
--text-s: #94a3b8;           /* Texto secundario, metá-, placeholders */
--text-muted: #6b7280;       /* Texto atenuado */
--border-222: rgba(255,255,255,0.13); /* Bordes primarios */
--border-444: rgba(255,255,255,0.27); /* Bordes secundarios */
```

### 2.2 Fondos y Superficies
```css
/* Fondos principales */
--background: #0f172a;       /* Fondo oscuro principal (modo prémium) */
--surface: #f9fafb;          /* Fondo claro de tarjetas y secciones */
--mixed-black: rgba(0,0,0,0.02); /* Fondos ligeramente oscuros para secciones internas */

/* Estados de hover/active */
--hover-overlay: rgba(255,255,255,0.04);    /* Sobre capa clara */
--hover-overlay-dark: rgba(0,0,0,0.04);     /* Sobre capa oscura */
--active-overlay: rgba(255,255,255,0.08);   /* Estado presionado claro */
--active-overlay-dark: rgba(0,0,0,0.08);    /* Estado presionado oscuro */
```

### 2.3 Colores de Estado para Badges (con transparencias predefinidas)
```css
/* Para uso directo en badges - fondo 15% + borde 40% */
--badge-success-bg: var(--c-success)15;
--badge-success-border: var(--c-success)40;
--badge-warning-bg: var(--c-warning)15;
--badge-warning-border: var(--c-warning)40;
--badge-danger-bg: var(--c-danger)15;
--badge-danger-border: var(--c-danger)40;
--badge-info-bg: var(--c-info)15;
--badge-info-border: var(--c-info)40;
--badge-accent-bg: var(--c-accent)15;
--badge-accent-border: var(--c-accent)40;
```

## 3. Tokens de Tipografía

### 3.1 Familia de Fuentes
```css
/* Familias de fuentes */
--font-sans: 'Inter', 'Outfit', system-ui, -apple-system, sans-serif;
--font-display: 'Sora', 'Cabinet Grotesk', system-ui, -apple-system, sans-serif;
--font-mono: 'Space Mono', 'JetBrains Mono', monospace;
```

### 3.2 Tamaños de Fuente (Escala)
```css
/* Escala tipográfica basada en rem (16px base) */
--text-xs: 0.62rem;   /* 10px - Metadatos mínimos */
--text-sm: 0.75rem;   /* 12px - Etiquetas, captions */
--text-base: 0.875rem; /* 14px - Texto corporal */
--text-lg: 1.05rem;   /* 16.8px - Títulos de sección */
--text-xl: 1.25rem;   /* 20px - Títulos de módulo */
--text-2xl: 1.5rem;   /* 24px - Subtítulos importantes */
--text-3xl: 1.6rem;   /* 25.6px - KPIs principales */
--text-4xl: 2rem;     /* 32px - Encabezados principales */
```

### 3.3 Pesos de Fuente
```css
/* Pesos de fuente */
--font-weight-light: 300;
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
--font-weight-extrabold: 800;
--font-weight-black: 900;

/* Usos específicos */
--font-weight-label: 900;      /* Para etiquetas en mayúsculas */
--font-weight-title: 950;      /* Para títulos principales (pseudo-peso) */
--font-weight-meta: 800;       /* Para metadatos destacados */
```

### 3.4 Alturas de Línea
```css
/* Alturas de línea */
--leading-none: 1;
--leading-tight: 1.25;
--leading-snug: 1.375;
--normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose: 2;
```

### 3.5 Espaciado de Letras
```css
/* Espaciado de letras (tracking) */
--tracking-tighter: -0.05em;
--tracking-tight: -0.025em;
--tracking-normal: 0;
--tracking-wide: 0.025em;
--tracking-wider: 0.05em;
--tracking-widest: 0.1em;
```

## 4. Tokens de Espaciado

### 4.1 Espaciado Base (Sistema de 4px)
```css
/* Escala de espaciado basada en increments de 4px */
--space-0: 0px;
--space-px: 1px;
--space-0.5: 2px;
--space-1: 4px;
--space-1.5: 6px;
--space-2: 8px;
--space-2.5: 10px;
--space-3: 12px;
--space-3.5: 14px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-7: 28px;
--space-8: 32px;
--space-9: 36px;
--space-10: 40px;
--space-11: 44px;
--space-12: 48px;
--space-14: 56px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
--space-28: 112px;
--space-32: 128px;
```

### 4.2 Espaciado Específico de Componentes
```css
/* Espaciado interno de componentes comunes */
--card-padding: var(--space-6);     /* 24px - padding interno de tarjetas */
--form-padding: var(--space-5);     /* 20px - padding de formularios */
--modal-padding: var(--space-6);    /* 24px - padding de modales */
--tooltip-padding: var(--space-2);  /* 8px - padding de tooltips */

/* Espaciado entre elementos */
--gap-1: var(--space-1);    /* 4px */
--gap-2: var(--space-2);    /* 8px */
--gap-3: var(--space-3);    /* 12px */
--gap-4: var(--space-4);    /* 16px */
--gap-5: var(--space-5);    /* 20px */
--gap-6: var(--space-6);    /* 24px */
--gap-8: var(--space-8);    /* 32px */
```

### 4.3 Radio de Borde
```css
/* Radio de borde */
--radius-none: 0px;
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 12px;
--radius-2xl: 16px;
--radius-3xl: 24px;
--radius-full: 9999px;      /* Para círculos y cápsulas */

/* Usos específicos */
--radius-button: var(--radius-md);    /* 6px - botones estándar */
--radius-input: var(--radius-md);     /* 6px - inputs */
--radius-card: var(--radius-lg);      /* 8px - tarjetas */
--radius-modal: var(--radius-lg);     /* 8px - modales */
--radius-badge: var-radius-md;        /* 6px - badges */
--radius-fab: 50%;                   /* Círculo perfecto para FAB */
```

## 5. Tokens de Sombra y Elevación

### 5.1 Sombras de Caja
```css
/* Elevación mediante sombras */
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
--shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06);

/* Contexto específico */
--shadow-card: var(--shadow-md);
--shadow-dropdown: var(--shadow-lg);
--shadow-modal: var(--shadow-xl);
--shadow-fab: 0 4px 12px 0 rgba(0, 0, 0, 0.15);
```

### 5.2 Sombras de Texto
```css
/* Para efectos de texto especial (usar con moderación) */
--text-shadow-sm: 0 1px 1px rgba(0,0,0,0.1);
```

## 6. Tokens de Transición y Animación

### 6.1 Duraciones
```css
/* Duraciones de transición */
--duration-50: 50ms;
--duration-100: 100ms;
--duration-150: 150ms;
--duration-200: 200ms;
--duration-250: 250ms;
--duration-300: 300ms;
--duration-350: 350ms;
--duration-400: 400ms;
--duration-500: 500ms;
--duration-700: 700ms;
--duration-1000: 1000ms;
```

### 6.2 Funciones de Easing
```css
/* Funciones de easing (curvas de Bezier) */
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in-out-back: cubic-bezier(0.68, -0.55, 0.265, 1.55);

/* Usos específicos */
--transition-fast: var(--duration-150) var(--ease-in-out);
--transition-normal: var(--duration-250) var(--ease-in-out);
--transition-slow: var(--duration-350) var(--ease-in-out);
```

### 6.3 Animaciones Predefinidas
```css
/* Animaciones de clave común */
--animate-pulse: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
--animate-bounce: bounce 1s infinite;
--animate-spin: spin 1s linear infinite;
--animate-ping: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;

/* Definiciones de keyframes (deben ir en CSS global) */
/*
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .5; }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-25%); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes ping {
  75%, 100% { transform: scale(2); opacity: 0; }
}
*/
```

## 7. Tokens de Z-index

### 7.1 Capas de Interfaz
```css
/* Capas de apilamiento */
--z-index-0: 0;
--z-index-10: 10;
--z-index-20: 20;
--z-index-30: 30;
--z-index-40: 40;
--z-index-50: 50;
--z-index-header: 1000;    /* Barra de navegación/fija */
--z-index-dropdown: 1500;  /* Menús desplegables */
--z-index-sticky: 1600;    /* Elementos pegajosos */
--z-index-fixed: 1700;     /* Posición fija */
--z-index-modal-backdrop: 1800; /* Fondos de modales */
--z-index-modal: 1900;     /* Modales */
--z-index-popover: 2000;   /* Popovers y tooltips */
--z-index-toast: 2100;     /* Notificaciones toast */
--z-index-loading: 2200;   /* Indicadores de carga fullscreen */
```

## 8. Tokens Específicos de Componentes

### 8.1 Botones
```css
/* Botones comunes */
--btn-font-size: var(--text-base);
--btn-font-weight: 600;
--btn-px: var(--space-3);    /* 12px padding horizontal */
--btn-py: var(--space-2);    /* 8px padding vertical */
--btn-border-radius: var(--radius-md);
--btn-transition: var(--transition-normal);

/* Estados de botón */
--btn-hover-opacity: 0.9;
--btn-active-scale: 0.95;
--btn-disabled-opacity: 0.5;
```

### 8.2 Inputs y Formularios
```css
/* Inputs y formularios */
--input-font-size: var(--text-base);
--input-px: var(--space-3);     /* 12px */
--input-py: var(--space-2);     /* 8px */
--input-border-radius: var(--radius-md);
--input-border-width: 1px;
--input-border-color: var(--border-222);
--input-focus-ring: 0 0 0 3px rgba(59, 130, 246, 0.5);
--input-disabled-opacity: 0.5;
```

### 8.3 Tarjetas
```css
/* Tarjetas */
--card-border-radius: var(--radius-lg);
--card-border-width: 1px;
--card-border-color: var(--border-222);
--card-bg: var(--surface);
--card-box-shadow: var(--shadow-md);
--card-shadow-hover: var(--shadow-lg));
--card-transition: var(--transition-normal);
```

### 8.4 Badges
```css
/* Badges (etiquetas de estado) */
--badge-font-size: 0.6rem;
--badge-font-weight: 900;
--badge-letter-spacing: 0.5px;
--badge-text-transform: uppercase;
--badge-padding-y: 2px;
--badge-padding-x: 8px;
--badge-border-radius: var(--radius-md);
```

### 8.5 FAB (Floating Action Button)
```css
/* FAB - Floating Action Button */
--fab-size: 56px;
--fab-icon-size: 24px;
--fab-bg-color: var(--c-success);
--fab-icon-color: white;
--fab-shadow: var(--shadow-fab);
--fab-hover-scale: 1.05;
--fab-active-scale: 0.95;
--fab-transition: var(--transition-normal);
```

## 9. Utilizacione en CSS y JavaScript

### 9.1 Uso en CSS/SCSS
```css
/* Uso básico */
.button {
    background-color: var(--c-success);
    color: white;
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
    transition: var(--transition-normal);
}

/* Con funciones CSS */
.card {
    background-color: var(--surface);
    box-shadow: var(--shadow-md);
    border-radius: var(--radius-lg);
    padding: calc(var(--space-6) * 1.5); /* 36px */
}

/* Para temas diferentes */
[data-theme="dark"] {
    --background: #0f172a;
    --surface: #1e293b;
    --text-primary: #f8fafc;
}
```

### 9.2 Uso en JavaScript
```javascript
// Obtener valor de variable CSS
const primaryColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--c-success').trim();

// Establecer valor de variable CSS (para temas dinámicos)
document.documentElement.style.setProperty('--c-success', '#059669');

// Crear elementos con estilos basados en tokens
const badge = document.createElement('div');
badge.style.backgroundColor = `var(--c-warning)15`;
badge.style.color = 'var(--c-warning)';
badge.style.border = `1px solid var(--c-warning)40`;
badge.style.borderRadius = 'var(--radius-md)';
// etc.
```

### 9.3 Uso en HTML (inline styles limitados)
```html
<!-- Solo cuando absolutamente necesario -->
<div style="
    background-color: var(--c-info)15;
    color: var(--c-info);
    border: 1px solid var(--c-info)40;
    border-radius: var(--radius-md);
    padding: 2px 8px;
    font-size: 0.6rem;
    font-weight: 900;
    text-transform: uppercase;
">
    Info
</div>
```

## 10. Guía de Actualización de Temas

### 10.1 Modo Oscuro
```css
/* En :root o .dark-theme */
:root {
    --background: #0f172a;
    --surface: #1e293b;
    --border-222: rgba(255,255,255,0.12);
    --border-444: rgba(255,255,255,0.22);
}

/* Los colores semánticos permanecen iguales para mantener significado */
--c-success: #10b981;      /* Igual en claro y oscuro */
--c-danger: #ef4444;       /* Igual en claro y oscuro */
/* ... */
```

### 10.2 Temas de Alto Contraste
```css
. high-contrast {
    --text-primary: #000000;
    --text-s: #333333;
    --background: #ffffff;
    --surface: #f0f0f0;
    --border-222: #000000;
    --border-444: #000000;
    
    /* Aumentar grosores de borde */
    --border-width: 2px;
}
```

## 11. Buenas Prácticas

### 11.1 Nombrado Consistente
- Usar nombres semánticos, no valores específicos (`--c-success` no `--verde-500`)
- Agrupar relacionados con prefijos comunes (`--btn-*`, `--card-*`)
- Ser específico pero no excesivamente detallado
- Documentar excepciones y usos especiales

### 11.2 Organización
- Declarar todos los tokens en `:root` para disponibilidad global
- Agrupar por categoría en el archivo CSS
- Mantener comentarios explicativos para tokens no obvios
- Usar el mismo orden de declaración en todos los archivos

### 11.3 Mantenimiento
- Revisar trimestralmente para eliminar tokens no utilizados
- Añadir nuevos tokens solo cuando sea necesario para múltiples componentes
- Documentar razones de existencia para cada nuevo token
- Mantener compatibilidad hacia atrás cuando sea posible

## 12. Archivo de Implementación

Los tokens deben definirse en `css/styles.css` dentro del selector `:root`:
```css
:root {
    /* Todos los tokens van aquí */
    --c-success: #10b981;
    /* ... resto de tokens ... */
}

/* Theme overrides */
[data-theme="dark"] {
    --background: #0f172a;
    /* ... overrides específicos ... */
}
```

## Apéndice A: Valores Completos

### Colores Completos
```
--c-success: #10b981
--c-danger: #ef4444
--c-warning: #f59e0b
--c-info: #3b82f6
--c-accent: #8b5cf6
--p-gold: #fbbf24
--c-orange: #f97316
--text-primary: #111827
--text-s: #94a3b8
--text-muted: #6b7280
--background: #0f172a
--surface: #f9fafb
--mixed-black: rgba(0,0,0,0.02)
--border-222: rgba(255,255,255,0.13)
--border-444: rgba(255,255,255,0.27)
```

### Espaciado Completo
```
--space-0: 0px
--space-px: 1px
--space-0.5: 2px
--space-1: 4px
--space-1.5: 6px
--space-2: 8px
--space-2.5: 10px
--space-3: 12px
--space-3.5: 14px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-7: 28px
--space-8: 32px
--space-9: 36px
--space-10: 40px
--space-11: 44px
--space-12: 48px
--space-14: 56px
--space-16: 64px
--space-20: 80px
--space-24: 96px
--space-28: 112px
--space-32: 128px
```

### Radio Completo
```
--radius-none: 0px
--radius-sm: 4px
--radius-md: 6px
--radius-lg: 8px
--radius-xl: 12px
--radius-2xl: 16px
--radius-3xl: 24px
--radius-full: 9999px
```

Este sistema de tokens proporciona una base sólida para mantener la consistencia visual en toda la aplicación mientras permite flexibilidad para temas personalizados y ajustes de diseño futuros.