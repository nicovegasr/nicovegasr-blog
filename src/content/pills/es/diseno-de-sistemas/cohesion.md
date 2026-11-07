---
kind: 'pill'
title: 'Cohesión'
subtitle: 'Reunir las decisiones relacionadas'
icon: 'cohesion'
order: 5
momentStage: 'cohesion'
publicationDate: 2026-10-12
---

La **cohesión** expresa hasta qué punto los datos y las operaciones de una pieza responden al mismo propósito. Reunir una regla con los datos que necesita permite entender y modificar esa decisión en un mismo lugar y ayuda a evitar objetos anémicos, que contienen datos pero dejan las reglas que los gobiernan fuera.

## Ejemplo: descatalogar un producto

Un producto solo puede descatalogarse cuando no quedan unidades en stock. Tanto un proceso automático como el panel de administración deben respetar esa condición. Podemos reunirla con el cambio de estado en `Product`:

```ts
class Product {
  constructor(
    readonly code: string,
    readonly stock: number,
    readonly status: 'active' | 'discontinued',
    readonly discontinuedAt?: Date,
  ) {}

  discontinue(now: Date): Product {
    if (this.stock > 0) throw new Error('Product still has stock');
    return new Product(
      this.code, this.stock, 'discontinued', this.discontinuedAt ?? now,
    );
  }
}

const discontinued = product.discontinue(now);
await products.save(discontinued);
```

La operación rechaza el cambio si quedan unidades y devuelve un nuevo producto si puede descatalogarse. Si ya estaba descatalogado, conserva su fecha. Los casos de uso siguen decidiendo cuándo solicitarlo y guardan el resultado.

## Qué significa mejorar la cohesión aquí

La condición de stock y la transición que la cumple se consultan juntas en `Product`. La coordinación y el acceso a datos permanecen fuera; reunir decisiones relacionadas no implica concentrar todo el proceso en una clase.
