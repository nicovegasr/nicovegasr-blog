---
kind: 'pill'
title: 'Model'
subtitle: 'Learning from examples instead of writing rules'
icon: 'model'
order: 2
publicationDate: 2026-11-20
---

A **model** is a function that is not programmed rule by rule: it is fitted from examples. You give it many inputs with the right answer and, during **training**, its parameters (internal numbers, sometimes billions of them) are corrected until its answers resemble those in the examples.

## From rules to examples

Back to the shop that routes support messages. Instead of a keyword list, the team gathers messages it has already classified by hand:

```text
"I want to return my order"        → return
"Can I get a refund?"              → return
"The parcel still hasn't arrived"  → shipping
"I just need a different size"     → exchange
… thousands more messages
```

With enough varied examples, the model can classify "Could you refund me, please?" as a return even though it contains no word from any list. It is not looking for words: **the message resembles others the team labelled as returns**.

## What you gain and what you lose

- **You gain** flexibility: covering a new case does not mean writing another rule, just adding examples and training again.
- **You lose** the explanation. There is no line of code to read to find out why it decided something.
- **And it can be confidently wrong** about inputs unlike anything it has seen.

**A model does not return the right answer, but the most likely one according to its examples.**
