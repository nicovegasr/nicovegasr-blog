---
kind: 'pill'
title: 'Infraestructura'
subtitle: 'dónde vive la aplicación'
icon: 'infrastructure'
order: 7
bonus: false
publicationDate: 2026-08-21
---

La infraestructura es **todo lo que una aplicación necesita para ejecutarse y
seguir disponible fuera del ordenador donde se desarrolló**. Incluye las
máquinas, la red, el almacenamiento y las herramientas con las que se despliega,
protege y observa.

El código no flota en el aire. Una tienda necesita CPU y memoria para ejecutar
el backend, un sitio donde servir el frontend, una red que reciba las peticiones,
una base de datos y almacenamiento para no perder la información.

## Ejecutar es solo el principio

Cuando la aplicación está en uso aparecen más preguntas. ¿Cómo se cifra el
tráfico? ¿Dónde se guardan los secretos? ¿Qué ocurre si una máquina cae? ¿Cómo
sabes que el checkout lleva diez minutos fallando? ¿Cómo recuperas los pedidos
si se rompe el almacenamiento?

Ahí entran certificados, balanceadores de carga, copias de seguridad, logs,
métricas, alertas y procesos de despliegue. No todas las aplicaciones necesitan
las mismas piezas, pero todas terminan tomando estas decisiones en algún nivel.

![La misma aplicación vive en infraestructura on-premise y cloud; cambia quién opera cada pieza, no las necesidades del sistema](../../images/fundamentos/infraestructura/infraestructura-es.webp)

## On-premise: tú operas las máquinas

En *on-premise*, la organización controla sus propios servidores, ya estén en
una oficina o en un centro de datos. Decide qué hardware compra, cómo monta la
red y cuándo amplía la capacidad.

Ese control puede ser importante por rendimiento, regulación o integración con
sistemas propios. También significa encargarse de los parches, las averías, la
electricidad, las copias y la capacidad que necesitarás dentro de seis meses.

## Cloud: alquilas recursos y servicios

En cloud, un proveedor ofrece computación, red y almacenamiento bajo demanda.
Además de alquilar máquinas, puedes usar servicios gestionados: una base de
datos, una cola o un balanceador que el proveedor opera por debajo.

Eso permite crear recursos rápido y escalar sin comprar hardware por adelantado.
No elimina el trabajo: todavía hay que configurar permisos, vigilar costes,
diseñar copias de seguridad y asumir los límites y dependencias del proveedor.

⚠️ On-premise da más control, pero obliga a operar más cosas. Cloud delega parte
de ese trabajo, pero no hace desaparecer la infraestructura. La diferencia real
es quién se responsabiliza de cada capa y cuánto cuesta hacerlo.
