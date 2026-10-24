---
kind: 'pill'
title: 'Coupling'
subtitle: 'Separate using a dependency from knowing its details'
icon: 'coupling'
order: 7
momentStage: 'coupling'
publicationDate: 2026-10-12
---

When one piece knows the details of another, changing those details can mean modifying both. In the report generator, coupling shows up in how much it needs to know about storage to save a file.

## Month 16: the use case also knows how to save the report

The use case generates an inventory report and uploads it through the storage SDK:

~~~ts
const report = generateInventoryReport(records);
await storageSdk.putObject({
  key: `reports/${crypto.randomUUID()}.csv`,
  body: report.content,
});
~~~

Now one installation needs to save reports to disk. Doing that means opening the same use case and adding local paths and filesystem calls. Report generation has not changed, but its code also knows how each destination stores the file.

## The decision: ask for the report to be saved

The use case receives a `ReportArchive`. Its contract expresses what it needs: save the complete report.

~~~ts
interface ReportArchive {
  save(report: InventoryReport): Promise<void>;
}

const report = generateInventoryReport(records);
await archive.save(report);
~~~

The SDK call and the construction of its key move into `ObjectStorageArchive`:

~~~ts
class ObjectStorageArchive implements ReportArchive {
  async save(report: InventoryReport): Promise<void> {
    await storageSdk.putObject({
      key: `reports/${crypto.randomUUID()}.csv`,
      body: report.content,
    });
  }
}
~~~

Another implementation can save to disk. Application configuration chooses which one the use case receives. Changing the destination still takes work, but that change no longer requires modifying report generation.

The use case remains coupled to `ReportArchive`: it needs `save` to store the report or communicate the failure. What it no longer knows are the SDK methods, their parameters and the paths for each destination.

**What it costs:** maintaining the contract, its implementations and the configuration connecting them. With a single stable SDK call and no need to separate those changes, adding an interface may not pay off.

**Storage changes are separated from changes to the report content.**

*The report has been saved, but the response never arrives.*
