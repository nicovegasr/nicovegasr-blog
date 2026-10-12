---
kind: 'pill'
title: 'Acoplamiento'
subtitle: 'elegir de qué detalles depende cada pieza'
icon: 'coupling'
order: 5
bonus: false
publicationDate: 2026-10-12
---

El acoplamiento describe cuánto necesita saber una pieza de otra para funcionar o cambiar. Una aplicación siempre tendrá dependencias: la decisión de diseño es **a qué se acopla** y qué coste tendrá mover esa frontera.

## Problema a resolver

Un proceso genera informes de inventario y los archiva. `GenerateInventoryReport` calcula el contenido, construye la ruta del proveedor y llama directamente a `storageSdk.putObject(...)`. Al añadir un segundo destino para ciertos informes, el caso de uso acaba eligiendo credenciales, rutas y clientes. Cambiar cómo se archiva un informe obliga a tocar el código que decide qué contiene.

## Acciones a realizar

Dejar en el caso de uso la decisión «este informe debe archivarse» y definir un puerto con esa intención: `ReportArchive.save(report)`. Una implementación usa el almacenamiento de objetos; otra, el nuevo destino. El caso de uso depende de un contrato propio y cada adaptador traduce ese contrato a su proveedor.

~~~text
GenerateInventoryReport → ReportArchive.save(report)
                           ├→ ObjectStorageArchive → SDK
                           └→ OtherArchive         → otro destino
~~~

La [arquitectura de puertos y adaptadores](https://alistair.cockburn.us/hexagonal-architecture) da nombre a esta frontera. El informe y la necesidad de archivarlo son dependencias del problema; la ruta, las credenciales y los tipos del SDK son detalles de integración. El puerto evita que esos detalles dicten cómo se expresa el caso de uso.

La abstracción también cuesta: hay un contrato, adaptadores y una decisión de composición que mantener. Si solo hay una llamada estable al SDK y no existe una frontera útil que proteger, envolver cada método en una interfaz idéntica añade pasos sin desacoplar decisiones. Conviene extraer el puerto cuando puede nombrarse una capacidad de la aplicación, no cuando se quiere ocultar el nombre de una librería.
