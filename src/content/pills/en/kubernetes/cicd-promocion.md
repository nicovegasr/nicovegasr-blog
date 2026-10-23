---
kind: 'pill'
title: 'CI/CD and environment promotion'
subtitle: 'move the same artifact with control'
icon: 'pipeline'
order: 10
publicationDate: 2026-10-13
---

A useful pipeline separates two decisions: **which code became an image**
and **which environment may run that image**. For the inventory API, CI
builds, tests, packages and publishes an image digest. Promotion updates
the reference to that digest in an environment's configuration; it does
not recompile the code for production.

```text
commit → tests → image@sha256 → staging → checks → production
```

The pipeline can validate that manifests render and Kubernetes accepts
their schema. After deployment it should check rollout progress and a
representative application operation. A successful `kubectl apply` only
confirms that the API accepted the objects. It does not prove the new
version works.

## Vary environments without duplicating everything

**Kustomize** composes a shared manifest base with environment overlays:
replicas, names, limits or image references. **Helm** renders manifests
from charts and values. Both help when they reduce duplication and make
environment differences visible. If each environment has so many
exceptions that you cannot tell what will be applied, the template has
become another language to review.

Inspect the rendered result and the actual diff before promotion. A Helm
value or Kustomize patch can change a selector, port or Secret without it
being obvious in the file you edited.

## Make rollback possible

A promotion should record the digest, configuration, author and outcome.
Returning to the previous digest is straightforward only if data and
contracts remain compatible. A deployment with a database migration needs
a sequence that lets old and new versions coexist. The pipeline automates
steps; it does not decide when deleting a column or repeating an external
effect is safe.

This flow may apply manifests directly. It may also end in a reviewed Git
change that another controller synchronizes. That second option is the
next pill.
