---
kind: 'pill'
title: 'Reintentos'
subtitle: 'Repetir el guardado sin crear otro fichero'
icon: 'retry'
order: 8
momentStage: 'async-retries'
publicationDate: 2026-10-12
---

Un timeout indica que no llegó una respuesta a tiempo. La operación puede haberse completado, así que repetirla exige saber qué ocurrirá si ya se había ejecutado.

## Mes 18: el informe está guardado, pero no se sabe

`ReportArchive.save(report)` termina con un timeout. El almacenamiento ha guardado el informe, pero la respuesta se ha perdido. Al reintentar, el adaptador genera un nombre de fichero nuevo y vuelve a subir el contenido. Ahora hay dos copias del mismo informe.

## La decisión: el mismo informe usa la misma clave

El informe se genera una vez, antes de intentar guardarlo. Cada intento conserva su identificador y su contenido. `ObjectStorageArchive` usa ese identificador para construir la clave:

~~~ts
await storageSdk.putObject({
  key: `reports/${report.id}.csv`,
  body: report.content,
});
~~~

En este almacenamiento, escribir sobre una clave existente reemplaza su contenido. Si el primer intento funcionó, el siguiente vuelve a escribir el mismo fichero. Si no llegó a guardarse, lo crea. En ambos casos queda una sola entrada para ese informe.

Ese guardado es [idempotente](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/): repetirlo mantiene el mismo resultado. El fichero puede haberse escrito varias veces; no hace falta que el trabajo se ejecute una sola vez para evitar el duplicado.

En el [Async Chaos Lab](/es/laboratorios/async-chaos-lab/) puedes provocar una confirmación perdida y ver qué ocurre al repetir el trabajo.

**Lo que cuesta:** conservar el identificador y el contenido entre intentos, y comprobar qué hace el destino al recibir la misma clave. Cambiar el nombre en cada intento vuelve a crear duplicados.

**Antes de reintentar, hay que saber qué pasa si la operación ya se completó.**

*Ahora marketing quiere campañas de precio por fechas.*
