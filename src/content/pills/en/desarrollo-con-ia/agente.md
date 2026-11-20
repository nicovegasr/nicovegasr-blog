---
kind: 'pill'
title: 'Agent'
subtitle: 'A model that uses tools'
icon: 'agent'
order: 6
publicationDate: 2026-11-20
---

An **agent** is a program that gives an LLM tools and runs the ones the model asks for: reading a file, searching the code, editing it or running a command. It adds each result to the context and asks the model again, **in a loop, until the task is done**. Claude Code, Codex and Copilot's agent mode work this way.

## The loop

Imagine you ask an agent to add `GET /v1/products/out-of-stock` to your API:

```text
model → search "products" in src/        agent → 3 files found
model → read ProductController.ts        agent → file contents
model → edit ProductController.ts        agent → change applied
model → run npm test                     agent → 1 test fails
model → fix it and run again             agent → tests pass
```

What you did yourself in a chat (finding the code, pasting it, applying the change, testing it) **is now done by the agent**.

## Three ways to work with it

Being able to do everything does not mean it always should. Most tools let you choose how much the agent decides:

- **Ask**: it answers about the code without touching it.
- **Plan**: it proposes how to do the task and you accept or correct it.
- **Act**: it makes the changes on its own.

They are not exclusive. Within one task it is common to ask to understand, plan, and then act.

## More autonomy, more responsibility

**The agent acts on your machine with your permissions**, and every tool result takes up context. The more you let it do, the more it matters what it knows about the project and what it can reach.
