---
kind: 'pill'
title: 'Retries'
subtitle: 'Repeat the save without creating another file'
icon: 'retry'
order: 8
momentStage: 'async-retries'
publicationDate: 2026-10-12
---

A **retry** runs an operation again after a failure or when its outcome could not be confirmed. A timeout means the response did not arrive in time; the operation may have completed. That makes it necessary to define what happens when it is repeated.

## Example: saving a report after losing the response

Storage saves a report, but its confirmation is lost. If every attempt generates a new filename, retrying creates another copy. We can generate the report once and keep its identifier and content across all attempts:

```js
function saveReport(report, storage) {
  return storage.putObject({
    key: `reports/${report.id}.csv`,
    body: report.content,
  });
}
```

In this example, writing to an existing key replaces its content. Repeating the save with the same key and content keeps the same visible file. The identifier must also survive when a different process performs the retry.

## What retrying safely means here

The effect on the file is [idempotent](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/): repeating it preserves the result, even with several writes. That guarantee depends on the destination and does not automatically cover historical versions or other effects, such as notifications; each effect needs its own strategy.

The [Async Chaos Lab](/en/labs/async-chaos-lab/) lets you observe a lost confirmation and its retries.
