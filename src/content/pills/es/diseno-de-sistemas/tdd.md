---
kind: 'pill'
title: 'TDD y pruebas que guían el diseño'
subtitle: 'avanzar por comportamientos, no por métodos privados'
icon: 'tdd'
order: 11
bonus: false
publicationDate: 2026-10-12
---

TDD (*Test-Driven Development*) construye una funcionalidad en ciclos pequeños: expresar el siguiente comportamiento en una prueba que falla, implementar lo necesario para que pase y mejorar el diseño con la prueba en verde. La prueba obliga a concretar qué promete el código antes de escribir su solución.

## Problema a resolver

El cálculo de precios de la píldora anterior admite una campaña. Ahora un producto puede tener varias campañas activas. La regla acordada es aplicar el mayor descuento válido, sin bajar nunca del precio mínimo del producto. Empezar por un algoritmo completo deja fácil olvidar fechas, solapamientos o el mínimo.

## Acciones a realizar

Preparar una lista breve de comportamientos observables y elegir uno cada vez:

1. Sin campañas activas, el precio permanece igual.
2. Con una campaña activa, se aplica su descuento.
3. Con dos campañas activas, gana el mayor descuento válido.
4. Si el cálculo baja del mínimo, se devuelve el precio mínimo.

Para cada caso, escribir una prueba con un producto, campañas y fecha concretos; comprobar que falla por el comportamiento esperado; añadir el código mínimo que la hace pasar; y refactorizar sin cambiar el resultado. El contrato puede evolucionar de `calculateCampaignPrice(product, campaign, now)` a `calculateCampaignPrice(product, campaigns, now)` conforme aparece la necesidad real de varias campañas.

~~~text
Ejemplo de comportamiento → prueba roja → código que pasa → refactor
          ↑                                      │
          └──────── siguiente caso ─────────────┘
~~~

Las pruebas expresan precios y reglas, no si se usó un `for`, una Factory o tres funciones privadas. Así pueden detectar una regresión y, a la vez, dejar espacio para cambiar el diseño. [Red, green, refactor](https://martinfowler.com/bliki/TestDrivenDevelopment.html) incluye el último paso: si solo se acumulan pruebas y condiciones, el código se vuelve difícil de ampliar aunque todo esté en verde.

TDD tampoco decide la regla de negocio por sí solo. Antes del primer test hay que acordar qué significa «mayor descuento válido» y qué pasa al llegar al mínimo; el ciclo ayuda a implementar y revisar esa decisión con ejemplos verificables.
