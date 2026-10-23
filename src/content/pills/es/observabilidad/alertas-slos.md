---
kind: 'pill'
title: 'Alertas y SLOs'
subtitle: 'medir para actuar'
icon: 'alert'
order: 8
publicationDate: 2026-08-27
---

Una alerta conecta una señal con una acción. Un SLO define cuánto deterioro puede
aceptar el servicio; la alerta avisa cuando el ritmo de fallos amenaza con agotar
ese margen.

## De un informe fallido a una notificación

El worker ya expone cuántos informes terminan correctamente y cuántos fallan.
Prometheus puede convertir esas métricas en una regla sencilla:

```text
si los fallos superan el 1 % durante 5 minutos -> notificar
```

Prometheus comprueba la condición periódicamente. Exigir que se mantenga durante
cinco minutos evita avisar por un pico breve. Si continúa, Alertmanager envía la
notificación a la persona o al canal correspondiente.

El aviso debe incluir lo necesario para actuar: el servicio afectado, el
dashboard, los logs del periodo y un procedimiento. Una alerta sin contexto ni
respuesta posible solo genera ruido.

## Cómo entra el SLO

El **SLI** es la medida: proporción de informes generados correctamente. El
**SLO** fija el objetivo: por ejemplo, `99,9 %` durante 30 días. El `0,1 %`
restante es el **presupuesto de error**; por cada 10.000 informes permite 10
fallos sin bajar del objetivo.

Una regla fija como «más del 1 %» no sabe cuánto presupuesto queda. El *burn
rate* mide el ritmo al que se consume ese margen. Mantener un 1 % de fallos
consume diez veces más rápido el presupuesto permitido por un objetivo del
99,9 %.

Observar un periodo corto y otro más largo permite distinguir un pico pasajero
de un deterioro sostenido que terminará agotando el presupuesto.

## Cuándo debe interrumpir a alguien

Alerta por síntomas que afectan a quien genera el informe: errores, latencia o
incapacidad para completar la operación. CPU alta puede ayudar a diagnosticar,
pero no merece una página si el servicio sigue cumpliendo su objetivo y nadie
tiene una acción concreta.

Con poco tráfico, un solo fallo produce un porcentaje enorme; conviene exigir un
volumen mínimo o esperar más tiempo. Cada alerta necesita una persona responsable
y una acción clara. Si siempre se ignora, no es una alerta útil.
