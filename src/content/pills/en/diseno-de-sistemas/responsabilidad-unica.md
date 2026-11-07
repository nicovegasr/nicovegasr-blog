---
kind: 'pill'
title: 'Single Responsibility Principle (SRP)'
subtitle: 'One responsibility, several steps'
icon: 'responsibility'
order: 2
momentStage: 'srp'
publicationDate: 2026-10-12
---

The **Single Responsibility Principle** (SRP) proposes giving each piece of code a single responsibility. That responsibility can require several operations: counting how many things a class or function does is not enough to decide whether it follows the principle.

## Example: importing an inventory file

A use case imports a client's inventory. Completing that task requires reading the file, validating its records and saving them:

```js
// One responsibility: coordinate the inventory import.
function importInventory(file, reader, validator, repository) {
  return reader.read(file)
    .then(records => validator.validate(records))
    .then(records => repository.saveAll(records));
}
```

The reader interprets the file structure; the validator checks the inventory rules and rejects records that fail them; the repository handles saving. The use case coordinates those operations without implementing their details. Changing how a field is interpreted or how data is saved does not require changing that coordination.

## What applying SRP means here

Reading, validating and saving are three operations needed for one responsibility: importing inventory. If the use case also implemented file formats, rules and data access, it would bring together decisions that can change for different reasons.

The [formulation of the principle](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html) explains what a reason to change means.
