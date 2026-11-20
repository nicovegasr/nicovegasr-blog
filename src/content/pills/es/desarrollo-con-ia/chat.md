---
kind: 'pill'
title: 'Chat'
subtitle: 'Una conversación que se reenvía entera'
icon: 'chat'
order: 5
publicationDate: 2026-11-20
---

Un **chat** es una aplicación sobre un LLM que te deja conversar con él. Parece que el modelo recuerda lo que hablasteis, pero no es así: la aplicación guarda la conversación y la reenvía **entera** con cada mensaje nuevo.

## Lo que viaja en cada mensaje

Si pides cómo listar los productos sin stock y después escribes «ahora pagínalos», lo que recibe el modelo es algo así:

```js
[
  { role: 'system', content: 'Eres un asistente de programación.' },
  { role: 'user', content: '¿Cómo listo los productos sin stock?' },
  { role: 'assistant', content: 'Puedes filtrar los productos con stock 0…' },
  { role: 'user', content: 'Ahora pagínalos' }, // ← solo tiene sentido con lo anterior
]
```

Cada turno añade mensajes y la petición crece.

## Cuando la conversación no cabe

Tarde o temprano, la conversación supera la ventana de contexto. La aplicación descarta o **resume** los mensajes antiguos para seguir, y en ese resumen se pierden detalles: una decisión que tomasteis al principio, un caso que descartasteis. Por eso **conviene abrir una conversación nueva para cada tarea** en lugar de arrastrar una larga.

## Tú haces de puente

El modelo solo produce texto. Eres tú quien elige qué código pegar, copia lo que propone, lo aplica y comprueba si funciona. El chat ayuda a pensar y a escribir, pero **el trabajo de llevarlo al proyecto sigue siendo manual**.
