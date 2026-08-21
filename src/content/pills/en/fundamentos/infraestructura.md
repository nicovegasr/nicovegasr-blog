---
kind: 'pill'
title: 'Infrastructure'
subtitle: 'where the application lives'
icon: 'infrastructure'
order: 7
bonus: false
publicationDate: 2026-08-21
---

Infrastructure is **everything an application needs to run and remain
available outside the computer where it was developed**. It includes machines,
networking, storage, and the tools used to deploy, protect, and observe it.

Code does not float in the air. An online shop needs CPU and memory to run its
backend, somewhere to serve the frontend, a network that receives requests, a
database, and storage that keeps its information safe.

## Running is only the beginning

Once the application is in use, more questions appear. How is traffic encrypted?
Where are secrets kept? What happens if a machine fails? How do you know the
checkout has been failing for ten minutes? How do you recover the orders if
storage breaks?

That is where certificates, load balancers, backups, logs, metrics, alerts, and
deployment processes come in. Not every application needs the same pieces, but
every application eventually makes these decisions at some level.

![The same application runs on-premise and in the cloud; who operates each piece changes, not the system's needs](../../images/fundamentos/infraestructura/infraestructura-en.webp)

## On-premise: you operate the machines

With *on-premise* infrastructure, the organisation controls its own servers,
whether they are in an office or a data centre. It decides which hardware to
buy, how to build the network, and when to add capacity.

That control may matter for performance, regulation, or integration with
internal systems. It also means dealing with patches, failures, electricity,
backups, and the capacity you will need six months from now.

## Cloud: you rent resources and services

In the cloud, a provider offers compute, networking, and storage on demand. As
well as renting machines, you can use managed services: a database, queue, or
load balancer whose underlying operation is handled by the provider.

That makes it possible to create resources quickly and scale without buying
hardware in advance. It does not remove the work: permissions still need
configuring, costs need watching, backups need designing, and the provider's
limits and dependencies need accepting.

⚠️ On-premise offers more control but leaves you operating more things. Cloud
delegates some of that work but does not make infrastructure disappear. The real
difference is who is responsible for each layer and what it costs to run.
