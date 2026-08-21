---
kind: 'pill'
title: 'Backend'
subtitle: 'la lógica'
icon: 'foundation'
order: 4
bonus: false
publicationDate: 2026-08-21
---

El backend es la parte de una aplicación que **decide qué está permitido y
aplica los cambios en el sistema**. Normalmente se ejecuta en un servidor y no
la ves al usar la aplicación, pero ahí viven sus reglas.

![Un formulario pide crear un pedido; el backend valida la petición, autoriza la operación y aplica las reglas antes de guardar el cambio](../../images/fundamentos/backend/request-flow-es.webp)

## Del clic al cambio real

El frontend recoge la intención de quien usa la aplicación: muestra un
formulario, deja elegir productos y ofrece un botón para confirmar el pedido.
Pero pulsar ese botón no debería crear el pedido por sí solo.

El frontend envía una petición al backend. Entonces el backend comprueba que
los datos son válidos, que hay stock, que el precio sigue siendo correcto y que
esa persona puede hacer la operación. Solo después guarda el pedido y responde
con el resultado.

Así puedes tener una web, una app móvil y una integración externa usando las
mismas reglas sin copiarlas en cada cliente.

## No siempre espera un clic

Un backend también puede reaccionar a cosas que ya han ocurrido o iniciar
trabajo por su cuenta. Cuando se crea un pedido, por ejemplo, puede publicar un
evento para que otro proceso prepare la factura o avise al almacén.

Un *webhook* hace algo parecido entre sistemas: el backend envía una petición a
otro servicio para notificarle un cambio. Y los trabajos programados (*cron
jobs*) o asíncronos se ocupan de tareas que no conviene resolver mientras la
persona espera, como generar un informe nocturno o procesar muchas imágenes.

La idea es la misma: **el backend aplica las reglas del sistema aunque nadie
esté pulsando un botón en ese momento**.

## La seguridad se decide aquí

El frontend puede ocultar un botón o validar un campo para mejorar la
experiencia, pero cualquiera puede modificarlo o llamar a la API directamente.
**No es una frontera de seguridad.**

Cuando una petición actúa en nombre de alguien, el backend debe comprobar su
identidad y sus permisos antes de hacer nada. Un token es una forma habitual de
llevar esa identidad; una sesión mediante cookie es otra. También hay rutas
públicas que no necesitan autenticar a nadie.

## Sin memoria entre peticiones

Muchos backends son *stateless*: cada petición incluye el contexto necesario
para procesarla, como la identidad o los datos de la operación. Así cualquiera
de las instancias del backend puede atender la siguiente petición, sin depender
de la memoria de la anterior.

⚠️ *Stateless* no significa que la aplicación no guarde datos. Significa que
el servidor no necesita recordar la conversación en su memoria para continuar.
