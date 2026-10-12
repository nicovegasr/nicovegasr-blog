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

## Problem to solve

A process generates inventory reports and archives them. `GenerateInventoryReport` calculates the content, builds a provider-specific path, and calls `storageSdk.putObject(...)` directly. When a second destination is added for some reports, the use case starts choosing credentials, paths, and clients. Changing how a report is archived now means touching the code that decides what it contains.

## Actions to take

Keep the decision “this report must be archived” in the use case and define a port around that intent: `ReportArchive.save(report)`. One implementation uses object storage; another uses the new destination. The use case depends on its own contract, and each adapter translates that contract to its provider.

~~~text
GenerateInventoryReport → ReportArchive.save(report)
                           ├→ ObjectStorageArchive → SDK
                           └→ OtherArchive         → other destination
~~~

[Ports and adapters architecture](https://alistair.cockburn.us/hexagonal-architecture) gives this boundary a name. The report and the need to archive it belong to the problem; paths, credentials, and SDK types are integration details. The port keeps those details from dictating how the use case is expressed.

The abstraction also has a cost: a contract, adapters, and a composition decision to maintain. If there is only one stable SDK call and no useful boundary to protect, wrapping every method in an identical interface adds steps without decoupling decisions. Extract a port when it can name an application capability, rather than merely hiding a library's name.
