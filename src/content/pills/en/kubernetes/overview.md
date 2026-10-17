---
kind: 'series'
draft: true
title: 'Kubernetes for applications'
summary: 'From an image to an operable application: desired state, deployments, networking, GitOps and diagnosis from a developer’s perspective.'
icon: 'kubernetes'
order: 5
publicationDate: 2026-10-13
---

An application on Kubernetes is more than a container in the cloud. Someone
publishes an image, declares how it should run, and controllers work to keep
that declaration true as things fail and change.

The series follows an inventory API: build its image, run replicas, provide
configuration and a stable address, open traffic when it is ready, and promote
it between environments with a traceable change. The last stop returns to
the beginning: when something fails, distinguish an image, Pod,
configuration, network or application problem.

The thread running through the series is the separation between **the
artifact**, **deployment intent**, and **what actually happens**. Kubernetes
reconciles the last two. The team still owns the artifact, configuration,
security and observable behaviour of the service.
