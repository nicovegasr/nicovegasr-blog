---
kind: 'pill'
title: 'Por dónde empezar'
subtitle: 'Cómo montaría el entorno hoy'
icon: 'workspace'
order: 14
publicationDate: 2026-11-20
---

Esta píldora no es teoría: es lo que yo haría si empezara hoy a trabajar con agentes. Uso Claude Code, Codex y Copilot según el proyecto, así que no va de una herramienta, sino de una forma de trabajar.

## Herramienta

**Empieza con un solo agente y aprende a usarlo bien.** Si en el trabajo ya tienes Copilot, ese; si no, Claude Code o Codex en la terminal.

Lo que aprendes con él (dar contexto, estructurar el proyecto, escribir skills) sirve para todos. `AGENTS.md` y las skills son formatos abiertos, así que **cambiar de agente después cuesta poco**.

## Permisos

Yo trabajo en modo automático desde el principio: el agente no me pide permiso para cada comando. **Lo que lo hace seguro son los raíles** que pones antes de la primera tarea:

- Sandbox activado, para que solo escriba en el proyecto y solo se conecte a lo que permites.
- `deny` para el `.env` y tus claves.

En un entorno crítico o empresarial, además, revisa tú el código y decide cuándo se hace cada commit o push. Que los lance el agente no es un problema, siempre que sea porque se lo pides tú y no algo que hace por su cuenta.

## Cómo pedir las tareas

Empieza cada tarea diciendo **qué quieres conseguir y qué tiene que cumplir para darla por buena**.

Si todavía no lo tienes claro, que te pregunte el agente antes de empezar. Para eso hay skills como [brainstorming](https://skills.sh/obra/superpowers/brainstorming), que convierte una idea en un diseño antes de tocar código, o [grill-me](https://skills.sh/mattpocock/skills/grill-me), de Matt Pocock, que te interroga hasta que el plan no deja dudas.

## Instrucciones

- Un `AGENTS.md` mínimo en cada proyecto, con comandos y convenciones. Crece cada vez que corriges lo mismo dos veces.
- Tus preferencias en la memoria de usuario (`~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`): idioma, estilo y lo que no quieres que haga.

## Skills

Antes de escribir una, **mira si ya existe**. [skills.sh](https://skills.sh) es un directorio abierto con skills para muchas tareas comunes, y la skill `find-skills` le enseña al propio agente a buscar en él:

```bash
npx skills add https://github.com/vercel-labs/skills --skill find-skills
```

Una skill trae instrucciones y scripts de un tercero que el agente va a seguir, así que ponle raíles en tu memoria de usuario:

```md
## Instalar skills

- Solo skills con más de 1.000 descargas o de fuentes conocidas, como Anthropic o Vercel.
- Solo si pasan las auditorías de seguridad que muestra skills.sh.
- Antes de instalarla, lee el SKILL.md y sus scripts y dime qué hacen.
```

**Las tuyas tienen sentido para lo que se hace a tu manera o a la de tu equipo**: cómo creáis un endpoint, cómo preparáis una release.

## Hábitos

- **Una intención por conversación.** Si aparece otra cosa a mitad, apúntala y ábrela aparte.
- **Cierra con todo ordenado.** Al terminar, los cambios están probados y guardados, o sabes por qué no.
- **Un documento de pendientes.** Lo que queda abierto va a un fichero, no a la conversación. La siguiente sesión, tuya o del agente, empieza leyéndolo.
- **Limpia el contexto entre tareas.** Con las ventanas actuales ya no es tan necesario, pero evita que una tarea arrastre restos de la anterior.
- **Revisa el diff según la tarea.** Un cambio de texto no se revisa igual que una migración. Decidir cuánto revisar es criterio, y eso no lo pone el agente.
