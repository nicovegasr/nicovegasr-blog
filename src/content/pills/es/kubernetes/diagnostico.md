---
kind: 'pill'
title: 'Métricas, eventos y diagnóstico'
subtitle: 'Averiguar dónde falló el recorrido'
icon: 'diagnosis'
order: 12
publicationDate: 2026-10-13
---

Cuando `inventory-api` deja de responder, «Kubernetes está roto» no
localiza la causa. Conviene seguir el mismo recorrido que llevó la aplicación
al clúster: intención, imagen, ubicación, proceso, disponibilidad y tráfico.

```bash
kubectl -n inventory get deployment,pods,service
kubectl -n inventory describe deployment inventory-api
kubectl -n inventory describe pod <pod-name>
kubectl -n inventory logs <pod-name> -c api --previous
kubectl -n inventory get events --sort-by=.metadata.creationTimestamp
```

`describe` reúne condiciones y eventos útiles: un Pod `Pending` puede señalar
falta de recursos o restricciones de scheduling; `ImagePullBackOff`, una
referencia o credencial de registro; `CrashLoopBackOff`, un proceso que sale y
vuelve a arrancar. `--previous` recupera logs de la instancia anterior de
un contenedor reiniciado, si siguen disponibles.

## Del síntoma a la hipótesis

Si hay Pods `Running` pero el Service no tiene destinos, revisa etiquetas y
readiness. Si hay destinos y la ruta externa falla, sigue Ingress o Gateway,
TLS, DNS público y políticas de red. Si solo aumentó la latencia, compara
CPU, throttling, memoria, conexiones, tiempos de base de datos y saturación
de dependencias. `OOMKilled` se investiga con memoria observada, límite y
patrón de carga; subir el límite sin entender el crecimiento puede aplazar
el siguiente fallo.

Las **métricas** muestran tendencia y saturación; los **eventos** explican
decisiones recientes de Kubernetes; los **logs y trazas** muestran el
comportamiento de la aplicación. Los eventos no son un registro histórico
duradero y `kubectl logs` no sustituye una solución centralizada. Para una
investigación posterior, conecta los identificadores de petición con
[logs, métricas y trazas](/es/pildoras/observabilidad).

Una comprobación local con kind o k3d ayuda a reproducir manifiestos,
probes y fallos de arranque. No reproduce por sí sola el balanceador,
políticas, permisos o capacidad de producción. Lo importante es formular
una hipótesis, observar el recurso que puede confirmarla y corregir la
causa en código o en Git, para que la siguiente sincronización no deshaga
el arreglo.

La [guía oficial para depurar Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
amplía las técnicas de inspección.
