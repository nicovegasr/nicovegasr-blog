---
kind: 'pill'
title: 'Acoplamiento'
subtitle: 'elegir de qué detalles depende cada pieza'
icon: 'coupling'
order: 5
publicationDate: 2026-10-12
---

El acoplamiento describe cuánto necesita saber una pieza de otra para funcionar o cambiar. Una aplicación siempre tendrá dependencias: la decisión de diseño es **a qué se acopla** y qué coste tendrá mover esa frontera.

## Cuando el caso de uso conoce al proveedor

Un proceso genera informes de inventario y los archiva. `GenerateInventoryReport` calcula el contenido, construye la ruta del proveedor y llama directamente a `storageSdk.putObject(...)`. Al añadir un segundo destino para ciertos informes, el caso de uso acaba eligiendo credenciales, rutas y clientes. Cambiar cómo se archiva un informe obliga a tocar el código que decide qué contiene.

## Poner nombre a la capacidad

El caso de uso mantiene la decisión «este informe debe archivarse». Un puerto expresa esa intención con `ReportArchive.save(report)`: una implementación usa el almacenamiento de objetos y otra, el nuevo destino. Cada adaptador traduce el contrato al proveedor que le corresponde. Si el destino varía por tipo de informe, una política de enrutamiento recibe ese dato y elige entre adaptadores configurados; las credenciales y los nombres de proveedor no pasan al caso de uso.

~~~text
GenerateInventoryReport → ReportArchive.save(report)
                           ├→ ObjectStorageArchive → SDK
                           └→ OtherArchive         → otro destino
~~~

La [arquitectura de puertos y adaptadores](https://alistair.cockburn.us/hexagonal-architecture) da nombre a esta frontera. El informe y la necesidad de archivarlo son parte del problema; la ruta, las credenciales y los tipos del SDK son detalles de integración. El puerto evita que esos detalles dicten cómo se expresa el caso de uso. Si falla el guardado, el adaptador también debe traducir el error del SDK a uno que permita decidir si el trabajo se reintenta o se marca como fallido.

## El coste de esa frontera

La abstracción cuesta: hay un contrato, adaptadores y una decisión de composición que mantener. Si solo hay una llamada estable al SDK y no existe una frontera útil que proteger, envolver cada método en una interfaz idéntica añade pasos sin desacoplar decisiones. Conviene extraer el puerto cuando puede nombrarse una capacidad de la aplicación y mantener fuera detalles que cambian por otro motivo.
