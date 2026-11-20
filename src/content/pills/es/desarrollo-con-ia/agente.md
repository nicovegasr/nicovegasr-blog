---
kind: 'pill'
title: 'Agente'
subtitle: 'Un modelo que usa herramientas'
icon: 'agent'
order: 6
publicationDate: 2026-11-20
---

Un **agente** es un programa que le da herramientas a un LLM y ejecuta las que el modelo pide: leer un fichero, buscar en el código, editarlo o lanzar un comando. Añade cada resultado al contexto y vuelve a preguntar al modelo, **en bucle, hasta que la tarea termina**. Claude Code, Codex o el modo agente de Copilot funcionan así.

## El bucle

Imagina que le pides a un agente que añada `GET /v1/products/out-of-stock` a tu API:

```text
modelo → buscar "products" en src/        agente → 3 ficheros encontrados
modelo → leer ProductController.ts        agente → contenido del fichero
modelo → editar ProductController.ts      agente → cambio aplicado
modelo → ejecutar npm test                agente → 1 test falla
modelo → corregir y volver a ejecutar     agente → tests en verde
```

Lo que en un chat hacías tú (buscar el código, pegarlo, aplicar el cambio, probarlo) **ahora lo hace el agente**.

## Tres formas de trabajar con él

Que pueda hacerlo todo no significa que siempre deba. La mayoría de herramientas permiten elegir cuánto decide el agente:

- **Preguntar**: responde sobre el código sin tocarlo.
- **Planificar**: propone cómo hacer la tarea y tú lo aceptas o lo corriges.
- **Ejecutar**: hace los cambios por su cuenta.

No son excluyentes. En una misma tarea es habitual preguntar para entender, planificar y después ejecutar.

## Más autonomía, más responsabilidad

**El agente actúa en tu máquina con tus permisos**, y cada resultado de una herramienta ocupa contexto. Cuanto más lo dejas hacer, más importa lo que sabe del proyecto y lo que tiene a su alcance.
