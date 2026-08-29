---
kind: 'pill'
title: 'OpenTelemetry'
subtitle: 'la instrumentación'
icon: 'telemetry'
order: 7
bonus: false
publicationDate: 2026-08-27
---

OpenTelemetry es la capa que genera y transporta telemetría. No sustituye a Loki,
Prometheus, Tempo o Grafana: hace que aplicaciones y librerías produzcan señales
con un modelo común y las entrega a los backends que las almacenan.

## Del código a los backends

La instrumentación automática ya puede crear spans para la petición HTTP, la
cola o una consulta. El código manual se reserva para operaciones que la librería
no puede entender, como generar el informe:

```java
Span span = tracer.spanBuilder("report.generate").startSpan();
try (Scope ignored = span.makeCurrent()) {
  span.setAttribute("report.format", "pdf");
  generateReport(reportId);
} catch (Exception error) {
  span.recordException(error);
  span.setStatus(StatusCode.ERROR);
  throw error;
} finally {
  span.end();
}
```

Esa llamada atraviesa varias capas:

1. **La API define qué se quiere registrar.** `Tracer`, `Span` o los instrumentos
   de métricas son interfaces estables que también pueden usar las librerías.
2. **El SDK crea y procesa los datos.** Añade el recurso
   `service.name="report-worker"`, aplica muestreo, mantiene buffers y decide qué
   exportador utilizar. Sin un SDK configurado, la API no envía telemetría por sí
   sola.
3. **El contexto acompaña a la operación.** La instrumentación inyecta
   `trace_id` y `span_id` en HTTP o en el mensaje de cola. El worker los extrae y
   crea spans que Tempo podrá unir a la misma traza.
4. **El exportador serializa OTLP.** Los spans terminados y las métricas
   acumuladas se agrupan en lotes y salen del proceso mediante gRPC o HTTP.
5. **El Collector recibe el lote.** Un `receiver` acepta OTLP, los `processors`
   pueden enriquecer, filtrar o reagrupar los datos y cada `exporter` los entrega
   con el protocolo que espera su destino.

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/loki]
```

El YAML solo conecta componentes definidos en el resto de la configuración. Una
pipeline no comparte datos con otra: cada señal entra por sus receivers, pasa por
sus processors y sale por sus exporters. El exporter `prometheus` es especial:
expone una ruta que Prometheus consulta mediante *scraping*, igual que en la
píldora anterior.

La pipeline de logs representa aplicaciones que exportan OTLP. Si los logs salen
por `stdout`, siguen el recorrido explicado en Loki y un agente local puede
enviarlos sin pasar por este Collector.

```text
código -> API -> SDK -> OTLP -> Collector -> Loki / Prometheus / Tempo
```

## Dónde colocar el Collector

Como **agente**, se ejecuta junto a las aplicaciones o en cada nodo. Puede añadir
metadatos locales y evita que cada proceso conozca los backends finales. Como
**gateway**, ofrece un punto central al que envían aplicaciones u otros
Collectors; allí se aplican decisiones compartidas como enrutado, límites o
muestreo basado en la traza completa.

El Collector desacopla, pero no vuelve infinita la entrega. Cuando se configuran,
sus colas y reintentos tienen límites: si el backend permanece caído y el buffer
se agota, habrá que bloquear, descartar o persistir datos según la estrategia
elegida.

Empieza con instrumentación automática y añade spans o métricas manuales solo
donde aporten significado. Mantén atributos comunes como `service.name` y
`deployment.environment.name`; cambiar de backend es más fácil que corregir
señales cuyos nombres y contexto nunca fueron consistentes.
