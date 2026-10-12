---
kind: 'pill'
title: 'Creational patterns: Builder and Factory'
subtitle: 'build a valid value and choose who produces it'
icon: 'creation'
order: 8
bonus: false
publicationDate: 2026-10-12
---

Creational patterns make decisions about object creation explicit. **Builder** organizes the construction of a value with several options and invariants; **Factory** chooses which implementation to create from an input. They solve different problems, even when they appear in the same flow.

## Problem to solve

An inventory report accepts a date range, a warehouse, and an option to include out-of-stock products. It can be exported as CSV or PDF. With a constructor that takes several positional parameters, some calls swap dates or create invalid ranges. The endpoint and the scheduled job also repeat an `if` to choose between `CsvReportWriter` and `PdfReportWriter`.

## Actions to take

Use a `ReportRequestBuilder` at the entry point to name the options and validate them when `build()` is called: start date before end date, required date range, and explicit defaults. The use case receives an already valid `ReportRequest` without knowing how it was assembled.

Centralize writer selection in `ReportWriterFactory.for(format)`. This can be a small function: given `CSV`, it returns `CsvReportWriter`; given `PDF`, it returns `PdfReportWriter`. The report generation process works with the shared ability to write a report.

~~~text
Options → Builder → valid ReportRequest
Format  → Factory → CsvReportWriter | PdfReportWriter
                       ↓
              generate and write report
~~~

Builder answers “how do I build this request without leaving it half configured?” Factory answers “which writer matches this format?” If `ReportRequest` has two fields and a clear constructor, Builder adds ceremony. If CSV is the only format and no selection is needed, a Factory adds nothing either. Use the pattern when it removes a repeated decision or prevents invalid states from being created.
