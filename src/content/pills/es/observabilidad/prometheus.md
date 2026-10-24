---
kind: 'pill'
title: 'Prometheus'
subtitle: 'Almacenar y consultar métricas'
icon: 'metrics'
order: 4
publicationDate: 2026-08-27
---

Prometheus responde preguntas sobre muchas ejecuciones: cuántos informes se
generan, qué proporción falla o cuánto tardan. No conserva el evento completo de
`report-482`; guarda muestras periódicas de métricas acumuladas por la aplicación.

## Del código al panel

El worker registra el resultado de cada generación mediante una librería de
métricas. Con Micrometer, el recorrido puede empezar así:

```java
try {
  generateReport(reportId);
  registry.counter("reports.generated", "status", "completed").increment();
} catch (Exception error) {
  registry.counter("reports.generated", "status", "failed").increment();
  throw error;
}
```

Los contadores viven en memoria dentro de cada instancia. Actualizarlos no envía
una petición de red a Prometheus. La librería expone su estado actual en
`/metrics`:

```text
# TYPE reports_generated_total counter
reports_generated_total{status="completed"} 1216
reports_generated_total{status="failed"} 34
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

## Una vista global

Las métricas resumen el comportamiento de todas las ejecuciones. Permiten ver el
volumen de informes y qué proporción está fallando, pero no explican qué ocurrió
con `report-482`. Para investigar ese caso hacen falta sus logs o su traza.

Las etiquetas permiten separar resultados, servicios o entornos. Deben tener un
número limitado de valores: usar `report_id` o `trace_id` crearía una serie por
cada operación y aumentaría innecesariamente el coste.
