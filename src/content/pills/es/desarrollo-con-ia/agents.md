---
kind: 'pill'
title: 'Agents'
subtitle: 'Especialistas con su propio contexto'
icon: 'agents'
order: 10
publicationDate: 2026-11-20
---

Hasta ahora, un solo agente lo hace todo en una sola conversación. Eso tiene un límite: cada fichero que lee para una tarea secundaria se queda ocupando su ventana de contexto. Aquí entran dos ideas que suelen ir juntas.

## Custom agents: especialistas con nombre

Un **custom agent** es una configuración con nombre: sus propias instrucciones, las herramientas que puede usar y, si quieres, otro modelo. En Claude Code es un fichero en `.claude/agents/`:

```md
---
name: api-reviewer
description: Revisa cambios en la API de inventario contra las convenciones del equipo. Úsalo después de modificar un endpoint.
tools: Read, Grep, Glob
---

Revisa el diff. Comprueba la paginación, los códigos de error y los tests.
Devuelve solo los problemas encontrados, con fichero y línea.
```

Fíjate en `tools`: solo puede leer. Un revisor que no puede editar no va a «arreglar» por su cuenta lo que revisa.

## Subagentes: trabajar en otra ventana

Un **subagente** es un agente que el principal lanza para una tarea concreta. Trabaja en **su propia ventana de contexto** y **devuelve solo el resultado**.

Imagina que acabas de añadir un endpoint. El agente principal delega la revisión en `api-reviewer`, que lee quince ficheros en su ventana y devuelve tres problemas. **La conversación principal recibe esos tres problemas, no los quince ficheros.**

## Cuándo compensan

Compensan en tareas que se pueden separar y que generan mucho ruido: revisar, investigar o buscar en todo el código. Tienen su coste:

- El subagente no ve la conversación. **Lo que no le pases en el encargo, no lo sabe.**
- Hay más configuración que mantener.
- Su trabajo también gasta tokens, como la sesión principal.
