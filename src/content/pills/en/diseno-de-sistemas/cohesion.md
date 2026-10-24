---
kind: 'pill'
title: 'Cohesion'
subtitle: 'Keep related decisions where they belong'
icon: 'cohesion'
order: 5
momentStage: 'cohesion'
publicationDate: 2026-10-12
---

Cohesion tells you whether the decisions inside a piece belong to the same purpose. When a rule sits far from the data it governs, understanding a change means walking through the system. Piling everything into one class makes it just as hard to follow.

## Month 12: two places that discontinue

A product can only be discontinued when no units remain in stock, whether the request comes from the automated process or the administration dashboard.

If a supplier stops sending a product for several imports, the reconciliation cron job checks its status and stock before marking it as discontinued and recording the date. The dashboard service repeats this logic but forgets the stock check: it allows a product to be discontinued while units remain. The same rule is implemented in two places and is no longer enforced in both. `Product` is little more than a bag of fields.

## The decision: move the rule to whoever owns it

`Product` brings the data and the discontinuation rule together in `product.discontinue(now)`. This method checks the stock and returns a new product with the discontinued status and date, leaving the original unchanged:

~~~ts
class Product {
  private constructor(
    readonly code: string,
    readonly stock: number,
    readonly status: 'active' | 'discontinued',
    readonly discontinuedAt?: Date,
  ) {}

  discontinue(now: Date): Product {
    if (this.stock > 0) {
      throw new Error('Cannot discontinue a product with stock remaining');
    }

    return new Product(
      this.code,
      this.stock,
      'discontinued',
      this.discontinuedAt ?? now,
    );
  }
}
~~~

Use cases load the product and save the new version returned by `discontinue`. If it was already discontinued, the original date is preserved. If units remain, it rejects the transition. The original product stays unchanged in every case.

~~~ts
const discontinued = product.discontinue(now);
await products.save(discontinued);
~~~

The cron job still decides when to request discontinuation based on the imports received; the dashboard does so at an administrator's request. Their reasons for requesting it differ, but both must respect the same stock condition. That condition belongs in `Product`.

Two signals help find the boundary. A domain name, `discontinue`, tells the intent better than `setDiscontinuedAt`. And a use case that reaches through the product's properties to decide on its behalf usually means the rule is in the wrong place: [it's better to ask it to make the transition](https://martinfowler.com/bliki/TellDontAsk.html) than to pull its data out and implement it elsewhere.

**What it costs:** services must use and save the version returned by this operation, and the rule must be looked up in `Product`. Data access and coordination between components stay outside; bringing the rule and the data it protects together does not mean putting the entire process in the entity.

**Here, improving cohesion means bringing the stock condition together with the state change that must respect it.**

*Next, the business wants alerts when a product's stock drops below a threshold.*
