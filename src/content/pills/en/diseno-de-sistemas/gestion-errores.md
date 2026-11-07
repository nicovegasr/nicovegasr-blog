---
kind: 'pill'
title: 'Error handling'
subtitle: 'Handle each failure without losing its data'
icon: 'error-flow'
order: 6
momentStage: 'error-handling'
publicationDate: 2026-10-12
---

**Error handling** means recognizing failures, keeping the information that explains them and deciding how to respond. A generic message or `null` can hide distinctions needed to make that decision.

## Example: a stock alert that cannot be created

Creating an alert can fail because of a negative threshold, a missing product or a database outage. Returning `null` for all three makes them indistinguishable. For a negative threshold, the error can carry its type and the input that caused it:

```js
const error = {
  type: 'invalid-threshold',
  message: 'Stock alert threshold must not be negative',
  metadata: { productCode, threshold },
};
```

At the point where the response to the client is decided, the failure is logged with the request context:

```js
logger.error(
  { operation: 'create-alert', requestId, error },
  'Stock alert creation failed',
);
```

For a connection failure, keep the original exception with its stack and cause; the logger must record them too. A layer adding context propagates the failure while preserving that cause.

## What handling errors means here

Each failure arrives with the data needed to respond and investigate it, including domain errors. Log it once at that boundary, avoiding a copy of the same failure at every layer and information unrelated to it.
