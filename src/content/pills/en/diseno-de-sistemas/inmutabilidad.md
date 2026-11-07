---
kind: 'pill'
title: 'Immutability'
subtitle: 'Recreate state instead of mutating it'
icon: 'snapshot'
order: 4
momentStage: 'immutability'
publicationDate: 2026-10-12
---

**Immutability** means keeping an object unchanged after creating it. When its state changes, an operation returns another object; anyone holding the previous version still sees the same data.

## Example: completing an import that had failed

An imported file has a status and, if it fails, an error. When a retry completes, we want a completed file without losing information about the failed attempt. The `complete` method creates another object with the same name, the `completed` status and no error:

```ts
class ImportFile {
  constructor(
    readonly name: string,
    readonly status: 'failed' | 'completed',
    readonly error?: string,
  ) {}

  complete(): ImportFile {
    return new ImportFile(this.name, 'completed');
  }
}

const failed = new ImportFile('inventory.csv', 'failed', 'Read timeout');
const completed = failed.complete();
```

After calling `complete`, `failed` still has the `failed` status and the `Read timeout` error. `completed` is a different object: its status is `completed` and it has no associated error.

## What immutability means here

Completing the import creates a new version of the file instead of changing the previous one. Code that continues working with the completed file must use the object returned by `complete`.
