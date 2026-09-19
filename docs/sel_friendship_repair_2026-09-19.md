# Friendship Workshop: repair, boundaries and next steps

The Repair tab now supports deciding what repair could involve instead of presenting a fixed sequence that assumes reconciliation. Its previous text sometimes assumed shared responsibility, equated an unsteady voice with inability to communicate, and encouraged vulnerability without checking whether contact was wanted. Those claims and the step carousel are replaced with optional, contextual practice.

## Learning design

Three fictional contexts have separate elementary, middle and high-school setups and example language: a missed plan, taking responsibility for sharing private information, and repeated pressure. Each distinguishes observations from uncertain motives, offers example words with explicit limits, and introduces a changed circumstance to reconsider. A separate own-example context supports transfer without requiring personal disclosure.

The activity distinguishes responsibility for an action from accepting someone else's blame. An explanation does not automatically make an agreement workable. Apologizing, forgiveness, rebuilding trust and reconnecting are separate choices. A no-contact request can be respected while practical repair begins; example language is not an instruction to send another message. Communication does not require a particular tone, eye contact or emotional presentation.

Routes include inviting a conversation, taking or respecting space, seeking adult support, and remaining undecided. Repeated pressure starts with support and excludes direct-talk rehearsal, including from malformed or older saved selections. The own-example guidance asks learners to seek support for threats, repeated pressure or fear of retaliation; the tool does not classify a personal situation or assess risk automatically.

Five optional notes cover observations/uncertainty, responsibility, boundaries/support, a possible action and evidence for revising the plan. Changing a route keeps the notes. Native disclosures reduce the initial reading load. A read-only plan preview contains only the current context's notes and route and identifies the plan as a draft, not evidence of reconciliation.

## Sources and limits

[StopBullying.gov: Respond to Bullying](https://www.stopbullying.gov/prevention/on-the-spot), reviewed September 19, 2026, advises adult involvement, hearing accounts separately and avoiding forced apologies or immediate reconciliation when responding to bullying. This informs the repeated-pressure example's support-first approach. The scenarios and other instructional wording are authored practice materials, not a validated relationship assessment or a guarantee that a conversation will succeed.

## State and accessibility

`repairSelections[band]` remembers the context. `repairDrafts[band:context]` stores optional notes and route. Guards recover from malformed new containers and values; unknown draft properties are retained. Existing `repairIdx`, journal, coach and digital-activity records are not migrated or overwritten. The repair activity sends no provider requests, awards no points and creates no completion or reconciliation claim. Notes are not monitored and do not request help.

The interface uses labeled native selects and textareas, keyboard-operable disclosures, a polite route explanation, 44px controls, 16px input text and explicit light/dark/high-contrast surfaces. Canonical and public modules remain byte-identical. Focused tests exercise context/grade separation, remounting, legacy preservation, keyboard interaction, support restrictions and three 320px themes. A real-hub regression covers leaving and reopening the activity.

Validation and commit status are recorded in `reports/sel-friendship-repair/validation.json` after checks finish. No push, deployment or packaged build is included.
