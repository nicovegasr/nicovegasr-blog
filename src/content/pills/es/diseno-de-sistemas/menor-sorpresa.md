---
kind: 'pill'
title: 'Principio de la menor sorpresa'
subtitle: 'El comportamiento debe seguir la promesa de la interfaz'
icon: 'predictable'
order: 3
systemMapStage: 'least-surprise'
publicationDate: 2026-10-12
---

El principio de la menor sorpresa pide que una pieza se comporte como espera quien conoce su contrato. El nombre importa, pero la promesa también incluye los efectos que produce, los errores que devuelve y el momento en que hace cada cosa.

## Mes 9: una previsualización que escribe

Negocio quiere revisar un fichero antes de importarlo: qué registros son válidos y cuáles fallarán. Se añade `previewImport(file)`, que reutiliza los lectores y `InventoryRecord`. Devuelve el informe esperado, pero también guarda los registros válidos. Si alguien abre la previsualización dos veces, ese stock se suma dos veces.

El informe parece correcto. La sorpresa está en un efecto que nadie espera de una previsualización.

## La decisión: dos operaciones, dos contratos

~~~text
previewImport(file) → leer + validar           → ImportPreview
confirmImport(file) → leer + validar → guardar → ImportResult
~~~

Las dos comparten lectores y reglas; solo la segunda escribe. Si los datos o las reglas pueden cambiar entre la previsualización y la confirmación, `confirmImport` vuelve a validar antes de guardar: la previsualización informa, no garantiza el resultado.

El contrato se comprueba desde fuera: previsualizar no cambia el inventario y confirmar devuelve el resultado de la escritura. Un error de formato puede aparecer en ambos caminos; un fallo al guardar, solo en el segundo.

**Lo que cuesta:** dos entradas públicas en lugar de una y, si se previsualiza y después se confirma, la validación se ejecuta dos veces. Si algún día la previsualización tiene que reservar stock, ese efecto debe aparecer en su contrato y en su nombre, no esconderse detrás de `preview`.

**Un buen nombre ayuda, pero la promesa se cumple en la conducta observable: lo que devuelve y lo que cambia.**

*La importación ya no sorprende. Pero en la ejecución nocturna, los últimos registros de un fichero salen con precios calculados con otras reglas que los primeros.*
