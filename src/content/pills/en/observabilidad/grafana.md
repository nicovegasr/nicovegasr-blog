---
kind: 'pill'
title: 'Grafana'
subtitle: 'exploring and connecting signals'
icon: 'dashboard'
order: 6
bonus: false
publicationDate: 2026-08-27
---

Grafana displays data stored in systems such as Prometheus, Loki and Tempo in a
single interface. It does not store metrics, logs or traces: it queries each
source and represents its response.

## From data to panel

A panel stores three decisions: which source to query, which question to ask and
how to display the response. When someone opens a dashboard, Grafana runs the
query and draws the result as a chart, table or value.

Units, legends, colors and thresholds help interpret the data, but do not modify
it. The same response can be displayed in several ways without changing what
Prometheus, Loki or Tempo returned.

```text
data source -> query -> response -> visualization
```

## Connecting the signals

Grafana also lets you move from one signal to another. If a Prometheus panel
shows that failures have increased, a link can open the logs for the same
service and time range in Loki. From a log with `trace_id="7ac..."`, another link
can open the trace for `report-482` in Tempo.

```text
metric -> logs for the period -> specific trace
```

For those links to work, signals must share service names, environments and
identifiers. Grafana can represent and connect the available information, but
it cannot relate data that use different contexts.

Dashboards monitor recurring questions, Explore supports free-form
investigation, and alerts notify someone when a query meets a condition.
