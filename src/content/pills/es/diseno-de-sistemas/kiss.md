---
kind: 'pill'
title: 'Keep It Simple, Stupid (KISS)'
subtitle: 'resolver lo complejo sin complicarlo más'
icon: 'simple'
order: 1
bonus: false
publicationDate: 2026-10-12
---

**Mantén las cosas simples.** Esa es la idea de KISS (*Keep It Simple, Stupid*). Si el problema es sencillo, una solución sencilla debería bastar. Si es complejo, el diseño tiene que hacerse cargo de esa complejidad y permitir trabajar con ella.

Una interfaz puede ayudarte a simplificar. Una función de veinte líneas puede hacerte la vida imposible. La diferencia se ve cuando tienes que entender el código o cambiarlo.

## Cien jobs que leen ficheros

Imagina cien jobs de Spring Batch que importan inventario de distintos proveedores. Llegan JSON, XML y ficheros posicionales, donde cada campo ocupa unas posiciones concretas. Dos ficheros posicionales pueden tener distribuciones completamente distintas: que compartan formato no significa que se lean igual.

Algunos proveedores cambian esa distribución con frecuencia. Esta semana el código de producto ocupa las posiciones 1 a 12; la siguiente, las posiciones 1 a 16, desplazando los campos que vienen después.

Hay dos dificultades que el código tiene que resolver: entender cada disposición y mantenerla cuando cambie. Eso es **complejidad inherente**: viene con el problema que hemos aceptado resolver.

## ¿Dónde cambias la lectura de ese fichero?

Una primera solución podría copiar la lectura dentro de cada job que la necesita. Parece cómoda: cada job tiene todo su código a mano. Pero si ocho jobs leen la misma disposición y el proveedor la cambia, ahora tienes ocho sitios que revisar. También tienes ocho oportunidades de dejar una copia con las posiciones antiguas.

Podemos concentrar esa lectura en un lector y reutilizarlo en los ocho jobs. Las disposiciones distintas tendrán sus propios lectores. Todos entregan registros de inventario mediante una interfaz común:

~~~ts
interface InventoryReader {
  read(file: InventoryFile): Iterable<InventoryRecord>;
}
~~~

Cada job recibe el lector que le corresponde y trabaja con sus registros. No necesita conocer las posiciones del fichero ni elegir entre todos los formatos del sistema.

~~~text
Job A ─┐
Job B ─┼→ SupplierStockReader → registros de inventario
Job C ─┘

Job D ──→ WarehouseXmlReader → registros de inventario
~~~

Cuando cambia la disposición del primer fichero, modificas `SupplierStockReader` y sus pruebas. Los jobs siguen pidiendo registros de la misma manera. Si también cambia el significado de un dato, habrá que revisar lo que hace el procesamiento con él: una interfaz no puede hacer desaparecer ese cambio.

**Aquí la abstracción simplifica el mantenimiento.** Centralizar significa mantener la lectura de cada disposición en un lugar conocido, no meter los cien formatos en una clase gigante.

## La complejidad que añadimos nosotros

Las copias repartidas entre jobs son **complejidad añadida**: el proveedor no nos ha obligado a duplicar su formato. Tampoco nos obliga a crear un sistema de plugins, una jerarquía de diez clases o un motor configurable para empezar a leerlo.

Esos mecanismos pueden tener sentido si resuelven una necesidad concreta. Si los formatos cambian a menudo y deben incorporarse sin desplegar código, quizá compense describirlos mediante configuración. Esa configuración también tendrá que entenderse, comprobarse y mantenerse; ser genérica no la hace automáticamente más simple.

Con un fichero pequeño que solo usa un proceso, una función puede bastar. Con cien disposiciones reales, organizar sus lectores y compartir un contrato puede ser la solución más sencilla de mantener.

**KISS pide que el diseño facilite resolver el problema real, con toda su complejidad, y que cada mecanismo añadido se gane su sitio.**
