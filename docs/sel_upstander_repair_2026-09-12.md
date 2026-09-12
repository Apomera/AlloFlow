# Upstander: repair planning with consent and follow-through

Date: 2026-09-12. Nineteenth SEL enhancement pass.

## Purpose

The repair pathway inside Break the Cycle now uses six fictional situations, two per grade band. Six revisitable questions replace the mandatory step sequence. Each question combines age-banded guidance, a case-specific application and an optional note. The activity does not require a learner to identify as someone who caused harm, confess, disclose personal experiences or contact another person.

The earlier sequence sometimes urged a direct apology or public correction, inferred motives, prescribed prolonged self-reproach, and awarded a badge on completion. The revised pathway separates changed behavior from forgiveness, contact and friendship. Reading, writing, closing the guide and requesting adjacent apology feedback no longer award repair or rehearsal XP. Existing historical badges remain in project data.

## Pedagogical basis and boundaries

[StopBullying.gov's support guidance](https://www.stopbullying.gov/prevention/support-the-children-involved) assigns responsibilities to adults, includes teaching and practical repair, and emphasizes continued follow-through. It cautions against forced peer mediation when power is unequal. Its [immediate-response guidance](https://www.stopbullying.gov/prevention/on-the-spot) prioritizes safety and advises against forcing apologies or reconciliation on the spot. These general principles inform the authored examples; they do not validate this activity or predict its effects.

Educators should identify appropriate local adults and response procedures. Real safety concerns require a response without waiting for a worksheet. Support for a learner who caused harm can accompany clear limits and accountability; the affected learner is not responsible for their comfort or progress. An apology can remain unsent. Silence, refusal and no-contact boundaries do not authorize a different route through friends or another channel.

## Six questions

1. **Stop harm and get support:** identify what must stop and who can help.
2. **Name behavior and known impact:** distinguish actions and supported facts from assumptions about intention or feelings.
3. **Check contact and consent:** consider whether contact is wanted and permitted; respect separate conversations and no-contact boundaries.
4. **Choose a practical repair:** match restoration to the actual harm and check for further exposure or pressure.
5. **Practice a different response:** prepare for a specific situation with appropriate support, including changes adults need to make.
6. **Review what changed:** specify who checks, when, and what evidence matters. An accepted apology or a thank-you does not show that ongoing harm stopped.

Use reading, thinking, discussion or drawing as alternatives to writing. The questions can be opened in any order and revisited as information changes. Do not use the number of completed notes as a measure of remorse or successful repair.

## Fictional cases

### Elementary

- **An unwanted nickname:** A child keeps using a nickname after a classmate asks them to stop. The classmate now wants space.
- **Taking supplies during art:** A child has repeatedly taken a classmate's art supplies without asking. One brush is damaged. The child wants to give the classmate a present.

### Middle

- **A rumor and an unwanted message:** A student repeated an unverified rumor in a small group. The peer affected has asked for no messages. The student proposes a public apology post.
- **Restoring a teammate's work:** A student repeatedly deleted a teammate's contributions and claimed the work as their own. The teammate wants the teacher's help and declines a joint meeting.

### High

- **Repair without further disclosure:** A student shared a peer's private identity information in a group chat without permission. The peer asks for no contact and fears a public correction would spread it further.
- **An apology accepted, harm continuing:** A student organized repeated exclusion from a club. They apologized and the peer accepted, but other members still block the peer from activities.

## Project state and compatibility

`repairCaseSelections` records a situation ID per band. `repairDrafts` stores optional string notes at `band:caseID`, keyed by `stop`, `name`, `contact`, `repair`, `practice` and `review`. Notes survive selection changes, band changes, closing, hub return/reopen and serialized restoration. The hub save controls provide durable project storage; the tool itself updates project state. Review personal details before sharing.

`repairOpen` remains the saved open/closed state. A bounded, nonnegative integer `repairStep` is retained only as a fallback for the initially expanded question; it is not treated as completed work or assigned a note. Invalid selections and malformed drafts fall back safely. Existing apology drafts, feedback and badges are preserved. Closing returns keyboard focus to the opening button and does not award completion.

## Adjacent apology feedback

The existing optional AI feature now asks for a fictional situation and explains that an explicit feedback request sends the situation and draft to the configured service. Its prompt avoids predicting the recipient's response and requires respect for no-contact directions, privacy and uncertain impact. No apology is sent to a recipient. The feedback request no longer awards rehearsal XP. Existing safety pre-checks and crisis-resource rendering remain in place. Tests use a stubbed provider; no live AI output quality or network service was certified.

## Scope and validation

The repair guide is the scope of the phone accessibility scans. The adjacent AI feature received wording, prompt and reward changes, not a complete visual or accessibility redesign. Other specialized role/cycle deep dives, grounding, witness-shame content and generated activities remain outside this pass.

See `reports/sel-upstander-repair/validation.json` for exact checks and screenshots. Focused browser coverage exercises all six situations and 36 case/question combinations, independent notes, recovery of earlier state, keyboard focus, three-theme phone layouts and an explicit stubbed AI request. The actual hub workflow verifies close, return and reopen. No push or deployment is included.
