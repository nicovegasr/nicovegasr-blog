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

## Qué complejidad exige el caso

Un proceso de inventario recibe **archivos posicionales**, **JSON** y **XML**. Cada formato tiene reglas distintas de lectura, pero todos deben convertirse en registros de inventario antes de aplicar las mismas validaciones y continuar el procesamiento. Los tres formatos existen hoy; sus diferencias no se pueden eliminar cambiando el diseño.

## Una solución proporcionada

Cada lector interpreta su formato y entrega un `InventoryRecord`. A partir de ahí, las validaciones y el procesamiento son los mismos para los tres. Un error de lectura queda asociado al formato que lo produjo, antes de entrar en el flujo común.

~~~text
Archivo posicional → PositionalReader ┐
JSON               → JsonReader       ├→ InventoryRecord → validar → procesar
XML                → XmlReader        ┘
~~~

Las reglas de lectura y el tratamiento de archivos inválidos son **complejidad inherente**: los tres formatos existen. Meterlos en una única función para reducir el número de clases escondería las diferencias que el código necesita manejar.

También se podría construir un motor que leyera definiciones externas y usara *reflection* para mapear campos a clases en tiempo de ejecución. Añadir un formato sería cuestión de escribir una definición. A cambio, habría que diseñar, validar, versionar y mantener esas definiciones; un error de mapeo sería más difícil de localizar que en un lector explícito.

Los tres formatos son conocidos y cambian junto con la aplicación. Esa flexibilidad no resuelve una necesidad actual. Aquí entra **YAGNI (You Aren't Gonna Need It)**: no construir hoy un mecanismo para formatos futuros.

## El criterio para revisarlo

KISS no se mide por el número de clases o de líneas de código. **Pide conservar la complejidad que exige el problema y evitar la que introduce la solución.** Si muchos formatos nuevos tuviesen que incorporarse sin desplegar código, habría un motivo concreto para reconsiderar un sistema de definiciones. Hasta entonces, tres lectores dejan visibles las diferencias reales.
