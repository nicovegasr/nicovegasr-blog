---
kind: 'pill'
title: 'Cohesión'
subtitle: 'Que el código reúna las decisiones que le pertenecen'
icon: 'cohesion'
order: 4
publicationDate: 2026-10-12
---

La cohesión indica si las decisiones de una pieza pertenecen al mismo propósito. Cuando una regla y los datos que gobierna quedan lejos, entender un cambio exige recorrer el sistema; cuando todo se amontona en una sola clase, también.

## La regla está fuera del usuario

Para dar de baja a un usuario sin borrar su historial, un servicio consulta `user.status.value`, comprueba si ya está de baja y escribe `user.deletedAt.value`. Otro proceso hace la misma comprobación con una condición ligeramente distinta. Ahora hay dos lugares que deciden cuándo puede producirse la baja, y el `User` es poco más que un contenedor de propiedades.

## Mover la transición a quien la conoce

`User` puede hacerse cargo de la transición con `user.markForRemoval(now)`. El método comprueba si la baja es válida y actualiza su estado en una operación. El caso de uso coordina la carga y el guardado; el modelo decide cómo cambia un usuario. Así, otro flujo que quiera darlo de baja no necesita reconstruir la misma condición.

~~~text
RemoveUser → cargar User → user.markForRemoval(now) → guardar User
                         └→ regla de baja y cambio de estado
~~~

## Señales para revisar la frontera

Varias ideas ayudan a detectar si la regla está en el lugar adecuado:

- **Carga cognitiva:** ¿se puede seguir la operación sin retener demasiados pasos y efectos ocultos? La meta es que una persona pueda reconstruir la transición leyendo pocas piezas relacionadas.
- **Naming:** ¿`markForRemoval` describe la transición del producto mejor que `setDeletedAt`? Un nombre de dominio permite leer la intención sin descifrar campos.
- **Ley de Demeter:** ¿el caso de uso habla con `User` o atraviesa sus propiedades para decidir por él? Una cadena de accesos puede indicar que conoce detalles que pertenecen al modelo.
- **Tell, don't ask:** ¿se le pide al usuario que haga la transición o se extraen sus datos para implementarla fuera? [Mover el comportamiento junto a los datos que gobierna](https://martinfowler.com/bliki/TellDontAsk.html) evita que el modelo sea anémico.

Estas señales no obligan a meter toda la lógica en entidades. El acceso a datos, la coordinación entre componentes y una transformación sin reglas de dominio pueden vivir fuera. La pregunta decisiva es qué pieza debe cambiar cuando cambie la regla de baja. Si hay que modificar varios servicios para preservar la misma invariante, la cohesión sigue siendo débil.
