---
kind: 'pill'
title: 'Reintentos'
subtitle: 'Repetir el guardado sin crear otro fichero'
icon: 'retry'
order: 8
momentStage: 'async-retries'
publicationDate: 2026-10-12
---

Un **reintento** vuelve a ejecutar una operación que ha fallado o cuyo resultado no se ha podido confirmar. Un timeout indica que la respuesta no llegó a tiempo; la operación puede haberse completado. Por eso hay que definir qué ocurre al repetirla.

## Ejemplo: guardar un informe tras perder la respuesta

El almacenamiento guarda un informe, pero su confirmación se pierde. Si cada intento genera un nombre nuevo, reintentar crea otra copia. Podemos generar el informe una sola vez y conservar su identificador y su contenido en todos los intentos:

```js
function saveReport(report, storage) {
  return storage.putObject({
    key: `reports/${report.id}.csv`,
    body: report.content,
  });
}
```

En este ejemplo, el destino reemplaza el contenido al escribir sobre una clave existente. Repetir el guardado con la misma clave y contenido mantiene el mismo fichero visible. El identificador debe conservarse también si el reintento lo ejecuta otro proceso.

## Qué significa reintentar con seguridad aquí

El efecto sobre el fichero es [idempotente](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/): repetirlo conserva el resultado, aunque haya varias escrituras. Esa garantía depende del destino y no cubre automáticamente versiones históricas ni otros efectos, como notificaciones; cada efecto necesita su propia estrategia.

El [Async Chaos Lab](/laboratorios/async-chaos-lab/) permite observar una confirmación perdida y sus reintentos.
