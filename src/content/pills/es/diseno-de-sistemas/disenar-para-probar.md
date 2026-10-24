---
kind: 'pill'
title: 'Diseñar para poder probar'
subtitle: 'Probar la regla sin levantar toda la aplicación'
icon: 'testable'
order: 9
momentStage: 'design-for-testing'
publicationDate: 2026-10-12
---

Si para comprobar un descuento hay que conectar una base de datos y esperar a que llegue una fecha, la prueba depende de más cosas que la regla. Separar el cálculo de cómo obtiene sus datos permite comprobarlo con entradas conocidas.

## Mes 20: una campaña que depende del reloj

Marketing quiere aplicar un descuento entre dos fechas. La función que calcula el precio carga el producto y la campaña, consulta la hora del sistema y guarda el resultado. Para probar qué ocurre al terminar la campaña, hay que preparar la base de datos y controlar un reloj que la función consulta por su cuenta.

El cálculo solo necesita el precio, las condiciones de la campaña y una fecha. Leerlos y guardar el resultado son tareas del caso de uso.

## La decisión: pasar los datos y la fecha al cálculo

~~~ts
function calculateCampaignPrice(
  product: Product,
  campaign: Campaign,
  now: Date,
): number {
  if (now < campaign.startsAt || now >= campaign.endsAt) {
    return product.priceInCents;
  }

  return Math.round(
    product.priceInCents * (1 - campaign.discountPercent / 100),
  );
}
~~~

La campaña incluye el instante de inicio y excluye el de fin. La función devuelve el precio en céntimos sin modificar el producto. Para un precio de 10 000 céntimos y una campaña del 20 % activa del 10 al 20 de octubre, se pueden comprobar ambos casos con fechas fijas:

~~~ts
const product = { priceInCents: 10000 };
const campaign = {
  startsAt: new Date('2026-10-10T00:00:00Z'),
  endsAt: new Date('2026-10-20T00:00:00Z'),
  discountPercent: 20,
};
const during = new Date('2026-10-15T12:00:00Z');
const atEnd = new Date('2026-10-20T00:00:00Z');

expect(calculateCampaignPrice(product, campaign, during)).toBe(8000);
expect(calculateCampaignPrice(product, campaign, atEnd)).toBe(10000);
~~~

Estas pruebas no consultan la base de datos ni esperan al día 20. El caso de uso sigue cargando el producto y la campaña, obtiene la hora una vez y la pasa al cálculo antes de guardar el precio. Que el cálculo funcione no demuestra que el repositorio guarde bien; esa integración se prueba por separado.

**Lo que cuesta:** hacer explícitas las entradas y permitir controlar el reloj del caso de uso. No hace falta una interfaz para cada pieza: el cálculo ya se puede probar como una función.

**La regla se comprueba con datos y una fecha; el acceso a esos datos se prueba por separado.**

*El importador de un proveedor ya tiene alertas, informes y campañas. Cada cambio ha ido dando forma al diseño.*
