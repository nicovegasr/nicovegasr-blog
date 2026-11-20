---
kind: 'pill'
title: 'The natural language problem'
subtitle: 'Why rules are not enough'
icon: 'natural-language'
order: 1
publicationDate: 2026-11-20
---

**Natural language** is the language people use to speak and write. For a program it is a hard problem: **the same intention can be phrased in many ways**, and a word changes meaning depending on what surrounds it.

## Trying it with rules

Imagine an online shop that wants to send each customer message to the right team. The first idea anyone has is to look for keywords:

```js
function classify(message) {
  if (message.includes('return')) return 'return';
  if (message.includes('has not arrived')) return 'shipping';
  return 'other';
}

classify('I want to return my order');                    // 'return'
classify('Could you refund me, please?');                 // 'other'  ← same intention, other words
classify("I don't want to return it, just a new size");   // 'return' ← the word is there, the intention is not
```

It works with the message you had in mind when you wrote it. With the other two it fails both ways: it misses a return phrased differently and mistakes a size exchange for a return.

## Each rule fills one gap and opens another

You can add "refund", "money back", "send it back"… and exceptions for "don't want to return". The list never ends, **because people do not write from your list**.

For a long time, much of text processing was done this way: rules, dictionaries and exceptions. The alternative is **not to write the rules, but to learn them from examples**.
