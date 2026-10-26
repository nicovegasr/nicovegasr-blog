# Payment labs: guided-mode UX review

Scope: the two current payment simulations, their introductory calls and optional
walkthroughs. The simulation engine and the site's shared layout are unchanged.

## Findings and changes

| Finding                                                                        | Effect on the experience                                              | Change                                                                                                                        |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Entering a walkthrough reduced the diagram width and its text sizes            | The explanation competed with the system it described                 | Both modes use the same full-width diagram; the explanation follows it                                                        |
| The initial scene highlighted storage while asking the player to start         | The visual cue contradicted the next instruction                      | Only a required configuration change receives a blue cue; live execution stays green                                          |
| A second introductory dialog followed the welcome call                         | The player had to dismiss another introduction before trying anything | Selecting the walkthrough opens its first scene directly, with execution still under player control                           |
| Explanation, next action, counters and advanced options competed for attention | The player had to decide which panel mattered                         | One short explanation and a distinct Now area; secondary metrics and advanced action settings wait until free experimentation |
| Guidance could replay its entrance animation when its content changed          | Reading the current instruction could feel unstable                   | Walkthrough updates no longer animate the explanatory text                                                                    |
| Mobile guidance and its target could be far apart                              | Following instructions required searching the page                    | View step in the transport reveals the guidance; Show this choice focuses the actual field without changing its value         |
| Naming lived in the simulation transport                                       | A cosmetic tool competed with processing controls                     | Names is above the API, or beside the payment strip inside the worker lab                                                     |
| Incident callers explained internal RAM and worker mechanics                   | Dialogue sounded like an incident report                              | Callers describe the customer's problem; the diagram and walkthrough explain its technical cause                              |

## Interaction details

- Start, Pause, Resume and Reprocess keep their existing meanings. There is one
  simulation transport. Reading a step or focusing a choice does not execute work.
- Beginning a walkthrough closes naming mode. Leaving early restores the prior
  trial and editing mode. Finishing keeps the successful configuration and jobs.
- The current task follows actual state: start, observe, retry, change a decision,
  or finish. Changing a protection back updates the guidance rather than continuing
  to describe a protection that is no longer enabled.
- The advanced worker action controls remain available in free experimentation.
  Naming stays available beside the system in either mode.
- The guide's task is announced politely; ordinary progress does not replay a
  whole narrated panel on every simulation tick. Inputs reference the current
  instruction when they are the relevant choice.
- Mobile scrolling reserves room for the sticky site header and transport.
  Reduced-motion mode uses immediate navigation to a field.

## Review evidence

The Playwright tests in `src/features/async-chaos-lab/*.e2e.ts` check the real browser flow,
including full-width diagram stability, readable explanation type, no transport
occlusion, direct walkthrough entry, contextual field focus, naming placement,
trial preservation, customer-facing calls, mobile navigation and reduced motion.
Screenshots are attached to the Playwright HTML report.

These checks establish layout and interaction behavior. Enjoyment and learning
transfer still require the reader's feedback.
