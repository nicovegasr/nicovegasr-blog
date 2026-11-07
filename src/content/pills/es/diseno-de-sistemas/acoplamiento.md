---
kind: 'pill'
title: 'Acoplamiento'
subtitle: 'Depender de un contrato'
icon: 'coupling'
order: 7
momentStage: 'coupling'
publicationDate: 2026-10-12
---

El **acoplamiento** describe la dependencia entre piezas de un sistema. Cuando una conoce detalles de otra, cambiar esos detalles puede obligar a modificar ambas. Elegir qué necesita conocer permite limitar el alcance de esos cambios.

## Ejemplo: guardar informes en distintos destinos

Un caso de uso genera un informe de inventario. Si también conoce los métodos del SDK de almacenamiento, admitir guardado en disco exige modificarlo. Podemos hacer que dependa de una operación `save(report)` y llevar los detalles del SDK a una implementación:

```js
function exportInventory(records, archive) {
  const report = generateInventoryReport(records);
  return archive.save(report);
}

const objectStorageArchive = {
  save(report) {
    return storageSdk.putObject({
      key: `reports/${crypto.randomUUID()}.csv`,
      body: report.content,
    }).then(() => undefined);
  },
};
```

Otra implementación puede guardar en disco. La configuración elige cuál recibe el caso de uso; ambas deben guardar el informe o comunicar el fallo mediante el rechazo de la promesa.

## Qué significa reducir el acoplamiento aquí

El caso de uso sigue dependiendo del contrato de `archive`, pero deja de conocer los parámetros del SDK y las rutas del destino. Mantener ese contrato y conectar sus implementaciones tiene un coste; una única llamada estable al SDK puede no justificar esa separación.
