---
kind: 'pill'
title: 'Where to start'
subtitle: 'How I would set things up today'
icon: 'workspace'
order: 14
publicationDate: 2026-11-20
---

This pill is not theory: it is what I would do if I started working with agents today. I use Claude Code, Codex and Copilot depending on the project, so it is not about a tool, but about a way of working.

## Tool

**Start with a single agent and learn to use it well.** If you already have Copilot at work, that one; if not, Claude Code or Codex in the terminal.

What you learn with it (giving context, structuring the project, writing skills) works for all of them. `AGENTS.md` and skills are open formats, so **switching agents later costs little**.

## Permissions

I work in auto mode from the start: the agent does not ask me for permission for every command. **What makes that safe are the guardrails** you set before the first task:

- Sandbox on, so it only writes inside the project and only connects where you allow.
- `deny` for the `.env` and your keys.

In a critical or company setting, also review the code yourself and decide when each commit or push happens. It is fine for the agent to run them, as long as it is because you asked and not something it does on its own.

## How to ask for tasks

Start each task by saying **what you want to achieve and what it has to meet to count as done**.

If it is not clear to you yet, let the agent ask you before starting. There are skills for that, such as [brainstorming](https://skills.sh/obra/superpowers/brainstorming), which turns an idea into a design before any code is touched, or Matt Pocock's [grill-me](https://skills.sh/mattpocock/skills/grill-me), which questions you until the plan leaves no doubts.

## Instructions

- A minimal `AGENTS.md` in each project, with commands and conventions. It grows every time you correct the same thing twice.
- Your preferences in user memory (`~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`): language, style and what you do not want it to do.

## Skills

Before writing one, **check whether it already exists**. [skills.sh](https://skills.sh) is an open directory with skills for many common tasks, and the `find-skills` skill teaches the agent itself to search it:

```bash
npx skills add https://github.com/vercel-labs/skills --skill find-skills
```

A skill brings third-party instructions and scripts that the agent will follow, so give it guardrails in your user memory:

```md
## Installing skills

- Only skills with more than 1,000 installs or from known sources, such as Anthropic or Vercel.
- Only if they pass the security audits shown on skills.sh.
- Before installing one, read its SKILL.md and scripts and tell me what they do.
```

**Your own make sense for what is done your way or your team's way**: how you create an endpoint, how you prepare a release.

## Habits

- **One intention per conversation.** If something else comes up halfway, note it down and open it separately.
- **Close with everything tidy.** When you finish, the changes are tested and saved, or you know why not.
- **A to-do document.** Whatever is left open goes to a file, not to the conversation. The next session, yours or the agent's, starts by reading it.
- **Clear the context between tasks.** With today's windows it is less necessary, but it stops one task dragging leftovers from the previous one.
- **Review the diff according to the task.** A text change is not reviewed like a migration. Deciding how much to review is judgement, and the agent does not supply it.
