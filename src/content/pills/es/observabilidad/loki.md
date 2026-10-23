---
kind: 'pill'
title: 'Loki'
subtitle: 'almacenar y consultar logs'
icon: 'loki'
order: 3
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
  "report_id": "report-482",
  "reason": "template_not_found",
  "correlation_id": "corr-913",
  "trace_id": "7ac..."
}
```

A partir de ahí, el log sigue este recorrido:

1. **Alloy recoge la línea.** Lee los nuevos logs de `stdout` y añade información
   estable, como el servicio y el entorno.
2. **Loki agrupa los logs.** Las etiquetas `service_name` y `environment`
   determinan a qué grupo pertenece cada línea. Loki llama *stream* a ese grupo.
3. **Loki comprime y almacena las líneas.** Solo indexa las etiquetas y el
   intervalo de tiempo; no cada palabra del mensaje.
4. **Grafana consulta Loki.** Primero acota por servicio y periodo. Después,
   LogQL interpreta el JSON y busca `reason="template_not_found"` dentro de las
   líneas encontradas:

```text
{service_name="report-worker", environment="production"}
  | json
  | reason="template_not_found"
```

Loki devuelve las líneas que cumplen el filtro y Grafana las muestra en Explore
o en un panel. Como la línea incluye `trace_id`, también puede enlazarla con su
traza en Tempo.

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
