---
kind: 'pill'
title: 'Deployments, replicas and updates'
subtitle: 'change versions without cutting traffic'
icon: 'deployment'
order: 5
publicationDate: 2026-10-13
---

A Deployment manages interchangeable Pods through ReplicaSets. Declare
three `inventory-api` replicas; if one disappears, the controller creates
another. Change the Pod template, such as its image digest, and it creates
a new ReplicaSet and gradually replaces Pods from the old version.

```yaml
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

With this strategy, the controller may create one extra Pod and aims to
keep three replicas available during the update. The cluster needs room for
that extra Pod. If the new version never passes readiness, the rollout
stalls: keeping old replicas protects traffic, but the Deployment cannot
repair the new version.

```bash
kubectl -n inventory rollout status deployment/inventory-api
kubectl -n inventory describe deployment inventory-api
kubectl -n inventory rollout undo deployment/inventory-api
```

`rollout undo` recovers an earlier Pod template from the Deployment's
history. It cannot reverse a database migration or undo effects already
produced. If Argo CD manages the Deployment and Git still holds the new
digest, the next sync may undo that manual rollback; change versioned intent
in Git too. A migration incompatible with the old version breaks the option
to roll back. Deploy compatible schema changes first, then remove old
structures later.

## Replicas do not mean infinite capacity

The Deployment maintains the requested replica count. An HPA can change it
based on metrics, but every new Pod consumes resources and opens its own
connections. If each replica keeps a pool of 20 connections, moving from 3
to 12 Pods can raise the theoretical maximum from 60 to 240 database
connections. Identify the bottleneck and size the application and its
dependencies together before scaling. If an HPA controls replica count, do
not keep `spec.replicas` in a manifest that is repeatedly applied: the next
apply could overwrite the HPA's calculated value.

A Deployment is intended for continuous processes. Work that finishes is
modelled with Jobs or CronJobs. Their retries require thinking about
idempotency, not only replica counts.

The [Deployment documentation](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
details `maxSurge`, `maxUnavailable` and progress conditions. The
[HPA guide](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
explains automatic replica control.
