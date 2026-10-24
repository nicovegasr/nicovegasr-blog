---
kind: 'pill'
title: 'Principle of least surprise'
subtitle: 'Behavior should match what the interface promises'
icon: 'predictable'
order: 3
momentStage: 'least-surprise'
publicationDate: 2026-10-12
---

The principle of least surprise asks a piece of software to behave as someone who knows its contract would expect. The name matters, but the promise also includes the effects it produces, the errors it returns, and when it does each thing.

## Month 9: a preview that writes

The business wants to review a file before importing it: which records are valid and which will fail. A new `previewImport(file)` reuses the readers and `InventoryRecord`. It returns the expected report, but it also saves the valid records. If someone opens the preview twice, that stock is added twice.

The report looks right. The surprise is an effect nobody expects from a preview.

## The decision: two operations, two contracts

~~~text
previewImport(file) → read + validate          → ImportPreview
confirmImport(file) → read + validate → save   → ImportResult
~~~

Both share the readers and the rules; only the second one writes. If the data or the rules can change between the preview and the confirmation, `confirmImport` validates again before saving: the preview informs, it doesn't guarantee the outcome.

The contract can be checked from the outside: previewing doesn't change the inventory, and confirming returns the result of the write. A format error can show up on both paths; a failure while saving, only on the second.

**What it costs:** two public entry points instead of one, and validation runs twice if the import is previewed and then confirmed. If the preview ever has to reserve stock, that effect must show up in its contract and its name, not hide behind `preview`.

**A good name helps, but the promise is kept in observable behavior: what it returns and what it changes.**

*The import no longer surprises anyone. But confirming a large file takes minutes, and someone needs to follow its progress.*
