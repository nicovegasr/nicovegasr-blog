# nicovegasr.com

Sitio personal y blog técnico bilingüe de Nicolás Vegas Rodríguez. Está construido como un sitio estático con Astro y se publica en español e inglés.

## Desarrollo

Requiere Node.js 22.12 o superior.

```bash
npm install
npm run dev
```

## Verificación

```bash
npm run typecheck
npm run test:run
npm run build
```

## Documentación

- [Arquitectura técnica](docs/technical/architecture.md)
- [Guía de estilo](docs/design/styleguide.md)
- [Guía para imágenes](docs/design/images-styles.md)
- [Guía para vídeos y producción](videos/README.md)

## Stack

- Astro 7 y TypeScript en modo estricto
- Content Collections, Zod y Markdown
- i18n nativo de Astro para español e inglés
- CSS nativo con tokens y temas claro/oscuro
- RSS y sitemap

## Licencia

Contenido y código reservados. No se permite su reutilización sin autorización.
