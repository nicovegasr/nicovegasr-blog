---
kind: 'pill'
title: 'Arquitectura y costes de Kubernetes'
subtitle: 'qué aporta al desarrollar una aplicación'
icon: 'cluster-cost'
order: 1
bonus: false
publicationDate: 2026-10-13
---

Kubernetes coordina aplicaciones empaquetadas en contenedores dentro de un
**clúster**. En lugar de escoger una máquina para cada proceso, declaras qué
quieres ejecutar y dejas que el sistema ubique los Pods, sustituya los que se
pierden y exponga una forma estable de encontrarlos.

Imagina una API de inventario con tres réplicas. Si una máquina desaparece, el
control plane detecta que faltan réplicas y crea Pods de sustitución en nodos
disponibles. Esa capacidad es útil, pero no arregla una API que devuelve datos
incorrectos ni convierte una operación con estado en automáticamente segura.

## El recorrido de una decisión

- La **API de Kubernetes** recibe y valida objetos como Deployments o Services.
- `etcd` conserva el estado de esos objetos. Los **controladores** comparan lo
  solicitado con lo observado y actúan cuando hay diferencias.
- El **scheduler** asigna los Pods pendientes a nodos que cumplen sus
  restricciones y tienen capacidad solicitada.
- En cada nodo, el **kubelet** trabaja con el runtime de contenedores para
  iniciar y vigilar los Pods asignados.

No hay un único proceso que «ejecute todo». Los componentes cooperan a través
de la API y siguen reconciliando el estado. Por eso un `kubectl apply` aceptado
significa que la declaración llegó a la API; todavía no demuestra que la
aplicación esté lista para servir tráfico.

## Lo que cuesta

Kubernetes tiene sentido cuando la necesidad de desplegar, escalar y operar
varias cargas compensa administrar el clúster y sus integraciones. Incluso en
un servicio gestionado hay que decidir capacidad de nodos, red, permisos,
actualizaciones, observabilidad y recuperación. Los recursos reservados por
`requests`, las réplicas adicionales durante un despliegue y los componentes
de plataforma también consumen capacidad.

Para una aplicación pequeña con despliegues sencillos, una plataforma más
simple puede ser suficiente. La pregunta útil no es «¿podemos usar
Kubernetes?», sino qué problemas operativos concretos resolvería y quién
mantendría el sistema resultante.

Si vienes de [Docker](/es/pildoras/docker), aquí cambia la responsabilidad:
la imagen sigue describiendo el proceso, pero Kubernetes decide dónde y con
qué condiciones ejecutarlo.

La [arquitectura oficial del clúster](https://kubernetes.io/docs/concepts/overview/components/)
describe las responsabilidades del control plane y los nodos.
