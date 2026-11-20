---
kind: 'pill'
title: 'Agents'
subtitle: 'Specialists with their own context'
icon: 'agents'
order: 10
publicationDate: 2026-11-20
---

So far, a single agent does everything in a single conversation. That has a limit: every file it reads for a side task stays in its context window. Two ideas that usually go together help here.

## Custom agents: named specialists

A **custom agent** is a named configuration: its own instructions, the tools it can use and, optionally, a different model. In Claude Code it is a file in `.claude/agents/`:

```md
---
name: api-reviewer
description: Reviews inventory API changes against the team's conventions. Use it after changing an endpoint.
tools: Read, Grep, Glob
---

Review the diff. Check pagination, error codes and tests.
Return only the problems found, with file and line.
```

Notice `tools`: it can only read. A reviewer that cannot edit will not "fix" what it reviews on its own.

## Subagents: working in another window

A **subagent** is an agent the main one launches for a specific task. It works in **its own context window** and **returns only the result**.

Imagine you have just added an endpoint. The main agent delegates the review to `api-reviewer`, which reads fifteen files in its window and returns three problems. **The main conversation receives those three problems, not the fifteen files.**

## When they pay off

They pay off for tasks that can be separated and generate a lot of noise: reviewing, researching or searching the whole codebase. They have a cost:

- The subagent does not see the conversation. **Whatever you leave out of the brief, it does not know.**
- There is more configuration to maintain.
- Its work also spends tokens, just like the main session.
