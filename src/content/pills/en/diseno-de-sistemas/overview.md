---
kind: 'series'
draft: true
title: 'System design'
summary: 'Design decisions from the code up: how to keep a solution understandable, test it, and let it evolve without adding complexity ahead of time.'
icon: 'design'
order: 4
publicationDate: 2026-10-12
---

These decisions connect. Before introducing an abstraction, identify what can actually vary: a format, a domain rule, a provider, or the state one run must preserve. KISS helps avoid hypothetical flexibility; single responsibility, cohesion, and coupling help place each change where it belongs.

Then consider the visible contract. A preview should not write without saying so; an object should not exist in an invalid state; an input error should not look like a database outage. Builder, Factory, immutability, and result types are possible tools for expressing those decisions, not goals in themselves.

Finally, the design must hold when the application runs: a timeout may hide an operation that already completed, and a job may execute again after a crash. Tests verify behavior and boundaries; TDD lets the solution grow through small examples. No principle replaces observing the actual case and explaining the cost the solution accepts.
