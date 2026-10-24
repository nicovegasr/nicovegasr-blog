---
kind: 'pill'
title: 'Keep It Simple, Stupid (KISS)'
subtitle: 'Handle complexity without adding more'
icon: 'simple'
order: 1
systemMapStage: 'kiss'
publicationDate: 2026-10-12
---

**KISS** (*Keep It Simple, Stupid*) asks you to use the simplest solution that actually solves the problem. Simple doesn't mean ignoring its complexity; it means avoiding complexity you don't need.

Imagine a retail chain that imports inventory from its suppliers. This is the system we'll see grow throughout the series.

## Month 1: one supplier, one function

A single supplier sends its inventory as JSON. One function reads it and returns inventory records. Nothing else is needed.

## Month 3: another `if`

More suppliers arrive, each with its own structure. The quick move is to add a branch:

~~~ts
if (supplier === 'north') { code = item.code; }
else if (supplier === 'south') { code = item.product.sku; }
// ...and one more if for every new supplier
~~~

Each `if` looks like the simple option. The reading logic ends up copied into the cron jobs that import stock, reconcile it and export it.

## Month 6: a supplier renames a field

A supplier switches `code` to `sku`. Two cron jobs get updated; the third keeps looking for `code`, gets `undefined` and loads products with no code. The process finishes without reporting a problem.

The variation between suppliers is **inherent complexity**: it comes with the problem. Duplicating the reading logic across several processes is **added complexity**: we put it there.

## The decision: one reader per format

~~~ts
interface InventoryReader {
  read(file: InventoryFile): InventoryRecord[];
}
~~~

Each structure has its own reader, and all three cron jobs reuse it. When a supplier changes its format, you touch one reader and its tests.

**What it costs:** one interface and one reader per format. A configurable engine or a plugin system would add more pieces to maintain. That may be worthwhile if you need to onboard formats without deploying.

**An `if` can be enough. Here, separate readers make changes simpler: each format is interpreted in one place.**

*The importer now reads every format well. The problem now is that it does too much.*
