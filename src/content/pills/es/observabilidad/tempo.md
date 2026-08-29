---
kind: 'pill'
title: 'Tempo'
subtitle: 'almacenar y consultar trazas'
icon: 'traces'
order: 5
bonus: false
publicationDate: 2026-08-27
---

Tempo conserva el recorrido de una ejecución concreta. Si la métrica dice que
generar informes se ha vuelto lento, una traza permite abrir `rpt-482` y ver en
qué paso se empleó el tiempo.

## De la petición a la traza

Cuando entra `POST /reports`, la instrumentación crea un span y un `trace_id`.
Cada operación relevante crea otro span con su propio `span_id`, tiempos,
atributos y estado:

```text
trace_id: 7ac...

POST /reports                    18 ms
└─ queue.publish                  4 ms
   └─ report.generate           842 ms
      ├─ data.query             311 ms
      ├─ pdf.render             487 ms  ERROR
      └─ storage.put             40 ms
```

Para que el worker continúe la misma traza, la API incluye el contexto en el
mensaje de cola. El consumidor lo extrae antes de crear `report.generate`; si no
lo hace, Tempo recibirá dos trazas sin relación.

Un span exportado contiene algo equivalente a esto:

```json
{
  "trace_id": "7ac...",
  "span_id": "b41...",
  "parent_span_id": "93f...",
  "name": "pdf.render",
  "start": "2026-08-29T10:15:42.311Z",
  "duration_ms": 487,
  "status": "ERROR",
  "attributes": {
    "service.name": "report-worker",
    "report.format": "pdf",
    "error.type": "TemplateNotFoundException"
  }
}
```

A partir de ahí ocurre este recorrido:

1. **El SDK termina y agrupa spans.** El span no se exporta hasta que conoce su
   duración y estado; normalmente se acumula con otros para enviarlo en lote.
2. **El exportador los envía a Tempo.** Puede hacerlo directamente o a través de
   un Collector. Tempo recibe spans, no el código ni los logs de la aplicación.
3. **Tempo los agrupa por `trace_id`.** Los spans recientes pueden consultarse
   casi de inmediato; después se organizan en bloques y se guardan para su
   retención.
4. **Una consulta recupera la traza.** Buscar `7ac...` devuelve todos los spans
   recibidos con ese identificador. Sus `span_id` y `parent_span_id` permiten
   reconstruir el árbol que Grafana dibuja como una línea temporal.

También se pueden buscar trazas sin conocer su identificador. TraceQL filtra por
atributos y duración:

```text
{ resource.service.name = "report-worker"
  && span:name = "pdf.render"
  && span:duration > 400ms }
```

```text
instrumentación -> spans -> exportador -> Tempo -> TraceQL -> Grafana
```

## Qué puede romper el recorrido

El contexto debe cruzar HTTP, colas y tareas asíncronas. Un salto sin propagación
crea otra traza; reutilizar un `trace_id` incorrecto mezcla operaciones que no
pertenecen juntas.

Además, solo se puede consultar lo que fue exportado. El muestreo reduce volumen
y coste, pero puede descartar la traza que luego necesitas. Un proceso terminado,
una cola de exportación llena o un timeout también pueden dejar spans fuera. La
ausencia de un span no demuestra por sí sola que el paso nunca se ejecutó.
