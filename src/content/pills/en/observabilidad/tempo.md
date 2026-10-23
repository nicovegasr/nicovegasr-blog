---
kind: 'pill'
title: 'Tempo'
subtitle: 'storing and querying traces'
icon: 'traces'
order: 5
publicationDate: 2026-08-27
---

Tempo retains the journey of a particular execution. If a metric says that
report generation has become slow, a trace lets you open `report-482` and see which
step consumed the time.

## From request to trace

When `POST /reports` arrives, the instrumentation creates a span and a
`trace_id`. Every relevant operation creates another span with its own
`span_id`, timing, attributes and status:

```text
trace_id: 7ac...

POST /reports                    18 ms
└─ queue.publish                  4 ms
   └─ report.generate           842 ms
      ├─ data.query             311 ms
      ├─ pdf.render             487 ms  ERROR
      └─ storage.put             40 ms
```

An exported span contains the equivalent of this:

```json
{
  "trace_id": "7ac...",
  "span_id": "b41...",
  "parent_span_id": "93f...",
  "name": "pdf.render",
  "duration_ms": 487,
  "status": "ERROR"
}
```

This is what happens next:

1. **The application exports the spans.** It can send them directly or through a
   Collector. Tempo receives the information for each step separately.
2. **Tempo groups them.** Spans with the same `trace_id` belong to the same
   execution and are stored together.
3. **Grafana retrieves the trace.** The `span_id` and `parent_span_id` fields
   reconstruct the tree and display it as a timeline.

```text
instrumentation -> spans -> Tempo -> Grafana
```

## How the same trace continues

Tempo does not relate spans by their timestamp or service name. The relationship
is created while the request moves through the system by propagating a small
context containing the `trace_id` and the current step's `span_id`.

When the API calls another service, it adds that context to the request using
the standard `traceparent` header. When it publishes a message, it includes the
context in its headers or metadata. The receiver extracts it and creates a new
span with three pieces of information:

- The same `trace_id`, because it belongs to the same execution
- A new `span_id`, because it represents another step
- The received `span_id` as its parent, preserving the relationship

```text
API:    trace_id=7ac  span_id=a1
          │  propagates traceparent
          ▼
Worker: trace_id=7ac  span_id=b2  parent_span_id=a1
```

Every service repeats the process when calling the next one. Spans are exported
independently; they do not need to send the complete trace or query Tempo during
the request. Once they reach the backend, the `trace_id` groups them and the
parent references reconstruct the tree.

Automatic instrumentation usually handles this exchange for HTTP clients and
servers. With queues, custom libraries or asynchronous tasks, you must verify
that the context is also copied. If it is lost at one of those boundaries, the
next service starts a separate trace.
