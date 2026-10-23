---
kind: 'pill'
title: 'De la aplicación a la imagen'
subtitle: 'construcción, registro e identidad'
icon: 'image'
order: 2
publicationDate: 2026-10-13
---

Antes de crear un Deployment necesitas una imagen que el clúster pueda
descargar. Para la API de inventario, el recorrido es: código → build → imagen
→ registro → referencia en el manifiesto → descarga en el nodo. Kubernetes no
compila la aplicación ni resuelve sus dependencias; consume el artefacto que
publicaste.

## Identificar la imagen que se ejecuta

El `Dockerfile` describe cómo construirla, pero un build solo será reproducible
si también controlas las versiones de la imagen base, las dependencias y las
herramientas de construcción. Un build multi-stage evita llevar al runtime
compiladores y dependencias de desarrollo. La aplicación debe escuchar
en la interfaz adecuada, escribir logs a la salida estándar, recibir
configuración desde el entorno y responder a señales de terminación. Son
decisiones de la aplicación y de la imagen, no opciones mágicas del Deployment.

Una vez construida, subes la imagen a un registro accesible desde los nodos.
Estas referencias son ilustrativas: el registro y el digest deben sustituirse
por los de una imagen publicada realmente.

```text
registry.example.com/inventory-api:1.4.2
registry.example.com/inventory-api@sha256:<digest>
```

Una etiqueta ayuda a leer la versión, pero puede apuntar a otro contenido si
alguien la sobrescribe. El **digest** identifica el contenido exacto. Fijarlo
en el manifiesto permite saber qué se ejecutó y repetir un despliegue sin
depender de que la etiqueta siga intacta. `imagePullPolicy: Always` comprueba
el registro al arrancar, pero tampoco convierte una etiqueta mutable en una
versión fija.

## Cuando el nodo no puede descargarla

`ImagePullBackOff` señala que la descarga está fallando y Kubernetes retrasa
los siguientes intentos. Comprueba el nombre y la referencia, el acceso del
nodo al registro y, si es privado, el `imagePullSecret` asociado al Pod o a su
ServiceAccount. Una credencial válida en tu portátil no concede acceso al
clúster.

La imagen contiene **código y dependencias**. Configuración específica del
entorno y credenciales entrarán después por ConfigMaps y Secrets. Construir
una sola imagen y promover su digest entre entornos reduce las diferencias
entre lo probado y lo desplegado.

Puedes profundizar en [Dockerfile](/es/pildoras/docker/docker-file) y
[builds multi-stage](/es/pildoras/docker/multistage).
La [documentación de imágenes de Kubernetes](https://kubernetes.io/docs/concepts/containers/images/)
detalla la diferencia entre etiquetas, digests y políticas de descarga.
