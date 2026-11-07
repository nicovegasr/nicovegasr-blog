---
kind: 'pill'
title: 'Principle of least surprise'
subtitle: 'Honor the contract'
icon: 'predictable'
order: 3
momentStage: 'least-surprise'
publicationDate: 2026-10-12
---

The **principle of least surprise** proposes that a component behave as someone familiar with its contract would expect. Its name, inputs and promised result should honestly describe what it does.

## Example: a preview that saves data

An operation called `previewInventory` lets you inspect a file's contents before importing it. However, it also saves the records to the database:

```js
async function previewInventory(file, reader, repository) {
  const records = await reader.read(file);
  await repository.saveAll(records); // ← The preview saves data? 🤔
  return { records };
}
```

Returning the expected records does not justify an effect the contract does not announce.

## What applying the principle means here

The preview shows the data without modifying inventory. Saving it belongs in an import operation whose contract makes that behavior clear.
