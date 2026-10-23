---
kind: 'pill'
title: 'Principio de la menor sorpresa'
subtitle: 'el comportamiento debe seguir la promesa de la interfaz'
icon: 'predictable'
order: 3
publicationDate: 2026-10-12
---

El principio de la menor sorpresa pide que una pieza de software se comporte como espera quien conoce su contrato. El nombre importa, pero la promesa también está en los efectos que produce, los errores que devuelve y el momento en que hace cada cosa.

## Una previsualización que escribe

Una pantalla permite previsualizar la importación de un CSV de productos. Muestra qué filas son válidas y cuáles fallarán antes de que alguien confirme la carga. El método `previewImport(file)` devuelve ese informe, pero también guarda las filas válidas en la base de datos. Abrir la pantalla dos veces modifica el inventario dos veces.

El resultado visible parece correcto. La sorpresa está en un efecto lateral que nadie esperaría de una previsualización.

## Dos contratos visibles

La operación que **evalúa** el CSV y la que **confirma** la importación tienen contratos distintos. Ambas pueden compartir el parseo y las reglas de validación, pero solo la segunda escribe. Si los datos o las reglas pueden cambiar entre la vista previa y la confirmación, esta última debe volver a validar antes de guardar: la vista previa informa, no garantiza un resultado futuro.

~~~text
previewImport(file) → leer + validar → ImportPreview
confirmImport(file) → leer + validar → guardar → ImportResult
~~~

El contrato se comprueba desde fuera: previsualizar no cambia el inventario; confirmar sí devuelve el resultado de la escritura. Un error de formato puede aparecer en ambos caminos. Un fallo al guardar solo pertenece al segundo.

## La promesa también incluye los efectos

La separación añade dos entradas públicas, pero elimina una duda peligrosa: quien llama a `previewImport` puede usarla sin investigar efectos ocultos. Si el producto decide que la previsualización reserve stock, debe cambiar el contrato y hacerlo visible, no esconderlo detrás del mismo nombre. Un buen nombre ayuda; la conducta observable es la prueba de que la promesa se cumple.
