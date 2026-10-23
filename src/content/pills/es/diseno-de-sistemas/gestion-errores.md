---
kind: 'pill'
title: 'Gestión de errores'
subtitle: 'dar a cada fallo un lugar y una respuesta explícita'
icon: 'error-flow'
order: 7
publicationDate: 2026-10-12
---

Gestionar errores consiste en decidir **qué fallos forman parte del contrato** de una operación y dónde se traducen los fallos de sus dependencias. `Result`, `Either` y `try-catch` ayudan en puntos distintos de esa decisión.

## Dos fallos que piden respuestas distintas

Una persona configura una alerta de inventario. El umbral debe ser positivo y el producto debe existir. La validación puede rechazar la petición de forma normal. Al guardar la alerta, además, la base de datos puede no responder. Si ambos casos se convierten en un `null` o en un `catch` general, quien llama no sabe si debe corregir los datos o esperar a que vuelva el servicio.

## Hacer explícitos los resultados esperados

`Result<AlertRule, ValidationError>` expresa los dos resultados de validar el umbral y construir la regla. Un `Ok` contiene una regla válida; un `Err` explica qué dato corregir. `Either` representa la misma idea de dos caminos, aunque sus nombres y convenciones varían entre librerías. Comprobar que el producto existe requiere una consulta: «no existe» es un resultado esperado; «no puedo consultar» es un fallo de disponibilidad.

~~~text
Entrada → validar umbral → Err(ValidationError) → corregir entrada
          └→ Ok(AlertRule) → buscar producto → no existe → corregir ID
                                  └→ existe → guardar → alerta creada
Buscar o guardar → fallo del proveedor → error de disponibilidad
~~~

## Traducir el fallo donde se conoce su origen

El adaptador de persistencia captura las excepciones relevantes del cliente de base de datos y las traduce a un error de disponibilidad que entiende la aplicación. Ahí tiene un lugar concreto `try-catch`; ponerlo alrededor de cada función dispersaría la política de errores. La capa de entrada decide después cómo comunicar el fallo: datos a corregir o servicio temporalmente indisponible. Conviene conservar la causa original en los logs para investigar el incidente, sin exponer detalles del proveedor en la respuesta pública.

Un [tipo `Result`](https://doc.rust-lang.org/core/result/enum.Result.html) hace visibles sus dos variantes cuando el lenguaje y las herramientas lo apoyan. Su utilidad no depende de convertir **todos** los fallos en valores. La frontera importante es que un dato inválido, un producto inexistente y una dependencia caída no se presenten como el mismo problema.
