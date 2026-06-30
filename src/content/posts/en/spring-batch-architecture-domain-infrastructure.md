---
title: "Spring Batch — Architecture: More Domain, Less Infrastructure"
publicationDate: 2026-07-01
summary: "Three techniques to stop Spring Batch from taking over the center of your application: a factory that centralizes common job configuration, a reusable generic reader, and a writer that only materializes the actions the domain decided on."
tags: ["java", "spring", "spring-batch", "ddd", "backend"]
translationSlug: "spring-batch-arquitectura-dominio-infraestructura"
---

![Cover: Spring Batch, architecture with more domain and less infrastructure](../images/spring-batch-architecture/portada.webp)

> When a project has fifty jobs, the goal stops being writing one more. The goal is for job number fifty to be almost as easy to maintain as job number five.

I've spent a couple of years working with Spring Batch, and this article is my attempt to gather everything I wish I'd known when I started: the small decisions that make the difference between a job repository that's easy to maintain and one that's scary to touch.

Spring Batch is usually associated with ETL processes, but before diving in, two ideas are worth clarifying.

1. **It's not just for ETLs.** Spring Batch has components built for extracting, transforming and loading data, but it's also widely used for scheduled tasks: nightly processes, maintenance jobs, synchronizations or notification dispatches. For these cases there are *tasklets*, which don't follow the *chunk-oriented* model.

2. **DDD isn't always worth it.** Hexagonal architecture and Domain-Driven Design shine when the domain is complex and you need tight control over business rules. In a one-off data migration you'll run once and forget, they're probably more of a hindrance than a help.

Combining DDD with Spring Batch has its detractors, but when the domain is rich and the project is going to evolve over time, I think it pays off. And if you're already working on an application that uses both, many of the ideas in this article can help you cut down on repetitive code.

I could write an entire book about Spring Batch, but that would be too long. Instead, I've put together a GitHub repository with a complete example, and here I'll focus only on the techniques that have had the biggest impact on my projects.

In DDD, the domain should be the protagonist: the application revolves around the business model, not the framework. Spring Batch, however, pushes in exactly the opposite direction. Every job and every step ends up dragging along dependencies, listeners, validators and its own configuration.

With four jobs, you barely notice.

With forty, finding what you're looking for starts to become an odyssey.

And when several jobs share steps or have conditional behavior, the sheer amount of infrastructure ends up overshadowing the business logic.

The following techniques aim at exactly that: making Spring Batch an infrastructure detail again, not the center of your application.

# Centralize infrastructure with factories

When you start with Spring Batch, it's normal for every configuration class to declare its own dependencies:

- `JobRepository`
- `PlatformTransactionManager`
- listeners
- validators
- retry policies
- transaction configuration

At first, this looks like three or four unimportant lines.

The problem shows up a few months later.

Imagine an application with ten jobs and three steps each. Every time you add a new listener or change a retry policy, you have to remember to update thirty different configurations. The risk of missing one is always there.

Let's look at an example.

### Spring Batch job without a factory

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

There's nothing particularly wrong with this code.

The problem is that practically every job in the application will have exactly the same structure. Changing one shared policy means modifying all of them.

Instead of repeating the same configuration over and over, we can move all that infrastructure into a single factory.

### Spring Batch job with a factory

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

The job configuration now only describes two things:

- which steps it has;
- what each one does.

Everything else disappears from the configuration and lives in a single place.

The factory could look something like this:

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

It might look like a small optimization, but it scales surprisingly well.

A factory like this becomes the natural place to centralize any behavior shared across jobs:

- listeners;
- validators;
- retry policies;
- transaction configuration;
- *skip* strategies;
- any other cross-cutting configuration.

From that point on, adding a new policy stops being a change scattered across dozens of classes and becomes a modification in a single file.

On top of that, the code savings start to add up.

A project with ten jobs and three steps per job easily eliminates close to a hundred lines of repeated infrastructure. But the most important benefit isn't those fewer lines — it's that the configuration goes back to expressing only the job's intent.

And that only covers the shared infrastructure.

The real savings show up once we stop writing a new reader and a new writer for practically every step.

# Reusable infrastructure components

So far we've removed a fair amount of noise from job configuration.

The next place where Spring Batch tends to generate more code than necessary is readers and writers.

And, interestingly, I think this is where it's easiest to lose sight of the application's actual goal.

The domain should decide **what** data it needs.

Spring Batch should only be responsible for **how** to iterate over it.

---
## Readers

When you need to read data from a source that Spring Batch's built-in readers don't cover, the [official documentation](https://docs.spring.io/spring-batch/reference/readers-and-writers/custom.html) suggests implementing the `ItemReader` or `ItemStreamReader` interface yourself.

That's a perfectly valid solution.

The problem shows up as the project grows.

Imagine an application with ten jobs.

- One syncs users.
- Another processes invoices.
- Another sends newsletters.
- Another migrates historical data.

Each one will have one or more readers.

After a few months you discover you have twenty or thirty different classes whose job is essentially the same:

- Open a resource;
- Iterate over elements one by one;
- Save state so the job can restart;
- Close the resource when done.

The logic changes.

**The infrastructure doesn't.**

Let's look at a typical example.

### Traditional reader

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

This reader works perfectly fine.

But take a closer look.

How much of this code actually talks about subscribers?

Very little.

Most of the reader is dedicated to managing infrastructure:

- opening resources;
- maintaining an iterator;
- tracking state for restarts;
- closing the stream correctly.

The domain shows up in exactly one line.

```java
repository.findActive(...)
```

Everything else could be reused for practically any other case.

That's where I think it's worth changing the approach.

Instead of creating one reader per use case, I prefer a single generic reader that only knows how to do one thing: iterate over a `Stream<T>`.

### Generic reader

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

The difference is that now the infrastructure no longer knows about the domain.

All it needs is a function that returns a `Stream<T>`.

Everything else disappears.

In each job, we only state which data we want to read.

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

Notice the shift in responsibility.

Before, the reader decided how to get the data.

**Now it simply consumes a stream.**

The business logic goes back where it belongs: the domain.

Spring Batch limits itself to iterating over the elements.

And this has another interesting advantage.

If tomorrow you need to read from JDBC, a REST API, or even a CSV file, you don't have to touch the generic reader.

You just need the domain to expose a `Stream<T>` from that data source.

The infrastructure doesn't even know where the records come from.

That decoupling makes adding new jobs much faster, and repetitive code practically disappears.

---
## Writers

The exact same thing tends to happen with writers.

The most common approach is to create one writer per step.

At first, that seems reasonable.

Over time, you discover that many of them do practically the same thing: group elements and call different repositories.

I think it's worth shifting the perspective a bit.

**A writer shouldn't decide business logic.**

It should only materialize the actions the domain has already decided to perform.

Let's look at an example.

Imagine a job that sends a newsletter every week.

It has two very simple steps.

- The first removes users who requested unsubscription from the whitelist.
- The second sends the newsletter and logs failures so they can be retried later.

We could create a different writer for each of those steps.
```
DeleteSubscribersWriter
FailedDispatchWriter
NewsletterAuditWriter
...
```

There's nothing wrong with that.

But all of them are acting on the same bounded context: **Newsletter**.

Instead, I prefer the domain to describe which actions it wants to perform and have a single writer in charge of executing them.

That object could look like this:

```java
@Getter
@Accessors(fluent = true)
public class NewsletterActions {

    private final List<Subscriber> subscribersToDelete = new ArrayList<>();

    private final List<DispatchFailure> failedDispatches = new ArrayList<>();
}
```

Notice the shift in mindset.

The domain no longer says:

> "delete this user"

or

> "save this error".

What it does is return a set of actions that represent the result of the use case.

Afterward, the infrastructure decides how to persist them.

That small difference keeps all the logic living in the domain, and turns the writer into a plain piece of infrastructure.

Then, a single writer interprets those actions.

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

The writer no longer contains business rules.

It only groups the actions the domain produced and persists them as efficiently as possible.

This has several advantages.

The first is obvious: any step working on the Newsletter bounded context can reuse exactly the same writer.

The second is less obvious.

All the logic still lives in the domain.

If tomorrow the rules for deleting users or logging errors change, the writer probably won't even need to be modified.

The step ends up being surprisingly small.

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

Notice how little Spring Batch is left here.

The step only wires pieces together.

It doesn't decide business rules.

It doesn't know about persistence.

It contains no logic.

It simply orchestrates the flow.

And I think that should be exactly Spring Batch's role within an application: handling batch processing while the domain keeps making the decisions.

# When is this architecture worth it?

Not every application needs this level of abstraction.

If you're building a one-off migration that will run exactly once, this is probably too much work. In those cases, I'd rather write the simplest possible job and focus on making it do its one job well.

The situation changes, however, once Spring Batch stops being a one-off tool and becomes part of the product.

That's when new jobs, new business processes and small cross-cutting changes start to appear. Infrastructure grows, configurations get repeated, and keeping things consistent becomes harder than implementing the actual logic.

The following table sums up pretty well when I'd reach for this approach.

| Scenario                          | Would I apply this architecture? |
| ---------------------------------- | --------------------------------- |
| One-off data migration             | ❌ No                              |
| Simple ETL                         | 🤔 Depends                        |
| Jobs with complex business rules   | ✅ Yes                             |
| Platform with many jobs            | ✅ Definitely                      |
| Applications already using DDD     | ✅ Yes                             |

It's not a matter of performance.

It's a matter of maintainability.

# What do we end up gaining?

If we look back at everything we've built throughout the article, we've really only introduced three ideas.

- A factory to centralize common job configuration.
- A reusable reader that eliminates repetitive infrastructure.
- A writer that materializes the domain's actions without containing business rules.

On their own, they look like small changes.

Together, they stop infrastructure from growing at the same pace as the application.

**Traditional approach:** every job has its own reader and its own writer. Job 1, Job 2, Job 3... each with a different reader/writer pair, even though they do basically the same thing.

**Reusable approach:** all jobs share one generic reader and one generic writer. Job 1, Job 2, Job 3... all relying on the same two pieces of infrastructure.

The difference isn't about saving a few lines of code.

The difference is that, when a new requirement comes in, you usually only have to write business logic.

The infrastructure already exists.

# Conclusions

Spring Batch is an excellent framework for processing large volumes of data.

But as a project starts to grow, it's easy for infrastructure code to end up taking up more space than the domain itself.

My goal with these ideas was never to reinvent Spring Batch.

Quite the opposite.

I try to make the framework do only what it was designed for: orchestrating batch processing.

And let the rest of the decisions stay where I think they add the most value: in the domain.

With this approach, creating a new job stops being about copying classes, adapting readers and writing yet another writer almost identical to the previous one.

Most of the work simply consists of implementing a new use case.

And that, at least for me, is a good sign that the architecture is doing its job.

---

All the code from this article, along with complete examples, performance tests and other ideas that didn't fit here, is available in the [GitHub repository](https://github.com/nicovegasr/spring-batch-ddd).

If you organize Spring Batch projects differently, or found another solution to any of these problems, I'd love to read about it. There's always more than one way to build maintainable software, and comparing approaches is usually the best way to keep learning.
