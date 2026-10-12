---
kind: 'pill'
title: 'Principio de responsabilidad única (SRP)'
subtitle: 'una responsabilidad puede abarcar todo un proceso'
icon: 'responsibility'
order: 2
bonus: false
publicationDate: 2026-10-12
---

El Principio de Responsabilidad Única (SRP) agrupa el código que cambia por el mismo [motivo](https://blog.cleancoder.com/uncle-bob/2014/05/08/SingleReponsibilityPrinciple.html). La responsabilidad de un caso de uso puede ser un proceso completo, aunque necesite varios pasos para entregar su resultado.

## Problema a resolver

Un worker recibe un fichero con datos para actualizar usuarios. Antes de guardar cada uno necesita obtener un `User` a partir de su registro. El formato puede ser incorrecto o faltarle campos obligatorios. ¿Qué parte del código debe hacerse cargo de convertir esa entrada en un usuario válido?

## Acciones a realizar

Dar al caso de uso la responsabilidad de **obtener un `User` válido del fichero**. Dentro de ese proceso, leer el registro, comprobar su formato y construir el usuario pueden ser funciones distintas. Cada función explica un paso; el caso de uso responde por el resultado completo.

~~~text
Worker → caso de uso → leer → validar formato → construir User
       ← User válido o error de entrada
Worker → guardar User
~~~

El worker decide qué hacer con el resultado y coordina el guardado. El código de persistencia tiene otro motivo de cambio: puede cambiar la base de datos sin que cambie el formato del fichero. Esa frontera es más útil que repartir `read`, `validateFormat` y `toUser` en tres clases por el simple hecho de que son tres verbos.

Si el formato empieza a evolucionar por separado o lo consumen varios procesos, extraer un lector puede tener sentido. Hasta entonces, mantener juntos los pasos permite seguir la operación sin saltar entre piezas creadas para una reutilización hipotética.

SRP sirve para decidir **qué cambia junto**, no para contar cuántas cosas hace una función o cuántas clases tiene un proceso.
