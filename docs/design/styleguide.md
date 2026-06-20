# Guía visual

Cómo debe verse el sitio. El detalle ejecutable vive en `src/styles/tokens.css` (valores) y `src/styles/base.css` (elementos y patrones de página). Esto solo cuenta las decisiones.

## Identidad

Editorial-dev: blanco, rotundo, con carácter de autor. Nada de gradientes difusos, glass ni blobs. La personalidad sale de tres palancas:

1. **Tipografía**: Space Grotesk (titulares, UI), Inter (cuerpo de lectura), IBM Plex Mono (meta, etiquetas, breadcrumbs).
2. **Profundidad táctil**: sombras sólidas desplazadas, nunca borrosas.
3. **Acento único lima** (`#d8ff3e`): siempre como bloque —resaltado, pill, subrayado al hover, marca de cita—, nunca como texto fino (no tendría contraste sobre papel).

## Color y tema

- Claro de fábrica; oscuro derivado redefiniendo solo los tokens de color en `[data-theme="dark"]`. Los componentes no conocen el tema, consumen `var(--color-*)`.
- Preferencia persistida en `localStorage`; un script inline fija el tema antes del primer pintado (sin parpadeo). Toggle en la barra de navegación.

## Movimiento

Sobrio e intencional: bloques que aparecen al entrar en viewport (clase `.reveal`), hover que resalta. Todo se desactiva con `prefers-reduced-motion`. Si falla el JS, el contenido se ve igual.

## Técnica

- CSS a pelo, sin framework de utilidades. Custom properties como capa de tokens.
- Elementos semánticos estilados en `base.css` (global) → las páginas ES/EN, de markup idéntico, comparten apariencia sin duplicar CSS.
- Componentes reutilizables (`layouts/`, `features/*/components/`) llevan su `<style>` scoped.
- Fuentes self-hosted vía `@fontsource` (sin petición externa en runtime).
