---
kind: 'pill'
title: 'Keep It Simple, Stupid (KISS)'
subtitle: 'Solve without overcomplicating'
icon: 'simple'
order: 1
momentStage: 'kiss'
publicationDate: 2026-10-12
---

**KISS** (*Keep It Simple, Stupid*) is a principle that proposes finding the simplest way to solve a problem without ignoring its inherent complexity.

## Example: reading files from different clients

Imagine an application that reads files from different clients, processes their data and saves it. One client identifies products with a `code` field; another uses `sku`. Interpreting those differences is part of the problem's inherent complexity.

We can use readers that understand each structure and return the data in a common representation. If the processing rules are the same, we then follow the same steps to process and save it. When a file's structure changes, its reader changes; the rest of the flow can stay the same.

The use case receives the appropriate reader for the file structure:

```js
function importInventory(file, reader, processor, repository) {
  return reader.read(file) // ← Different readers return common domain records.
    .then(records => processor.process(records))
    .then(records => repository.saveAll(records));
}
```

## What applying KISS means here

If the task includes files from different clients, the simple solution must handle those differences while keeping the reading, processing and saving flow clear. Separate readers make sense if they help meet that need without introducing mechanisms for requirements that do not yet exist.
