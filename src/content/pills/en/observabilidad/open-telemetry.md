---
kind: 'pill'
title: 'OpenTelemetry'
subtitle: 'The instrumentation layer'
icon: 'telemetry'
order: 7
publicationDate: 2026-08-27
---

OpenTelemetry is the layer that generates and transports telemetry. It does not
replace Loki, Prometheus, Tempo or Grafana: it makes applications and libraries
produce signals with a common model and delivers them to the backends that
store them.

## From code to backends

Automatic instrumentation can observe known operations such as an HTTP request
or a database query. A business operation such as generating a report can use a
manually created span:

```java
Span span = tracer.spanBuilder("report.generate").startSpan();
try (Scope ignored = span.makeCurrent()) {
  generateReport(reportId);
} finally {
  span.end();
}
```

OpenTelemetry handles three parts of the journey:

1. **Instrumentation generates the signals.** Automatic libraries and manual
   code create spans, metrics or logs and add common data such as
   `service.name="report-worker"`.
2. **The SDK prepares the telemetry.** It maintains context between operations
   and passes the signals to an exporter, usually through the OTLP format.
3. **The Collector distributes them.** It receives OTLP and sends each signal to
   the appropriate backend: logs to Loki, metrics to Prometheus and traces to
   Tempo.

```text
application -> instrumentation -> SDK -> OTLP -> Collector -> backends
```

The Collector prevents every application from having to know all destinations.
Not every signal must pass through it: logs can leave through `stdout`, and
Prometheus can collect metrics directly. OpenTelemetry provides a common model;
it does not impose a single architecture.

## What to instrument

Start with automatic instrumentation and add manual code only for operations
that provide meaning, such as `report.generate`. Keep names and attributes
consistent across services; changing backends is easier than correcting
telemetry that never shared the same context.
