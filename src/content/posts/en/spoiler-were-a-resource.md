---
title: "Spoiler: we're a resource"
publicationDate: 2026-08-30
summary: "A personal reflection on autonomy, leadership and the place of those who build software in a market where AI makes generating code increasingly cheap, while judgment remains expensive."
tags: ["reflections", "artificial-intelligence", "industry", "career"]
translationSlug: "spoiler-somos-un-recurso"
---

I want to open up an interesting can of worms, and I'd love to hear what other people think about it.

Part of me is writing this to vent. Another part because I've been noticing a pattern for a while now, one I wish didn't exist. But, spoiler: it does.

The title says it all.

**We're a resource.**

When I started working in corporate IT a few years ago (the kind where you actually work for a living, I mean), I had the good and bad fortune of doing my internship at Lean Mind.

I remember sitting down without knowing what a kata was and, all of a sudden, searching a `String` for patterns with a regular expression.

I remember one of my colleagues sitting next to me and starting a pair programming session:

—How would you extract the text between `[]` from a `String`?

It was a kata with a simple problem, and we ended up designing, debating and thinking through a thousand different ways to solve it.

I had never had so much fun.

Not simply programming, but actually thinking about the solutions, considering every case we could come up with and discussing different ways to approach the same problem.

Until then, I knew I liked computer science.

What I didn't know was how much I liked programming.

That was the good fortune.

It took me a little longer to understand the bad.

Lean Mind was my first reference for what working in software development looked like. The problem with having a good first reference is that you risk thinking it's the norm.

Then you go out into the world.

And discover that **it's cold out there**.

Some time later, I remembered something another Lean Mind colleague had said in a talk while I was still studying: having bad bosses matters because they teach you to appreciate the good ones.

At the time, I thought it was an interesting reflection. Once I started working, I understood it much better.

Having worked somewhere where people genuinely cared about what they built was a great piece of luck. It also meant entering the market expecting to find the same thing everywhere.

And that isn't always the case.

Out there, you also find burned-out people waiting for the day they get fired so they can stop dealing with micromanagement, impossible timelines and priorities that change every week.

After moving through different projects and organisations, you start to recognise certain patterns.

## Autonomy until something goes wrong

There's one pattern in the corporate world that I find particularly interesting.

When everything is going well, many teams live in limbo. Nobody leads, nobody manages, and some decisions never seem to get made. Even so, the team pushes on, solves problems and keeps things running.

As long as it works, we call that autonomy.

*Ownership.*

*Self-managed teams.*

The problem is that autonomy doesn't mean leaving a team to fend for itself.

An autonomous team needs context, clear priorities and someone to make the decisions that don't belong to the team itself. Without that, you don't have autonomy. You have a group of people trying to move a project forward while guessing what the organisation expects from them.

But while things are getting done, nobody seems too concerned.

Until a deadline arrives and the project isn't ready.

Then the leaders appear.

Suddenly, we need meetings, explanations, visibility, tracking and metrics. People who trusted the team's autonomy completely until yesterday start asking how we could possibly have ended up here.

And, of course, the micromanagement begins.

The interesting part is how often we manage to swing from one extreme to the other without ever stopping in the middle. First, we confuse autonomy with managing nothing. When that stops working, we try to fix it by controlling every move people make.

Meanwhile, the team is left wondering when we went from “you're the experts” to having to explain what we did yesterday, what we're doing today and why something that has been blocked for months is still blocked :).

And somehow, everyone ends up feeling responsible except the people whose job was precisely to manage the project.

**When someone needed to lead, we were autonomous. When someone needs to take the blame, we're resources.**

And this is where the two ideas begin to connect.

## We were always resources

IT professionals have been a scarce resource for years.

I think that allowed us to forget a fairly simple truth for a while:

**We were always a resource.**

For years, changing jobs frequently has carried a certain stigma. It doesn't matter if you've landed in hell: stick it out. What will the next company think if you leave again? How will you explain staying for only a year?

As if leaving an environment that gives you nothing—or is even beginning to affect your life outside work—were some kind of professional betrayal.

Meanwhile, companies do what makes sense for them.

And that's fine.

They're companies.

If a division stops being profitable tomorrow, a project disappears or keeping a particular team no longer makes business sense, someone will run the numbers and make a decision.

Maybe the problem was that we thought the relationship was something else.

For a long time, we were an expensive resource, yes. But above all, we were **a scarce resource**.

We're still expensive, but we're beginning to look less scarce and, to some companies, far more disposable.

And yes: AI is here to stay.

## What happens now?

I don't know where this revolution will take the world of software.

At least from where I'm standing, the market is tighter and more selective than it was a few years ago. I don't know how much of that we can really attribute to AI, how much comes from the economy and how much is the correction of a market that spent years hiring as if it would grow forever.

It's probably a mixture of all three.

And, to be honest, I don't necessarily think demanding more qualified people is a bad thing.

Anyone who has worked for a while has met leaders who don't lead, developers who don't develop and analysts who don't analyse. We've also met brilliant people holding entire projects together with barely anyone noticing.

I haven't been around that long myself, and I've already seen a bit of everything.

What interests me isn't only that the market is demanding more. It's **what we're going to consider qualified**.

Because writing code was never our whole job.

And now it's an even smaller part of it.

An AI can generate an implementation in seconds. It can write tests, explain a repository, find bugs, suggest a refactor or build the foundations of an application before you finish your coffee.

That's a reality. Pretending it isn't happening won't make it go away.

But an implementation isn't necessarily a solution.

Someone still has to decide what to build, understand the problem and talk to the people who actually have it. Someone has to understand the trade-offs we're making, what will happen when something fails and how much changing it will cost two years from now.

We still need to understand production, data and the business.

And, above all, we still need to know when we **don't** need Kafka for a CRUD application.

AI can help you write the ten services, their abstractions, the tests and the Kubernetes manifests. The problem is that you don't always need ten services, all those abstractions or a Kubernetes cluster.

Generating code has never been cheaper.

Judgment remains pretty expensive.

## Code or solutions

I think that over the next few years we'll see an increasingly clear divide between two kinds of organisation.

There are companies that want to produce code.

And there are companies that want to build solutions.

The first group may discover that generating code has never been cheaper. Ask an AI for another layer, another abstraction or another five services, and you'll have them in seconds.

The second group has a much harder problem.

Because a maintainable solution isn't simply code that compiles. Nor is it an architecture diagram full of impressive names.

It's understanding the domain, knowing which trade-offs you're making and designing something that can keep working when a dependency goes down, more users arrive than expected or the person who wrote the code is no longer at the company.

It's also observability, resilience and high availability when the problem genuinely calls for them.

And simplicity when it doesn't.

Because no, a CRUD application doesn't need Kafka.

For years, we've talked about technical debt as something we'd pay “in the future”. Now I'm curious to see what happens when generating even more code takes seconds.

Until now, adding complexity came with at least some friction. Someone had to write it, test it and maintain it. That friction didn't stop us from building monstrosities, but it did mean somebody had to spend time on them.

AI greatly reduces that initial cost, but it doesn't remove the cost of understanding the result, running it in production or changing it two years from now.

Maybe some companies will discover that AI hasn't eliminated their technical debt. It has simply allowed them to generate it at a speed that used to be impossible.

And then the bill will arrive.

It won't just be the AI provider's bill. It will be the cost of maintaining thousands of lines of code that nobody fully understands, produced to solve problems that perhaps never needed that much code.

## Less scarce resources

Maybe a few years from now I'll read this again and discover I was completely wrong.

Perhaps we'll end up with AI systems developing autonomously, deploying and maintaining production systems around the world while we watch from home.

In that case, it'll be time to get a degree in AI.

What else can you do?

As long as computers exist, I suspect we'll find some way to keep breaking them.

But for now, I think we're exactly where we've always been.

**We're resources.**

We always were.

The difference is that perhaps we're less scarce now.

That doesn't mean knowledge has stopped mattering. It may mean exactly the opposite: when writing code stops being the barrier, everything that surrounded the code starts to matter much more.

Understanding why we're building something.

Knowing when to say no.

Choosing a simple solution even when the complicated one looks better on the diagram.

Spotting that something is going to blow up before it does.

Understanding that a system doesn't end when we merge.

And genuinely caring about what we're building.

The problem is that judgment isn't as easy to measure as closed tickets, generated lines of code or the headcount reduction someone can put in a spreadsheet.

And, as has always been the case, managers will often be the ones deciding who has that knowledge, who provides value and who is disposable.

We'll see which companies care about building quality teams and products.

Which understand AI as a tool for multiplying those teams' capabilities.

And which try to ride the wave by cutting costs until they discover they confused generating code with building software.

I don't know who will ride it perfectly and who will fall along the way. Nor do I know whether we'll reach a point where AI can do everything for us.

For now, as long as computers exist, software is still alive.

And we'll keep building.

Because, spoiler:

**we're a resource.**

But resources were never all the same.
