---
kind: 'pill'
title: 'Asynchrony and retries'
subtitle: 'choose whether an attempt must survive the process'
icon: 'retry'
order: 9
bonus: false
publicationDate: 2026-10-12
---

An asynchronous task lets an API accept a request and finish the work later. Retrying it requires deciding **how long it may wait** and **what happens if the process disappears**. An in-memory loop and a persisted job answer different needs.

## Problem to solve

An API accepts a request to generate a report, and a worker uploads it to external storage. The upload may time out. Sometimes a few seconds are enough to recover; at other times the provider is down for minutes. A timeout also does not confirm whether the file arrived: it may have been saved even if the response never returned.

## Actions to take

For a short transient failure, make a **bounded** number of attempts inside the worker, with [increasing delays and some variation](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_limit_retries.html) between attempts. The request should not be retried at every layer at once. A credentials or format error will not be fixed by repeating the same call.

If the operation must continue after a restart or a long outage, persist the job in a durable queue or task store. The worker [acknowledges it](https://www.rabbitmq.com/docs/reliability) after completing the work; if it dies first, another attempt can resume it. This means accepting that the same job may run more than once.

![An in-memory retry is lost when its process dies; a persisted job can be delivered again to another worker, which must recognize the same identifier](../../images/diseno-de-sistemas/asincronia-reintentos/retries-en.webp)

Give the report a stable `reportId` and make saving the file with that identifier idempotent. Then, if the first upload succeeded but the response was lost, repeating it does not create two reports. Recording attempt count and failure cause helps distinguish a temporary incident from a job that needs intervention.

A durable retry adds a queue, state, and operational work. It makes sense when losing the job with the process would be worse than maintaining that infrastructure. For a short, safe call, a bounded in-memory retry may be enough.
