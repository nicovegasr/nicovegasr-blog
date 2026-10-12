---
kind: 'pill'
title: 'Designing for testability'
subtitle: 'make a decision’s inputs and boundaries visible'
icon: 'testable'
order: 10
bonus: false
publicationDate: 2026-10-12
---

A testable design makes it clear which inputs a decision needs, what result it produces, and which external dependencies surround it. That clarity also helps outside tests: a rule can change without starting the entire application just to understand it.

## Problem to solve

A campaign discounts products during a date range. The function that calculates the price reads the global clock, loads the product from the database, and saves the new price. Checking the case “the campaign has ended” requires preparing data, connecting the database, and controlling a clock the code does not allow callers to set.

The test is difficult because the date rule is mixed with reading, time, and persistence.

## Actions to take

Keep coordination in the use case: load the product and campaign, read the time once, call the rule, and save the result. Pass the values the rule needs: `calculateCampaignPrice(product, campaign, now)`. Then campaign start, end, and discount calculation can be tested with fixed dates and no infrastructure.

~~~text
ApplyCampaign → load product and campaign ──→ calculateCampaignPrice(..., now)
              read time                 ← calculated price
              save result
~~~

The clock and repository can enter the use case as explicit dependencies when their real implementations make the test hard to control. Then an integration test checks that the adapter loads and saves as expected. Tests of the rule check behavior: discounted price during the campaign and original price outside its dates; they do not need to mirror every private function involved.

The aim is not to create an interface for every class. If a function only transforms its arguments, it is already testable. The boundary appears where a decision stops depending on its inputs and starts depending on the clock, network, disk, or database.
