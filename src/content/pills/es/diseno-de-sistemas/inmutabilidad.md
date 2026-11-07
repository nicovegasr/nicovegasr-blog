---
kind: 'pill'
title: 'Inmutabilidad'
subtitle: 'Recrear el estado en vez de mutarlo'
icon: 'snapshot'
order: 4
momentStage: 'immutability'
publicationDate: 2026-10-12
---

La **inmutabilidad** consiste en conservar un objeto sin modificarlo después de crearlo. Cuando cambia su estado, una operación devuelve otro objeto; quienes conservaban la versión anterior siguen viendo los mismos datos.

## Ejemplo: completar una importación que había fallado

Un fichero importado tiene un estado y, si falla, un error. Al completar un reintento, queremos obtener un fichero completado sin perder la información del intento fallido. El método `complete` crea otro objeto con el mismo nombre, el estado `completed` y sin error:

```ts
class ImportFile {
  constructor(
    readonly name: string,
    readonly status: 'failed' | 'completed',
    readonly error?: string,
  ) {}

  complete(): ImportFile {
    return new ImportFile(this.name, 'completed');
  }
}

const failed = new ImportFile('inventory.csv', 'failed', 'Read timeout');
const completed = failed.complete();
```

Después de llamar a `complete`, `failed` sigue teniendo el estado `failed` y el error `Read timeout`. `completed` es otro objeto: su estado es `completed` y no tiene un error asociado.

## Qué significa aplicar inmutabilidad aquí

Completar la importación crea una nueva versión del fichero en lugar de modificar la anterior. El código que continúe trabajando con el fichero completado debe usar el objeto devuelto por `complete`.
