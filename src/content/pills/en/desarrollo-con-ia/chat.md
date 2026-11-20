---
kind: 'pill'
title: 'Chat'
subtitle: 'A conversation resent in full'
icon: 'chat'
order: 5
publicationDate: 2026-11-20
---

A **chat** is an application built on an LLM that lets you talk to it. It looks as if the model remembers what you discussed, but it does not: the application stores the conversation and resends it **in full** with every new message.

## What travels with each message

If you ask how to list the products out of stock and then write "now paginate them", the model receives something like this:

```js
[
  { role: 'system', content: 'You are a programming assistant.' },
  { role: 'user', content: 'How do I list the products out of stock?' },
  { role: 'assistant', content: 'You can filter products with stock 0…' },
  { role: 'user', content: 'Now paginate them' }, // ← only makes sense with what came before
]
```

Every turn adds messages and the request grows.

## When the conversation no longer fits

Sooner or later, the conversation exceeds the context window. The application drops or **summarises** older messages to keep going, and that summary loses details: a decision you made early on, a case you ruled out. That is why **it is worth opening a new conversation for each task** instead of dragging a long one along.

## You are the bridge

The model only produces text. You choose which code to paste, copy what it proposes, apply it and check whether it works. A chat helps you think and write, but **getting the result into the project is still manual work**.
