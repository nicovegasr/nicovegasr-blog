---
kind: 'pill'
title: 'LLM'
subtitle: 'Predecir el siguiente token'
icon: 'llm'
order: 3
publicationDate: 2026-11-20
---

Un **LLM** (*Large Language Model*) es un modelo entrenado con enormes cantidades de texto para hacer una sola cosa: **dado un texto, predecir cómo continúa**. Todo lo demás, como responder preguntas, traducir o escribir código, sale de repetir esa operación.

## El texto se parte en tokens

El modelo no lee letras ni palabras, sino **tokens**: fragmentos de texto que pueden ser una palabra entera, un trozo de palabra o un signo. Cada token se convierte en un número, que es lo que el modelo maneja de verdad. Un tokenizador podría partir «Los productos sin stock» así:

```text
Los | productos | sin | stock
```

**Los tokens son también la unidad con la que se mide todo lo demás**: cuánto texto cabe en una petición, cuánto tarda y cuánto cuesta.

## Una respuesta, token a token

El modelo predice el token más probable, lo añade al texto y vuelve a empezar con el texto ya ampliado:

```text
Los productos sin stock            → se
Los productos sin stock se         → marcan
Los productos sin stock se marcan  → como
…
```

No hay un plan de respuesta escrito de antemano: **cada token depende de los anteriores**. Y como el modelo aprendió de textos con preguntas y respuestas, la continuación más probable de una pregunta suele ser una respuesta. Lo que parece una conversación es este mecanismo repetido muy rápido.
