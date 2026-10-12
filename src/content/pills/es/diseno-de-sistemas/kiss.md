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

## Problema a resolver

Un proceso de inventario recibe archivos posicionales, JSON y XML. Cada formato tiene reglas distintas de lectura: posiciones y longitudes de campos en uno, propiedades en otro y elementos en el tercero. Todos deben convertirse en registros de inventario antes de aplicar las mismas validaciones.

Los tres formatos existen hoy. La decisión no es cómo eliminar sus diferencias, sino dónde dejarlas para que el resto del proceso no tenga que conocerlas.

## Acciones a realizar

Crear un lector por formato. Cada lector interpreta su archivo y devuelve un `InventoryRecord`; la validación y el procesamiento posteriores trabajan con ese resultado común.

~~~text
Archivo posicional → PositionalReader ┐
JSON               → JsonReader       ├→ InventoryRecord → validar → procesar
XML                → XmlReader        ┘
~~~

Las diferencias entre formatos y el tratamiento de archivos inválidos son **complejidad inherente**. Tres lectores tienen sentido porque los tres formatos existen. Meter toda la lectura en una única función solo escondería esas diferencias.

La alternativa sería un artefacto genérico que leyera definiciones externas de cada archivo y usara *reflection* para mapear sus campos a clases en tiempo de ejecución. Añadir un formato podría convertirse en escribir una definición, pero también habría que diseñar, validar y mantener esas definiciones. Un error de mapeo sería más difícil de localizar que en un lector explícito.

Si los tres formatos son conocidos y cambian junto con la aplicación, esa flexibilidad no resuelve un problema actual. Aquí entra YAGNI (*You Aren't Gonna Need It*): no construir hoy un mecanismo para formatos futuros. Si más adelante llegan muchas estructuras distintas que deben incorporarse sin desplegar código, habrá un motivo concreto para reconsiderarlo.

KISS no pide hacer lo mínimo en líneas de código. Pide conservar la complejidad que exige el problema y evitar la que introduce la solución. YAGNI ayuda a reconocer cuándo esa complejidad adicional responde únicamente a un futuro imaginado.
