---
kind: 'pill'
title: 'Skills'
subtitle: 'Instrucciones que se cargan cuando hacen falta'
icon: 'skill'
order: 9
publicationDate: 2026-11-20
---

Una **skill** es una carpeta que enseña a un agente a hacer una tarea concreta: crear un endpoint, preparar una release, revisar una migración. Es un formato abierto y lo admiten Claude Code, Codex y Copilot, entre otros.

## Por qué no meterlo todo en AGENTS.md

Todo lo que pones en `AGENTS.md` se carga en cada sesión, **la necesites o no**. Si metes ahí el procedimiento completo de cada tarea, llenas la ventana de contexto con instrucciones que casi nunca aplican.

Las skills lo resuelven cargándose por partes:

1. Al empezar, el agente solo lee el **nombre y la descripción** de cada skill.
2. Cuando una tarea encaja con una descripción, lee las **instrucciones** completas.
3. Los **scripts y documentos** de apoyo solo se abren si las instrucciones los piden.

Así puedes tener decenas disponibles y que **cada una ocupe una línea hasta que hace falta**.

## Cómo es por dentro

```text
new-endpoint/
├── SKILL.md
├── references/
│   └── error-codes.md
└── scripts/
    └── check-openapi.sh
```

```md
---
name: new-endpoint
description: Crea o modifica endpoints REST de la API de inventario siguiendo las convenciones del equipo. Úsala al añadir o cambiar rutas HTTP.
---

1. Escribe el caso de uso y su test antes que el controlador.
2. Usa los códigos de error de references/error-codes.md.
3. Ejecuta scripts/check-openapi.sh y corrige lo que reporte.
```

⚠️ La **descripción** es lo que decide si la skill se usa. Si es vaga («ayuda con la API»), el agente no la relacionará con la tarea y nunca leerá el resto.
