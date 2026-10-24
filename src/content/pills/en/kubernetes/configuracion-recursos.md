---
kind: 'pill'
title: 'Configuration, Secrets and resources'
subtitle: 'What changes without rebuilding the image'
icon: 'config'
order: 6
publicationDate: 2026-10-13
---

The same `inventory-api` image can run in staging and production if its
differences are configuration. A **ConfigMap** holds non-confidential data,
such as `LOG_LEVEL`. A **Secret** holds credentials and other sensitive
values. Neither requires rebuilding the image.

This snippet is schematic: it assumes the ConfigMap, Secret and published
image with the indicated digest exist.

```yaml
containers:
  - name: api
    image: registry.example.com/inventory-api@sha256:<digest>
    env:
      - name: LOG_LEVEL
        valueFrom:
          configMapKeyRef:
            name: inventory-settings
            key: log-level
      - name: DATABASE_PASSWORD
        valueFrom:
          secretKeyRef:
            name: inventory-database
            key: password
    resources:
      requests:
        cpu: 200m
        memory: 256Mi
      limits:
        memory: 512Mi
```

Environment variables are fixed when the container starts: changing a
ConfigMap or Secret does not change that process. When mounted as volumes,
content can update after a delay, but the application must read it again.
A `subPath` mount does not receive those updates. Define how each change
takes effect and who triggers a restart when needed.

A Secret **is not encrypted merely because it is a Secret**. Its common
manifest representation uses Base64, which only encodes bytes. Restrict
access with RBAC, keep plaintext values out of Git and check how cluster
data is encrypted at rest. An external secret system may handle distribution
but introduces another integration to operate.

## Request capacity and limit consumption

The scheduler uses a `request` to decide whether a Pod fits on a node. A
`limit` caps a container. A CPU limit may cause *throttling*; crossing a
memory limit may terminate the process with `OOMKilled`. A limit does not
reserve capacity, and a request set too low hides real demand from the
scheduler and an HPA based on utilization.

Start from measured consumption. Review latency, memory and restarts after
each adjustment. Adding replicas of a service with a database pool or
in-memory cache also changes pressure on external systems.

See the official documentation for [Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
and [requests and limits](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/).
