---
kind: 'pill'
title: 'Principio de responsabilidad única (SRP)'
subtitle: 'Una responsabilidad, varios pasos'
icon: 'responsibility'
order: 2
momentStage: 'srp'
publicationDate: 2026-10-12
---

El **principio de responsabilidad única** (SRP) propone que cada pieza de código tenga una única responsabilidad. Esa responsabilidad puede requerir varias operaciones: contar cuántas hace una clase o función no basta para decidir si cumple el principio.

## Ejemplo: importar un fichero de inventario

Un caso de uso importa el inventario de un cliente. Para completar esa tarea necesita leer el fichero, validar sus registros y guardarlos:

```js
// Una responsabilidad: coordinar la importación del inventario.
function importInventory(file, reader, validator, repository) {
  return reader.read(file)
    .then(records => validator.validate(records))
    .then(records => repository.saveAll(records));
}
```

El lector interpreta la estructura del fichero; el validador comprueba las reglas del inventario y rechaza los registros que no las cumplen; el repositorio se encarga de guardarlos. El caso de uso coordina esas operaciones, sin implementar sus detalles. Cambiar cómo se interpreta un campo o cómo se guardan los datos no exige modificar esa coordinación.

## Qué significa aplicar SRP aquí

Leer, validar y guardar son tres operaciones necesarias para una responsabilidad: importar el inventario. Si el caso de uso también implementase los formatos, las reglas y el acceso a datos, reuniría decisiones que pueden cambiar por motivos distintos.

La [formulación del principio](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html) desarrolla qué se entiende por un motivo de cambio.
