---
kind: 'pill'
title: 'Gestión de errores'
subtitle: 'Gestionar cada fallo sin perder sus datos'
icon: 'error-flow'
order: 6
momentStage: 'error-handling'
publicationDate: 2026-10-12
---

Gestionar errores implica distinguirlos y tener los datos necesarios para decidir qué hacer con cada uno. Si se capturan para devolver un `null` o continuar como si nada, esa información se pierde por el camino.

## Mes 13: tres fallos, un solo log

Para crear una alerta de stock se indica un producto y un umbral. El caso de uso valida la entrada, busca el producto y guarda la alerta, con todo dentro de un `try-catch`:

~~~ts
try {
  // validar umbral, buscar producto, guardar alerta
} catch (error) {
  logger.error('Error al crear la alerta');
  return null;
}
~~~

El panel recibe `null` y el log dice «Error al crear la alerta». Pero puede haber fallado porque el umbral era negativo, porque el producto no existía o porque la base de datos estaba caída. Son fallos distintos y se ha perdido lo necesario para tratarlos por separado.

## La decisión: cada error con sus datos

El umbral negativo tiene un error propio, con el valor recibido y el producto para el que se intentaba crear la alerta:

~~~ts
const error = {
  type: 'invalid-threshold',
  message: 'Stock alert threshold must not be negative',
  metadata: { productCode, threshold },
};
~~~

Su tipo permite distinguirlo del producto inexistente, y sus metadatos dicen con qué entrada ocurrió. Si lo que falla es la conexión, se conserva la excepción original con su stack y su causa.

El error sigue subiendo hasta donde se decide qué significa hacia el exterior. Allí también se registra, añadiendo el contexto de la operación:

~~~ts
logger.error(
  { operation: 'create-alert', requestId, error },
  'Stock alert creation failed',
);
~~~

Ahora el registro permite saber qué falló, para qué producto y en qué petición. El logger debe conservar también el stack y la causa si recibe una excepción. Que un error sea de dominio y se sepa qué responder no lo hace menos útil para observabilidad.

Si una capa captura el fallo para añadir contexto, después lo propaga conservando la causa. Registrarlo y devolver `null` volvería a dejar al resto sin saber qué pasó. El log se escribe una vez al final de ese recorrido, sin repetirlo en cada capa.

**Lo que cuesta:** decidir qué datos necesita cada error. Un mensaje genérico se queda corto; guardar datos sin relación con el fallo añade ruido.

**Cada error por separado, con sus metadatos y sin silenciarlo por el camino.**

*Ahora dirección pide informes de inventario, y algunos tienen que archivarse en dos sitios.*
