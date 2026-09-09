# SEL hub UI, UX, and pedagogy review — September 8, 2026

Implemented and verified locally. No push or deployment.

## Scope and approach

Reviewed the shared hub, its 72-tool catalog, search, launch routes, eight curated pathways, progress semantics, onboarding, educator guidance, and the coping library's movement/breathing explanations. Existing historical review notes were checked against current source rather than treated as an active backlog. The current implementation, existing regression suites, real Chromium interactions, and rendered screenshots informed the changes.

This is a focused implementation review of the shared experience and selected learning content, not a clinical validation or an exhaustive review of every state in all 72 tools. The browser harness mounts the real hub and all real SEL plugins with AI disabled and stubbed host callbacks; packaged Desktop, cloud services, and live teacher sessions are outside its scope.

## Findings and changes

| Finding | Implemented change |
| --- | --- |
| Opening a pathway tool was labeled completion. | Progress now reports tools opened. Reopening does not inflate the count. No claim of mastery, assessment, or completed practice is made. |
| Pathways were filtered catalogs without an explicit learning cycle. | All eight now include a practice goal, example, rehearsal invitation, reflection, and an everyday transfer prompt. The guide remains available inside a pathway activity. |
| Pathway cards followed catalog category order, contradicting their suggested sequence. | Cards follow the authored pathway order, with numbered, textual opened/not-opened indicators and direct next-option navigation. Starting a pathway focuses and reveals the guide; exiting from a tool restores tool focus. |
| Students had no shared way to indicate that a strategy did not fit. | Optional, ungraded self-checks offer “I tried a step,” “I need another way,” and “Pass for now,” with actionable feedback. These choices stay in memory for the current pathway session, are reset for a new pathway, and create no new export or AI payload. |
| Catalog descriptions and labels were frequently 9–11 px, with bright accent colors used as small text. | Primary card descriptions are 14 px, compact card labels 12 px, launch/search text 13–14 px, and small colored labels use theme-aware foregrounds. Need and category controls have 44 px targets. |
| Browsing exposed a long row of specialist category controls. | Skill-area filters are grouped in a native disclosure. Search has a visible label. Existing need shortcuts, result announcements, and the skip-to-list control remain available. |
| Practice Journeys was missing search synonyms and duplicated MAPS' icon. | Added everyday journey, story, scenario, rehearsal, and support-search vocabulary; gave its catalog card a distinct book icon. |
| Coping exercises asserted hemisphere integration, guaranteed effects, and self-administered EMDR mechanisms. | Revised 49 explanations and labels across cross-body movements, drawing, breathing, tapping, and coordination practice. Kept useful exercises, added adaptation/stop/observe choices, and separated self-guided practice from claims about trauma treatment or generalized academic benefit. Activity IDs and saved-state structures remain unchanged. |
| Onboarding claimed closing the tab erased all work, while some data uses local storage. | Replaced absolute ephemerality claims with an explanation of activity-dependent storage, export, shared-device considerations, and configured services. |
| The embedded educator guide was older than its canonical Markdown document and contained contradictory data-flow claims. | Synchronized the in-app/public copies, clarified prompt context and browser excerpts, and removed promises that every flagged input pauses the activity or produces an identical alert. Added a drift regression test. |

## Pedagogical rationale

The pathway cycle applies CASEL's emphasis on explicit goals, connected learning, active practice, and opportunities to use skills beyond a lesson. The model and reflection prompts are authored scaffolds, not a claim that the hub is an evaluated SEL curriculum. [CASEL: Explicit SEL Instruction](https://schoolguide.casel.org/focus-area-3/classroom/explicit-sel-instruction/).

Multiple response modes, optional disclosure, and feedback that supports changing strategies apply CAST's emphasis on learner agency and accessible reflection. No particular emotional state is treated as the required outcome. [CAST: Promote individual and collective reflection](https://udlguidelines.cast.org/engagement/emotional-capacity/reflection/).

The movement revisions remove unsupported explanatory leaps rather than substituting a new brain mechanism. EEF highlights the need to distinguish educational neuroscience from neuromyths; NCCIH describes variable findings and limitations for yoga and related practices. These sources do not validate the hub's individual routines. [EEF: Neuroscience in education](https://educationendowmentfoundation.org.uk/news/eef-and-wellcome-trust-announce-6-million-neuroscience-round), [NCCIH: Yoga effectiveness and safety](https://www.nccih.nih.gov/health/yoga-effectiveness-and-safety).

## Verification

Validation: **469 regression tests passed, two skipped; six Chromium workflows passed; all 72 tools passed initial-render checks.** Focused axe checks found no contrast or labeling violations in the tested catalog and guide states across light, dark, and high-contrast themes.

The archived summary is `reports/sel-hub-review/validation.json`. Local (git-ignored) run logs are recorded in `reports/sel-hub-regression-run.log`, `reports/sel-hub-browser-run.log`, and `reports/sel-render-review.log`. Browser screenshots and focused axe reports are in `reports/sel-hub-review/`.

The browser suite exercises real opening, next-option navigation, repeat visits, optional self-checks and passing, reset between pathways, all eight sequences, search, keyboard activation, 320 px layout, 44 px guide buttons, and light/dark/high-contrast catalog labeling and contrast. It does not claim whole-application WCAG conformance or test an AI response.

Manual visual review covers the desktop catalog, phone catalog and pathway, and high-contrast pathway. Source/public mirror parity, JavaScript syntax, and scoped whitespace checks are required before handoff.

## Remaining boundaries

- The larger clinical/physiological content library still warrants a separate subject-matter review. The historical review queue includes broader consent, retention, and evidence-rating questions; this change does not certify those resolved.
- Individual activities retain their existing evidence tiers and clinical safeguards. A framework-alignment badge is not proof that a specific activity is effective.
- New pathway scaffolds follow the hub's existing English content pattern; a full localized content pass and educator/learner usability feedback remain valuable.
- Source/public assets are updated; installed Desktop packages require a future build/release to include them.


## Second enhancement pass: station practice and reflection

Custom stations now carry their activity navigation and reflection steps into the selected tool. Learners can switch activities without returning to the catalog, and the station catalog follows the teacher-authored tool order. Opening a station focuses its guide; exiting restores an appropriate focus target.

New teacher-launch reflections and all three custom presets use an explicit learner self-check. Their existing `freeResponse` schema carries `params.selfCheck: true`; optional notes and completion/passing state reuse the existing station progress records. Typing enough characters does not complete these new reflections. Learners may think, draw, speak, sign, or use AAC, mark a step complete without entering personal text, pass separately from completion, and reopen a step without losing their note.

The Daily Check-In and Reflection Deep Dive presets now follow notice/practice/reflect/transfer steps rather than awarding completion for accumulated XP or elapsed time. Repair Pack uses fictional, low-stakes disagreements and offers support planning without requiring contact, disclosure, or forgiveness.

Existing saved XP, time, and length-target tasks retain their criteria. Their displays now describe those quantities as activity records rather than measures of learning or wellbeing. Written reflections remain editable after reaching a legacy length target. No new destination or AI call was introduced; station notes and status continue to use existing local/project persistence. The new self-check interface requires this updated hub version.

The station guide uses legible type, wrapping controls, native disclosures, 44 px buttons, and theme-aware colors. Browser coverage exercises voluntary blank completion, reopening, passing, long notes that do not auto-complete, legacy completion with continued editing, tool switching, serialized save/reload, teacher launches, all three custom presets, and 320 px views in light, dark, and high-contrast themes. Station screenshots and axe results are stored beside the original captures in `reports/sel-hub-review/`.

Second-pass validation: **156 regression tests, 12 Chromium workflows, and all 72 initial tool renders passed.** The station guide had zero violations in the focused contrast/label checks across three themes. Source/public parity, syntax, and scoped whitespace checks passed. The archived summary is `reports/sel-hub-review/validation-stations.json`; detailed local logs use the `reports/sel-hub-stations-` prefix.


## Third enhancement pass: adaptable station authoring

Saved stations now offer **Adapt a copy**. The builder clones the activity sequence and prompts into a draft with fresh step identifiers. Saving creates a separate station; original instructions, learner notes, and completion records remain attached to the original. Cancel discards the draft.

Teachers can add practice or reflection steps, edit titles and reflection prompts, associate a step with an included activity, and move both activities and steps earlier or later with named buttons. Step editors use native disclosures, visible field labels, and 44 px controls. Newly added steps open and receive focus. New reflection steps offer optional writing and explicit completion/passing; author guidance encourages modeling, response choices, and transfer to another situation.

Copied legacy XP, time, and writing targets remain visible. Teachers can explicitly convert a copied step to a learner self-check, preserving its reflection prompt. Timed steps require a selected related activity before saving so removing an activity cannot produce an unreachable time requirement. XP targets are labeled as cumulative, including earlier activity. No original criterion is rewritten by adapting a copy.

Third-pass validation: **156 regression checks passed across the main run and the corrected accessibility recheck; all 17 Chromium workflows passed; all 72 tool renders passed.** After the final disabled-button styling adjustment, the five affected authoring workflows passed again. Builder contrast/label audits found zero violations in light, dark, and high-contrast themes at 320 px. Visual review covered all three editor themes. Syntax, mirror parity, and scoped whitespace checks passed. Browser coverage adds draft cancellation, original-record isolation, keyboard ordering, edited-prompt persistence, step addition/removal, save/reload, explicit legacy conversion, timed-step validation, and mobile authoring contrast and labels in three themes. The change is local; nothing has been pushed or deployed.

The archived authoring summary is `reports/sel-hub-review/validation-authoring.json`; detailed local logs use the `reports/sel-hub-authoring-` prefix.


## Fourth enhancement pass: recovery, discovery, and adaptable instruction

Added station-removal undo, step-removal undo that preserves later edits, recoverable local authoring drafts, and guards against replacing an unfinished draft. Local storage failures for hub stations, progress, checkpoints, artifacts, and drafts are now visible with retry. Project save requests are explicitly distinguished from confirmed file saves. Full data reset clears recovery state. Drafts are device-local until saved as stations.

The activity chooser uses explicit goal, time, and response choices, explains suggested first steps, and handles no-match combinations. It does not infer emotions or call AI. A suggested duration describes a first step, not a full-tool completion time. Eight pathways now have 24 authored examples across elementary, middle, and high school, with learner-selectable levels. Shared activity support offers alternative ways to practice and a consistent return control while explaining that offline responses do not submit a form.

Evidence badges now describe research on the approach and explain the limits of transferring results to a digital adaptation. Two catalog descriptions that overstated treatment/program equivalence were narrowed. The educator guide and embedded copy explain the new behavior. The implementation applies the choice and contextual-fit principles in [CAST guidance](https://udlguidelines.cast.org/engagement/interests-identities/choice-autonomy/) and [CASEL program selection guidance](https://schoolguide.casel.org/focus-area-3/school/adopt-an-evidence-based-program-for-sel/); those sources do not validate this implementation.

Fourth-pass verification: **156 regression checks and 30 distinct browser workflows passed across the final main runs and focused rechecks; all 72 tool renders passed against the final code.** The last browser failure came from a test that did not open the saved-entry history; the corrected keyboard save/reopen/history journey passed. Journal history now has descriptive saved-entry and return labels with 44 px controls. Chooser contrast and label audits found zero violations in light, dark, and high-contrast phone layouts; all three layouts and the saved journal view were visually reviewed. A concrete walkthrough for classroom, assistive-technology, packaged Desktop, and configured-service verification is in `docs/sel_hub_classroom_validation_plan.md`. Real classroom observations, population-specific evidence review, and complete interaction audits of all 72 tools remain outside the isolated browser harness.

Archived results: `reports/sel-hub-review/validation-recovery.json`. Packaged-app and classroom observations are still pending; the isolated harness uses simulated host callbacks and does not evaluate every interaction or research claim in all 72 tools.


## Fifth enhancement pass: revisable journal reflections

The journal now supports revising a saved entry, canceling a revision, and returning to a separate unfinished writing draft without overwriting it. Saving a revision preserves the original prompt, timestamp, and unknown entry fields, adds an updated timestamp, and does not award additional XP or badges. A stale revision cannot overwrite an entry whose original text or timestamp changed. Existing entries remain compatible; revision state uses the existing tool/project data path. This is an editable reflection, not a version-history archive.

Drafts keep their prompt when learners browse alternatives. A clearly named action explicitly attaches a different displayed prompt without replacing their writing. Restored legacy drafts acquire a prompt association when edited or when the prompt carousel is used.

Optional reflection help offers notice, practice, reflection, and transfer questions plus an age-adapted fictional model. It invites learners to use one step, pass, or respond away from the form, without requiring personal disclosure or a changed emotional state. The design applies [CAST guidance on modeling and scaffolds for reflection](https://udlguidelines.cast.org/engagement/emotional-capacity/reflection/); it does not establish the journal's effectiveness.

The journal tab's older research note also no longer prescribes writing about difficult experiences or implies guaranteed health gains and a brain mechanism. Its replacement emphasizes learner choice and brief or fictional reflection.

The editor and revision fields have visible labels and 16 px text. Journal mode controls, prompt navigation, and revision actions use at least 44 px targets; controls wrap on narrow screens. History navigation and revision save/cancel restore keyboard focus after React commits. The hub delayed-launch helper now respects focus already moved into the destination, with deterministic tests for removed launch cards, history headings, and typing. Saving feedback distinguishes an in-activity entry from a saved project copy.

Validation: **441 existing regression checks passed (two skipped); the final run passed seven journal browser workflows and three deterministic focus tests. All 72 initial tool renders passed.** The existing regressions ran before the final focus refinement; that behavior was verified separately in the final run. Six focused writing/revision axe audits returned zero contrast or label violations. Corrected phone screenshots were visually reviewed; syntax, source/public parity, and scoped whitespace passed. Archived results: `reports/sel-hub-review/validation-journal.json`. Focused browser checks cover prompt association, explicit reassignment, cancel/save, blank revisions, separate drafts, serialized restore, stale-revision protection, the previous save/reopen journey, and 320 px writing/revision states in three host themes. The existing hub deliberately uses a dark journal surface in both light and dark themes; high contrast uses black/yellow. Broader journal analytics, AI responses, and installed Desktop behavior are outside this pass.


## Sixth enhancement pass: optional check-ins and truthful energy summaries

Energy starts as **Not recorded / unsure**, with an explicitly labeled optional selector. Saving an unanswered energy field preserves `null`; weekly averages and energy/mood comparisons use only valid recorded values. Weekly screen and print summaries show the number of recorded energy ratings and use “Not recorded” when none exist. The printed check-in count now uses the actual summary count instead of an unused field that always produced zero. Existing numeric records remain unchanged, including historical defaults whose original intent cannot be recovered.

Learners can deselect a mood or skip directly to writing without creating a check-in or earning check-in points. Skipping preserves unfinished choices and moves keyboard focus to the journal field. Changing or deselecting a mood clears dependent emotion words; changing the more-specific feeling clears its expanded word too. This prevents invisible stale labels from being saved.

The large overview dashboard now sits in a native “Journal overview and shortcuts” disclosure above the form. It starts closed, reducing the initial phone scroll; its shortcuts still work by keyboard and move focus into their destination.

The check-in explains that feelings may be mixed or difficult to name, and that energy, context, thoughts, and appreciation are optional. Additional context lives in a native disclosure with an explicit explanation that closing it retains entered details. The older claim that logging automatically changes behavior was replaced with a description of an optional snapshot. Mood, emotion, and context buttons announce selected states; the mood grid wraps; fields have visible labels; touched controls use at least 44 px targets. Post-save activity checkboxes now have specific names, selected-state announcements, and a visible high-contrast checked state.

Validation: **442 regression checks passed (436 existing plus six energy-summary tests; two existing skips), and 15 distinct browser workflows passed across the main runs and focused rechecks.** The final check-in run passed eight journeys; the last restored-history shortcut refinement passed its focused recheck. All 72 tools passed the final render smoke check. Six focused axe audits returned zero contrast/label violations; phone screenshots were visually reviewed. Source/public parity, syntax, and scoped whitespace passed. The existing regressions preceded the final overview refinement, whose behavior was covered by the later browser checks. Archived results: `reports/sel-hub-review/validation-checkin.json`. Scope includes the check-in, missing-energy summaries and printed payload, prior journal revision flows, and selected phone/theme states. Broader mood analytics, the full coping/playlist content library, AI responses, real classroom use, and installed Desktop are not validated by this pass. The browser harness uses simulated host callbacks and intercepts the print payload rather than validating a physical printer.
