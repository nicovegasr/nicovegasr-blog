---
kind: 'series'
draft: true
title: 'System design'
summary: 'Design decisions from the code up: how to understand, test, and change a solution without turning every modification into a new problem.'
icon: 'design'
order: 4
publicationDate: 2026-10-12
---

Design is tested when something changes: a supplier modifies its file, a new rule appears, or a report needs another destination. KISS helps handle that complexity without adding obstacles of our own. Single responsibility, cohesion, and coupling help decide which code belongs together and what should be separate. An abstraction can simplify the work when it brings an actual variation into one place; it can also complicate things when it makes people navigate more pieces without a concrete reason.

Then consider the visible contract. A preview should not write without saying so; an object should not exist in an invalid state; an input error should not look like a database outage. Builder, Factory, immutability, and result types are possible tools for expressing those decisions, not goals in themselves.

Finally, the design must hold when the application runs: a timeout may hide an operation that already completed, and a job may execute again after a crash. Tests verify behavior and boundaries; TDD lets the solution grow through small examples. No principle replaces observing the actual case and explaining the cost the solution accepts.
