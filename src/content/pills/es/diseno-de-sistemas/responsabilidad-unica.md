---
kind: 'pill'
title: 'Principio de responsabilidad única (SRP)'
subtitle: 'Separar por motivos de cambio, no por pasos'
icon: 'responsibility'
order: 2
momentStage: 'srp'
publicationDate: 2026-10-12
---

El Principio de Responsabilidad Única (SRP) propone mantener junto el código que cambia por el mismo [motivo](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html) y separar el que cambia por motivos distintos. Contar métodos o pasos no revela esa frontera.

## Mes 8: una regla nueva para todos los proveedores

Cada lector del importador traduce el JSON de su proveedor y, de paso, comprueba que el registro es válido: código presente y cantidad no negativa. Funciona hasta que negocio decide que los códigos de producto deben tener ocho caracteres. Hay que cambiar todos los lectores. Se olvida uno, y los códigos de seis caracteres de ese proveedor siguen entrando.

Los lectores cambian por dos motivos: cuando un proveedor modifica su formato y cuando cambian las reglas del inventario.

## La decisión: el lector traduce, el registro decide

~~~ts
class NorthReader implements InventoryReader {
  read(file: InventoryFile): InventoryRecord[] {
    return parseJson(file).map((item) =>
      InventoryRecord.from({ code: item.code, quantity: item.qty }),
    );
  }
}
~~~

El lector solo sabe dónde está cada dato en el JSON de su proveedor. `InventoryRecord.from` aplica las reglas que hacen válido un registro y lo rechaza si no se cumplen. Cuando cambia un formato, se toca su lector; cuando cambia una regla, se toca `InventoryRecord`.

~~~ts
class InventoryRecord {
  private constructor(
    public readonly code: string,
    public readonly quantity: number,
  ) {}

  static from(data: { code: string; quantity: number }): InventoryRecord {
    if (data.code.length !== 8) {
      throw new Error('Product code must have eight characters');
    }
    if (data.quantity < 0) {
      throw new Error('Quantity must not be negative');
    }
    return new InventoryRecord(data.code, data.quantity);
  }
}
~~~

## Tres pasos, una responsabilidad

Separar no significa crear una clase por paso. El lector parsea, traduce campos y pide a `InventoryRecord` que construya el registro, y sigue teniendo un único motivo de cambio: el formato de su proveedor. En este caso, dividirlo en `JsonParser`, `FieldMapper` y `RecordBuilder` añadiría piezas sin que hayamos identificado motivos de cambio propios para cada una.

**Lo que cuesta:** hay una pieza más y hay que seguir la llamada a `InventoryRecord.from` para consultar las reglas. A cambio, las reglas del inventario pueden cambiar sin modificar la lectura del formato, incluso con un solo proveedor. Con varios lectores, además, se evita repetirlas.

**Una responsabilidad se reconoce por el motivo que la hace cambiar, no por el número de pasos que coordina.**

*El importador ya lee y valida. Ahora negocio quiere ver qué se va a importar antes de confirmarlo.*
