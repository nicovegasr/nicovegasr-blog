---
kind: 'pill'
title: 'Cohesión'
subtitle: 'Que el código reúna las decisiones que le pertenecen'
icon: 'cohesion'
order: 5
systemMapStage: 'cohesion'
publicationDate: 2026-10-12
---

La cohesión indica si las decisiones de una pieza pertenecen al mismo propósito. Cuando una regla queda lejos de los datos que gobierna, entender un cambio exige recorrer el sistema; cuando todo se amontona en una sola clase, también.

## Mes 12: dos sitios que descatalogan

Un producto solo puede descatalogarse si no quedan unidades en stock, tanto desde el proceso automático como desde el panel de administración.

Si un proveedor deja de enviar un producto durante varias importaciones, el cron job de conciliación comprueba su estado y su stock antes de marcarlo como descatalogado y registrar la fecha. El servicio del panel repite esa lógica, pero olvida comprobar el stock: permite descatalogar un producto del que aún quedan unidades. La misma regla está implementada en dos sitios y ya no se cumple en ambos. `Product` es poco más que un contenedor de campos.

## La decisión: mover la regla a quien la conoce

`Product` reúne los datos y la regla de descatalogación en `product.discontinue(now)`. Este método comprueba el stock y devuelve un nuevo producto con el estado y la fecha de descatalogación, sin modificar el original:

~~~ts
class Product {
  private constructor(
    readonly code: string,
    readonly stock: number,
    readonly status: 'active' | 'discontinued',
    readonly discontinuedAt?: Date,
  ) {}

  discontinue(now: Date): Product {
    if (this.stock > 0) {
      throw new Error('Cannot discontinue a product with stock remaining');
    }

    return new Product(
      this.code,
      this.stock,
      'discontinued',
      this.discontinuedAt ?? now,
    );
  }
}
~~~

Los casos de uso cargan el producto y guardan la nueva versión que devuelve `discontinue`. Si ya estaba descatalogado, conserva la fecha original. Si quedan unidades, rechaza la transición. El producto original permanece intacto en todos los casos.

~~~ts
const discontinued = product.discontinue(now);
await products.save(discontinued);
~~~

El cron job sigue decidiendo cuándo solicitar la descatalogación según las importaciones recibidas; el panel lo hace a petición del administrador. Los motivos para solicitarla son distintos, pero ambos deben respetar la misma condición de stock. Esa condición pertenece a `Product`.

Dos señales ayudan a ver la frontera. Un nombre de dominio, `discontinue`, cuenta la intención mejor que `setDiscontinuedAt`. Y un caso de uso que atraviesa las propiedades del producto para decidir por él suele indicar que la regla está fuera de sitio: [mejor pedirle que haga la transición](https://martinfowler.com/bliki/TellDontAsk.html) que extraer sus datos para implementarla fuera.

**Lo que cuesta:** los servicios deben usar y guardar la versión que devuelve esta operación, y hay que acudir a `Product` para consultar su regla. El acceso a datos y la coordinación entre componentes siguen fuera; reunir la regla y los datos que protege no implica meter todo el proceso en la entidad.

**Aquí, mejorar la cohesión consiste en reunir la condición de stock y el cambio de estado que debe respetarla.**

*Ahora negocio quiere alertas cuando el stock de un producto baje de un umbral.*
