---
kind: 'pill'
title: 'El problema del lenguaje natural'
subtitle: 'Por qué las reglas no bastan'
icon: 'natural-language'
order: 1
publicationDate: 2026-11-20
---

El **lenguaje natural** es el que usamos las personas para hablar y escribir. Para un programa es un problema difícil: **una misma intención se puede decir de muchas formas**, y una palabra cambia de sentido según lo que la rodea.

## Intentarlo con reglas

Imagina una tienda online que quiere enviar cada mensaje de sus clientes al equipo adecuado. Lo primero que se le ocurre a cualquiera es buscar palabras clave:

```js
function classify(message) {
  if (message.includes('devolver')) return 'return';
  if (message.includes('no ha llegado')) return 'shipping';
  return 'other';
}

classify('Quiero devolver el pedido');                    // 'return'
classify('Me gustaría que me lo reembolsarais');          // 'other'  ← misma intención, otras palabras
classify('No quiero devolverlo, solo cambiar la talla');  // 'return' ← aparece la palabra, no la intención
```

Funciona con el mensaje que tenías en mente al escribirla. Con los otros dos, falla en los dos sentidos: no reconoce una devolución dicha de otra forma y confunde un cambio de talla con una devolución.

## Cada regla tapa un hueco y abre otro

Puedes añadir «reembolso», «reembolsar», «me devolvéis el dinero»… y excepciones para «no quiero devolver». La lista no termina, **porque la gente no escribe a partir de tu lista**.

Durante mucho tiempo, buena parte del procesamiento de texto se hizo así: reglas, diccionarios y excepciones. La alternativa es **no escribir las reglas, sino aprenderlas de ejemplos**.
