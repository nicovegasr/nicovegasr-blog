---
kind: 'series'
draft: true
title: 'Diseño de sistemas'
summary: 'Decisiones de diseño desde el código: cómo entender una solución, probarla y cambiarla sin que cada modificación se convierta en un problema nuevo.'
icon: 'design'
order: 4
publicationDate: 2026-10-12
---

El diseño se pone a prueba cuando algo cambia: un proveedor modifica su fichero, aparece una regla nueva o hay que añadir otro destino para un informe. KISS ayuda a resolver esa complejidad sin añadir obstáculos propios. Responsabilidad única, cohesión y acoplamiento ayudan a decidir qué código mantener junto y qué conviene separar. Una abstracción puede simplificar el trabajo cuando reúne una variación real; también puede complicarlo si obliga a recorrer más piezas sin una razón concreta.

Después importa el contrato visible. Una previsualización no debería escribir a escondidas; un objeto no debería existir en un estado inválido; un error de entrada no debería parecer una caída de la base de datos. Builder, Factory, inmutabilidad y tipos de resultado son herramientas posibles para expresar esas decisiones, no objetivos en sí mismos.

Por último, el diseño debe sostenerse cuando la aplicación se ejecuta: un timeout puede ocultar una operación ya completada y un trabajo puede repetirse después de una caída. Las pruebas verifican comportamientos y fronteras; TDD permite avanzar por ejemplos pequeños. Ningún principio sustituye observar el caso real y explicar qué coste acepta la solución.
