---
kind: 'pill'
title: 'Coupling'
subtitle: 'Separate using a dependency from knowing its details'
icon: 'coupling'
order: 7
momentStage: 'coupling'
publicationDate: 2026-10-12
---

**Coupling** describes dependencies between pieces of a system. When one knows the details of another, changing those details can require modifying both. Choosing what it needs to know can limit the reach of those changes.

## Example: saving reports to different destinations

A use case generates an inventory report. If it also knows the storage SDK's methods, supporting disk storage requires changing it. We can make it depend on a `save(report)` operation and move SDK details into an implementation:

```js
function exportInventory(records, archive) {
  const report = generateInventoryReport(records);
  return archive.save(report);
}

const objectStorageArchive = {
  save(report) {
    return storageSdk.putObject({
      key: `reports/${crypto.randomUUID()}.csv`,
      body: report.content,
    }).then(() => undefined);
  },
};
```

Another implementation can save to disk. Configuration chooses which one the use case receives; both must save the report or communicate failure by rejecting the promise.

## What reducing coupling means here

The use case still depends on the `archive` contract but no longer knows the SDK parameters or destination paths. Maintaining that contract and connecting its implementations has a cost; a single stable SDK call may not justify this separation.
