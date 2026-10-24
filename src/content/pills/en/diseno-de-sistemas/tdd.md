---
kind: 'pill'
title: 'TDD and tests that guide design'
subtitle: 'Advance by behavior rather than private methods'
icon: 'tdd'
order: 11
publicationDate: 2026-10-12
---

TDD (Test-Driven Development) builds functionality in small cycles: express the next behavior in a failing test, implement what is needed to make it pass, and improve the design while the test is green. The test forces us to state what the code promises before choosing how to solve it.

## Choose the next behavior

A pricing rule accepts one campaign. Now a product can have several active campaigns. The agreed rule is to apply the largest valid discount without ever dropping below the product's minimum price. Starting with a complete algorithm makes it easy to forget dates, overlaps, or the minimum.

Start with a short list of observable behaviors and take them one at a time:

1. With no active campaigns, the price stays the same.
2. With one active campaign, its discount applies.
3. With two active campaigns, the largest valid discount wins.
4. If the calculation falls below the minimum, return the minimum price.

## A cycle that changes the contract

Suppose a product costs €100 and has a minimum price of €70. On the chosen date, 10% and 25% campaigns are valid. One test expects €75. It should fail because the code accepts only one campaign or chooses the first, **not** because the test setup is broken. The contract can then evolve from `calculateCampaignPrice(product, campaign, now)` to `calculateCampaignPrice(product, campaigns, now)`, and the code can choose the larger discount. A second test with a 40% discount expects €70, not €60.

At each step, add only what is needed to pass the test, then review names and duplication while tests are green. Add the next case once the previous one works.

~~~text
Behavior example → red test → passing code → refactor
        ↑                                │
        └──────── next case ─────────────┘
~~~

Tests express prices and rules, not whether the implementation used a `for`, a Factory, or three private functions. They can catch a regression while leaving room to change the design. [Red, green, refactor](https://martinfowler.com/bliki/TestDrivenDevelopment.html) includes that last step: if tests and conditionals merely accumulate, the code becomes hard to extend even while everything is green.

## What the test proves

TDD does not decide the product rule by itself. Before the first test, the team must agree on what “largest valid discount” means, which dates count as active, and what happens at the minimum. The cycle helps implement and review those decisions through verifiable examples; a green suite only proves the cases that have been expressed.
