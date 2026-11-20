---
kind: 'pill'
title: 'Estandarizar procesos'
subtitle: 'Una forma acordada de hacer cada tarea'
icon: 'standards'
order: 8
publicationDate: 2026-11-20
---

Un `AGENTS.md` ordena un repositorio. Pero en una empresa hay decenas de proyectos, y la forma de crear un endpoint, escribir una migración o preparar una pull request debería ser la misma en todos. **Estandarizar procesos** es escribir esa forma acordada una vez, en un sitio compartido, para que el agente de cada persona la siga en cualquier proyecto.

## Un repositorio con los procesos del equipo

```text
engineering-standards/
├── AGENTS.md                  ← qué contiene y cuándo consultarlo
└── processes/
    ├── new-endpoint.md        ← pasos, tests obligatorios y qué revisar
    ├── database-migration.md
    └── pull-request.md
```

Cada desarrollador lo enlaza desde las instrucciones de su usuario, que el agente carga en cualquier proyecto (`~/.claude/CLAUDE.md` en Claude Code o `~/.codex/AGENTS.md` en Codex):

```md
Antes de implementar, busca el proceso que corresponda en
~/work/engineering-standards/processes/ y síguelo.
```

A partir de ahí, «quiero añadir un endpoint de productos sin stock» **sigue el mismo camino para cualquiera del equipo y en cualquier repositorio**.

## Por qué compensa

- **Una sola fuente**: mejorar un proceso es un cambio en un repositorio, revisado como el código.
- **Menos variación**: el resultado depende menos de quién pidió la tarea y de cómo la pidió.
- **Incorporación más rápida**: una persona nueva y su agente trabajan como el equipo desde el primer día.

**El coste es mantenerlo vivo.** Si los procesos dejan de reflejar lo que el equipo hace, los agentes repiten con mucha disciplina una forma de trabajar que ya nadie usa.
