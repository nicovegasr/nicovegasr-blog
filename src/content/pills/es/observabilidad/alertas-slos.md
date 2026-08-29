---
kind: 'pill'
title: 'Alertas y SLOs'
subtitle: 'medir para actuar'
icon: 'alert'
order: 8
bonus: false
publicationDate: 2026-08-27
---

Una alerta conecta una señal con una acción. Un SLO define cuánto deterioro puede
aceptar el servicio; la alerta avisa cuando el ritmo de fallos amenaza con agotar
ese margen.

## De un informe fallido a una notificación

El worker ya expone `reports_generated_total{status="failed"}`. Una regla de
Prometheus convierte esas series en una condición operativa:

```yaml
groups:
  - name: reports
    rules:
      - alert: ReportGenerationHighErrorRate
        expr: |
          sum(rate(reports_generated_total{status="failed"}[10m]))
          /
          sum(rate(reports_generated_total[10m])) > 0.01
        for: 5m
        labels:
          severity: page
        annotations:
          summary: "Report generation error rate is above 1%"
```

A partir de ahí ocurre este recorrido:

1. **Prometheus evalúa `expr`.** Lo hace en cada intervalo de evaluación usando
   las muestras más recientes. Si el resultado supera el 1 %, crea una instancia
   de alerta con las etiquetas de la serie resultante.
2. **La alerta queda `pending`.** El `for: 5m` exige que la condición siga siendo
   cierta durante cinco minutos. Un pico corto desaparece sin llegar a
   `firing`.
3. **Prometheus la envía a Alertmanager.** Al pasar a `firing`, incluye sus
   etiquetas y anotaciones. Alertmanager agrupa alertas relacionadas, elimina
   duplicados, aplica silencios y decide la ruta de notificación.
4. **La persona recibe contexto para actuar.** La notificación debe enlazar al
   dashboard, los logs del periodo y un procedimiento. Cuando `expr` deja de
   devolver la serie, Prometheus marca la alerta como resuelta.

```text
métrica -> PromQL -> pending -> firing -> Alertmanager -> persona
```

## Cómo entra el SLO

El **SLI** es la medida: proporción de informes generados correctamente. El
**SLO** fija el objetivo: por ejemplo, `99,9 %` durante 30 días. El `0,1 %`
restante es el **presupuesto de error**; por cada 10.000 informes permite 10
fallos antes de incumplir el objetivo.

La regla anterior observa una ventana corta, pero todavía no sabe cuánto
presupuesto queda. Una alerta por *burn rate* compara la tasa actual de errores
con la permitida por el SLO. Mantener un 1 % de fallos consume diez veces más
rápido el presupuesto de un objetivo del 99,9 %.

En producción se combinan ventanas: una corta detecta una caída grave y otra
larga confirma que el consumo es sostenido. Así no se despierta a alguien por un
pico de un minuto ni se ignora un deterioro pequeño que agotará el presupuesto.

## Cuándo debe interrumpir a alguien

Alerta por síntomas que afectan a quien genera el informe: errores, latencia o
incapacidad para completar la operación. CPU alta puede ayudar a diagnosticar,
pero no merece una página si el servicio sigue cumpliendo su objetivo y nadie
tiene una acción concreta.

Con poco tráfico, un solo fallo produce un porcentaje enorme. Exige también un
volumen mínimo o usa ventanas más largas. Cada alerta necesita responsable,
severidad, contexto y procedimiento; si siempre se ignora, no es una alerta útil.
