---
kind: 'pill'
title: 'Asincronía y reintentos'
subtitle: 'elegir si un intento debe sobrevivir al proceso'
icon: 'retry'
order: 9
bonus: false
publicationDate: 2026-10-12
---

Una tarea asíncrona permite aceptar una petición y terminar el trabajo después. Reintentarla exige decidir **cuánto tiempo puede esperar** y **qué ocurre si el proceso desaparece**. Un bucle en memoria y un trabajo persistido responden a necesidades distintas.

## Problema a resolver

Una API acepta la generación de un informe y un worker lo sube a un almacenamiento externo. La subida puede devolver un timeout. A veces bastan unos segundos para recuperarse; otras veces el proveedor está caído durante minutos. Además, un timeout no confirma si el fichero llegó: pudo guardarse aunque la respuesta no volviera.

## Acciones a realizar

Para un fallo transitorio corto, hacer un número **acotado** de reintentos dentro del worker, con [espera creciente y algo de variación](https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_mitigate_interaction_failure_limit_retries.html) entre intentos. La petición no debe reintentarse en cada capa a la vez. Un error de credenciales o de formato no se arregla repitiendo la misma llamada.

Si la operación debe continuar tras un reinicio o una caída larga, guardar el trabajo en una cola o almacén de tareas duradero. El worker [confirma el trabajo](https://www.rabbitmq.com/docs/reliability) después de completarlo; si cae antes, otro intento puede retomarlo. Eso implica aceptar que el mismo trabajo puede ejecutarse más de una vez.

![Un reintento en memoria se pierde al caer el proceso; un trabajo persistido puede entregarse de nuevo a otro worker, que debe reconocer el mismo identificador](../../images/diseno-de-sistemas/asincronia-reintentos/retries-es.webp)

Asignar al informe un `reportId` estable y hacer que guardar el fichero con ese identificador sea idempotente. Así, si la primera subida tuvo éxito pero se perdió la respuesta, repetirla no crea dos informes. Registrar número de intentos y causa del fallo permite distinguir una incidencia temporal de un trabajo que requiere intervención.

Un reintento duradero añade cola, estado y operación. Se justifica cuando perder el trabajo al morir el proceso sería peor que mantener esa infraestructura. Para una llamada corta y segura, el reintento acotado en memoria puede ser suficiente.
