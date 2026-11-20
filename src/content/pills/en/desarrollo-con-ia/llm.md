---
kind: 'pill'
title: 'LLM'
subtitle: 'Predicting the next token'
icon: 'llm'
order: 3
publicationDate: 2026-11-20
---

An **LLM** (*Large Language Model*) is a model trained on huge amounts of text to do one thing: **given a text, predict how it continues**. Everything else, such as answering questions, translating or writing code, comes from repeating that operation.

## Text is split into tokens

The model does not read letters or words but **tokens**: fragments of text that can be a whole word, a piece of a word or a symbol. Each token becomes a number, which is what the model really handles. A tokenizer might split "Products out of stock" like this:

```text
Products | out | of | stock
```

**Tokens are also the unit everything else is measured in**: how much text fits in a request, how long it takes and how much it costs.

## An answer, token by token

The model predicts the most likely token, appends it to the text and starts again with the longer text:

```text
Products out of stock               → are
Products out of stock are           → flagged
Products out of stock are flagged   → as
…
```

There is no answer planned in advance: **each token depends on the previous ones**. And because the model learned from texts with questions and answers, the most likely continuation of a question is usually an answer. What looks like a conversation is this mechanism repeated very fast.
