---
kind: 'pill'
title: 'Metrics, events and diagnosis'
subtitle: 'Find where the journey failed'
icon: 'diagnosis'
order: 12
publicationDate: 2026-10-13
---

When `inventory-api` stops responding, “Kubernetes is broken” does not
locate the cause. Follow the same route that brought the app into the
cluster: intent, image, placement, process, availability and traffic.

```bash
kubectl -n inventory get deployment,pods,service
kubectl -n inventory describe deployment inventory-api
kubectl -n inventory describe pod <pod-name>
kubectl -n inventory logs <pod-name> -c api --previous
kubectl -n inventory get events --sort-by=.metadata.creationTimestamp
```

`describe` brings together useful conditions and events. A `Pending` Pod
may indicate insufficient resources or scheduling constraints;
`ImagePullBackOff` points to a registry reference or credential;
`CrashLoopBackOff` means a process exits and is restarted. `--previous`
retrieves the prior instance's logs for a restarted container, when still
available.

## From symptom to hypothesis

If Pods are `Running` but the Service has no destinations, inspect labels
and readiness. If destinations exist but the external route fails, follow
Ingress or Gateway, TLS, public DNS and network policies. If only latency
has risen, compare CPU, throttling, memory, connection counts, database
timing and dependency saturation. Investigate `OOMKilled` against measured
memory, the limit and the load pattern. Raising the limit without
understanding growth may only delay the next failure.

**Metrics** show trends and saturation; **events** explain recent
Kubernetes decisions; **logs and traces** show application behaviour.
Events are not a durable history, and `kubectl logs` is not a replacement
for centralized collection. For later investigations, link request IDs
with [logs, metrics and traces](/en/pills/observabilidad).

A local check with kind or k3d can help reproduce manifests, probes and
startup failures. By itself it does not reproduce the production load
balancer, policies, permissions or capacity. Form a hypothesis, inspect
the resource that can confirm it, and fix the cause in code or Git so the
next synchronization does not undo the repair.

The official [guide to debugging Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
offers more inspection techniques.
