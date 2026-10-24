---
kind: 'pill'
title: 'CI/CD y promoción entre entornos'
subtitle: 'Mover el mismo artefacto con control'
icon: 'pipeline'
order: 10
publicationDate: 2026-10-13
---

Una pipeline útil separa dos decisiones: **qué código se convirtió en
imagen** y **en qué entorno se permite ejecutar esa imagen**. Para la API de
inventario, CI compila, ejecuta pruebas, construye la imagen y publica su
digest. La promoción cambia la referencia de ese digest en la configuración
del entorno; no vuelve a compilar el código para producción.

```text
commit → pruebas → imagen@sha256 → staging → comprobaciones → producción
```

La pipeline puede validar que los manifiestos se generan y que el esquema
de Kubernetes los acepta. Después del despliegue debe comprobar el rollout
y una operación representativa de la aplicación. `kubectl apply` exitoso
solo confirma la aceptación de objetos por la API; no demuestra que la
versión nueva funciona.

## Variar entornos sin duplicar toda la definición

**Kustomize** compone una base de manifiestos con overlays por entorno:
réplicas, nombres, límites o referencias de imagen. **Helm** genera
manifiestos a partir de charts y valores. Ambos son útiles cuando reducen
duplicación y hacen visible la diferencia entre entornos. Si cada entorno
tiene tantas excepciones que cuesta saber qué se aplicará, la plantilla se
ha convertido en otro lenguaje que revisar.

Antes de promover, inspecciona el resultado renderizado y el diff real. Un
valor de Helm o un patch de Kustomize puede cambiar un selector, un puerto o
un Secret sin que el cambio resulte obvio en el fichero que editaste.

## Diseñar la vuelta atrás

Una promoción debe dejar constancia del digest, configuración, autor y
resultado. Volver al digest anterior es sencillo solo si datos y contratos
siguen siendo compatibles. Un despliegue con migración de base de datos
necesita una secuencia que permita convivir a la versión vieja y la nueva.
La pipeline automatiza pasos; no decide por sí sola cuándo es seguro borrar
una columna o repetir un efecto externo.

Este flujo puede aplicar manifiestos directamente, pero también puede
terminar en un cambio revisado en Git que otro controlador sincronice. Esa
segunda opción es el tema de la siguiente pill.
