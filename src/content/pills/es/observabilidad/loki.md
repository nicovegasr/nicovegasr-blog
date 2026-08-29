---
kind: 'pill'
title: 'Loki'
subtitle: 'almacenar y consultar logs'
icon: 'loki'
order: 3
bonus: false
publicationDate: 2026-08-27
---

Loki centraliza los logs para poder consultarlos sin entrar en cada máquina. No
crea los eventos ni dibuja los paneles: recibe las líneas que envía un agente,
las almacena y responde consultas LogQL desde herramientas como Grafana.

## Del código al panel

Supongamos que el worker no puede generar un informe porque falta su plantilla.
La aplicación registra el evento con pares clave-valor:

```java
log.atError()
  .addKeyValue("report_id", reportId)
  .addKeyValue("reason", "template_not_found")
  .log("Report generation failed");
```

Con un encoder JSON compatible, `stdout` recibe una sola línea como esta
—formateada aquí para leerla—:

```json
{
  "timestamp": "2026-08-29T10:15:42Z",
  "level": "ERROR",
  "message": "Report generation failed",
  "report_id": "rpt-482",
  "reason": "template_not_found",
  "correlation_id": "corr-913",
  "trace_id": "7ac..."
}
```

A partir de ahí ocurre este recorrido:

1. **El runtime captura `stdout`.** En un contenedor, guarda la línea en un
   archivo del nodo asociado al contenedor que la produjo.
2. **Un agente la recoge.** Grafana Alloy sigue el archivo, recuerda hasta qué
   posición ha leído, interpreta el JSON, recupera los metadatos del contenedor
   y añade etiquetas estables como `service_name="report-worker"` y
   `environment="production"`.
3. **El agente envía un lote.** Cada entrada llega a Loki separada en tres
   piezas: etiquetas, timestamp y línea original.

```text
etiquetas: {service_name="report-worker", environment="production"}
timestamp: 2026-08-29T10:15:42Z
línea:     {"level":"ERROR","reason":"template_not_found", ...}
```

4. **Loki elige un stream.** Todas las entradas con la misma combinación de
   etiquetas pertenecen al mismo *stream*. Loki indexa esas etiquetas y el
   intervalo de tiempo, pero no cada palabra de la línea.
5. **Loki almacena el contenido.** Las líneas se agrupan y comprimen en
   *chunks*. El índice permite encontrar qué chunks pueden contener el resultado
   sin recorrer todos los logs.
6. **Grafana envía una consulta LogQL a Loki.** Primero selecciona streams por
   sus etiquetas y después interpreta el JSON para filtrar por un campo del
   evento:

```text
{service_name="report-worker", environment="production"}
  | json
  | reason="template_not_found"
```

Loki usa el índice para localizar los chunks del servicio y del periodo elegido,
lee su contenido y devuelve solo las líneas que cumplen el filtro. Grafana las
muestra en Explore o en un panel. Como la línea incluye `trace_id`, también puede
enlazarla con su traza en Tempo.

```text
log.atError() -> encoder -> stdout -> runtime -> Alloy -> Loki -> Grafana
```

## Lo que determina el coste

Las etiquetas crean los streams, así que deben tener pocos valores posibles.
`service_name`, `environment` o `region` suelen ser buenos candidatos.
`report_id`, `request_id` y `trace_id` deben permanecer dentro del log o como
metadatos estructurados: usarlos como etiquetas crearía miles de streams y
degradaría la ingesta y las consultas.

También importan el volumen, la retención y el intervalo consultado. Buscar un
servicio durante una hora obliga a leer muchos menos chunks que buscar todos los
servicios durante treinta días.

⚠️ Loki puede encontrar `reason="template_not_found"` porque la aplicación
escribió ese dato. Centralizar `Something went wrong` no añade el contexto que
falta.
