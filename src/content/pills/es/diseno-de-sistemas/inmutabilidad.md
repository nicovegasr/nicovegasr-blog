---
kind: 'pill'
title: 'Inmutabilidad'
subtitle: 'Recrear el estado en vez de mutarlo'
icon: 'snapshot'
order: 4
momentStage: 'immutability'
publicationDate: 2026-10-12
---

La inmutabilidad consiste en no modificar un objeto después de crearlo: cuando algo cambia, se crea un objeto nuevo con el estado completo. Así se puede conservar un estado sin que la siguiente transición lo modifique.

## Mes 10: un error que sobrevive al reintento

Las importaciones grandes tardan minutos, así que pasan a ejecutarse en segundo plano. Cada fichero va de `pending` a `processing` y termina en `completed`, o en `failed` si algo sale mal. En ese caso, la política de reintentos lo vuelve a procesar.

El fichero es un objeto que se modifica en cada paso:

~~~ts
file.status = 'failed';
file.error = 'Timeout al leer el fichero';

// el reintento lo procesa de nuevo y esta vez va bien
file.status = 'completed';
~~~

El fichero aparece como `completed`, pero sigue teniendo un detalle de error. Quien lo consulta no sabe si la importación fue bien, si falló a medias o si ese error es de otro intento.

## La decisión: cada transición crea un objeto nuevo

~~~ts
class ImportFile {
  private constructor(
    readonly name: string,
    readonly status: ImportStatus,
    readonly error?: string,
  ) {}

  fail(error: string): ImportFile {
    return new ImportFile(this.name, 'failed', error);
  }

  complete(): ImportFile {
    return new ImportFile(this.name, 'completed');
  }
}
~~~

Cada transición construye el estado entero desde cero, así que un fichero `completed` no puede arrastrar el error de un intento anterior: nadie lo copia. Y cada paso queda como un valor propio que se puede registrar:

~~~text
pending → processing → failed (timeout) → processing → completed
~~~

El error pertenece a la versión `failed`, no al fichero para siempre.

**Lo que cuesta:** crear un objeto en cada transición y decidir qué datos sobreviven a cada una, como el nombre del fichero. Si un objeto solo tiene un campo que cambia y nada asociado a cada estado, modificarlo es igual de claro.

**Al completar el fichero, el error del intento anterior queda fuera del nuevo estado.**

*Las importaciones ya terminan en un estado claro. Ahora un proveedor deja de enviar un producto y hay que decidir si se descataloga.*
