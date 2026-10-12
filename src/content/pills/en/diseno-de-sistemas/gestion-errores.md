---
kind: 'pill'
title: 'Error handling'
subtitle: 'give each failure a place and an explicit response'
icon: 'error-flow'
order: 7
bonus: false
publicationDate: 2026-10-12
---

Handling errors means deciding **which failures belong to an operation's contract** and where failures from its dependencies are translated. `Result`, `Either`, and `try-catch` help at different points in that decision.

## Problem to solve

Someone configures an inventory alert. The threshold must be positive and the product must exist. Validation may reject the request as part of normal operation. When saving the alert, the database might also be unavailable. If both cases become `null` or a general `catch`, callers cannot tell whether to correct the input or wait for the service to recover.

## Actions to take

Express rule creation with two possible outcomes: `Result<AlertRule, ValidationError>`. An `Ok` contains a valid rule; an `Err` explains which input to correct. `Either` expresses the same two-path idea, although names and conventions vary between libraries.

~~~text
Input → validate → Ok(AlertRule) ──→ save → alert created
                 └→ Err(ValidationError) → correct input
Save → provider failure → availability error
~~~

In the persistence adapter, catch the exceptions raised by the database client and translate them into an availability error the application understands. That is a concrete place for `try-catch`; wrapping every function would scatter the error policy. The entry layer then decides how to communicate the failure: for example, a validation error versus a temporary service failure.

A [`Result` type](https://doc.rust-lang.org/core/result/enum.Result.html) makes its two variants explicit when the language and tooling support it. Its value does not depend on turning **every** failure into a value. The important boundary is that invalid input and an unavailable dependency do not appear to be the same problem.
