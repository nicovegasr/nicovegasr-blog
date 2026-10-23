---
kind: 'pill'
title: 'Loki'
subtitle: 'storing and querying logs'
icon: 'loki'
order: 3
publicationDate: 2026-08-27
---

Loki centralizes logs so they can be queried without connecting to every
machine. It does not create events or draw panels: it receives the lines sent by
an agent, stores them and answers LogQL queries from tools such as Grafana.

## From code to panel

Suppose the worker cannot generate a report because its template is missing. The
application records the event using key-value pairs:

```java
log.atError()
  .addKeyValue("report_id", reportId)
  .addKeyValue("reason", "template_not_found")
  .log("Report generation failed");
```

With a compatible JSON encoder, `stdout` receives a single line like this one
—formatted here for readability—:

```json
{
  "timestamp": "2026-08-29T10:15:42Z",
  "level": "ERROR",
  "message": "Report generation failed",
  "report_id": "report-482",
  "reason": "template_not_found",
  "correlation_id": "corr-913",
  "trace_id": "7ac..."
}
```

From there, the log follows this path:

1. **Alloy collects the line.** It reads new logs from `stdout` and adds stable
   information such as the service and environment.
2. **Loki groups the logs.** The `service_name` and `environment` labels
   determine which group each line belongs to. Loki calls that group a *stream*.
3. **Loki compresses and stores the lines.** It only indexes the labels and time
   range, not every word in the message.
4. **Grafana queries Loki.** It first narrows the search by service and time
   range. LogQL then parses the JSON and searches the matching lines for
   `reason="template_not_found"`:

```text
{service_name="report-worker", environment="production"}
  | json
  | reason="template_not_found"
```

Loki returns the lines that match the filter and Grafana displays them in
Explore or a panel. Because the line includes `trace_id`, it can also link to the
corresponding trace in Tempo.

```text
log.atError() -> encoder -> stdout -> runtime -> Alloy -> Loki -> Grafana
```

## What determines the cost

Labels create streams, so they should have few possible values. `service_name`,
`environment` and `region` are usually good candidates. `report_id`,
`request_id` and `trace_id` should remain in the log or as structured metadata:
using them as labels would create thousands of streams and degrade ingestion
and queries.

Volume, retention and the queried time range also matter. Searching one service
for an hour requires reading far fewer chunks than searching every service over
thirty days.
