---
kind: 'pill'
title: 'Designing for testability'
subtitle: 'Test the rule without starting the whole application'
icon: 'testable'
order: 10
momentStage: 'design-for-testing'
publicationDate: 2026-10-12
---

**Designing for testability** means making a rule checkable with known inputs and an observable result. Making its required data explicit keeps its test from depending on a database or the system clock.

## Example: calculating a price during a campaign

A campaign applies a discount between two instants: its start is included and its end excluded. The calculation receives the product, campaign and date; it returns a price in integer cents without modifying the product:

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

These checks use fixed dates without waiting for the campaign day. The use case loads the data, reads the time once and passes it to the calculation before saving the result.

## What designing for testability means here

The rule can be checked by controlling its inputs, without adding an interface for every value. Passing calculation tests does not prove data is loaded or saved correctly: those integrations are tested separately.
