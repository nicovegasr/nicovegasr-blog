---
kind: 'pill'
title: 'Kubernetes architecture and costs'
subtitle: 'What it gives an application developer'
icon: 'cluster-cost'
order: 1
publicationDate: 2026-10-13
---

Kubernetes coordinates containerized applications in a **cluster**. Instead
of picking a machine for each process, you declare what should run and let
the system place Pods, replace lost ones and provide stable ways to find them.

Picture an inventory API with three replicas. If a machine disappears, the
control plane notices the missing replicas and creates replacement Pods on
available nodes. That is useful, but it cannot fix an API that returns wrong
data or make stateful operations automatically safe.

## Following a decision

- The **Kubernetes API** receives and validates objects such as Deployments
  and Services.
- `etcd` stores their state. **Controllers** compare requested and observed
  state and act on differences.
- The **scheduler** assigns pending Pods to nodes that meet their constraints
  and requested capacity.
- On each node, the **kubelet** works with the container runtime to start
  and monitor assigned Pods.

No single process runs everything. Components cooperate through the API and
keep reconciling state. An accepted `kubectl apply` therefore means the API
received the declaration; it does not yet mean the application is ready for
traffic.

## What it costs

Kubernetes makes sense when the need to deploy, scale and operate workloads
outweighs the cost of administering the cluster and its integrations. Even
with a managed service, someone must decide node capacity, networking,
permissions, upgrades, observability and recovery. Capacity reserved by
`requests`, extra replicas during a rollout and platform components consume
resources as well.

For a small application with simple deployment needs, a simpler platform
may suffice. The useful question is which operational problems Kubernetes
would solve and who would maintain the resulting system.

If you know [Docker](/en/pills/docker), the responsibility changes here: the
image still describes the process, while Kubernetes decides where and under
which conditions it runs.

The official [cluster architecture](https://kubernetes.io/docs/concepts/overview/components/)
describes the responsibilities of the control plane and nodes.
