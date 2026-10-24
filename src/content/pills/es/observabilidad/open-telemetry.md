---
kind: 'pill'
title: 'OpenTelemetry'
subtitle: 'La instrumentación'
icon: 'telemetry'
order: 7
publicationDate: 2026-08-27
---

OpenTelemetry es la capa que genera y transporta telemetría. No sustituye a Loki,
Prometheus, Tempo o Grafana: hace que aplicaciones y librerías produzcan señales
con un modelo común y las entrega a los backends que las almacenan.

## Del código a los backends

La instrumentación automática puede observar operaciones conocidas, como una
petición HTTP o una consulta a la base de datos. Para una operación propia del
negocio, como generar un informe, se puede crear un span manual:

```java
Span span = tracer.spanBuilder("report.generate").startSpan();
try (Scope ignored = span.makeCurrent()) {
  generateReport(reportId);
} finally {
  span.end();
}
```

OpenTelemetry se encarga de tres partes del recorrido:

1. **La instrumentación genera las señales.** Las librerías automáticas y el
   código manual crean spans, métricas o logs y añaden datos comunes como
   `service.name="report-worker"`.
2. **El SDK prepara la telemetría.** Mantiene el contexto entre operaciones y
   pasa las señales a un exportador, normalmente mediante el formato OTLP.
3. **El Collector las distribuye.** Recibe OTLP y envía cada señal al backend
   correspondiente: logs a Loki, métricas a Prometheus y trazas a Tempo.

```text
aplicación -> instrumentación -> SDK -> OTLP -> Collector -> backends
```

El Collector evita que cada aplicación tenga que conocer todos los destinos. No
es obligatorio que cada señal pase por él: los logs pueden salir por `stdout` y
las métricas pueden ser recogidas directamente por Prometheus. OpenTelemetry
ofrece un modelo común, no impone una única arquitectura.

## Qué conviene instrumentar

Empieza con instrumentación automática y añade código manual solo a operaciones
que aporten significado, como `report.generate`. Mantén nombres y atributos
consistentes entre servicios; cambiar de backend es más sencillo que corregir
telemetría que nunca compartió el mismo contexto.
