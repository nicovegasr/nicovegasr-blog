---
kind: 'pill'
title: 'Cohesión'
subtitle: 'que el código reúna las decisiones que le pertenecen'
icon: 'cohesion'
order: 4
bonus: false
publicationDate: 2026-10-12
---

Una solución sostenible necesita resolver el problema durante años. Un código cohesionado ayuda a sostenerla: las decisiones relacionadas viven cerca y cada pieza se puede entender sin reconstruir medio sistema. La cohesión habla de **cómo se organiza el comportamiento**, no de cuántas líneas tiene un archivo.

## Problema a resolver

Para dar de baja a un usuario sin borrar su historial, un servicio consulta `user.status.value`, comprueba si ya está de baja y escribe `user.deletedAt.value`. Otro proceso hace la misma comprobación con una condición ligeramente distinta. Ahora hay dos lugares que deciden cuándo puede producirse la baja, y el `User` es poco más que un contenedor de propiedades.

## Acciones a realizar

Colocar la transición de estado en `User`: `user.markForRemoval(now)`. El método comprueba si la baja es válida y actualiza el estado que le pertenece. El caso de uso sigue coordinando la carga y el guardado; el modelo decide cómo cambia un usuario.

~~~text
RemoveUser → cargar User → user.markForRemoval(now) → guardar User
                         └→ regla de baja y cambio de estado
~~~

Para revisar si esa pieza está bien cohesionada, sirven cuatro preguntas:

- **Carga cognitiva:** ¿se puede seguir la función sin retener demasiados pasos y efectos ocultos? El [«siete» de Mark Seemann](https://blog.ploeh.dk/2021/07/28/referential-transparency-fits-in-your-head/) es una señal sobre los límites de la memoria de trabajo, no un máximo de siete elementos.
- **Naming:** ¿`markForRemoval` describe la transición del producto mejor que `setDeletedAt`? Un nombre de dominio permite leer la intención sin descifrar campos.
- **Ley de Demeter:** ¿el caso de uso habla con `User` o atraviesa sus propiedades para decidir por él? Una cadena de accesos puede indicar que conoce detalles que pertenecen al modelo.
- **Tell, don't ask:** ¿se le pide al usuario que haga la transición o se extraen sus datos para implementarla fuera? [Mover el comportamiento junto a los datos que gobierna](https://martinfowler.com/bliki/TellDontAsk.html) evita que el modelo sea anémico.

Esto no obliga a meter toda la lógica en entidades. El acceso a datos, la coordinación entre componentes y una transformación sin reglas de dominio pueden vivir fuera. La frontera se decide por quién necesita conocer la regla cuando cambie.
