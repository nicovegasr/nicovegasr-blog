---
kind: 'pill'
title: 'Acoplamiento'
subtitle: 'Separar el uso de una dependencia de sus detalles'
icon: 'coupling'
order: 7
momentStage: 'coupling'
publicationDate: 2026-10-12
---

Cuando una pieza conoce detalles de otra, cambiar esos detalles puede obligar a modificar ambas. En el generador de informes, el acoplamiento se ve en cuánto necesita saber sobre el almacenamiento para guardar un fichero.

## Mes 16: guardar el informe también depende del caso de uso

El caso de uso genera un informe de inventario y lo sube con el SDK del almacenamiento:

~~~ts
const report = generateInventoryReport(records);
await storageSdk.putObject({
  key: `reports/${crypto.randomUUID()}.csv`,
  body: report.content,
});
~~~

Ahora una instalación necesita guardar los informes en disco. Para hacerlo, hay que entrar en ese mismo caso de uso y añadir rutas locales y llamadas al sistema de ficheros. La generación del informe no ha cambiado, pero su código también conoce cómo se guarda en cada destino.

## La decisión: pedir que se guarde el informe

El caso de uso recibe un `ReportArchive`. Su contrato expresa lo que necesita: guardar el informe completo.

~~~ts
interface ReportArchive {
  save(report: InventoryReport): Promise<void>;
}

const report = generateInventoryReport(records);
await archive.save(report);
~~~

La llamada al SDK y la construcción de su clave pasan a `ObjectStorageArchive`:

~~~ts
class ObjectStorageArchive implements ReportArchive {
  async save(report: InventoryReport): Promise<void> {
    await storageSdk.putObject({
      key: `reports/${crypto.randomUUID()}.csv`,
      body: report.content,
    });
  }
}
~~~

Otra implementación puede guardar en disco. La configuración de la aplicación elige cuál recibe el caso de uso. Cambiar de destino sigue exigiendo trabajo, pero ese cambio ya no obliga a modificar la generación del informe.

El caso de uso sigue acoplado a `ReportArchive`: necesita que `save` guarde el informe o comunique el fallo. Lo que deja de conocer son los métodos del SDK, sus parámetros y las rutas de cada destino.

**Lo que cuesta:** mantener el contrato, sus implementaciones y la configuración que las conecta. Si solo hay una llamada estable al SDK y no hay una necesidad de separar esos cambios, añadir una interfaz puede no compensar.

**El cambio de almacenamiento queda separado del cambio en el contenido del informe.**

*El informe se ha guardado, pero la respuesta no llega.*
