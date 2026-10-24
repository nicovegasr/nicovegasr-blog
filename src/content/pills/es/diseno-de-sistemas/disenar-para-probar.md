---
kind: 'pill'
title: 'Diseñar para poder probar'
subtitle: 'Hacer visibles las entradas y los límites de una decisión'
icon: 'testable'
order: 10
publicationDate: 2026-10-12
---

Un diseño fácil de probar deja ver qué datos necesita una decisión, qué resultado produce y qué dependencias externas la rodean. Esa claridad sirve también fuera de los tests: permite cambiar una regla sin tener que levantar toda la aplicación para entenderla.

## Cuando una regla necesita levantar toda la aplicación

Una campaña aplica un descuento a productos durante unas fechas. La función que calcula el precio consulta la hora global, carga el producto desde la base de datos y guarda el precio nuevo. Para comprobar el caso «la campaña ya terminó» hay que preparar datos, conectar la base de datos y controlar un reloj que el código no deja fijar.

El test resulta difícil porque la regla de fechas está mezclada con lectura, tiempo y persistencia.

## Separar el cálculo de sus fuentes de datos

El caso de uso coordina la carga del producto y la campaña, obtiene la hora una vez, llama a la regla y guarda el resultado. La regla recibe los valores que necesita: `calculateCampaignPrice(product, campaign, now)`. Así, inicio, fin y cálculo del descuento se prueban con fechas fijas y sin infraestructura. También queda claro que todas las decisiones de esa operación usan el mismo instante.

~~~text
ApplyCampaign → cargar producto y campaña ──→ calculateCampaignPrice(..., now)
              obtener hora             ← precio calculado
              guardar resultado
~~~

## Probar cada frontera por lo que promete

Una prueba de la regla puede fijar una fecha dentro del periodo y esperar el precio rebajado; otra, fijar una fecha fuera y esperar el original. No necesita base de datos. El reloj y el repositorio pueden entrar al caso de uso como dependencias explícitas para comprobar que este llama a la regla y guarda el precio calculado. Una prueba de integración comprueba aparte que el adaptador carga y persiste datos reales. Ninguna de ellas necesita replicar cada función privada.

La finalidad no es crear una interfaz para cada clase. Si una función solo transforma sus argumentos, ya se puede probar. La frontera aparece donde una decisión deja de depender de sus entradas y empieza a depender del reloj, la red, el disco o la base de datos. Hacerla explícita mejora tanto los tests como la lectura del flujo.
