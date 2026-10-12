---
kind: 'pill'
title: 'Keep It Simple, Stupid (KISS)'
subtitle: 'the simplest solution that solves the problem'
icon: 'simple'
order: 1
bonus: false
publicationDate: 2026-10-12
---

KISS (*Keep It Simple, Stupid*) means solving a problem with **as little added complexity as possible**. A problem may be complex in its own right; simplifying the solution does not mean ignoring its rules.

## Three input formats

An inventory process receives fixed-width, JSON, and XML files. Each format has different reading rules: field positions and lengths in one, properties in another, and elements in the third. All three must become inventory records before the same validations run.

A direct solution uses one reader per format. Each reader knows how to interpret its file and returns the same record type; the rest of the process does not need to know where it came from.

~~~text
Fixed-width file → PositionalReader ┐
JSON             → JsonReader       ├→ InventoryRecord → validate → process
XML              → XmlReader        ┘
~~~

The differences between formats and the handling of invalid files are **inherent complexity**. Three readers are not overengineering when all three formats exist. Forcing all the parsing into one function to reduce the number of classes would only hide those differences.

## Complexity that can be avoided

A generic artifact could instead read external definitions for each file and use reflection to map fields to classes at runtime. Adding a format might then mean writing a new definition. But those definitions would need to be designed, validated, and maintained, while errors in the mapping would be harder to trace than in explicit readers.

If the three formats are known and change along with the application, that flexibility does not meet a current need. This is where YAGNI (*You Aren't Gonna Need It*) applies: do not build a mechanism for future formats today. If many different structures later need to be added without deploying code, there will be a concrete reason to reconsider it.

KISS does not mean minimizing lines of code. It means keeping the complexity required by the problem and avoiding complexity introduced by the solution. YAGNI helps identify when that added complexity only serves an imagined future.
