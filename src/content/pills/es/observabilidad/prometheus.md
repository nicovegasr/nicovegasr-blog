---
kind: 'pill'
title: 'Prometheus'
subtitle: 'almacenar y consultar métricas'
icon: 'metrics'
order: 4
bonus: false
publicationDate: 2026-08-27
---

Prometheus responde preguntas sobre muchas ejecuciones: cuántos informes se
generan, qué proporción falla o cuánto tardan. No conserva el evento completo de
`rpt-482`; guarda muestras periódicas de métricas acumuladas por la aplicación.

## Del código al panel

El worker registra el resultado y la duración de cada generación mediante una
librería de métricas. Con Micrometer, el recorrido puede empezar así:

```java
Timer generationDuration = Timer.builder("report.generation.duration")
  .publishPercentileHistogram()
  .register(registry);

Timer.Sample sample = Timer.start(registry);
try {
  generateReport(reportId);
  registry.counter("reports.generated", "status", "completed").increment();
} catch (Exception error) {
  registry.counter("reports.generated", "status", "failed").increment();
  throw error;
} finally {
  sample.stop(generationDuration);
}
```

El contador y el timer viven en memoria dentro de cada instancia. Actualizarlos
no envía una petición de red a Prometheus. La librería expone su estado actual en
`/metrics`:

```text
# TYPE reports_generated_total counter
reports_generated_total{status="completed"} 1216
reports_generated_total{status="failed"} 34

# TYPE report_generation_duration_seconds histogram
report_generation_duration_seconds_bucket{le="0.5"} 892
report_generation_duration_seconds_bucket{le="1.0"} 1184
report_generation_duration_seconds_count 1250
report_generation_duration_seconds_sum 812.4
```

A partir de ahí ocurre este recorrido:

1. **Prometheus descubre el worker.** Su configuración o el entorno le indica
   qué instancias exponen `/metrics`.
2. **Prometheus hace *scrape*.** Cada cierto intervalo solicita la ruta y recibe
   los valores acumulados en ese instante.
3. **Cada muestra entra en una serie.** El nombre de la métrica y todas sus
   etiquetas identifican la serie; Prometheus añade además etiquetas del target,
   como `job` e `instance`.
4. **PromQL compara muestras.** Un counter puede reiniciarse con el proceso, por
   eso `rate()` calcula cuánto aumentó por segundo dentro de una ventana y
   contempla esos reinicios.

```text
sum(rate(reports_generated_total{status="failed"}[5m]))
/
sum(rate(reports_generated_total[5m]))
```

5. **Grafana envía la consulta a Prometheus.** Prometheus lee las series del
   intervalo, calcula la proporción de informes fallidos y devuelve puntos con
   timestamp y valor. Grafana los dibuja en un panel.

```text
instrumento -> /metrics -> scrape -> serie temporal -> PromQL -> Grafana
```

## Qué se gana y qué se pierde

Un counter resume muchas operaciones en unos pocos números: permite detectar que
los fallos suben, pero no explica qué ocurrió con `rpt-482`. Para investigar ese
caso hacen falta sus logs o su traza.

Cada valor distinto de una etiqueta crea otra serie. `status`, `method` o una
ruta normalizada tienen pocos valores; `report_id`, `trace_id` o un mensaje de
error pueden crear millones. Esa cardinalidad multiplica memoria, almacenamiento
y trabajo de consulta.

Un histograma conserva cuántas observaciones cayeron en cada rango. Esto permite
agregar instancias y calcular percentiles en PromQL, pero los límites deben
elegirse alrededor de las latencias que importan: una observación que cayó en un
bucket demasiado amplio no puede recuperar precisión después.
