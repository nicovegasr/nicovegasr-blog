---
kind: 'pill'
title: 'MCP'
subtitle: 'Conectar el agente con otros sistemas'
icon: 'mcp'
order: 11
publicationDate: 2026-11-20
---

Gran parte del contexto que necesita una tarea no está en el repositorio: la issue con los criterios de aceptación, la documentación interna, los datos de una base de datos. **MCP** (*Model Context Protocol*) es un protocolo abierto para que un agente consulte esos sistemas por su cuenta.

## Un protocolo en lugar de N integraciones

Sin un estándar, cada agente necesitaría su propia integración con GitHub, con Jira, con Postgres… MCP lo separa en dos piezas:

- Un **servidor MCP** expone herramientas de un sistema, como «leer una issue» o «ejecutar una consulta».
- Cualquier **agente compatible** puede usar esas herramientas sin saber cómo están hechas.

**Quien publica el servidor lo escribe una vez**, y funciona en Claude Code, Codex, Copilot o Cursor.

## Conectar uno

GitHub publica un servidor MCP remoto. En Claude Code se declara en el `.mcp.json` del proyecto:

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    }
  }
}
```

A partir de ahí puedes pedir «Implementa la issue #142». El agente lee la issue con sus criterios y comentarios, en lugar de esperar a que la copies en la conversación.

## Con cuidado

⚠️ Cada servidor conectado tiene un precio. La descripción de sus herramientas ocupa contexto aunque no las uses. Y es código de terceros que actúa con el acceso que le des: tu token de GitHub, tu base de datos. **Conecta solo los que necesites, con los permisos mínimos.**
