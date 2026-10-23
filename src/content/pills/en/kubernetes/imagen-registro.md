---
kind: 'pill'
title: 'From application to image'
subtitle: 'build, registry and identity'
icon: 'image'
order: 2
publicationDate: 2026-10-13
---

Before creating a Deployment, you need an image the cluster can pull. For
the inventory API, the path is: source → build → image → registry → manifest
reference → pull on the node. Kubernetes does not compile the application or
resolve its dependencies; it consumes the artifact you published.

## Identify the image that runs

The `Dockerfile` describes the build, but it is reproducible only if you also
control the base image, dependency and build-tool versions. A multi-stage
build keeps compilers and development dependencies out of the runtime image.
The application should listen on the right interface, log to standard output, take configuration
from its environment and respond to termination signals. Those are
application and image decisions, not magic Deployment settings.

Once built, publish the image to a registry reachable from the nodes. These
references are illustrative: replace the registry and digest with those of
an image you actually published.

```text
registry.example.com/inventory-api:1.4.2
registry.example.com/inventory-api@sha256:<digest>
```

A tag makes the version easy to read, but someone can move it to different
content. A **digest** identifies the exact content. Pinning it in the
manifest lets you identify what ran and repeat a deployment without relying
on the tag staying put. `imagePullPolicy: Always` checks the registry at
startup; it does not make a mutable tag immutable.

## When the node cannot pull it

`ImagePullBackOff` indicates a failed pull followed by delayed retries.
Check the name and reference, node access to the registry and, for a private
registry, the `imagePullSecret` attached to the Pod or its ServiceAccount.
Credentials on your laptop do not give the cluster access.

The image contains **code and dependencies**. Environment-specific settings
and credentials come later through ConfigMaps and Secrets. Building one
image and promoting its digest across environments reduces the gap between
what was tested and what was deployed.

Read more about [Dockerfiles](/en/pills/docker/docker-file) and
[multi-stage builds](/en/pills/docker/multistage).
The [Kubernetes image documentation](https://kubernetes.io/docs/concepts/containers/images/)
details tags, digests and pull policies.
