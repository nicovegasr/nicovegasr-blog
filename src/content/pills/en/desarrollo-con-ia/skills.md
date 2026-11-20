---
kind: 'pill'
title: 'Skills'
subtitle: 'Instructions loaded when they are needed'
icon: 'skill'
order: 9
publicationDate: 2026-11-20
---

A **skill** is a folder that teaches an agent to do a specific task: create an endpoint, prepare a release, review a migration. It is an open format supported by Claude Code, Codex and Copilot, among others.

## Why not put everything in AGENTS.md

Everything in `AGENTS.md` is loaded in every session, **whether you need it or not**. If you put the full procedure for every task there, you fill the context window with instructions that rarely apply.

Skills solve this by loading in stages:

1. At startup, the agent only reads each skill's **name and description**.
2. When a task matches a description, it reads the full **instructions**.
3. Supporting **scripts and documents** are only opened if the instructions call for them.

That way you can have dozens available, **each taking up one line until it is needed**.

## What it looks like inside

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
description: Creates or changes REST endpoints in the inventory API following the team's conventions. Use it when adding or changing HTTP routes.
---

1. Write the use case and its test before the controller.
2. Use the error codes in references/error-codes.md.
3. Run scripts/check-openapi.sh and fix whatever it reports.
```

⚠️ The **description** decides whether the skill is used. If it is vague ("helps with the API"), the agent will not connect it with the task and will never read the rest.
