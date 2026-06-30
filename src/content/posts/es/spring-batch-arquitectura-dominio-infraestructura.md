---
title: "Spring Batch — Arquitectura: más dominio, menos infraestructura"
publicationDate: 2026-07-01
summary: "Tres técnicas para que Spring Batch deje de ocupar el centro de la aplicación: una factoría que centraliza la configuración común de los jobs, un reader genérico reutilizable y un writer que solo materializa las acciones que decide el dominio."
tags: ["java", "spring", "spring-batch", "ddd", "backend"]
translationSlug: "spring-batch-architecture-domain-infrastructure"
---

![Portada: Spring Batch, arquitectura con más dominio y menos infraestructura](../images/spring-batch-architecture/portada.webp)

> Cuando un proyecto tiene cincuenta jobs, el objetivo deja de ser escribir otro más. El objetivo es que el número cincuenta sea casi tan fácil de mantener como el número cinco.

Llevo un par de años trabajando con Spring Batch y la idea de este artículo es reunir todo lo que me habría gustado saber cuando empecé: esas pequeñas decisiones que marcan la diferencia entre un repositorio de jobs fácil de mantener y otro que da miedo tocar.

Spring Batch suele asociarse a procesos ETL, pero antes de empezar conviene tener claras dos ideas.

1. **No es solo para ETLs.** Spring Batch tiene componentes pensados para extraer, transformar y cargar datos, pero también se utiliza muchísimo para tareas programadas: procesos nocturnos, mantenimientos, sincronizaciones o envíos de notificaciones. Para estos casos existen los *tasklets*, que no siguen el modelo *chunk-oriented*.

2. **DDD no siempre merece la pena.** La arquitectura hexagonal y Domain-Driven Design brillan cuando el dominio es complejo y necesitas controlar bien las reglas de negocio. En una migración de datos que vas a ejecutar una vez y olvidar, probablemente sean más un estorbo que una ayuda.

Combinar DDD con Spring Batch tiene sus detractores, pero cuando el dominio es rico y el proyecto va a evolucionar con el tiempo, creo que compensa. Y si ya trabajas en una aplicación que utiliza ambas cosas, muchas de las ideas de este artículo pueden ayudarte a reducir bastante el código repetitivo.

Podría escribir un libro entero sobre Spring Batch, pero sería demasiado largo. En lugar de eso, he preparado un repositorio de GitHub con un ejemplo completo y aquí voy a centrarme únicamente en las técnicas que más impacto han tenido en mis proyectos.

En DDD el dominio debería ser el protagonista: la aplicación gira alrededor del modelo de negocio y no del framework. Spring Batch, sin embargo, empuja justo en la dirección contraria. Cada job y cada step terminan arrastrando dependencias, listeners, validadores y configuración propia.

Con cuatro jobs apenas se nota.

Con cuarenta, encontrar lo que buscas empieza a ser una odisea.

Y cuando varios jobs comparten steps o tienen comportamientos condicionales, la cantidad de infraestructura acaba eclipsando a la lógica de negocio.

Las siguientes técnicas persiguen precisamente eso: que Spring Batch vuelva a ser un detalle de infraestructura y no el centro de tu aplicación.

# Centraliza la infraestructura con factorías

Cuando empiezas con Spring Batch es normal que cada configuración declare sus propias dependencias:

- `JobRepository`
- `PlatformTransactionManager`
- listeners
- validadores
- políticas de reintento
- configuración de transacciones

Al principio parecen tres o cuatro líneas sin importancia.

El problema aparece unos meses después.

Imagina una aplicación con diez jobs y tres steps por cada uno. Cada vez que añades un listener nuevo o cambias una política de reintentos tienes que acordarte de modificar treinta configuraciones distintas. El riesgo de olvidarte de una siempre está ahí.

Veamos un ejemplo.

### Job de Spring Batch sin factoría

```java
@Configuration
@RequiredArgsConstructor
public class NewsletterJobConfig {

    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;
    private final LoggingListener loggingListener;

    @Bean
    Job newsletterJob(Step processUnsubscriptionsStep, Step sendNewsletterStep) {
        var validator = new DefaultJobParametersValidator();
        validator.setRequiredKeys(new String[]{"businessDate"});
        validator.setOptionalKeys(new String[]{"run.id"});

        return new JobBuilder("newsletterJob", jobRepository)
            .validator(validator)
            .listener(loggingListener)
            .start(processUnsubscriptionsStep)
            .next(sendNewsletterStep)
            .build();
    }

    @Bean
    Step sendNewsletterStep() {
        return new StepBuilder("sendNewsletterStep", jobRepository)
            .<Subscriber, Email>chunk(50, transactionManager)
            .listener(loggingListener)
            .reader(activeSubscribersReader())
            .processor(toEmailProcessor())
            .writer(mailWriter())
            .build();
    }
}
```

No hay nada especialmente malo en este código.

El problema es que prácticamente todos los jobs de la aplicación tendrán exactamente la misma estructura. Cambiar una política común implica modificar todos ellos.

En lugar de repetir siempre la misma configuración, podemos mover toda esa infraestructura a una única factoría.

### Job de Spring Batch con factoría

```java
@Configuration
@RequiredArgsConstructor
public class NewsletterJobConfig {

    private final BatchFactory batch;

    @Bean
    Job newsletterJob(Step processUnsubscriptionsStep, Step sendNewsletterStep) {
        return batch.job("newsletterJob")
            .start(processUnsubscriptionsStep)
            .next(sendNewsletterStep)
            .build();
    }

    @Bean
    Step sendNewsletterStep() {
        return batch.<Subscriber, Email>step("sendNewsletterStep", 50)
            .reader(activeSubscribersReader())
            .processor(toEmailProcessor())
            .writer(mailWriter())
            .build();
    }
}
```

La configuración del job ahora solo describe dos cosas:

- qué steps tiene;
- qué hace cada uno.

Todo lo demás desaparece de la configuración y vive en un único sitio.

La factoría podría ser algo así:

```java
@Component
@RequiredArgsConstructor
@Accessors(fluent = true)
public class BatchFactory {

    private final JobRepository jobRepository;
    private final PlatformTransactionManager transactionManager;
    private final LoggingListener loggingListener;

    public JobBuilder job(String name) {
        var validator = new DefaultJobParametersValidator();
        validator.setRequiredKeys(new String[]{"businessDate"});
        validator.setOptionalKeys(new String[]{"run.id"});

        return new JobBuilder(name, jobRepository)
            .validator(validator)
            .listener(loggingListener);
    }

    public <I, O> SimpleStepBuilder<I, O> step(String name, int chunkSize) {
        return new StepBuilder(name, jobRepository)
            .<I, O>chunk(chunkSize, transactionManager)
            .listener(loggingListener);
    }
}
```

Puede parecer una optimización pequeña, pero escala sorprendentemente bien.

Una factoría como esta se convierte en el lugar natural para centralizar cualquier comportamiento común de todos los jobs:

- listeners;
- validadores;
- políticas de reintento;
- configuración de transacciones;
- estrategias de *skip*;
- cualquier otra configuración transversal.

A partir de ese momento, añadir una nueva política deja de ser un cambio repartido por decenas de clases y pasa a ser una modificación en un único fichero.

Además, el ahorro de código empieza a ser considerable.

Un proyecto con diez jobs y tres steps por job elimina fácilmente cerca de un centenar de líneas de infraestructura repetida. Pero el beneficio más importante no son esas líneas menos, sino que la configuración vuelve a expresar únicamente la intención del job.

Y esto solo afecta a la infraestructura común.

El verdadero ahorro aparece cuando dejamos de escribir un reader y un writer nuevo para prácticamente cada step.

# Componentes de infraestructura reutilizables

Hasta ahora hemos eliminado bastante ruido de la configuración de los jobs.

El siguiente sitio donde Spring Batch suele empezar a generar más código del necesario son los readers y los writers.

Y, curiosamente, creo que aquí es donde más fácil es perder de vista el objetivo de la aplicación.

El dominio debería decidir **qué** datos necesita.

Spring Batch únicamente debería encargarse de **cómo** recorrerlos.

---
## Readers

Cuando necesitas leer datos desde una fuente que no cubren los readers que trae Spring Batch, la [documentación oficial](https://docs.spring.io/spring-batch/reference/readers-and-writers/custom.html) propone implementar la interfaz `ItemReader` o `ItemStreamReader` tú mismo.

Es una solución perfectamente válida.

El problema aparece cuando el proyecto crece.

Imagina una aplicación con diez jobs.

- Uno sincroniza usuarios.
- Otro procesa facturas.
- Otro envía newsletters.
- Otro migra información histórica.

Cada uno tendrá uno o varios readers.

Después de unos meses descubres que tienes veinte o treinta clases distintas cuyo trabajo consiste en hacer prácticamente lo mismo:

- Abrir un recurso;
- Recorrer elementos uno a uno;
- Guardar el estado para reiniciar el job;
- Cerrar el recurso al terminar.

La lógica cambia.

**La infraestructura no.**

Veamos un ejemplo típico.

### Reader tradicional

```java
public class ActiveSubscribersReader implements ItemStreamReader<Subscriber> {

    private static final int PAGE = 200;

    private final SubscriberRepository repository;

    private Iterator<Subscriber> page = Collections.emptyIterator();
    private int offset = 0;

    public ActiveSubscribersReader(SubscriberRepository repository) {
        this.repository = repository;
    }

    @Override
    public void open(ExecutionContext ctx) {
        if (ctx.containsKey("offset")) {
            this.offset = ctx.getInt("offset");
        }
    }

    @Override
    public Subscriber read() {

        if (!page.hasNext()) {
            var batch = repository.findActive(offset, PAGE);

            if (batch.isEmpty()) {
                return null;
            }

            page = batch.iterator();
            offset += batch.size();
        }

        return page.next();
    }

    @Override
    public void update(ExecutionContext ctx) {
        ctx.putInt("offset", offset);
    }

    @Override
    public void close() {
        page = Collections.emptyIterator();
    }
}
```

Este reader funciona perfectamente.

Pero fíjate en algo.

¿Cuánto de este código habla realmente de suscriptores?

Muy poco.

La mayor parte del reader se dedica a gestionar infraestructura:

- abrir recursos;
- mantener un iterador;
- controlar el estado para reinicios;
- cerrar correctamente el stream.

El dominio aparece únicamente en una línea.

```java
repository.findActive(...)
```

Todo lo demás podría reutilizarse para prácticamente cualquier otro caso.

Ahí es donde creo que merece la pena cambiar el enfoque.

En lugar de crear un reader por cada caso de uso, prefiero tener un único reader genérico que solo sepa hacer una cosa: recorrer un `Stream<T>`.

### Reader genérico

```java
public class ChunkItemStreamReader<T> extends AbstractItemCountingItemStreamItemReader<T> {

    private final Supplier<Stream<T>> streamSupplier;

    private Stream<T> stream;
    private Iterator<T> iterator;

    private ChunkItemStreamReader(
            String name,
            Supplier<Stream<T>> streamSupplier
    ) {
        this.streamSupplier = streamSupplier;
        setName(name);
        setSaveState(true);
    }

    public static <T> ChunkItemStreamReader<T> of(
            String name,
            Supplier<Stream<T>> streamSupplier
    ) {
        return new ChunkItemStreamReader<>(name, streamSupplier);
    }

    @Override
    protected void doOpen() {
        stream = streamSupplier.get();
        iterator = stream.iterator();
    }

    @Override
    protected T doRead() {
        return iterator.hasNext()
                ? iterator.next()
                : null;
    }

    @Override
    protected void doClose() {
        if (stream != null) {
            stream.close();
            stream = null;
            iterator = null;
        }
    }
}
```

La diferencia es que ahora la infraestructura deja de conocer el dominio.

Lo único que necesita es una función que devuelva un `Stream<T>`.

Todo lo demás desaparece.

En cada job únicamente indicamos qué datos queremos leer.

```java
@Bean
ChunkItemStreamReader<Subscriber> activeSubscribersReader() {
    return ChunkItemStreamReader.of(
        "activeSubscribersReader",
        subscriberRepository::streamActive
    );
}

@Bean
ChunkItemStreamReader<Subscriber> unsubscribedReader() {
    return ChunkItemStreamReader.of(
        "unsubscribedReader",
        subscriberRepository::streamUnsubscribed
    );
}
```

Fíjate en el cambio de responsabilidad.

Antes el reader decidía cómo obtener los datos.

**Ahora simplemente consume un stream.**

La lógica de negocio vuelve donde debería estar: el dominio.

Spring Batch se limita a recorrer los elementos.

Y esto tiene otra ventaja interesante.

Si mañana necesitas leer desde JDBC, una API REST o incluso un fichero CSV, no tienes que modificar el reader genérico.

Solo necesitas que el dominio exponga un `Stream<T>` con ese origen de datos.

La infraestructura ni siquiera sabe de dónde vienen los registros.

Ese desacoplamiento hace que añadir nuevos jobs sea mucho más rápido y que el código repetitivo prácticamente desaparezca.

---
## Writers

Con los writers suele pasar exactamente lo mismo.

La solución más habitual consiste en crear un writer por cada step.

Al principio parece razonable.

Con el tiempo descubres que muchos de ellos hacen prácticamente lo mismo: agrupar elementos y llamar a distintos repositorios.

Creo que merece la pena cambiar un poco la perspectiva.

**Un writer no debería decidir la lógica de negocio.**

Solo debería materializar las acciones que el dominio ya ha decidido realizar.

Veamos un ejemplo.

Imagina un job que cada semana envía una newsletter.

Tiene dos pasos muy sencillos.

- El primero elimina de la whitelist a los usuarios que solicitaron la baja.
- El segundo envía la newsletter y registra los fallos para poder reintentarlos más adelante.

Podríamos crear un writer distinto para cada uno de esos steps.
```
DeleteSubscribersWriter
FailedDispatchWriter
NewsletterAuditWriter
...
```

No hay nada malo en ello.

Pero todos están actuando sobre el mismo bounded context: **Newsletter**.

En lugar de eso, prefiero que el dominio describa qué acciones quiere realizar y que exista un único writer encargado de ejecutarlas.

Ese objeto podría tener esta forma:

```java
@Getter
@Accessors(fluent = true)
public class NewsletterActions {

    private final List<Subscriber> subscribersToDelete = new ArrayList<>();

    private final List<DispatchFailure> failedDispatches = new ArrayList<>();
}
```

Fíjate en el cambio de mentalidad.

El dominio ya no dice:

> "borra este usuario"

o

> "guarda este error".

Lo que hace es devolver un conjunto de acciones que representan el resultado del caso de uso.

Después, la infraestructura decide cómo persistirlas.

Esa pequeña diferencia hace que toda la lógica siga viviendo en el dominio y que el writer se convierta en una simple pieza de infraestructura.

Después, un único writer interpreta esas acciones.

```java
@Component
@RequiredArgsConstructor
public class NewsletterWriterFactory {

    private final SubscriberRepository subscriberRepository;
    private final FailedDispatchStore failedDispatchStore;

    public ItemWriter<Result<NewsletterActions>> defaultWriter() {

        return chunk -> {

            var toDelete = new ArrayList<Subscriber>();
            var failedDispatches = new ArrayList<DispatchFailure>();

            for (var result : chunk.getItems()) {

                switch (result) {

                    case Result.Failure<NewsletterActions> failure ->
                        throw failure.error();

                    case Result.Success<NewsletterActions> success -> {

                        var actions = success.value();

                        toDelete.addAll(actions.subscribersToDelete());
                        failedDispatches.addAll(actions.failedDispatches());
                    }
                }
            }

            if (!toDelete.isEmpty()) {
                subscriberRepository.deleteAll(toDelete);
            }

            if (!failedDispatches.isEmpty()) {
                failedDispatchStore.saveAll(failedDispatches);
            }
        };
    }
}
```

El writer ya no contiene reglas de negocio.

Solo agrupa las acciones que el dominio ha producido y las persiste de la forma más eficiente posible.

Esto tiene varias ventajas.

La primera es evidente: cualquier step que trabaje sobre el bounded context de Newsletter puede reutilizar exactamente el mismo writer.

La segunda es menos obvia.

Toda la lógica sigue viviendo en el dominio.

Si mañana cambian las reglas para eliminar usuarios o registrar errores, el writer probablemente ni siquiera tenga que modificarse.

El step termina siendo sorprendentemente pequeño.

```java
@Configuration
@RequiredArgsConstructor
public class ProcessUnsubscriptionsStepConfig {

    private static final int CHUNK_SIZE = 100;

    private final BatchFactory batchFactory;
    private final SubscriberRepository subscriberRepository;
    private final NewsletterWriterFactory newsletterWriterFactory;

    @Bean
    ChunkItemStreamReader<Result<NewsletterActions>> pendingUnsubscriptionsReader() {

        var useCase = new ProcessUnsubscriptionsUseCase(subscriberRepository);

        return ChunkItemStreamReader.of(
            "pendingUnsubscriptionsReader",
            useCase::pendingUnsubscriptions
        );
    }

    @Bean
    Step processUnsubscriptionsStep(
        ChunkItemStreamReader<Result<NewsletterActions>> pendingUnsubscriptionsReader
    ) {

        return batchFactory
            .<Result<NewsletterActions>, Result<NewsletterActions>>
            step("processUnsubscriptionsStep", CHUNK_SIZE)
            .reader(pendingUnsubscriptionsReader)
            .writer(newsletterWriterFactory.defaultWriter())
            .build();
    }
}
```

Fíjate en lo poco que queda de Spring Batch.

El step únicamente conecta piezas.

No decide reglas de negocio.

No conoce la persistencia.

No contiene lógica.

Simplemente orquesta el flujo.

Y creo que ese debería ser precisamente el papel de Spring Batch dentro de una aplicación: encargarse del procesamiento por lotes mientras el dominio sigue siendo quien toma las decisiones.

# ¿Cuándo merece la pena esta arquitectura?

No todas las aplicaciones necesitan este nivel de abstracción.

Si estás desarrollando una migración puntual que va a ejecutarse una única vez, probablemente sea demasiado trabajo. En esos casos, prefiero escribir el job más sencillo posible y centrarme en que haga bien su trabajo.

Sin embargo, la situación cambia cuando Spring Batch deja de ser una herramienta puntual y pasa a formar parte del producto.

Es ahí donde empiezan a aparecer nuevos jobs, nuevos procesos de negocio y pequeños cambios que afectan a varias partes de la aplicación. La infraestructura crece, las configuraciones se repiten y mantener la consistencia empieza a ser más complicado que implementar la propia lógica.

La siguiente tabla resume bastante bien cuándo utilizaría esta aproximación.

| Escenario                            | ¿Aplicaría esta arquitectura? |
| ------------------------------------ | ----------------------------- |
| Migración puntual de datos           | ❌ No                          |
| ETL sencilla                         | 🤔 Depende                    |
| Jobs con reglas de negocio complejas | ✅ Sí                          |
| Plataforma con muchos jobs           | ✅ Totalmente                  |
| Aplicaciones que ya utilizan DDD     | ✅ Sí                          |

No es una cuestión de rendimiento.

Es una cuestión de mantenimiento.

# ¿Qué acabamos ganando?

Si repasamos todo lo que hemos construido durante el artículo, realmente solo hemos introducido tres ideas.

- Una factoría para centralizar la configuración común de los jobs.
- Un reader reutilizable que elimina infraestructura repetitiva.
- Un writer que materializa las acciones del dominio sin contener reglas de negocio.

Por separado parecen cambios pequeños.

Juntos hacen que la infraestructura deje de crecer al mismo ritmo que la aplicación.

**Enfoque tradicional:** cada job tiene su propio reader y su propio writer. Job 1, Job 2, Job 3... cada uno con una pareja reader/writer distinta, aunque hagan básicamente lo mismo.

**Enfoque reutilizable:** todos los jobs comparten un reader y un writer genéricos. Job 1, Job 2, Job 3... todos apoyándose en las mismas dos piezas de infraestructura.

La diferencia no está en ahorrar unas cuantas líneas de código.

La diferencia es que, cuando llega un nuevo requisito, normalmente solo tienes que escribir lógica de negocio.

La infraestructura ya existe.

# Conclusiones

Spring Batch es un framework excelente para procesar grandes volúmenes de información.

Pero cuando un proyecto empieza a crecer, es fácil que el código de infraestructura termine ocupando más espacio que el propio dominio.

Mi objetivo con estas ideas nunca ha sido reinventar Spring Batch.

Todo lo contrario.

Intento que el framework haga únicamente aquello para lo que fue diseñado: orquestar el procesamiento por lotes.

Y que el resto de decisiones permanezcan donde creo que aportan más valor: en el dominio.

Con esta aproximación, crear un nuevo job deja de ser copiar clases, adaptar readers y escribir otro writer casi idéntico al anterior.

La mayor parte del trabajo consiste simplemente en implementar un nuevo caso de uso.

Y eso, al menos para mí, es una buena señal de que la arquitectura está haciendo su trabajo.

---

Todo el código de este artículo, junto con ejemplos completos, pruebas de rendimiento y otras ideas que no han cabido aquí, está disponible en el [repositorio de GitHub](https://github.com/nicovegasr/spring-batch-ddd).

Si tienes otra forma de organizar proyectos con Spring Batch o has encontrado una solución diferente para alguno de estos problemas, me encantará leerla. Siempre hay más de una manera de construir software mantenible, y comparar enfoques suele ser la mejor forma de seguir aprendiendo.
