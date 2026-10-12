---
kind: 'pill'
title: 'Diseñar para poder probar'
subtitle: 'hacer visibles las entradas y los límites de una decisión'
icon: 'testable'
order: 10
bonus: false
publicationDate: 2026-10-12
---

Un diseño fácil de probar deja ver qué datos necesita una decisión, qué resultado produce y qué dependencias externas la rodean. Esa claridad sirve también fuera de los tests: permite cambiar una regla sin tener que levantar toda la aplicación para entenderla.

## Problema a resolver

Una campaña aplica un descuento a productos durante unas fechas. La función que calcula el precio consulta la hora global, carga el producto desde la base de datos y guarda el precio nuevo. Para comprobar el caso «la campaña ya terminó» hay que preparar datos, conectar la base de datos y controlar un reloj que el código no deja fijar.

El test resulta difícil porque la regla de fechas está mezclada con lectura, tiempo y persistencia.

## Acciones a realizar

Dejar la coordinación en el caso de uso: cargar el producto y la campaña, obtener la hora una vez, llamar a la regla y guardar el resultado. Pasar a la regla los valores que necesita: `calculateCampaignPrice(product, campaign, now)`. Así, inicio, fin y cálculo del descuento se prueban con fechas fijas y sin infraestructura.

~~~text
ApplyCampaign → cargar producto y campaña ──→ calculateCampaignPrice(..., now)
              obtener hora             ← precio calculado
              guardar resultado
~~~

El reloj y el repositorio pueden entrar al caso de uso como dependencias explícitas cuando su implementación real impide controlar el test. Después, una prueba de integración comprueba que el adaptador carga y guarda como se espera. Las pruebas de la regla comprueban el comportamiento: precio rebajado durante la campaña y precio original fuera de fechas; no cada función privada que participa.

La finalidad no es crear una interfaz para cada clase. Si una función solo transforma sus argumentos, ya se puede probar. La frontera aparece donde una decisión deja de depender de sus entradas y empieza a depender del reloj, la red, el disco o la base de datos.
