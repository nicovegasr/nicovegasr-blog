---
kind: 'pill'
title: 'Inmutabilidad y gestión del estado'
subtitle: 'decidir cuándo puede cambiar un valor y quién lo ve'
icon: 'snapshot'
order: 6
bonus: false
publicationDate: 2026-10-12
---

Un valor inmutable conserva el mismo significado durante toda su vida: para cambiarlo se crea otro. La utilidad no está en prohibir el estado, sino en hacer explícito **cuándo cambia y quién observa cada versión**.

## Problema a resolver

Un proceso nocturno importa un CSV de productos. Usa una configuración con moneda, porcentaje de recargo y reglas de redondeo. Esa configuración vive en un objeto compartido que un administrador puede editar mientras el fichero se procesa. Las primeras filas se calculan con unas reglas y las últimas con otras; el informe final no dice qué versión usó.

## Acciones a realizar

Al iniciar la importación, obtener una configuración completa y crear un `ImportPolicy` inmutable. Todas las filas del mismo fichero se procesan con esa instantánea. Una edición posterior genera una nueva política para la siguiente ejecución, sin alterar la que ya está en curso.

~~~text
Configuración v12 → ImportPolicy #12 → todas las filas del fichero A
        ↓ edición
Configuración v13 → ImportPolicy #13 → todas las filas del fichero B
~~~

La instantánea debe incluir también las reglas anidadas que pueden cambiar. Si `ImportPolicy` conserva una referencia a una lista mutable de redondeos, el problema sigue ahí aunque sus propiedades externas sean de solo lectura. Registrar la versión junto al resultado permite explicar después cómo se calcularon los precios.

El sistema seguirá modificando inventario y configuraciones: esas son acciones del producto. La inmutabilidad se aplica al **valor que una ejecución necesita considerar estable**. Copiar sin criterio un fichero entero en memoria o crear objetos nuevos para cada cambio interno puede costar más que el problema que resuelve; conviene fijar la frontera de estado en la política de cada ejecución.
