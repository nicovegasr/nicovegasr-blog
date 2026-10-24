---
kind: 'pill'
title: 'Error handling'
subtitle: 'Handle each failure without losing its data'
icon: 'error-flow'
order: 6
momentStage: 'error-handling'
publicationDate: 2026-10-12
---

Handling errors means telling them apart and having the data needed to decide what to do with each one. Catching them to return `null` or carry on as though nothing happened loses that information along the way.

## Month 13: three failures, one log line

Creating a stock alert requires a product and a threshold. The use case validates the input, finds the product and saves the alert, all inside a `try-catch`:

~~~ts
try {
  // validate threshold, find product, save alert
} catch (error) {
  logger.error('Error creating alert');
  return null;
}
~~~

The panel receives `null` and the log says “Error creating alert”. But it could have failed because the threshold was negative, the product did not exist or the database was down. These are different failures, and the information needed to handle them separately has been lost.

## The decision: each error carries its own data

A negative threshold has its own error, with the value received and the product for which the alert was being created:

~~~ts
const error = {
  type: 'invalid-threshold',
  message: 'Stock alert threshold must not be negative',
  metadata: { productCode, threshold },
};
~~~

Its type distinguishes it from a missing product, and its metadata identifies the input that caused it. If the connection fails, the original exception is preserved with its stack and cause.

The error keeps travelling up to where its meaning to the outside world is decided. It is also logged there, with the operation context added:

~~~ts
logger.error(
  { operation: 'create-alert', requestId, error },
  'Stock alert creation failed',
);
~~~

The record now tells you what failed, for which product and in which request. The logger must also preserve the stack and cause when it receives an exception. Knowing how to respond to a domain error does not make it any less useful for observability.

If a layer catches a failure to add context, it then propagates it while preserving the cause. Logging it and returning `null` would leave the rest of the application unable to tell what happened again. The log is written once at the end of that path rather than repeated at every layer.

**What it costs:** deciding which data each error needs. A generic message falls short; recording data unrelated to the failure adds noise.

**Handle each error separately, with its metadata, without silencing it along the way.**

*Next, inventory reports need to be generated, with a choice of where to save them.*
