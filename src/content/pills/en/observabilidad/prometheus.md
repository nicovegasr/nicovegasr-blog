---
kind: 'pill'
title: 'Prometheus'
subtitle: 'Storing and querying metrics'
icon: 'metrics'
order: 4
publicationDate: 2026-08-27
---

Prometheus answers questions about many executions: how many reports are
generated, what proportion fails or how long they take. It does not retain the
complete `report-482` event; it stores periodic samples of metrics accumulated by
the application.

## From code to panel

The worker records the result of every generation using a metrics library. With
Micrometer, the path can begin like this:

```java
try {
  generateReport(reportId);
  registry.counter("reports.generated", "status", "completed").increment();
} catch (Exception error) {
  registry.counter("reports.generated", "status", "failed").increment();
  throw error;
}
```

The counters live in memory inside each instance. Updating them does not send a
network request to Prometheus. The library exposes their current state at
`/metrics`:

```text
# TYPE reports_generated_total counter
reports_generated_total{status="completed"} 1216
reports_generated_total{status="failed"} 34
```

This is what happens next:

1. **Prometheus discovers the worker.** Its configuration or environment tells
   it which instances expose `/metrics`.
2. **Prometheus scrapes them.** At a fixed interval, it requests the endpoint and
   receives the values accumulated at that instant.
3. **Every sample enters a time series.** The metric name and all its labels
   identify the series; Prometheus also adds target labels such as `job` and
   `instance`.
4. **PromQL compares samples.** A counter can reset when the process restarts, so
   `rate()` calculates how much it increased per second within a window and
   accounts for those resets.

```text
sum(rate(reports_generated_total{status="failed"}[5m]))
/
sum(rate(reports_generated_total[5m]))
```

5. **Grafana sends the query to Prometheus.** Prometheus reads the series for the
   interval, calculates the proportion of failed reports and returns timestamped
   points. Grafana draws them in a panel.

```text
instrument -> /metrics -> scrape -> time series -> PromQL -> Grafana
```

## A global view

Metrics summarize the behavior of all executions. They show the report volume
and what proportion is failing, but they do not explain what happened to
`report-482`. Its logs or trace are needed to investigate that case.

Labels can separate results, services or environments. They should have a
limited number of values: using `report_id` or `trace_id` would create one series
per operation and increase cost unnecessarily.
