---
kind: 'pill'
title: 'Grafana'
subtitle: 'explorar y relacionar señales'
icon: 'dashboard'
order: 6
bonus: false
publicationDate: 2026-08-27
---

Grafana muestra en una misma interfaz los datos almacenados en sistemas como
Prometheus, Loki o Tempo. No guarda métricas, logs ni trazas: consulta cada
fuente y representa su respuesta.

## De los datos a un panel

Un panel guarda tres decisiones: qué fuente consultar, qué pregunta hacer y cómo
mostrar la respuesta. Cuando alguien abre un dashboard, Grafana ejecuta la
consulta y dibuja el resultado como una gráfica, una tabla o un valor.

La unidad, la leyenda, los colores y los umbrales ayudan a interpretar el dato,
pero no lo modifican. La misma respuesta puede mostrarse de varias formas sin
cambiar lo que Prometheus, Loki o Tempo devolvieron.

```text
fuente de datos -> consulta -> respuesta -> visualización
```

## Relacionar las señales

Grafana también permite pasar de una señal a otra. Si un panel de Prometheus
muestra que aumentaron los fallos, un enlace puede abrir en Loki los logs del
mismo servicio y periodo. Desde un log con `trace_id="7ac..."`, otro enlace puede
abrir en Tempo la traza de `report-482`.

```text
métrica -> logs del periodo -> traza concreta
```

Para que esos enlaces funcionen, las señales deben compartir nombres de
servicio, entorno e identificadores. Grafana puede representar y conectar la
información disponible, pero no puede relacionar datos que usan contextos
distintos.

Los dashboards sirven para vigilar preguntas habituales; Explore permite
investigar libremente y las alertas avisan cuando una consulta cumple una
condición.
