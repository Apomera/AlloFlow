# Conflict Resolution: apology and repair depth

Updated 2026-09-12.

Open Conflict Resolution and choose **Apology Lab**. This is the starting tab when no saved tab is selected. The existing 15 scenarios have been revised, with five in each grade band. This pass changes the activity itself: it replaces compulsory writing and a completion button with optional practice, case-specific drafts, realistic repair, and follow-through after a response that includes limits.

## Teaching sequence

1. **Check the case and its boundary.** Read the fictional situation and distinguish the action being owned from rights to privacy, space, support, or ending a relationship.
2. **Choose how to practice.** Rehearse an optional message, practice without contacting anyone, or plan trusted support. Changing the route keeps the writing. No action sends a message or contacts another person.
3. **Compare a model and its limits.** Five parts provide language for naming the action, owning a proportionate responsibility, acknowledging impact without mind-reading, offering an achievable repair, and planning a change. These are possible components, not a required script or a guarantee of healing.
4. **Draft only what is useful.** Writing is optional; discussion, drawing, signing, AAC, or private thinking can substitute. A repair-only draft is valid and appears in the preview. The preview preserves line breaks and does not certify an apology as complete.
5. **Follow through.** Reveal a fictional response, including requests for space, no contact, less publicity, or practical correction. Plan an action within the learner's control and a way to check it. An optional example shows how to respect the response without requiring forgiveness or reassurance.

## Nuance to discuss

- **Responsibility is specific.** Own an action without using character labels, accepting all blame in a conflict, or apologizing for a legitimate boundary.
- **Impact is not mind-reading.** Use the person's stated experience or an observable effect. Do not require them to disclose more or persuade someone that the impact counts.
- **Repair is an action, not an entitlement.** A correction, changed routine, or stopped behavior can matter even without renewed friendship or an accepted apology. Avoid promises about grades, complete erasure of posts, or another person's response.
- **Contact is a choice, not a requirement.** Private practice and support are available. Do not turn a repair into repeated messaging, a public apology that amplifies private details, or a forced meeting.
- **Safety support differs from gossip.** Do not promise absolute secrecy when someone may be unsafe or suggest that appropriately seeking trusted help itself requires an apology.
- **Bullying needs a different response from ordinary peer disagreement.** Repeated targeting and power differences should not be handled through forced peer mediation or equal blame. This distinction is informed by [StopBullying.gov's guidance on supporting children involved](https://www.stopbullying.gov/prevention/support-the-children-involved). The focus on responsive repair also draws on [CASEL's restorative-practices and SEL alignment guidance](https://schoolguide.casel.org/resource/restorative-practices-and-sel-alignment/). These sources guide the design; they do not evaluate this implementation.

## Revised scenario coverage

| Band | Scenario | Boundary or follow-through emphasis |
| --- | --- | --- |
| Elementary | The broken promise | A repair cannot guarantee a particular seat or require someone to sit with you. |
| Elementary | The harsh words | Returning to play, accepting an apology, or forgiving you are not required. |
| Elementary | A smaller party | Nobody owes every friend an invitation or private family information. The repair here concerns the untrue explanation. |
| Elementary | Needing a quiet day | You can decline an invitation without giving personal details. If saying no feels unsafe, get trusted support. |
| Elementary | The next round | Inclusion should not require forced friendship, an unwanted game, or one person always giving up a turn. |
| Middle | The public joke | A public apology can repeat the harm or draw more attention. Ask about preferences when possible, without making repair depend on a reply. |
| Middle | The shared secret | Do not promise absolute secrecy about safety concerns. Sharing necessary information with trusted support is different from spreading gossip. |
| Middle | The hurtful screenshot | You may seek confidential support about a difficult relationship. Accountability does not mean promising to talk only to the person involved. |
| Middle | The missed project work | You cannot guarantee a grade change or make the partner accept more collaboration. |
| Middle | Joining a pile-on | Repeated targeting and power differences call for adult support, not forced peer mediation, equal blame, or a group apology meeting. |
| High | The repeated accent comment | Do not make the affected person responsible for educating you, tracking your improvement, or reassuring you that you are a good person. |
| High | A dismissed request | An apology does not require either person to accept unwanted contact, abandon boundaries, remain in a relationship, or attend counseling together. If there is fear or control, seek individual trusted support. |
| High | Credit for an idea | Do not require the classmate to join an apology meeting or include them in messages without checking. You can correct your own attribution without asking them to do the work. |
| High | Privacy and necessary support | Do not apologize for appropriately seeking help with danger. You do not need permission to get necessary safety support; share only what is needed with someone able to help. |
| High | A friendship ending | No one owes renewed contact or a face-to-face conversation when there is fear, coercion, harassment, or a request for no contact. Closure cannot be guaranteed. |

## Facilitation

For a short practice, read one model and ask which action it owns and which outcome it cannot promise. For more depth, invite a draft, reveal the fictional response, and compare the proposed next action with the boundary stated in that response. Ask how a person could check their own behavior without measuring the other person's forgiveness or emotional state. Learners can keep or revise their idea and explain why.

Avoid using these scenarios to require a real apology or contact between students. A learner can work privately on accountability, and a person who experienced harm can decline involvement. Use locally appropriate adult support where safety or power differences matter. The tool does not assess whether a real relationship is safe or decide responsibility in a real incident.

## Drafts and compatibility

New drafts are stored in the existing tool/project data under `apDrafts`, keyed by scenario ID. The five drafting fields, practice route, support note, response reveal, follow-through note, and self-check remain separate. `apSelected` keeps the selected scenario for each grade band. Switching cases, routes, or tabs retains writing; the Hub save/export flow is needed to keep a project copy. Updating tool state is not proof that a file was written.

Older flat drafting fields are shown in an **earlier unassigned draft** disclosure. They lack a reliable case/grade-band link, and some revised cases have changed framing. The learner explicitly chooses whether to copy those words into the current case. Copying fills only blank fields, keeps existing writing, and preserves the earlier copy. There is no automatic reassignment or deletion. Existing completion totals and badges remain stored; this new workflow does not award XP, increment those totals, or treat navigation as completion.

Unknown scenario IDs fall back to a valid scenario, invalid route IDs act as no selection, and non-string note values display as blank. Legacy scenario indices are bounded before use.

The canonical implementation and authored models are in `sel_hub/sel_tool_conflict.js`, mirrored to `desktop/web-app/public/sel_hub/sel_tool_conflict.js`.

## Validation and remaining scope

**Validation:** 567 existing checks and 23 browser workflows passed, with two existing regression skips. All three scoped axe audits returned zero violations, and dark/high-contrast phone layouts were visually reviewed. Existing badge-dialog and worker-start timeouts were resolved through separate reruns; the first mobile locator was narrowed to its named fieldset. All 72 tools passed final initial-render checks. Results and evidence are archived in `reports/sel-conflict-depth/validation.json`. Focused tests use the actual renderer with simulated callbacks and check all 15 models, boundaries and follow-through examples; optional writing; a repair-only preview; draft isolation and serialized restoration; legacy recovery without overwriting; keyboard focus; and 320 px layouts in three themes. Actual hub return/reopen behavior is checked separately.

The other Conflict Resolution tabs, older repair prompts, quizzes, AI mediation and role-play are outside this pass. The checks do not validate real project-file round trips, packaged Desktop, live assistive-technology sessions, classroom outcomes, or clinical effectiveness. No deployment was performed.
