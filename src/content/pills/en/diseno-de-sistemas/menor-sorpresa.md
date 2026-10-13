---
kind: 'pill'
title: 'Principle of least surprise'
subtitle: 'behavior should match what the interface promises'
icon: 'predictable'
order: 3
bonus: false
publicationDate: 2026-10-12
---

The principle of least surprise asks software to behave as someone familiar with its contract would expect. The name matters, but the promise also includes its effects, the errors it returns, and when it does each thing.

## A preview that writes

A screen previews the import of a product CSV. It shows which rows are valid and which will fail before anyone confirms the upload. The `previewImport(file)` method returns that report, but it also saves valid rows to the database. Opening the screen twice changes the inventory twice.

The visible result looks right. The surprise lies in a side effect that nobody would expect from a preview.

## Two visible contracts

The operation that **evaluates** the CSV and the one that **confirms** the import have different contracts. They can share parsing and validation rules, but only the second writes. If data or rules can change between preview and confirmation, confirmation must validate again before saving: a preview informs, but cannot guarantee a future result.

~~~text
previewImport(file) → read + validate → ImportPreview
confirmImport(file) → read + validate → save → ImportResult
~~~

The contract can be checked from the outside: previewing does not change inventory; confirming returns the result of the write. A format error can appear on either path. A failure to save belongs only to the second.

## The promise includes effects

The separation adds two public entry points, but removes a dangerous doubt: callers can use `previewImport` without investigating hidden effects. If the product decides that previewing should reserve stock, the contract must change and make that effect visible rather than hiding it behind the same name. A good name helps; observable behavior proves the promise is kept.
