---
kind: 'pill'
title: 'Single Responsibility Principle (SRP)'
subtitle: 'one responsibility can cover an entire process'
icon: 'responsibility'
order: 2
bonus: false
publicationDate: 2026-10-12
---

The Single Responsibility Principle (SRP) groups code that changes for the same [reason](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html). A use case's responsibility can cover an entire process, even when it needs several steps to produce a result.

## Problem to solve

A worker receives a file with data for updating users. Before saving each one, it needs a `User` built from its record. The format may be invalid or required fields may be missing. Which part of the code should turn that input into a valid user?

## Actions to take

Give the use case responsibility for **obtaining a valid `User` from the file**. Within that process, reading the record, checking its format, and building the user can be separate functions. Each function explains a step; the use case owns the complete result.

~~~text
Worker → use case → read → validate format → build User
       ← valid User or input error
Worker → save User
~~~

The worker decides what to do with the result and coordinates saving. Persistence code has another reason to change: the database may change without the file format changing. That boundary is more useful than spreading `read`, `validateFormat`, and `toUser` across three classes simply because they are three verbs.

If the format starts evolving separately or several processes consume it, extracting a reader may make sense. Until then, keeping the steps together lets a reader follow the operation without jumping across pieces created for hypothetical reuse.

SRP helps decide **what changes together**, rather than counting how many things a function does or how many classes a process has.
