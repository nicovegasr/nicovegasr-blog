---
kind: 'pill'
title: 'Cohesion'
subtitle: 'keep related decisions where they belong'
icon: 'cohesion'
order: 4
bonus: false
publicationDate: 2026-10-12
---

A sustainable solution needs to keep solving the problem over time. Cohesive code helps sustain it: related decisions live close together, and each piece can be understood without reconstructing half the system. Cohesion is about **how behavior is organized**, not how many lines a file contains.

## Problem to solve

To remove a user without deleting their history, a service reads `user.status.value`, checks whether the user is already removed, and writes `user.deletedAt.value`. Another process makes the same check with a slightly different condition. Two places now decide when removal is allowed, while `User` is little more than a bag of properties.

## Actions to take

Put the state transition in `User`: `user.markForRemoval(now)`. The method checks whether removal is valid and changes the state it owns. The use case still coordinates loading and saving; the model decides how a user changes.

~~~text
RemoveUser → load User → user.markForRemoval(now) → save User
                         └→ removal rule and state transition
~~~

Four questions help review whether that piece is cohesive:

- **Cognitive load:** can the function be followed without holding too many steps and hidden effects in mind? Mark Seemann's [“seven”](https://blog.ploeh.dk/2021/07/28/referential-transparency-fits-in-your-head/) points to limited working memory; it is not a hard limit of seven elements.
- **Naming:** does `markForRemoval` describe the product transition better than `setDeletedAt`? A domain name lets readers see the intent without decoding fields.
- **Law of Demeter:** does the use case talk to `User`, or reach through its properties to decide for it? A chain of accessors can signal knowledge of details that belong to the model.
- **Tell, don't ask:** is the user told to make the transition, or are its data extracted so the transition can be implemented elsewhere? [Moving behavior next to the data it governs](https://martinfowler.com/bliki/TellDontAsk.html) keeps the model from becoming anemic.

This does not require putting all logic in entities. Data access, coordination between components, and transformations with no domain rules can live elsewhere. The boundary depends on who needs to know the rule when it changes.
