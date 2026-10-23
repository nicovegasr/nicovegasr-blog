---
kind: 'pill'
title: 'Configuración, Secrets y recursos'
subtitle: 'lo que cambia sin reconstruir la imagen'
icon: 'config'
order: 6
publicationDate: 2026-10-13
---

La misma imagen de `inventory-api` puede usarse en pruebas y producción si
sus diferencias entran como configuración. Un **ConfigMap** guarda datos no
confidenciales, como `LOG_LEVEL`. Un **Secret** sirve para credenciales y otros
valores sensibles. Ninguno obliga a reconstruir la imagen.

Este fragmento es esquemático: presupone que existen el ConfigMap, el Secret
y una imagen publicada con el digest indicado.

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

Los valores inyectados como variables de entorno se fijan al arrancar el
contenedor: cambiar el ConfigMap o el Secret no modifica ese proceso. Si se
montan como volumen, el contenido puede actualizarse con retraso, pero la
aplicación debe volver a leerlo; un montaje con `subPath` no recibe esas
actualizaciones. Define explícitamente cómo se aplica cada cambio y quién
ordena el reinicio cuando haga falta.

Un Secret **no es cifrado por el hecho de ser un Secret**. Su representación
habitual en un manifiesto usa Base64, que solo codifica bytes. Controla el
acceso con RBAC, evita incluir valores en Git en claro y comprueba cómo se
cifran en reposo los datos del clúster. Un sistema externo de secretos puede
resolver la distribución, pero añade otra integración que operar.

## Pedir capacidad y limitar consumo

El `request` se usa para decidir si un Pod cabe en un nodo. El `limit` marca
el techo del contenedor. Un límite de CPU puede provocar *throttling*; al
superar el de memoria, el proceso puede terminar con `OOMKilled`. El límite
no reserva capacidad y un `request` demasiado bajo oculta la necesidad real
del servicio al planificador y a un HPA basado en utilización.

Empieza con medidas de consumo real y revisa latencia, memoria y reinicios
tras cada ajuste. Para un servicio con un pool de base de datos o cachés en
memoria, añadir réplicas cambia también su consumo en sistemas externos.

Consulta los detalles de [Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
y [requests y limits](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
en la documentación oficial.
