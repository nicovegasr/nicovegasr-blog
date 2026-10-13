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

## Complexity the case already has

An inventory process receives **fixed-width**, **JSON**, and **XML** files. Each format has different reading rules, but all three must become inventory records before the same validation and processing can continue. All three formats exist today; changing the design cannot remove their differences.

## A solution sized to the need

Each reader interprets its format and returns an `InventoryRecord`. From that point on, validation and processing are the same for all three. A reading error stays associated with the format that caused it, before entering the common flow.

~~~text
Fixed-width file → PositionalReader ┐
JSON             → JsonReader       ├→ InventoryRecord → validate → process
XML              → XmlReader        ┘
~~~

Reading rules and the handling of invalid files are **inherent complexity**: all three formats exist. Putting them in a single function to reduce the number of classes would hide differences the code needs to handle.

A generic engine could instead read external definitions and use reflection to map fields to classes at runtime. Adding a format would then mean writing a definition. In return, those definitions would need to be designed, validated, versioned, and maintained; a mapping error would be harder to locate than in an explicit reader.

The three formats are known and change with the application. That flexibility does not meet a current need. This is where **YAGNI (You Aren't Gonna Need It)** applies: do not build a mechanism for future formats today.

## When to reconsider

KISS is not measured by the number of classes or lines of code. **It means keeping the complexity required by the problem and avoiding complexity introduced by the solution.** If many new formats had to be added without deploying code, there would be a concrete reason to reconsider external definitions. Until then, three readers keep the real differences visible.
