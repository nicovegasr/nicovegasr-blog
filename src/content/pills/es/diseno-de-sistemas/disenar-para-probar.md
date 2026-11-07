---
kind: 'pill'
title: 'Diseñar para poder probar'
subtitle: 'Probar con datos y fechas conocidas'
icon: 'testable'
order: 9
momentStage: 'design-for-testing'
publicationDate: 2026-10-12
---

**Diseñar para poder probar** consiste en permitir que una regla se compruebe con entradas conocidas y un resultado observable. Hacer explícitos los datos que necesita evita que su prueba dependa de una base de datos o del reloj del sistema.

## Ejemplo: calcular un precio durante una campaña

Una campaña aplica un descuento entre dos instantes: incluye el inicio y excluye el fin. El cálculo recibe el producto, la campaña y la fecha; devuelve un precio en céntimos enteros sin modificar el producto:

```js
function calculateCampaignPrice(product, campaign, now) {
  if (now < campaign.startsAt || now >= campaign.endsAt) {
    return product.priceInCents;
  }
  return Math.round(
    product.priceInCents * (1 - campaign.discountPercent / 100),
  );
}

const product = { priceInCents: 10000 };
const campaign = {
  startsAt: new Date('2026-10-10T00:00:00Z'),
  endsAt: new Date('2026-10-20T00:00:00Z'),
  discountPercent: 20,
};
expect(calculateCampaignPrice(product, campaign, campaign.startsAt)).toBe(8000);
expect(calculateCampaignPrice(product, campaign, campaign.endsAt)).toBe(10000);
```

Estas comprobaciones usan fechas fijas y no esperan al día de la campaña. El caso de uso carga los datos, obtiene la hora una vez y la pasa al cálculo antes de guardar el resultado.

## Qué significa diseñar para probar aquí

La regla se comprueba controlando sus entradas, sin añadir una interfaz para cada dato. Que el cálculo pase sus pruebas no demuestra que se cargue o guarde correctamente: esas integraciones se prueban por separado.
