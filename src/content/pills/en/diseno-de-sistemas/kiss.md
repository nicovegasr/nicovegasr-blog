---
kind: 'pill'
title: 'Keep It Simple, Stupid (KISS)'
subtitle: 'handle complexity without adding more'
icon: 'simple'
order: 1
bonus: false
publicationDate: 2026-10-12
---

**Keep things simple.** That is the idea behind KISS (*Keep It Simple, Stupid*). A straightforward problem should only need a straightforward solution. A complex problem needs a design that handles its complexity and lets people work with it.

An interface can help simplify things. A twenty-line function can make your life miserable. The difference becomes clear when you need to understand or change the code.

## A hundred jobs reading files

Imagine a hundred Spring Batch jobs importing inventory from different suppliers. Files arrive as JSON, XML, and fixed-width text, where each field occupies specific positions. Two fixed-width files can have completely different layouts: sharing a format does not mean they can be read in the same way.

Some suppliers change their layouts frequently. This week, the product code occupies positions 1 through 12; next week, it occupies positions 1 through 16, shifting the fields that follow.

The code has two difficulties to handle: understanding each layout and maintaining it as it changes. That is **inherent complexity**: it comes with the problem we have agreed to solve.

## Where do you change that file's reading logic?

An initial solution might copy the reading logic into every job that needs it. This seems convenient: each job has all its code close at hand. But if eight jobs read the same layout and the supplier changes it, you now have eight places to review. You also have eight opportunities to leave a copy using the old positions.

We can put that logic in one reader and reuse it across the eight jobs. Different layouts get their own readers. All readers provide inventory records through a common interface:

~~~ts
interface InventoryReader {
  read(file: InventoryFile): Iterable<InventoryRecord>;
}
~~~

Each job receives the reader it needs and works with its records. It does not need to know the file positions or choose between every format in the system.

~~~text
Job A ─┐
Job B ─┼→ SupplierStockReader → inventory records
Job C ─┘

Job D ──→ WarehouseXmlReader → inventory records
~~~

When the first file's layout changes, you update `SupplierStockReader` and its tests. The jobs still ask for records in the same way. If a field's meaning also changes, you will need to review how processing uses it: an interface cannot make that change disappear.

**Here, the abstraction simplifies maintenance.** Centralizing means keeping each layout's reading logic in one known place, rather than putting all hundred formats into one giant class.

## Complexity we add ourselves

Copies scattered across jobs are **added complexity**: the supplier did not force us to duplicate its format. Nor does it require us to build a plugin system, a ten-class hierarchy, or a configurable engine before we can read the file.

Those mechanisms can make sense when they meet a concrete need. If formats change frequently and must be introduced without deploying code, describing them through configuration may be worthwhile. That configuration will also need to be understood, checked, and maintained; being generic does not automatically make it simpler.

For one small file used by one process, a function may be enough. For a hundred actual layouts, organizing their readers and sharing a contract may be the simplest solution to maintain.

**KISS asks for a design that makes the actual problem easier to solve, with all its complexity, and makes every added mechanism earn its place.**
