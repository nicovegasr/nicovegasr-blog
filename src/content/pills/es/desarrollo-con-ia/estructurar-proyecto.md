---
kind: 'pill'
title: 'Estructurar un proyecto'
subtitle: 'Lo que el agente lee antes de empezar'
icon: 'project-structure'
order: 7
publicationDate: 2026-11-20
---

Un agente llega nuevo a tu proyecto **en cada sesión**. No recuerda la anterior: descubre cómo se arranca, cómo se prueba y qué convenciones seguís leyendo ficheros, y eso gasta tiempo y contexto. **Lo que no encuentra, lo supone.**

Estructurar un proyecto para agentes es dejar por escrito lo que no se deduce rápido del código, en ficheros que el agente carga al empezar.

## AGENTS.md

El formato más extendido es **`AGENTS.md`**: un Markdown sin campos obligatorios, como un README pensado para agentes. Lo leen Codex, Copilot, Cursor y muchos más; Claude Code usa `CLAUDE.md` y también puede leer `AGENTS.md`.

En un proyecto con varias partes, cada carpeta puede tener el suyo. Al trabajar en una carpeta, se aplica el más cercano:

```text
inventory/
├── AGENTS.md          ← cómo se arranca, se prueba y se hace un commit
├── api/
│   └── AGENTS.md      ← capas, errores HTTP, cómo se escribe un endpoint
└── web/
    └── AGENTS.md      ← componentes, estado y estilos
```

## Qué poner y qué no

```md
# API

- Ejecuta `npm test -w api` antes de dar una tarea por terminada.
- Los controladores no acceden a la base de datos: llaman a un caso de uso.
- Los listados se paginan con `?page` y `?size` (máximo 100).
```

Sirve **lo que el agente no adivinaría**: comandos, decisiones del equipo y trampas conocidas. Sobra lo que ya dice el código o cualquier guía de estilo.

Estos ficheros son contexto, no reglas que se cumplan siempre: **cuanto más cortos y concretos, mejor se respetan**. Y hay que mantenerlos: un `AGENTS.md` desactualizado enseña al agente cómo era el proyecto, no cómo es.
