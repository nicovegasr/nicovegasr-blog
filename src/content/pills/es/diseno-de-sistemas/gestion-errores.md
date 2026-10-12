---
kind: 'pill'
title: 'Gestión de errores'
subtitle: 'dar a cada fallo un lugar y una respuesta explícita'
icon: 'error-flow'
order: 7
bonus: false
publicationDate: 2026-10-12
---

Gestionar errores consiste en decidir **qué fallos forman parte del contrato** de una operación y dónde se traducen los fallos de sus dependencias. `Result`, `Either` y `try-catch` ayudan en puntos distintos de esa decisión.

## Problema a resolver

Una persona configura una alerta de inventario. El umbral debe ser positivo y el producto debe existir. La validación puede rechazar la petición de forma normal. Al guardar la alerta, además, la base de datos puede no responder. Si ambos casos se convierten en un `null` o en un `catch` general, quien llama no sabe si debe corregir los datos o esperar a que vuelva el servicio.

## Acciones a realizar

Expresar la creación de la regla con dos resultados posibles: `Result<AlertRule, ValidationError>`. Un `Ok` contiene una regla válida; un `Err` explica qué dato corregir. `Either` representa la misma idea de dos caminos, aunque sus nombres y convenciones varían entre librerías.

~~~text
Entrada → validar → Ok(AlertRule) ──→ guardar → alerta creada
                  └→ Err(ValidationError) → corregir entrada
Guardar → fallo del proveedor → error de disponibilidad
~~~

En el adaptador de persistencia, capturar las excepciones que emite el cliente de base de datos y traducirlas a un error de disponibilidad que entienda la aplicación. Ese es un lugar concreto para `try-catch`; ponerlo alrededor de cada función solo dispersaría la política de errores. La capa de entrada decide después cómo comunicar el fallo: por ejemplo, un error de validación frente a un fallo temporal del servicio.

Un [tipo `Result`](https://doc.rust-lang.org/core/result/enum.Result.html) obliga a tratar sus dos variantes cuando el lenguaje y las herramientas lo apoyan. Su utilidad no depende de convertir **todos** los fallos en valores. La frontera importante es que un dato inválido y una dependencia caída no se presenten como el mismo problema.
