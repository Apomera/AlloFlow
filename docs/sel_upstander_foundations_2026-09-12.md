# Upstander: roles and shared responsibility

Date: 2026-09-12. Eighteenth SEL enhancement pass.

## Purpose and learning design

The core Three Roles and Break the Cycle sections now offer 18 fictional examples across elementary, middle and high school. Role examples distinguish observed behavior, uncertainty, support needs and responsibility. Shared-responsibility examples explore stopping harm, accountability and follow-through. Learners can read, think or write; personal disclosure and writing are optional.

The earlier personal self-check no longer calculates role percentages. The new role examples avoid assigning a fixed identity or assumed feelings to a learner. The cycle introduction and visualization no longer ask a learner to absorb harm, suggest that experiencing harm inevitably causes harmful behavior, or make unsupported claims that punishment always fails.

The design draws on [StopBullying.gov's explanation of roles](https://www.stopbullying.gov/bullying/roles-kids-play), which emphasizes behavior rather than fixed labels, and [its guidance on supporting the children involved](https://www.stopbullying.gov/prevention/support-the-children-involved), including adult follow-through and avoiding forced peer mediation in bullying situations. These sources inform general principles; the authored examples and digital reflection sequence are design choices, not a validated intervention. Educators should identify appropriate local support and response procedures.

## How to use the examples

1. **Notice without guessing.** Read the fictional situation. Distinguish what was observed from feelings, motives, risks or preferences that remain unknown.
2. **Separate choices and responsibilities.** Consider learner options, what adults must address, and a boundary that protects access, consent or privacy. Support for a learner who caused harm can accompany accountability; the harmed learner does not owe contact or forgiveness.
3. **Check support and follow-through.** Ask whether harm stopped, access improved and retaliation was addressed. A plan that did not protect people needs review. Asking again is not a failure by the learner.

Choose one example at a time. The first disclosure starts open; the other two can be opened in any order. Compare examples through discussion or drawing as alternatives to writing. Do not require learners to identify their own role, disclose an identity, recount an incident, or act out harm. A real concern needs an appropriate adult response; completing the activity is not a prerequisite for help.

## Example inventory

### Elementary

**Roles**

- **Experiencing harm:** At lunch, classmates repeatedly use a name one child has asked them not to use.
- **Causing harm:** At lunch, a child keeps using a name a classmate has asked them not to use.
- **Witnessing harm:** A child hears repeated name-calling at lunch but does not speak in that moment.

**Shared responsibility**

- **Stop harm without carrying it:** A child who was teased earlier is now teasing someone else during a game.
- **A limit and a way to learn:** An adult stops a child from taking a classmate's supplies. The child says they did not know what else to do.
- **Check that help worked:** A teacher talks with children about name-calling. The next day the name-calling happens again away from the teacher.

### Middle

**Roles**

- **Experiencing harm:** A group repeatedly removes a student's contribution from a shared project and jokes that the student has nothing to offer.
- **Causing harm:** A student repeatedly deletes a peer's project contributions and joins jokes about their ability.
- **Witnessing harm:** A student sees a peer's work removed from a group project and hears mocking but worries that objecting will make them the next target.

**Shared responsibility**

- **Different responsibilities in the same situation:** A student who was excluded from one group begins excluding a younger student elsewhere.
- **Repair does not require a meeting:** A student offers an apology after repeatedly mocking a peer. The peer does not want to meet.
- **Support is not a courage contest:** After an incident, one witness speaks publicly and another asks a trusted adult privately for help.

### High

**Roles**

- **Experiencing harm:** A peer is repeatedly targeted with identity-based comments after an earlier request for the comments to stop.
- **Causing harm:** A student repeats identity-based comments about a peer and says the group meant them as jokes.
- **Witnessing harm:** A student witnesses repeated identity-based comments and wants to help without exposing the peer to more attention.

**Shared responsibility**

- **Address behavior and conditions:** Harassment happens repeatedly in a poorly supervised area even after individual reminders to stop.
- **Support and accountability can work together:** A student causing harm receives support from an adult while the school considers consequences under its procedures.
- **Revise a plan that is not protecting people:** An earlier intervention reduced public comments, but private messages now continue the harassment.

## Project state and earlier records

`rolesCoreSelected` and `cycleCoreSelected` store example IDs per grade band. `rolesCoreNotes` and `cycleCoreNotes` use `band:exampleID` keys with optional `notice`, `plan` and `review` strings. Switching examples, bands or hub sections preserves separate drafts. Notes remain in the current project state; users must use the hub's project save controls for durable storage and review personal details before sharing.

A valid earlier `roleIdx` or `cycleIdx` provides a fallback selection. Malformed selections and non-string notes fall back safely. Earlier `roleReflect` entries have no recorded band: the selected role's text appears in an explicitly unassigned disclosure and can be copied only by request into an empty noticing note. Existing notes are never overwritten by recovery. Original text, `scAnswers`, `scShowResults`, historical badges and other project data are retained. Old answers are not used to classify a learner. These core reflections award no XP and do not record completion.

## Scope and limits

This pass changes the core Roles and Cycle material only. The identity-harassment and other specialized role deep dives, REPAIR pathway, grounding and witness-shame extras, generated scenarios, role-play and coaching remain outside this pass. The preceding built-in Practice and Moves improvements are retained. Accessibility evidence is scoped to the two revised regions, not a whole-tool certification. No deployment or push is included.

## Validation

Validation results and screenshots are recorded in `reports/sel-upstander-foundations/validation.json`. Focused browser coverage exercises all 18 examples, optional notes, independent band/case state, serialized restoration, legacy recovery, malformed state, keyboard focus, phone layout and three-theme accessibility. The actual hub test covers returning to activities and reopening both sections.
