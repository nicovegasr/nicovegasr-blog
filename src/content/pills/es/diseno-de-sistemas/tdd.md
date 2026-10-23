---
kind: 'pill'
title: 'TDD y pruebas que guían el diseño'
subtitle: 'avanzar por comportamientos, no por métodos privados'
icon: 'tdd'
order: 11
publicationDate: 2026-10-12
---

TDD (*Test-Driven Development*) construye una funcionalidad en ciclos pequeños: expresar el siguiente comportamiento en una prueba que falla, implementar lo necesario para que pase y mejorar el diseño con la prueba en verde. La prueba obliga a concretar qué promete el código antes de elegir cómo resolverlo.

## Elegir el siguiente comportamiento

Una regla de precios admite una campaña. Ahora un producto puede tener varias campañas activas. La regla acordada es aplicar el mayor descuento válido, sin bajar nunca del precio mínimo del producto. Empezar por un algoritmo completo deja fácil olvidar fechas, solapamientos o el mínimo.

El punto de partida es una lista breve de comportamientos observables. Se elige uno cada vez:

1. Sin campañas activas, el precio permanece igual.
2. Con una campaña activa, se aplica su descuento.
3. Con dos campañas activas, gana el mayor descuento válido.
4. Si el cálculo baja del mínimo, se devuelve el precio mínimo.

## Un ciclo que cambia el contrato

Supongamos un producto de 100 € con precio mínimo de 70 €. En la fecha elegida hay campañas válidas del 10 % y del 25 %. Una prueba espera 75 €. Primero debe fallar porque el código solo admite una campaña o elige la primera, **no** por un error de preparación del test. Entonces el contrato puede pasar de `calculateCampaignPrice(product, campaign, now)` a `calculateCampaignPrice(product, campaigns, now)` y el código elegir el descuento mayor. Una segunda prueba con un descuento del 40 % espera 70 €, no 60 €.

En cada paso se añade lo mínimo para pasar la prueba y después se revisan nombres y duplicación con las pruebas en verde. El siguiente caso se incorpora cuando el anterior ya funciona.

~~~text
Ejemplo de comportamiento → prueba roja → código que pasa → refactor
          ↑                                      │
          └──────── siguiente caso ─────────────┘
~~~

Las pruebas expresan precios y reglas, no si se usó un `for`, una Factory o tres funciones privadas. Así pueden detectar una regresión y, a la vez, dejar espacio para cambiar el diseño. [Red, green, refactor](https://martinfowler.com/bliki/TestDrivenDevelopment.html) incluye el último paso: si solo se acumulan pruebas y condiciones, el código se vuelve difícil de ampliar aunque todo esté en verde.

## Qué demuestra la prueba

TDD no decide la regla de negocio por sí solo. Antes del primer test hay que acordar qué significa «mayor descuento válido», qué fechas cuentan como activas y qué pasa al llegar al mínimo. El ciclo ayuda a implementar y revisar esas decisiones con ejemplos verificables; una suite verde solo demuestra los casos que se han expresado.
