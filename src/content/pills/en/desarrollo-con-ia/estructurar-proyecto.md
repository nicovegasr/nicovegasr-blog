---
kind: 'pill'
title: 'Structuring a project'
subtitle: 'What the agent reads before it starts'
icon: 'project-structure'
order: 7
publicationDate: 2026-11-20
---

An agent arrives at your project as a newcomer **every session**. It does not remember the previous one: it finds out how to start, how to test and which conventions you follow by reading files, which costs time and context. **Whatever it does not find, it assumes.**

Structuring a project for agents means writing down what cannot be quickly inferred from the code, in files the agent loads when it starts.

## AGENTS.md

The most widespread format is **`AGENTS.md`**: Markdown with no required fields, like a README written for agents. Codex, Copilot, Cursor and many more read it; Claude Code uses `CLAUDE.md` and can also read `AGENTS.md`.

In a project with several parts, each folder can have its own. When working in a folder, the nearest one applies:

```text
inventory/
├── AGENTS.md          ← how to start, test and commit
├── api/
│   └── AGENTS.md      ← layers, HTTP errors, how to write an endpoint
└── web/
    └── AGENTS.md      ← components, state and styles
```

## What to include and what not

```md
# API

- Run `npm test -w api` before considering a task done.
- Controllers do not access the database: they call a use case.
- Listings are paginated with `?page` and `?size` (maximum 100).
```

What helps is **what the agent would not guess**: commands, team decisions and known pitfalls. What the code or any style guide already says is noise.

These files are context, not rules that always hold: **the shorter and more concrete, the better they are followed**. And they need maintaining: an outdated `AGENTS.md` teaches the agent how the project was, not how it is.
