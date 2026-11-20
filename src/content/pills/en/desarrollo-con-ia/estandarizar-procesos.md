---
kind: 'pill'
title: 'Standardising processes'
subtitle: 'One agreed way to do each task'
icon: 'standards'
order: 8
publicationDate: 2026-11-20
---

An `AGENTS.md` organises one repository. But a company has dozens of projects, and the way to create an endpoint, write a migration or prepare a pull request should be the same in all of them. **Standardising processes** means writing that agreed way once, in a shared place, so that everyone's agent follows it in any project.

## A repository with the team's processes

```text
engineering-standards/
├── AGENTS.md                  ← what it contains and when to check it
└── processes/
    ├── new-endpoint.md        ← steps, required tests and what to review
    ├── database-migration.md
    └── pull-request.md
```

Each developer links it from their user-level instructions, which the agent loads in any project (`~/.claude/CLAUDE.md` in Claude Code or `~/.codex/AGENTS.md` in Codex):

```md
Before implementing, find the matching process in
~/work/engineering-standards/processes/ and follow it.
```

From then on, "I want to add an endpoint for products out of stock" **follows the same path for anyone on the team and in any repository**.

## Why it pays off

- **One source**: improving a process is a change in one repository, reviewed like code.
- **Less variation**: the result depends less on who asked for the task and how.
- **Faster onboarding**: a new person and their agent work like the team from day one.

**The cost is keeping it alive.** If the processes stop reflecting what the team does, agents will faithfully repeat a way of working nobody uses any more.
