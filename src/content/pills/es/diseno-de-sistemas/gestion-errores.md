---
kind: 'pill'
title: 'Gestión de errores'
subtitle: 'Gestionar cada fallo sin perder sus datos'
icon: 'error-flow'
order: 6
momentStage: 'error-handling'
publicationDate: 2026-10-12
---

La **gestión de errores** consiste en reconocer los fallos, conservar la información que los explica y decidir cómo responder. Un mensaje genérico o un `null` pueden ocultar diferencias necesarias para tomar esa decisión.

## Ejemplo: una alerta de stock que no se crea

Crear una alerta puede fallar por un umbral negativo, un producto inexistente o una caída de la base de datos. Devolver `null` en todos los casos impide distinguirlos. Para el umbral negativo, el error puede incluir el tipo y la entrada que lo causó:

```js
const error = {
  type: 'invalid-threshold',
  message: 'Stock alert threshold must not be negative',
  metadata: { productCode, threshold },
};
```

En el punto donde se decide la respuesta al cliente, se registra el fallo con el contexto de la petición:

```js
logger.error(
  { operation: 'create-alert', requestId, error },
  'Stock alert creation failed',
);
```

Si falla la conexión, se conserva la excepción original con su stack y su causa; el logger debe registrarlos también. Una capa que añade contexto propaga el fallo conservando esa causa.

## Qué significa gestionar los errores aquí

Cada fallo llega con los datos necesarios para responder e investigarlo, incluidos los errores de dominio. Se registra una vez en ese punto de salida, evitando repetir el mismo fallo en cada capa y añadir datos sin relación con él.
