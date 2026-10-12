---
kind: 'pill'
title: 'TDD and tests that guide design'
subtitle: 'advance by behavior rather than private methods'
icon: 'tdd'
order: 11
bonus: false
publicationDate: 2026-10-12
---

TDD (Test-Driven Development) builds functionality in small cycles: express the next behavior in a failing test, implement what is needed to make it pass, and improve the design while the test is green. The test forces us to state what the code promises before writing its solution.

## Problem to solve

The pricing calculation from the previous pill accepts one campaign. Now a product can have several active campaigns. The agreed rule is to apply the largest valid discount without ever dropping below the product's minimum price. Starting with a complete algorithm makes it easy to forget dates, overlaps, or the minimum.

## Actions to take

Prepare a short list of observable behaviors and pick one at a time:

1. With no active campaigns, the price stays the same.
2. With one active campaign, its discount applies.
3. With two active campaigns, the largest valid discount wins.
4. If the calculation falls below the minimum, return the minimum price.

For each case, write a test with a concrete product, campaigns, and date; check that it fails for the expected behavior; add the smallest amount of code that makes it pass; and refactor without changing the result. The contract can evolve from `calculateCampaignPrice(product, campaign, now)` to `calculateCampaignPrice(product, campaigns, now)` as the need for multiple campaigns becomes real.

~~~text
Behavior example → red test → passing code → refactor
        ↑                                │
        └──────── next case ─────────────┘
~~~

Tests express prices and rules, not whether the implementation used a `for`, a Factory, or three private functions. They can catch a regression while leaving room to change the design. [Red, green, refactor](https://martinfowler.com/bliki/TestDrivenDevelopment.html) includes that last step: if tests and conditionals merely accumulate, the code becomes hard to extend even while everything is green.

TDD does not decide the product rule by itself either. Before the first test, the team has to agree on what “largest valid discount” means and what happens at the minimum; the cycle helps implement and review that decision through verifiable examples.
