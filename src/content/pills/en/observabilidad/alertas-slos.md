---
kind: 'pill'
title: 'Alerting and SLOs'
subtitle: 'measuring in order to act'
icon: 'alert'
order: 8
bonus: false
publicationDate: 2026-08-27
---

An alert connects a signal to an action. An SLO defines how much deterioration
the service can accept; the alert warns when the failure rate threatens to
exhaust that margin.

## From a failed report to a notification

The worker already exposes how many reports complete and how many fail.
Prometheus can turn those metrics into a simple rule:

```text
if failures remain above 1% for 5 minutes -> notify someone
```

Prometheus checks the condition periodically. Requiring it to remain true for
five minutes avoids notifying someone about a brief spike. If it continues,
Alertmanager sends the notification to the appropriate person or channel.

The notification should include what is needed to act: the affected service,
the dashboard, logs for the period and a runbook. An alert without context or a
possible response only creates noise.

## Where the SLO fits

The **SLI** is the measurement: the proportion of successfully generated
reports. The **SLO** sets the target: for example, `99.9%` over 30 days. The
remaining `0.1%` is the **error budget**; for every 10,000 reports, it allows 10
failures without dropping below the target.

A fixed rule such as "above 1%" does not know how much budget remains. The *burn
rate* measures how quickly that margin is being consumed. Sustaining a 1%
failure rate consumes the budget for a 99.9% target ten times faster than
permitted.

Looking at both a short and a longer period distinguishes a temporary spike from
a sustained degradation that will eventually exhaust the budget.

## When it should interrupt someone

Alert on symptoms that affect the person generating the report: errors, latency
or inability to complete the operation. High CPU may aid diagnosis, but it does
not deserve a page if the service still meets its objective and nobody has a
specific action to take.

With little traffic, one failure produces a huge percentage; require a minimum
volume or wait longer. Every alert needs an owner and a clear action. If it is
always ignored, it is not a useful alert.
