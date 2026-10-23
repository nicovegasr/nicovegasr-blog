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

La producción audiovisual (vídeos, guía de imágenes, voz) vive en un repositorio
privado aparte que se clona en `studio/` (ignorado por este repo).

## Stack

- Astro 7 y TypeScript en modo estricto
- Content Collections, Zod y Markdown
- i18n nativo de Astro para español e inglés
- CSS nativo con tokens y temas claro/oscuro
- RSS y sitemap

## Licencia

Contenido y código reservados. No se permite su reutilización sin autorización.
