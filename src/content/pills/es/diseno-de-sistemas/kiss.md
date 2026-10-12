---
kind: 'pill'
title: 'Keep It Simple, Stupid (KISS)'
subtitle: 'la solución más simple que resuelve el problema'
icon: 'simple'
order: 1
bonus: false
publicationDate: 2026-10-12
---

KISS (*Keep It Simple, Stupid*) propone resolver un problema con **la menor complejidad añadida**. Un problema puede ser complejo por sí mismo; simplificar la solución no consiste en ignorar sus reglas.

## Tres formatos de entrada

Un proceso de inventario recibe archivos posicionales, JSON y XML. Cada formato tiene reglas distintas de lectura: posiciones y longitudes de campos en uno, propiedades en otro y elementos en el tercero. Todos deben convertirse en registros de inventario antes de aplicar las mismas validaciones.

Una solución directa consiste en un lector por formato. Cada lector conoce cómo interpretar su archivo y devuelve el mismo tipo de registro; el procesamiento posterior no necesita saber de dónde vino.

~~~text
Archivo posicional → PositionalReader ┐
JSON               → JsonReader       ├→ InventoryRecord → validar → procesar
XML                → XmlReader        ┘
~~~

Las diferencias entre formatos y el tratamiento de archivos inválidos son **complejidad inherente**. Tres lectores no son sobreingeniería si los tres formatos existen. Forzar toda la lectura en una única función para reducir clases solo escondería esas diferencias.

## La complejidad que se puede evitar

También se podría construir un artefacto genérico que leyera definiciones externas de cada archivo y usara reflection para mapear sus campos a clases en tiempo de ejecución. Así, añadir un formato podría convertirse en escribir una nueva definición. Pero ahora habría que diseñar, validar y mantener esas definiciones, además de diagnosticar errores en un mapeo que ya no está expresado directamente en los lectores.

Si los tres formatos son conocidos y cambian junto con la aplicación, esa flexibilidad no resuelve un problema actual. Aquí entra YAGNI (*You Aren't Gonna Need It*): no construir hoy un mecanismo para formatos futuros. Si más adelante llegan muchas estructuras distintas que deben incorporarse sin desplegar código, habrá un motivo concreto para reconsiderarlo.

KISS no pide hacer lo mínimo en líneas de código. Pide conservar la complejidad que exige el problema y evitar la que introduce la solución. YAGNI ayuda a reconocer cuándo esa complejidad adicional responde únicamente a un futuro imaginado.
