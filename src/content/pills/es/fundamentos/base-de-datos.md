---
kind: 'pill'
title: 'Base de datos'
subtitle: 'guardar y encontrar'
icon: 'database'
order: 6
bonus: false
publicationDate: 2026-08-21
---

Una base de datos es **un sistema para guardar información, encontrarla y
mantenerla coherente mientras varias operaciones la usan a la vez**. En una
tienda ahí viven los productos, el stock y los pedidos, aunque el backend se
reinicie.

## Cómo guarda la información

En una base de datos relacional, la información se organiza en tablas formadas
por filas y columnas. Por debajo, el motor agrupa esas filas en páginas que
puede leer desde disco y mantener en memoria cuando se usan con frecuencia.

La aplicación no toca esos archivos directamente. Envía una consulta y el motor
decide qué páginas necesita leer, cómo relacionar los datos y qué cambios debe
escribir sin dejar la información a medias.

## Las conexiones también tienen límite

Abrir una conexión nueva para cada consulta cuesta tiempo y recursos. Por eso el
backend suele mantener un *pool*: un grupo pequeño de conexiones abiertas que
presta a cada operación y recupera cuando termina.

Si todas están ocupadas, las siguientes peticiones esperan. Aumentar el pool sin
medida no crea capacidad gratis; solo permite que más trabajo llegue a la base
de datos al mismo tiempo. Si las consultas son lentas, puedes empeorar el
problema.

## Un índice evita buscar fila por fila

Sin un índice, buscar los pedidos de un cliente puede obligar a revisar toda la
tabla. Un índice guarda ciertos valores en una estructura ordenada y apunta a
las filas donde están. El motor puede descartar bloques enteros de datos en vez
de comprobarlos uno a uno.

Por eso funcionan tan bien para las columnas por las que filtras, ordenas o
relacionas tablas con frecuencia. Y por eso tampoco conviene crear uno para cada
columna.

Cada `INSERT`, `UPDATE` o `DELETE` tiene que actualizar la tabla y todos los
índices afectados. Ganas velocidad al leer; pagas espacio y trabajo extra al
escribir.

![Comparación de dos planes para encontrar pedidos: sin índice se recorren todas las páginas de la tabla; con un índice se accede solo a las páginas relevantes, pero cada escritura actualiza tabla e índice](../../images/fundamentos/base-de-datos/base-de-datos-es.webp)

## Una consulta puede repetir trabajo sin que se note

Una subconsulta correlacionada se ejecuta usando los datos de cada fila de la
consulta exterior. A veces expresa justo lo que necesitas. Otras veces repite el
mismo acceso miles de veces cuando un `JOIN`, una agregación previa o una
consulta por lotes podría resolverlo de una sola pasada.

⚠️ Optimizar no es coleccionar trucos. Primero mira el plan de ejecución:
cuántas filas lee la consulta, qué índices usa y dónde dedica el tiempo. Sin esa
información, añadir un índice o reescribir SQL es apostar.
