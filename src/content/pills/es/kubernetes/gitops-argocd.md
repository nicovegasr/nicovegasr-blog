---
kind: 'pill'
title: 'GitOps y Argo CD'
subtitle: 'Sincronizar lo aprobado con el clúster'
icon: 'gitops'
order: 11
publicationDate: 2026-10-13
---

En un flujo GitOps, Git contiene la intención de despliegue. CI publica la
imagen y propone actualizar el digest en un repositorio de configuración.
Una revisión aprueba esa intención; **Argo CD** observa Git y el clúster y
compara el estado deseado con el estado vivo.

Una `Application` de Argo CD declara el repositorio y la ruta de origen, el
destino y cómo sincronizar. Su estado **Synced** significa que los recursos
gestionados coinciden con la configuración interpretada desde Git. **Healthy**
es una evaluación del estado de esos recursos. Ninguna de las dos etiquetas
equivale a que todas las operaciones de negocio se completan correctamente.

```text
imagen publicada → PR del digest → merge → Argo CD detecta diff → sync
                                               ↓
                                    estado vivo del clúster
```

## Qué pasa cuando alguien cambia el clúster

Sin sincronización automática, Argo CD puede mostrar `OutOfSync` y esperar
una acción. Con `automated` aplica cambios de Git; `selfHeal` permite corregir
determinadas modificaciones hechas solo en el clúster y `prune` permite borrar
recursos que ya no están en Git. Son decisiones distintas: activar borrado
automático requiere entender la propiedad de cada recurso y el efecto de
retirarlo.

GitOps evita entregar credenciales del clúster a cada pipeline de aplicación,
pero mueve la responsabilidad a permisos del repositorio, revisión,
configuración de Argo CD y acceso del controlador al clúster. El autoservicio
de plataforma aparece cuando un equipo puede cambiar una imagen o parámetros
permitidos mediante un PR, con validaciones y límites claros, sin pedir a
otra persona que ejecute comandos manuales.

Los Secrets en claro siguen sin pertenecer a Git. Hay que resolver su
distribución con un mecanismo apropiado y definir cómo rota una credencial
sin romper la aplicación.

Consulta los [conceptos de Argo CD](https://argo-cd.readthedocs.io/en/stable/core_concepts/)
y la [política de sincronización automática](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/).
