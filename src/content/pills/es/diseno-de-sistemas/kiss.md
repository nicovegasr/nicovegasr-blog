---
kind: 'pill'
title: 'Keep It Simple, Stupid (KISS)'
subtitle: 'Resolver lo complejo sin complicarlo más'
icon: 'simple'
order: 1
momentStage: 'kiss'
publicationDate: 2026-10-12
---

**KISS** (*Keep It Simple, Stupid*) propone usar la solución más sencilla que resuelva el problema de verdad. Simple no significa ignorar su complejidad, sino evitar añadir la que no hace falta.

Imaginemos una cadena de tiendas que importa el inventario de sus proveedores. Es el sistema que veremos crecer a lo largo de la serie.

## Mes 1: un proveedor, una función

Llega un único proveedor que envía su inventario en JSON. Una función lo lee y devuelve registros de inventario. No hace falta más.

## Mes 3: otro `if`

Llegan más proveedores, cada uno con su propia estructura. Lo rápido es añadir una rama:

~~~ts
if (supplier === 'north') { code = item.code; }
else if (supplier === 'south') { code = item.product.sku; }
// ...y un if más por cada proveedor nuevo
~~~

Cada `if` parece la opción simple. La lógica de lectura acaba copiada en los cron jobs que importan stock, concilian y exportan.

## Mes 6: un proveedor renombra un campo

Un proveedor cambia `code` por `sku`. Se actualizan dos cron jobs; el tercero sigue buscando `code`, recibe `undefined` y carga productos sin código. El proceso termina sin avisar.

La variación entre proveedores es **complejidad inherente**: viene con el problema. Duplicar la lógica de lectura en varios procesos es **complejidad añadida**: la hemos puesto nosotros.

## La decisión: un lector por formato

~~~ts
interface InventoryReader {
  read(file: InventoryFile): InventoryRecord[];
}
~~~

Cada estructura tiene su lector y los tres cron jobs lo reutilizan. Cuando un proveedor cambia su formato, tocas un lector y sus pruebas.

**Lo que cuesta:** una interfaz y un lector por formato. Un motor configurable o un sistema de plugins añadiría más piezas que mantener. Puede compensar si necesitas incorporar formatos sin desplegar.

**Un `if` puede ser suficiente. Aquí, separar los lectores simplifica el cambio: cada formato se interpreta en un solo sitio.**

*Los formatos ya se leen en un solo sitio. Ahora cada lector también aplica las reglas del inventario.*
