---
kind: 'pill'
title: 'Retries'
subtitle: 'Repeat the save without creating another file'
icon: 'retry'
order: 8
momentStage: 'async-retries'
publicationDate: 2026-10-12
---

A timeout means a response did not arrive in time. The operation may have completed, so retrying it requires knowing what will happen if it already ran.

## Month 18: the report was saved, but the caller cannot tell

`ReportArchive.save(report)` ends with a timeout. Storage has saved the report, but the response was lost. On retry, the adapter generates a new filename and uploads the content again. There are now two copies of the same report.

## The decision: the same report uses the same key

The report is generated once, before attempting to save it. Every attempt retains its identifier and content. `ObjectStorageArchive` uses that identifier to build the key:

~~~ts
await storageSdk.putObject({
  key: `reports/${report.id}.csv`,
  body: report.content,
});
~~~

In this storage system, writing to an existing key replaces its content. If the first attempt worked, the next one writes the same file again. If it was not saved, the next attempt creates it. Either way, there is a single entry for that report.

This save operation is [idempotent](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/): repeating it leaves the same result. The file may have been written several times; the work does not need to run exactly once to avoid the duplicate.

In the [Async Chaos Lab](/en/labs/async-chaos-lab/), you can cause a lost confirmation and see what happens when the work is repeated.

**What it costs:** retaining the identifier and content between attempts, and checking what the destination does when it receives the same key. Choosing a new filename on every attempt creates duplicates again.

**Before retrying, understand what happens if the operation has already completed.**

*Next, marketing wants date-based price campaigns.*
