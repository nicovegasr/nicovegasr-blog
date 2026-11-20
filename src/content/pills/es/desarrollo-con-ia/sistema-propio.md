---
kind: 'pill'
title: 'Personalizar un sistema propio'
subtitle: 'Cada instrucción en su sitio'
icon: 'own-system'
order: 12
publicationDate: 2026-11-20
---

Con todo lo anterior, cada desarrollador acaba montando su **sistema de trabajo**: dónde guarda lo que el agente debe recordar, de dónde salen los procesos y las skills, y cómo llegan a cada proyecto. **No hay una forma única de hacerlo.**

## Las piezas disponibles

- **La memoria nativa del agente**: instrucciones a nivel de usuario o la memoria que algunos agentes escriben por su cuenta a partir de tus correcciones.
- **Herramientas de memoria persistente**, como Engram, que guardan decisiones y aprendizajes entre sesiones y los comparten con distintos agentes a través de MCP.
- **Repositorios de equipo** con procesos, skills y agentes, como los de la píldora sobre estandarizar procesos.
- **Plugins**, que en Claude Code o Copilot empaquetan skills, agentes, hooks y servidores MCP para instalarlos de una vez.

## Tres capas

La forma más sencilla de ordenarlas es por alcance:

```text
Proyecto  → AGENTS.md del repositorio: comandos y convenciones de ese código
Equipo    → plugin o repositorio compartido: procesos, skills y agentes
Personal  → instrucciones de usuario y memoria: tus preferencias y aprendizajes
```

Cuando pides un endpoint, el agente combina las tres: las convenciones del proyecto, el proceso del equipo y tu forma de trabajar.

## Cada cosa en su sitio

**Una instrucción en la capa equivocada se nota.** Una preferencia tuya en el `AGENTS.md` del equipo acaba en la sesión de todos. Una convención del proyecto en tu memoria personal no le llega a nadie más.

Y la memoria también se revisa: **un aprendizaje desactualizado guía al agente con la misma seguridad que uno correcto**.
