---
kind: 'pill'
title: 'Designing for testability'
subtitle: 'make a decision’s inputs and boundaries visible'
icon: 'testable'
order: 10
publicationDate: 2026-10-12
---

A testable design makes it clear which inputs a decision needs, what result it produces, and which external dependencies surround it. That clarity also helps outside tests: a rule can change without starting the entire application just to understand it.

## When a rule needs the whole application to run

A campaign discounts products during a date range. The function that calculates the price reads the global clock, loads the product from the database, and saves the new price. Checking the case “the campaign has ended” requires preparing data, connecting the database, and controlling a clock the code does not allow callers to set.

The test is difficult because the date rule is mixed with reading, time, and persistence.

## Separate the calculation from its data sources

The use case coordinates loading the product and campaign, reads the time once, calls the rule, and saves the result. The rule receives the values it needs: `calculateCampaignPrice(product, campaign, now)`. Then campaign start, end, and discount calculation can be tested with fixed dates and no infrastructure. Every decision in that operation also uses the same instant.

~~~text
ApplyCampaign → load product and campaign ──→ calculateCampaignPrice(..., now)
              read time                 ← calculated price
              save result
~~~

## Test each boundary by its promise

One rule test can fix a date inside the campaign and expect the discounted price; another can fix a date outside and expect the original. Neither needs a database. The clock and repository can enter the use case as explicit dependencies to check that it calls the rule and saves the calculated price. A separate integration test checks that the adapter loads and persists real data. None of these tests needs to mirror every private function.

The aim is not to create an interface for every class. If a function only transforms its arguments, it is already testable. The boundary appears where a decision stops depending on its inputs and starts depending on the clock, network, disk, or database. Making it explicit improves both tests and the readability of the flow.
