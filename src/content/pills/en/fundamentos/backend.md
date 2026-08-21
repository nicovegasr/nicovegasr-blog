---
kind: 'pill'
title: 'Backend'
subtitle: 'the system rules'
icon: 'server'
order: 5
bonus: false
publicationDate: 2026-08-21
---

The backend is **the part of an application that receives requests, applies the
system's rules, and saves changes**. It usually runs on one or more servers and
you do not see it directly, but almost everything you do eventually passes
through it.

## From a button to a real change

When you confirm an order, the frontend collects the products and address and
sends a request. The backend checks that the data is valid, stock is available,
the price is still correct, and that person is allowed to make the purchase.

If everything adds up, it reduces the stock, saves the order, and returns the
result. If something fails, it returns an error the frontend can explain.

![A form asks to create an order; the backend validates the request, authorises the operation, and applies the rules before saving the change](../../images/fundamentos/backend/request-flow-en.webp)

That distinction matters because the same system may have several clients: a
website, a mobile app, or an external integration. If each one decided when a
purchase was allowed, you would end up with three versions of the same rules.
The backend keeps them in one place.

## Nobody has to be waiting

A backend also works without someone pressing a button. It can run a scheduled
task every night, process heavy work in the background, or react to an event
published by another system.

When an order is created, for example, it may publish an event to prepare the
invoice. A *webhook* travels in the other direction: the backend calls another
service to tell it something has happened. In both cases it is still doing the
same thing: receiving a signal and applying a rule.

## Security is decided here

The frontend can hide a button or prevent you from opening a route, but anyone
can bypass it and call the API directly. The backend therefore checks who made
the request and which permissions they have before changing anything.

Identity may arrive in a token or a cookie-based session. The mechanism changes;
the responsibility does not: **the backend does not trust the frontend to have
done those checks for it**.

## What *stateless* means

Many backends are *stateless*: each request carries what is needed to process
it, such as the identity and operation data. Another instance can therefore
handle the next request without remembering what happened in the previous one.

⚠️ *Stateless* does not mean the application stores no data. The order remains
in the database. What does not need to be kept is the conversation in one
particular server's memory.
