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

## Problem to solve

An inventory process receives fixed-width, JSON, and XML files. Each format has different reading rules: field positions and lengths in one, properties in another, and elements in the third. All three must become inventory records before the same validations run.

All three formats exist today. The decision is where to keep their differences so that the rest of the process does not need to know about them.

## Actions to take

Create one reader per format. Each reader interprets its file and returns an `InventoryRecord`; subsequent validation and processing work with that shared result.

~~~text
Fixed-width file → PositionalReader ┐
JSON             → JsonReader       ├→ InventoryRecord → validate → process
XML              → XmlReader        ┘
~~~

The differences between formats and the handling of invalid files are **inherent complexity**. Three readers make sense because all three formats exist. Putting all parsing into one function would only hide those differences.

The alternative would be a generic component that reads external definitions for each file and uses reflection to map fields to classes at runtime. Adding a format might become a matter of writing a definition, but those definitions would also need to be designed, validated, and maintained. A mapping error would be harder to locate than in an explicit reader.

If the three formats are known and change along with the application, that flexibility does not meet a current need. This is where YAGNI (*You Aren't Gonna Need It*) applies: do not build a mechanism for future formats today. If many different structures later need to be added without deploying code, there will be a concrete reason to reconsider it.

KISS does not mean minimizing lines of code. It means keeping the complexity required by the problem and avoiding complexity introduced by the solution. YAGNI helps identify when that added complexity only serves an imagined future.
