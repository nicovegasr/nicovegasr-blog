---
kind: 'pill'
title: 'Deployments, réplicas y actualizaciones'
subtitle: 'cambiar la versión sin cortar el servicio'
icon: 'deployment'
order: 5
publicationDate: 2026-10-13
---

Un Deployment administra Pods intercambiables mediante ReplicaSets. Declaras
tres réplicas de `inventory-api`; si una desaparece, el controlador crea otra.
Si cambias la plantilla del Pod —por ejemplo, el digest de la imagen— crea un
nuevo ReplicaSet y sustituye progresivamente los Pods de la versión anterior.

```yaml
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

Con esta estrategia, el controlador puede crear un Pod extra y procura
mantener disponibles las tres réplicas durante el cambio. Necesita capacidad
para alojar ese Pod adicional. Si la nueva versión nunca pasa readiness, el
rollout se atasca: conservar las réplicas antiguas protege el tráfico, pero
el Deployment no arregla el fallo de la nueva versión.

```bash
kubectl -n inventory rollout status deployment/inventory-api
kubectl -n inventory describe deployment inventory-api
kubectl -n inventory rollout undo deployment/inventory-api
```

`rollout undo` recupera una plantilla anterior del historial del Deployment.
No revierte una migración de base de datos ni deshace efectos ya producidos.
Si Argo CD gestiona el Deployment y Git conserva el digest nuevo, la siguiente
sincronización puede deshacer ese rollback manual; corrige también la intención
versionada en Git. Las migraciones incompatibles con la versión anterior rompen la posibilidad
de volver atrás; conviene desplegar cambios de esquema compatibles primero
y retirar lo antiguo después.

## Réplicas no equivalen a capacidad infinita

El Deployment mantiene el número de réplicas solicitado. Un HPA puede
modificarlo según métricas, pero cada Pod adicional consume recursos y abre
sus propias conexiones. Si cada réplica mantiene un pool de 20 conexiones,
pasar de 3 a 12 Pods puede elevar el máximo teórico de 60 a 240 conexiones
con la base de datos. Antes de escalar, hay que identificar el cuello de
botella y dimensionar juntos la aplicación y sus dependencias. Si un HPA
controla las réplicas, no mantengas `spec.replicas` en un manifiesto que se
aplica repetidamente: la siguiente aplicación podría sobrescribir el valor
calculado por el HPA.

Un Deployment está pensado para procesos continuos. El trabajo que termina
se modela con Jobs o CronJobs; sus reintentos obligan a pensar en
idempotencia, no solo en cuántas réplicas se ejecutan.

Consulta la [documentación de Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
para los detalles de `maxSurge`, `maxUnavailable` y las condiciones de progreso,
y la [guía de HPA](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
para el control automático de réplicas.
