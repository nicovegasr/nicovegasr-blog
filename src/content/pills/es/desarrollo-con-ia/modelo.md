---
kind: 'pill'
title: 'Modelo'
subtitle: 'Aprender de ejemplos en vez de escribir reglas'
icon: 'model'
order: 2
publicationDate: 2026-11-20
---

Un **modelo** es una función que no se programa regla a regla: se ajusta a partir de ejemplos. Le das muchas entradas con la respuesta correcta y, durante el **entrenamiento**, sus parámetros (números internos, a veces miles de millones) se van corrigiendo hasta que sus respuestas se parecen a las de los ejemplos.

## De reglas a ejemplos

Vuelve a la tienda que clasifica mensajes de soporte. En lugar de una lista de palabras clave, el equipo reúne mensajes que ya clasificó a mano:

```text
"Quiero devolver el pedido"        → return
"¿Me hacéis el reembolso?"         → return
"El paquete sigue sin llegar"      → shipping
"Solo quiero cambiar la talla"     → exchange
… miles de mensajes más
```

Con suficientes ejemplos variados, el modelo puede clasificar como devolución «Me gustaría que me lo reembolsarais» aunque no contenga ninguna palabra de una lista. No busca palabras: **se parece a otros mensajes que el equipo marcó como devolución**.

## Lo que ganas y lo que pierdes

- **Ganas** flexibilidad: cubrir un caso nuevo no exige escribir otra regla, basta con añadir ejemplos y volver a entrenar.
- **Pierdes** la explicación. No hay una línea de código que leer para saber por qué decidió algo.
- **Y puede equivocarse con seguridad** ante entradas que no se parecen a nada de lo que vio.

**Un modelo no devuelve la respuesta correcta, sino la más probable según sus ejemplos.**
