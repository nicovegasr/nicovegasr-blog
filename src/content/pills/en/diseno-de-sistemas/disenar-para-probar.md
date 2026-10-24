---
kind: 'pill'
title: 'Designing for testability'
subtitle: 'Test the rule without starting the whole application'
icon: 'testable'
order: 9
momentStage: 'design-for-testing'
publicationDate: 2026-10-12
---

If checking a discount requires connecting a database and waiting for a date to arrive, the test depends on more than the rule. Separating the calculation from how it obtains its data lets you check it with known inputs.

## Month 20: a campaign that depends on the clock

Marketing wants to apply a discount between two dates. The function that calculates the price loads the product and campaign, reads the system time and saves the result. Testing what happens when the campaign ends means preparing the database and controlling a clock the function reads on its own.

The calculation only needs the price, the campaign conditions and a date. Loading them and saving the result belong to the use case.

## The decision: pass the data and date into the calculation

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

The campaign includes its start instant and excludes its end. The function returns the price in cents without modifying the product. For a price of 10,000 cents and a 20% campaign active from October 10 to October 20, both cases can be checked with fixed dates:

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

These tests do not query the database or wait for October 20. The use case still loads the product and campaign, reads the time once and passes it to the calculation before saving the price. A working calculation does not prove that the repository saves correctly; that integration is tested separately.

**What it costs:** making the inputs explicit and allowing the use case clock to be controlled. An interface is not needed for every piece: the calculation can already be tested as a function.

**Check the rule with data and a date; test access to that data separately.**

*The importer for a single supplier now has alerts, reports and campaigns. Each change has helped shape the design.*
