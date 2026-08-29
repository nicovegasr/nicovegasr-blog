---
kind: 'pill'
title: 'Grafana'
subtitle: 'explorar y relacionar señales'
icon: 'dashboard'
order: 6
bonus: false
publicationDate: 2026-08-27
---

Grafana es la interfaz de investigación. No almacena métricas, logs ni trazas:
guarda cómo consultarlos y representarlos, envía cada consulta a su backend y
relaciona las respuestas.

## Del síntoma a la causa

El dashboard de informes muestra que la proporción de fallos ha subido. El panel
no contiene esos datos; conserva una fuente, una consulta, una unidad y una forma
de visualizarlos. En este caso usa Prometheus y PromQL:

```text
sum(rate(reports_generated_total{status="failed"}[5m]))
/
sum(rate(reports_generated_total[5m]))
```

Cuando alguien abre el dashboard ocurre este recorrido:

1. **Grafana resuelve el panel.** Sustituye variables como entorno o servicio y
   calcula el intervalo y la resolución necesarios para el ancho de la gráfica.
2. **Consulta la fuente de datos.** El plugin de Prometheus convierte la petición
   del panel en una consulta para su API. Prometheus calcula los puntos y Grafana
   los transforma en una serie temporal.
3. **La visualización aplica contexto.** Unidad, leyenda, umbral y colores dan
   significado al valor; no cambian el dato que devolvió Prometheus.

El panel detecta el síntoma, pero todavía no explica qué falló. Un enlace conserva
el servicio y el intervalo seleccionados y abre Explore contra Loki:

```text
{service_name="report-worker", environment="production"}
  | json
  | level="ERROR"
```

Entre las líneas aparece `rpt-482` con `trace_id="7ac..."`. Ese campo puede ser
otro enlace: Grafana consulta Tempo por el identificador y dibuja la traza. Allí
se ve que `pdf.render` es el span que falló; el log explica que faltaba la
plantilla.

```text
Prometheus -> panel -> Loki -> log de rpt-482 -> Tempo -> causa
```

Los dashboards sirven para preguntas repetibles; Explore, para seguir una pista
sin conocer todavía la causa. Ambos consultan las mismas fuentes, pero ofrecen
un flujo de trabajo distinto.

## Lo que debe compartir la stack

Los saltos solo funcionan si las señales comparten contexto: nombre del servicio,
entorno, intervalo y `trace_id`. Grafana puede construir enlaces con esos campos,
pero no puede deducir que `worker-pdf` y `report-worker` son el mismo servicio si
cada backend lo llama de una forma.

Un dashboard útil empieza con pocas preguntas: tráfico, errores, duración y
saturación. Añadir veinte gráficas de CPU no explica si las personas pueden
generar informes. Versiona fuentes y dashboards, muestra unidades y periodos, y
mantén cada enlace junto al contexto necesario para continuar la investigación.
