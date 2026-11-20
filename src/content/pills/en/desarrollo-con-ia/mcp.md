---
kind: 'pill'
title: 'MCP'
subtitle: 'Connecting the agent to other systems'
icon: 'mcp'
order: 11
publicationDate: 2026-11-20
---

Much of the context a task needs is not in the repository: the issue with its acceptance criteria, internal documentation, the data in a database. **MCP** (*Model Context Protocol*) is an open protocol that lets an agent query those systems on its own.

## One protocol instead of N integrations

Without a standard, every agent would need its own integration with GitHub, with Jira, with Postgres… MCP splits it into two pieces:

- An **MCP server** exposes a system's tools, such as "read an issue" or "run a query".
- Any **compatible agent** can use those tools without knowing how they are built.

**Whoever publishes the server writes it once**, and it works in Claude Code, Codex, Copilot or Cursor.

## Connecting one

GitHub publishes a remote MCP server. In Claude Code it is declared in the project's `.mcp.json`:

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

From then on you can ask "Implement issue #142". The agent reads the issue with its criteria and comments, instead of waiting for you to copy it into the conversation.

## With care

⚠️ Every connected server has a price. The description of its tools takes up context even if you do not use them. And it is third-party code acting with whatever access you give it: your GitHub token, your database. **Connect only the ones you need, with the least permissions.**
