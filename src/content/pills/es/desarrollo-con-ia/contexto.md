---
kind: 'pill'
title: 'Contexto'
subtitle: 'Lo único que el modelo ve'
icon: 'context-window'
order: 4
publicationDate: 2026-11-20
---

La **ventana de contexto** es todo el texto que un LLM recibe en una petición: tus instrucciones, la pregunta, el código que adjuntas y lo que haya dicho antes. Se mide en tokens y tiene un máximo. **Es lo único que el modelo ve**: no recuerda peticiones anteriores ni sabe nada de tu proyecto que no esté ahí.

## Si falta información, se la inventa

El modelo siempre genera la continuación más probable, y eso no se detiene porque le falten datos. Imagina que preguntas qué devuelve `GET /v1/products/out-of-stock` en tu API:

```text
Sin el código en el contexto:
  «Devuelve una lista de productos con id, name y stock: 0»   ← plausible, inventado

Con el controlador en el contexto:
  «Devuelve los SKU sin stock, paginados de 50 en 50»          ← sale del código
```

La primera respuesta no avisa de que es una suposición: tiene la forma de lo que suele devolver un endpoint así. A eso se le llama **alucinación**, y **casi siempre empieza por un contexto al que le falta algo**.

## Llenarla tampoco es la solución

Cada token cuesta, y en contextos muy largos los detalles pueden perder peso en la respuesta: lo importante queda enterrado entre lo que no lo es. Trabajar bien con un modelo consiste, en gran parte, en **decidir qué entra en la ventana y qué se queda fuera**. El resto de la serie trata de eso.
