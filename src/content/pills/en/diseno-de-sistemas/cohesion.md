---
kind: 'pill'
title: 'Cohesion'
subtitle: 'Keep related decisions where they belong'
icon: 'cohesion'
order: 5
momentStage: 'cohesion'
publicationDate: 2026-10-12
---

**Cohesion** describes how closely a piece's data and operations serve the same purpose. Keeping a rule with the data it needs makes that decision easier to understand and change in one place, and helps avoid anemic objects that hold data but leave the rules governing it elsewhere.

## Example: discontinuing a product

A product can only be discontinued when no units remain in stock. Both an automated process and the administration dashboard must respect that condition. We can bring it together with the state transition in `Product`:

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

The operation rejects the change if units remain and returns a new product if it can be discontinued. An already discontinued product keeps its original date. Use cases still decide when to request the change and save the result.

## What improving cohesion means here

The stock condition and the transition that respects it can be inspected together in `Product`. Coordination and data access stay outside; bringing related decisions together does not mean putting the whole process in one class.
