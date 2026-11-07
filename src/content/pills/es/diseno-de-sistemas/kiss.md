---
kind: 'pill'
title: 'Keep It Simple, Stupid (KISS)'
subtitle: 'Resolver sin complicar'
icon: 'simple'
order: 1
momentStage: 'kiss'
publicationDate: 2026-10-12
---

**KISS** (*Keep It Simple, Stupid*) es un principio que propone buscar la forma más sencilla de resolver un problema, sin ignorar su complejidad inherente.

## Ejemplo: leer ficheros de distintos clientes

Imaginemos una aplicación que lee ficheros de distintos clientes, procesa sus datos y los guarda. Un cliente identifica sus productos con el campo `code`; otro, con `sku`. Interpretar esas diferencias forma parte de la complejidad inherente del problema.

Podemos usar lectores que conozcan cada estructura y devuelvan los datos con una representación común. Si las reglas de procesamiento son las mismas, después seguimos los mismos pasos para procesarlos y guardarlos. Cuando cambia la estructura de un fichero, cambia su lector; el resto del flujo puede mantenerse.

El caso de uso recibe el lector adecuado para la estructura del fichero:

```js
function importInventory(file, reader, processor, repository) {
  return reader.read(file) // ← Distintos lectores devuelven registros de dominio comunes.
    .then(records => processor.process(records))
    .then(records => repository.saveAll(records));
}
```

## Qué significa aplicar KISS aquí

Si la tarea contempla ficheros de distintos clientes, la solución sencilla debe atender esas diferencias y mantener claro el flujo de lectura, procesamiento y guardado. Separar los lectores tiene sentido si ayuda a cubrir esa necesidad sin introducir mecanismos para requisitos que todavía no existen.
