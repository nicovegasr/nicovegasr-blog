---
kind: 'pill'
title: 'Immutability and state management'
subtitle: 'decide when a value may change and who sees it'
icon: 'snapshot'
order: 6
bonus: false
publicationDate: 2026-10-12
---

An immutable value keeps the same meaning throughout its lifetime: changing it creates another value. Its purpose is not to forbid state, but to make **when it changes and who sees each version** explicit.

## Problem to solve

A nightly process imports a product CSV. It uses a configuration with currency, markup percentage, and rounding rules. That configuration lives in a shared object an administrator can edit while the file is being processed. The first rows use one set of rules and the last rows use another; the final report does not say which version it used.

## Actions to take

At the start of the import, obtain a complete configuration and create an immutable `ImportPolicy`. Every row in the same file is processed with that snapshot. A later edit creates a new policy for the next run without changing the one already in progress.

~~~text
Configuration v12 → ImportPolicy #12 → every row in file A
       ↓ edit
Configuration v13 → ImportPolicy #13 → every row in file B
~~~

The snapshot must also include nested rules that can change. If `ImportPolicy` keeps a reference to a mutable list of rounding rules, the problem remains even if its outer properties are read-only. Recording the version with the result makes it possible to explain later how prices were calculated.

The system will still modify inventory and configuration: those are product actions. Immutability applies to **the value one execution needs to treat as stable**. Copying an entire file into memory without a reason, or creating new objects for every internal change, may cost more than the problem it solves; the useful state boundary is the policy for each run.
