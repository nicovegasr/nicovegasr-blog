---
kind: 'pill'
title: 'Immutability'
subtitle: 'Recreate state instead of mutating it'
icon: 'snapshot'
order: 4
momentStage: 'immutability'
publicationDate: 2026-10-12
---

Immutability means not modifying an object after it's created: when something changes, you create a new object with the complete state. That brings consistency, because each state holds only what belongs to it, and clarity to see every step it went through.

## Month 10: an error that survives the retry

Large imports take minutes, so they move to the background. Each file goes from `pending` to `processing` and ends in `completed`, or in `failed` if something goes wrong. In that case, the retry policy processes it again.

The file is an object that gets modified at each step:

~~~ts
file.status = 'failed';
file.error = 'Timeout while reading the file';

// the retry processes it again, and this time it works
file.status = 'completed';
~~~

The file shows up as `completed`, but it still carries an error detail. Whoever checks it can't tell whether the import went well, failed halfway, or whether that error belongs to another attempt.

## The decision: each transition creates a new object

~~~ts
class ImportFile {
  private constructor(
    readonly name: string,
    readonly status: ImportStatus,
    readonly error?: string,
  ) {}

  fail(error: string): ImportFile {
    return new ImportFile(this.name, 'failed', error);
  }

  complete(): ImportFile {
    return new ImportFile(this.name, 'completed');
  }
}
~~~

Each transition builds the whole state from scratch, so a `completed` file can't carry the error from an earlier attempt: nobody copies it. And every step remains a value of its own that can be recorded:

~~~text
pending → processing → failed (timeout) → processing → completed
~~~

The error belongs to the `failed` version, not to the file forever.

**What it costs:** creating an object on every transition and deciding which data survives each one, such as the file name. If an object has a single changing field and nothing tied to each state, modifying it is just as clear.

**If each transition recreates the object, no state carries data from another.**

*Imports now end in a clear state. Next, a supplier stops sending a product and someone has to decide whether to discontinue it.*
