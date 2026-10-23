---
kind: 'pill'
title: 'Inmutabilidad y gestión del estado'
subtitle: 'decidir cuándo puede cambiar un valor y quién lo ve'
icon: 'snapshot'
order: 6
publicationDate: 2026-10-12
---

Un valor inmutable conserva el mismo significado durante toda su vida: para cambiarlo se crea otro. La utilidad no está en prohibir el estado, sino en hacer explícito **cuándo cambia y quién observa cada versión**.

## Un mismo fichero, dos políticas

Un proceso nocturno importa un CSV de productos. Usa una configuración con moneda, porcentaje de recargo y reglas de redondeo. Esa configuración vive en un objeto compartido que un administrador puede editar mientras el fichero se procesa. Las primeras filas se calculan con unas reglas y las últimas con otras; el informe final no dice qué versión usó.

## Fijar la versión al iniciar la ejecución

Al iniciar la importación se obtiene la configuración completa y se crea un `ImportPolicy` inmutable. Todas las filas del mismo fichero se procesan con esa instantánea. Una edición posterior genera una nueva política para la siguiente ejecución, sin alterar la que ya está en curso.

~~~text
Configuración v12 → ImportPolicy #12 → todas las filas del fichero A
        ↓ edición
Configuración v13 → ImportPolicy #13 → todas las filas del fichero B
~~~

La instantánea debe incluir también las reglas anidadas que pueden cambiar. Si `ImportPolicy` conserva una referencia a una lista mutable de redondeos, el problema sigue ahí aunque sus propiedades externas sean de solo lectura. Registrar la versión junto al resultado permite explicar después cómo se calcularon los precios. Si la importación se reanuda en otro proceso, debe recuperar esa misma versión o una copia persistida; leer la configuración vigente al reanudar rompería la garantía.

## Qué estado necesita estabilidad

El sistema seguirá modificando inventario y configuraciones: esas son acciones del producto. La inmutabilidad se aplica al **valor que una ejecución necesita considerar estable**. No hace falta copiar el fichero entero en memoria: la frontera útil está en la política de cálculo y su versión. Esa elección tiene un coste de almacenamiento y ciclo de vida si se deben conservar políticas antiguas para reanudar o auditar ejecuciones.
