---
kind: 'series'
title: 'Diseño de sistemas'
summary: 'Decisiones de diseño desde el código: cómo mantener una solución comprensible, probarla y dejarla evolucionar sin añadir complejidad por adelantado.'
icon: 'design'
order: 4
publicationDate: 2026-10-12
---

Estas decisiones se encadenan. Antes de introducir una abstracción, identifica qué puede variar de verdad: un formato, una regla de dominio, un proveedor o el estado que debe conservar una ejecución. KISS ayuda a no construir flexibilidad hipotética; responsabilidad única, cohesión y acoplamiento ayudan a colocar cada cambio donde pertenece.

Después importa el contrato visible. Una previsualización no debería escribir a escondidas; un objeto no debería existir en un estado inválido; un error de entrada no debería parecer una caída de la base de datos. Builder, Factory, inmutabilidad y tipos de resultado son herramientas posibles para expresar esas decisiones, no objetivos en sí mismos.

Por último, el diseño debe sostenerse cuando la aplicación se ejecuta: un timeout puede ocultar una operación ya completada y un trabajo puede repetirse después de una caída. Las pruebas verifican comportamientos y fronteras; TDD permite avanzar por ejemplos pequeños. Ningún principio sustituye observar el caso real y explicar qué coste acepta la solución.
