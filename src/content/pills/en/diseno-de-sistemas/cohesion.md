---
kind: 'pill'
title: 'Cohesion'
subtitle: 'keep related decisions where they belong'
icon: 'cohesion'
order: 4
publicationDate: 2026-10-12
---

Cohesion asks whether the decisions in a piece serve the same purpose. When a rule lives far from the data it governs, understanding a change means tracing the system; when everything is piled into one class, it is just as hard.

## The rule lives outside the user

To remove a user without deleting their history, a service reads `user.status.value`, checks whether the user is already removed, and writes `user.deletedAt.value`. Another process makes the same check with a slightly different condition. Two places now decide when removal is allowed, while `User` is little more than a bag of properties.

## Move the transition to what knows it

`User` can own the transition through `user.markForRemoval(now)`. The method checks whether removal is valid and changes its state in one operation. The use case coordinates loading and saving; the model decides how a user changes. Another flow that removes a user no longer needs to reconstruct the same condition.

~~~text
RemoveUser → load User → user.markForRemoval(now) → save User
                         └→ removal rule and state transition
~~~

## Signals for reviewing the boundary

Several ideas help reveal whether the rule is in the right place:

- **Cognitive load:** can the operation be followed without holding too many steps and hidden effects in mind? A reader should be able to reconstruct the transition from a few related pieces.
- **Naming:** does `markForRemoval` describe the product transition better than `setDeletedAt`? A domain name lets readers see the intent without decoding fields.
- **Law of Demeter:** does the use case talk to `User`, or reach through its properties to decide for it? A chain of accessors can signal knowledge of details that belong to the model.
- **Tell, don't ask:** is the user told to make the transition, or are its data extracted so the transition can be implemented elsewhere? [Moving behavior next to the data it governs](https://martinfowler.com/bliki/TellDontAsk.html) keeps the model from becoming anemic.

These signals do not require putting all logic in entities. Data access, coordination between components, and transformations with no domain rules can live elsewhere. The decisive question is which piece must change when the removal rule changes. If several services must change to preserve the same invariant, cohesion is still weak.
