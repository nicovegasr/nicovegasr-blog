---
kind: 'pill'
title: 'Entrada y salida de red'
subtitle: 'publicar la API y limitar comunicaciones'
icon: 'network'
order: 9
publicationDate: 2026-10-13
---

El Service de la pill anterior ofrece una dirección dentro del clúster. Para
recibir tráfico externo hace falta decidir por dónde entra, dónde termina TLS
y quién interpreta las rutas HTTP.

Un `Service` de tipo `LoadBalancer` puede solicitar un balanceador externo si
la infraestructura lo soporta. Para varias aplicaciones HTTP suele haber un
controlador de **Ingress** o una implementación de **Gateway API** que recibe
el tráfico y lo dirige a los Services adecuados. Crear el objeto Ingress o
Gateway sin su controlador no instala un proxy ni publica nada por sí solo.

```text
cliente → balanceador/controlador → Service → Pod listo
```

En cada salto importa algo distinto: certificado y host en la entrada,
Service y puerto de destino dentro del clúster, readiness en el Pod. Si una
petición obtiene un 404 desde el controlador, puede ser una regla de host o
ruta. Si el controlador devuelve un error porque no hay backend, mira el
Service y sus EndpointSlices. Una prueba directa al Pod sirve para acotar el
problema, pero no verifica la ruta pública completa.

## La salida también es arquitectura

La API de inventario quizá necesite hablar con una base de datos o una API
externa. DNS, rutas de salida, NAT, proxies y reglas de red dependen del
clúster. Que el contenedor funcione en local no demuestra que pueda alcanzar
esos destinos desde un Pod. Establece timeouts y registra fallos de conexión
de forma que se distingan de los errores de la aplicación.

Por defecto, si no hay políticas que aíslen un Pod, el tráfico está permitido.
Una **NetworkPolicy** puede restringir entrada y salida por Pods, namespaces,
direcciones IP y puertos. Su efecto depende de que el plugin de red del
clúster la implemente. Una política de denegación de salida puede cortar
también el acceso a DNS; permitir solo el puerto de la base de datos no basta
si se conecta por nombre. Prueba tanto las conexiones permitidas como las
denegadas desde el namespace correcto.

La política de red controla conectividad, no sustituye autenticación,
autorización ni TLS entre servicios. Consulta las [NetworkPolicies oficiales](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
para sus reglas de aislamiento y límites.
