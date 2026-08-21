---
kind: 'pill'
title: 'Backend'
subtitle: 'the logic'
icon: 'foundation'
order: 4
bonus: false
publicationDate: 2026-08-21
---

A backend is the part of an application that **decides what is allowed and
applies changes to the system**. It usually runs on a server and you do not see
it while using an app, but that is where its rules live.

![A form asks to create an order; the backend validates the request, authorizes the operation, and applies the rules before saving the change](../../images/fundamentos/backend/request-flow-en.webp)

## From a click to a real change

The frontend captures the user's intent: it shows a form, lets them choose
products, and offers a button to confirm the order. But pressing that button
should not create the order on its own.

The frontend sends a request to the backend. The backend then checks that the
data is valid, that stock is available, that the price is still correct, and
that the person is allowed to carry out the operation. Only then does it save
the order and return a result.

This means a website, mobile app, and external integration can all use the same
rules without copying them into every client.

## It does not always wait for a click

A backend can also react to things that have already happened or start work on
its own. When an order is created, for example, it can publish an event so
another process prepares an invoice or notifies the warehouse.

A webhook does something similar between systems: the backend sends a request
to another service to notify it of a change. Scheduled jobs (*cron jobs*) and
asynchronous jobs handle work that should not happen while someone is waiting,
such as generating a nightly report or processing many images.

The idea is the same: **the backend applies the system's rules even when nobody
is pressing a button at that moment**.

## Security is decided here

The frontend can hide a button or validate a field to improve the experience,
but anyone can modify it or call the API directly. **It is not a security
boundary.**

When a request acts on someone's behalf, the backend must check their identity
and permissions before doing anything. A token is one common way to carry that
identity; a cookie-based session is another. There are also public routes that
do not need to authenticate anyone.

## No memory between requests

Many backends are *stateless*: every request includes the context needed to
process it, such as the identity or the operation's data. That way, any backend
instance can handle the next request without relying on the memory of the
previous one.

⚠️ *Stateless* does not mean an application does not store data. It means the
server does not need to remember the conversation in its memory to continue it.
