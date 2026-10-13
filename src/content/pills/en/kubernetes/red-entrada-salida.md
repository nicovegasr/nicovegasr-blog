---
kind: 'pill'
title: 'Inbound and outbound networking'
subtitle: 'publish the API and restrict communication'
icon: 'network'
order: 9
bonus: false
publicationDate: 2026-10-13
---

The Service from the previous pill gives the application an address inside
the cluster. Receiving external traffic requires deciding where traffic
enters, where TLS terminates and who interprets HTTP routes.

A `LoadBalancer` Service can request an external load balancer if the
infrastructure supports it. For multiple HTTP applications, an **Ingress**
controller or **Gateway API** implementation commonly receives traffic and
routes it to the right Services. Creating an Ingress or Gateway object
without its controller does not install a proxy or publish anything.

```text
client → load balancer/controller → Service → ready Pod
```

Each hop matters in a different way: certificate and host at the entry
point, Service and target port inside the cluster, readiness at the Pod.
A 404 from the controller may point to a host or path rule. If the
controller has no backend, inspect the Service and its EndpointSlices. A
direct request to a Pod can narrow the issue but does not test the full
public route.

## Outbound traffic is architecture too

The inventory API may need to reach a database or an external API. DNS,
egress routes, NAT, proxies and network rules depend on the cluster. A
container working locally does not prove it can reach those destinations
from a Pod. Set timeouts and log connection failures so they can be
distinguished from application errors.

If no policy isolates a Pod, traffic is allowed by default. A
**NetworkPolicy** can restrict ingress and egress by Pods, namespaces, IP
addresses and ports. It only takes effect if the cluster's network plugin
implements it. A deny-egress policy may also block DNS; allowing only a
database port is insufficient if the app connects by name. Test both
allowed and denied paths from the right namespace.

Network policy controls connectivity. It does not replace authentication,
authorization or TLS between services. The official [NetworkPolicy documentation](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
covers isolation rules and limits.
