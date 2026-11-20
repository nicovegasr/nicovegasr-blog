---
kind: 'pill'
title: 'Context'
subtitle: 'The only thing the model sees'
icon: 'context-window'
order: 4
publicationDate: 2026-11-20
---

The **context window** is all the text an LLM receives in a request: your instructions, the question, the code you attach and whatever was said before. It is measured in tokens and has a maximum. **It is the only thing the model sees**: it does not remember previous requests or know anything about your project that is not there.

## If information is missing, it makes it up

The model always generates the most likely continuation, and missing data does not stop it. Imagine you ask what `GET /v1/products/out-of-stock` returns in your API:

```text
Without the code in the context:
  "It returns a list of products with id, name and stock: 0"   ← plausible, made up

With the controller in the context:
  "It returns the SKUs out of stock, in pages of 50"           ← taken from the code
```

The first answer does not warn that it is a guess: it has the shape of what an endpoint like that usually returns. This is called a **hallucination**, and **it almost always starts with a context that is missing something**.

## Filling it up is not the answer either

Every token costs, and in very long contexts details can carry less weight in the answer: what matters gets buried under what does not. Working well with a model is largely a matter of **deciding what goes into the window and what stays out**. The rest of the series is about that.
