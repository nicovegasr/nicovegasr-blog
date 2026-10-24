---
kind: 'pill'
title: 'Error handling'
subtitle: 'Give each failure a place and an explicit response'
icon: 'error-flow'
order: 7
publicationDate: 2026-10-12
---

Handling errors means deciding **which failures belong to an operation's contract** and where failures from its dependencies are translated. `Result`, `Either`, and `try-catch` help at different points in that decision.

## Two failures that require different responses

Someone configures an inventory alert. The threshold must be positive and the product must exist. Validation may reject the request as part of normal operation. When saving the alert, the database might also be unavailable. If both cases become `null` or a general `catch`, callers cannot tell whether to correct the input or wait for the service to recover.

## Make expected outcomes explicit

`Result<AlertRule, ValidationError>` expresses the two outcomes of validating the threshold and constructing the rule. An `Ok` contains a valid rule; an `Err` explains which input to correct. `Either` expresses the same two-path idea, although names and conventions vary between libraries. Checking that a product exists requires a query: “it does not exist” is an expected outcome; “I cannot query it” is an availability failure.

~~~text
Input → validate threshold → Err(ValidationError) → correct input
         └→ Ok(AlertRule) → find product → missing → correct ID
                                 └→ found → save → alert created
Find or save → provider failure → availability error
~~~

## Translate a failure where its source is known

The persistence adapter catches relevant exceptions from the database client and translates them into an availability error the application understands. That gives `try-catch` a concrete place; wrapping every function would scatter the error policy. The entry layer then decides how to communicate the failure: data to correct or a temporarily unavailable service. Keep the original cause in logs for investigation without exposing provider details in the public response.

A [`Result` type](https://doc.rust-lang.org/core/result/enum.Result.html) makes its two variants visible when the language and tooling support it. Its value does not depend on turning **every** failure into a value. The important boundary is that invalid input, a missing product, and an unavailable dependency do not appear to be the same problem.
