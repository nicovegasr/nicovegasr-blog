# Payment lab interface direction

A small payment-processing laboratory for readers who may not know queue terms.
Make a decision's consequence visible, then let the reader try again.

Use the existing blog palette and typography: paper/ink, the existing lime action
accent, Space Grotesk for titles and actions, Inter for explanations, and IBM Plex
Mono for IDs and state. Component accents remain blue for intake, purple for
pending storage and amber for the worker. Green identifies live work; red marks
an observed fault. Symbols and written states accompany color.

## System and guidance

The diagram keeps its geometry when entering the optional walkthrough. The guide
follows the diagram at full width, with the explanation separated from the next
action. Its text does not animate on state updates. Only a choice that currently
needs changing receives the blue guidance cue. The initial Start instruction does
not highlight an unrelated setting.

The compact transport provides processing controls, completion progress and help.
In a walkthrough, View step takes the reader to the current instruction. Show this
choice returns to the relevant field without making the decision for them.
Names belongs beside the system: above the API in the queue lab and next to the
payment strip in the worker lab. A walkthrough temporarily omits secondary metrics
and advanced action settings; they remain available in free experimentation.

## Calls and outcomes

Tutorial opens a short incoming call that points out editable choices and hints
at repeated identities without prescribing the safe configuration. Its primary
action runs the current setup. Its secondary choice starts the guided walkthrough
directly. Finishing that walkthrough preserves its results and protections.

Incident calls describe what the customer notices: a missing payment record,
a paid but inactive subscription, a missing confirmation or a duplicate charge.
They do not sound like internal incident reports. Technical causes live on the
diagram and in the guide. Customized action types use generic outcome language;
a duplicated local record never implies another real charge.

Fatal outcomes keep the darkened background and payment-ticket evidence. A native
dialog gives the player a clear focus and a way back to the system. Recoverable
incidents use a lighter scrim and explicit retry. Reduced motion removes decorative
activity and outcome animations, preserving the same evidence.

The labs contain three payments each. Their fixed action counts remain three in
the queue lab and four inside the worker. The three rejected catalogue prototypes
have been removed from source and localized routes. The external-effect/checkpoint
uncertainty case is retained in engine tests, outside the first two labs' main UI.

See the [guided-mode UX review](ux-review.md) for the interaction findings and
their browser checks.
