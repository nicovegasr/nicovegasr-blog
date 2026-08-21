---
kind: 'pill'
title: 'Backend'
subtitle: 'el servicio que hace el trabajo'
icon: 'server'
order: 5
bonus: false
publicationDate: 2026-08-21
---

Un backend es **un servicio que recibe mensajes, ejecuta trabajo y devuelve un
resultado**. Suele ejecutarse en uno o varios servidores, pero no es el servidor
en sí: el servidor es la máquina o proceso que puede recibir tráfico; el backend
es el código que decide qué hacer con ese tráfico.

Lo más habitual es que reciba peticiones HTTP. Una web, una app móvil o una
integración envían un mensaje y el servicio responde. También puede recibir
mensajes de una cola o arrancar por un horario, pero la idea es la misma: llega
una señal y el backend aplica las reglas del sistema.

## Qué llega en una petición HTTP

Imagina que una persona confirma un pedido. El frontend puede enviar algo como
esto:

```http
POST /orders?coupon=SUMMER
Authorization: Bearer <token>
Cookie: session=...
Content-Type: application/json

{ "products": ["keyboard"], "address": "..." }
```

La petición tiene una **ruta** (`/orders`) y un **método** (`POST`) que expresan
la operación. Los *headers* llevan metadatos, como el formato del contenido o
la identidad. Los *query params* (`coupon=SUMMER`) afinan la petición. El
*body* lleva los datos que queremos crear o modificar. Las cookies también
viajan en los headers; el navegador las adjunta, por ejemplo, para identificar
una sesión.

![Una petición HTTP entra en un servicio backend, que autentica, valida y aplica las reglas para crear un pedido; después encarga por una cola la factura y su envío por correo](../../images/fundamentos/backend/request-flow-es.webp)

## Del mensaje a la operación

El backend no ejecuta una petición tal cual llega. Primero decide qué código
atiende esa ruta. Después puede autenticar a la persona, comprobar que tiene
permiso para comprar, validar que los campos tienen sentido y aplicar las reglas
del negocio: que haya stock, que el precio sea el actual o que el cupón siga
siendo válido.

Solo entonces cambia datos: descuenta unidades y guarda el pedido. Al final
devuelve una respuesta HTTP. Puede ser un `201 Created` con el pedido, un `400`
si faltan datos, un `401` si no hay una identidad válida o un `409` si ya no
queda stock. El frontend usa esa respuesta para actualizar la pantalla, pero no
decide si la operación era válida.

Esta centralización permite que la web, la app móvil y una integración externa
usen las mismas reglas sin copiarlas en cada cliente.

## CRUD es una parte del trabajo

Muchas APIs exponen operaciones CRUD: crear, leer, actualizar y borrar datos.
En una tienda, `POST /orders` crea un pedido, `GET /orders/42` lo consulta,
`PATCH /orders/42` modifica un dato permitido y `DELETE /cart/items/7` quita un
producto del carrito.

CRUD describe el cambio de datos, no sustituye las reglas. Crear un pedido no
es solo insertar una fila: hay que comprobar identidad, stock, precios y qué
efectos debe producir la compra.

## También puede seguir trabajando después

No todo tiene que terminar antes de responder. Tras crear el pedido, el backend
puede guardar un trabajo en una **cola** y responder enseguida. Otro proceso
consume ese trabajo más tarde: genera la factura y envía el correo.

Así la persona no espera a que se renderice un PDF o a que responda el proveedor
de correo. Además, si el envío falla, el trabajador puede reintentarlo sin
repetir la compra. Las tareas programadas y los mensajes de otros servicios se
procesan de una forma parecida.

⚠️ Ocultar un botón en el frontend mejora la experiencia, pero no protege la
operación. Cualquiera puede construir una petición HTTP por su cuenta; por eso
la autenticación, los permisos y las reglas importantes viven en el backend.
