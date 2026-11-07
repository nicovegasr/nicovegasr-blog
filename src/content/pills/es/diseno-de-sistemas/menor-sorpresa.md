---
kind: 'pill'
title: 'Principio de la menor sorpresa'
subtitle: 'Cumplir lo que promete el contrato'
icon: 'predictable'
order: 3
momentStage: 'least-surprise'
publicationDate: 2026-10-12
---

El **principio de la menor sorpresa** propone que una pieza se comporte como espera quien conoce su contrato. Su nombre, los datos que recibe y el resultado que promete devolver deben describir con honestidad lo que hace.

## Ejemplo: una previsualización que guarda datos

Una operación llamada `previewInventory` permite consultar el contenido de un fichero antes de importarlo. Sin embargo, también guarda los registros en la base de datos:

```js
async function previewInventory(file, reader, repository) {
  const records = await reader.read(file);
  await repository.saveAll(records); // ← ¿La previsualización guarda datos? 🤔
  return { records };
}
```

Devolver los registros esperados no justifica un efecto que el contrato no anuncia.

## Qué significa aplicar el principio aquí

La previsualización muestra los datos sin modificar el inventario. Guardarlos corresponde a una operación de importación que lo indique en su contrato.
