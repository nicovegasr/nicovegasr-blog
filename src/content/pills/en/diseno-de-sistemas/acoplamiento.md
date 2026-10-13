---
kind: 'pill'
title: 'Coupling'
subtitle: 'choose which details each piece depends on'
icon: 'coupling'
order: 5
bonus: false
publicationDate: 2026-10-12
---

Coupling describes how much one piece needs to know about another to work or change. An application will always have dependencies: the design decision is **what it depends on** and what moving that boundary will cost.

## When the use case knows the provider

A process generates inventory reports and archives them. `GenerateInventoryReport` calculates the content, builds a provider-specific path, and calls `storageSdk.putObject(...)` directly. When a second destination is added for some reports, the use case starts choosing credentials, paths, and clients. Changing how a report is archived now means touching the code that decides what it contains.

## Name the capability

The use case keeps the decision “this report must be archived.” A port expresses that intent as `ReportArchive.save(report)`: one implementation uses object storage, and another uses the new destination. Each adapter translates the contract to its provider. If the destination varies by report type, a routing policy uses that information to choose among configured adapters; credentials and provider names do not enter the use case.

~~~text
GenerateInventoryReport → ReportArchive.save(report)
                           ├→ ObjectStorageArchive → SDK
                           └→ OtherArchive         → other destination
~~~

[Ports and adapters architecture](https://alistair.cockburn.us/hexagonal-architecture) gives this boundary a name. The report and the need to archive it belong to the problem; paths, credentials, and SDK types are integration details. The port keeps those details from dictating how the use case is expressed. If saving fails, the adapter should also translate the SDK error into one that lets the application decide whether to retry the job or mark it as failed.

## The cost of that boundary

The abstraction has a cost: a contract, adapters, and a composition decision to maintain. If there is only one stable SDK call and no useful boundary to protect, wrapping every method in an identical interface adds steps without decoupling decisions. Extract a port when it can name an application capability and keep out details that change for another reason.
