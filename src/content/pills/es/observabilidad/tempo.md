---
kind: 'pill'
title: 'Tempo'
subtitle: 'almacenar y consultar trazas'
icon: 'traces'
order: 5
publicationDate: 2026-08-27
---

Tempo conserva el recorrido de una ejecución concreta. Si la métrica dice que
generar informes se ha vuelto lento, una traza permite abrir `report-482` y ver en
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

Un span exportado contiene algo equivalente a esto:

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

A partir de ahí ocurre este recorrido:

1. **La aplicación exporta los spans.** Puede enviarlos directamente o mediante
   un Collector. Tempo recibe la información de cada paso por separado.
2. **Tempo los agrupa.** Los spans con el mismo `trace_id` pertenecen a la misma
   ejecución y se almacenan juntos.
3. **Grafana recupera la traza.** Los campos `span_id` y `parent_span_id`
   permiten reconstruir el árbol y mostrarlo como una línea temporal.

```text
instrumentación -> spans -> Tempo -> Grafana
```

## Cómo continúa la misma traza

Tempo no relaciona spans por su hora o por el nombre del servicio. La relación se
crea mientras la petición avanza, propagando un pequeño contexto que contiene el
`trace_id` y el `span_id` del paso actual.

Cuando la API llama a otro servicio, añade ese contexto a la petición mediante
la cabecera estándar `traceparent`. Si publica un mensaje, lo incluye en sus
cabeceras o metadatos. El receptor lo extrae y crea un nuevo span con tres datos:

- El mismo `trace_id`, porque pertenece a la misma ejecución
- Un `span_id` nuevo, porque representa otro paso
- El `span_id` recibido como padre, para conservar la relación

```text
API:    trace_id=7ac  span_id=a1
          │  propaga traceparent
          ▼
Worker: trace_id=7ac  span_id=b2  parent_span_id=a1
```

Cada servicio repite el proceso al llamar al siguiente. Los spans se exportan de
forma independiente; no necesitan enviar la traza completa ni consultar Tempo
durante la petición. Cuando llegan al backend, el `trace_id` los agrupa y las
referencias al padre reconstruyen el árbol.

La instrumentación automática suele encargarse de este intercambio en clientes
y servidores HTTP. En colas, librerías propias o tareas asíncronas hay que
comprobar que el contexto también se copie. Si se pierde en uno de esos límites,
el siguiente servicio comienza otra traza.
