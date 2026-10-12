---
kind: 'pill'
title: 'Patrones creacionales: Builder y Factory'
subtitle: 'construir un valor válido y elegir quién lo produce'
icon: 'creation'
order: 8
bonus: false
publicationDate: 2026-10-12
---

Los patrones creacionales hacen explícitas decisiones que ocurren al crear objetos. **Builder** organiza la construcción de un valor con varias opciones e invariantes; **Factory** elige qué implementación crear según un dato de entrada. Resuelven problemas distintos, aunque puedan aparecer en el mismo flujo.

## Problema a resolver

Un informe de inventario admite periodo, almacén y la opción de incluir productos agotados. Puede salir en CSV o PDF. Con un constructor de varios parámetros posicionales, algunas llamadas intercambian fechas o crean periodos inválidos. Además, el endpoint y el proceso programado repiten un `if` para elegir entre `CsvReportWriter` y `PdfReportWriter`.

## Acciones a realizar

Usar un `ReportRequestBuilder` en la entrada para nombrar las opciones y validar al llamar a `build()`: fecha inicial anterior a fecha final, periodo obligatorio y valores por defecto explícitos. El caso de uso recibe un `ReportRequest` ya válido, sin conocer cómo se fue montando.

Centralizar la elección del escritor en `ReportWriterFactory.for(format)`. Puede ser una función pequeña: dado `CSV`, devuelve `CsvReportWriter`; dado `PDF`, devuelve `PdfReportWriter`. El proceso que genera el informe trabaja con la capacidad común de escribirlo.

~~~text
Opciones → Builder → ReportRequest válido
Formato → Factory → CsvReportWriter | PdfReportWriter
                        ↓
                generar y escribir informe
~~~

Builder responde «¿cómo construyo esta petición sin dejarla a medias?». Factory responde «¿qué escritor corresponde a este formato?». Si `ReportRequest` tiene dos campos y un constructor claro, Builder añadiría ceremonia. Si solo existe CSV y no hay selección real, una Factory tampoco aporta nada. El patrón entra cuando quita una decisión repetida o impide crear estados inválidos.
