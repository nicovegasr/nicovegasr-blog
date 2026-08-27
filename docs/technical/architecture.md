# Arquitectura técnica

## Visión general

El proyecto es un sitio estático de Astro. La raíz redirige a `/es`; tanto el español como el inglés usan prefijo de idioma y mantienen rutas equivalentes cuando existen.

Astro se encarga de las páginas, el renderizado estático y las Content Collections. El código propio se organiza en *vertical slices*: cada funcionalidad agrupa su modelo, su acceso al contenido y, cuando hace falta, sus componentes.

## Estructura

```text
src/
├── content.config.ts  # Colecciones y esquemas Zod
├── content/           # Markdown y recursos editoriales
├── features/          # Funcionalidades del dominio
├── i18n/              # Locales, textos y construcción de rutas
├── layouts/           # Shell compartido de las páginas
├── pages/             # Rutas de Astro por idioma
└── styles/            # Tokens y estilos globales
```

### Contenido y funcionalidades

`src/content/` responde a la convención de Astro: sus colecciones se declaran en `src/content.config.ts` y el idioma forma parte de la ruta del archivo. No debe moverse dentro de `features/`.

Cada módulo de `src/features/` separa tres responsabilidades sin introducir capas artificiales:

- `<feature>.ts`: tipos y lógica pura.
- `<feature>-repository.ts`: adaptación de `astro:content` a los tipos del dominio.
- `components/`: UI propia del módulo, solo cuando tiene sentido agruparla.

Las páginas y los componentes consumen los repositorios; no acceden directamente a `astro:content`. Esta frontera evita que los detalles de Astro se propaguen por la aplicación y permite probar la lógica de dominio de forma aislada.

## Internacionalización

`src/i18n/` es una preocupación transversal:

- `locale.ts` define los locales válidos y el idioma por defecto.
- `es.ts` y `en.ts` contienen los textos de interfaz.
- `routes.ts` transforma rutas lógicas entre idiomas.
- `entry-identifier.ts` obtiene idioma y *slug* a partir de los identificadores de las colecciones.

Las rutas se construyen mediante estas utilidades, sin hardcodear segmentos localizados en los componentes.

## Presentación

`BaseLayout.astro` concentra los estilos globales, fuentes, metadatos SEO, enlaces alternativos entre idiomas y la inicialización del tema. `layouts/` contiene el chrome compartido; los componentes específicos permanecen junto a su funcionalidad.

Los tokens viven en `src/styles/tokens.css`; `base.css` contiene el reset, la tipografía y los patrones verdaderamente globales. Los estilos de componente se definen de forma local y consumen los tokens, por lo que no dependen del tema activo.

## Calidad

Los tests se co-localizan con la lógica que cubren. La validación habitual es:

```bash
npm run typecheck
npm run test:run
npm run build
```

Consulta [la guía de estilo](../design/styleguide.md) para las decisiones visuales y [la guía de imágenes](../design/images-styles.md) antes de crear o editar recursos gráficos.
