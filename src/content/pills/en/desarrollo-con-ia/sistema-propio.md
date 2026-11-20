---
kind: 'pill'
title: 'Building your own system'
subtitle: 'Each instruction in its place'
icon: 'own-system'
order: 12
publicationDate: 2026-11-20
---

With all of the above, each developer ends up assembling their own **way of working**: where they keep what the agent should remember, where processes and skills come from, and how they reach each project. **There is no single way to do it.**

## The available pieces

- **The agent's native memory**: user-level instructions, or the memory some agents write on their own from your corrections.
- **Persistent memory tools**, such as Engram, which keep decisions and learnings across sessions and share them with different agents through MCP.
- **Team repositories** with processes, skills and agents, like the ones in the pill on standardising processes.
- **Plugins**, which in Claude Code or Copilot bundle skills, agents, hooks and MCP servers to install in one go.

## Three layers

The simplest way to organise them is by scope:

```text
Project   → the repository's AGENTS.md: commands and conventions for that code
Team      → a plugin or shared repository: processes, skills and agents
Personal  → user instructions and memory: your preferences and learnings
```

When you ask for an endpoint, the agent combines all three: the project's conventions, the team's process and your way of working.

## Each thing in its place

**An instruction in the wrong layer shows.** A personal preference in the team's `AGENTS.md` ends up in everyone's session. A project convention in your personal memory reaches nobody else.

And memory needs reviewing too: **an outdated learning guides the agent as confidently as a correct one**.
