# Product scope: review changed planning inputs
Date: 2026-09-04  
Status: scoped; application feature not implemented.

## Decision

Choose **“Planning inputs changed” for saved teacher lesson plans** as the next small product improvement.

A teacher should be able to reopen a saved plan, see which planning materials were available when it was created, and identify relevant input changes before deciding whether to edit the plan. The feature belongs in the existing Lesson Plan view.

This is a strong fit with AlloFlow's existing lesson workflow and resource architecture. The conclusion is based on current code, documented teaching workflows, and deterministic probes—not observed customer demand or measured time savings. A short usability check is included below before expanding the feature.

## Why this opportunity wins

| Candidate | Current evidence | Decision |
| --- | --- | --- |
| Saved-plan planning-input review | Generation combines resource summaries and an asset inventory, but the saved view infers “Based on” from current History. Directly reopening an older plan does not explain what changed. | Select. One existing screen, one versioned record, no extra AI call or new learner-data store. |
| Package-readiness summary | Guided Mode already has scoped confirmations, change invalidation and delivery evidence. Builder already describes omitted resources, answer visibility and format compatibility. A selected-output/settings gap remains. | Defer. Improve the existing output review later rather than introduce a new readiness dashboard. |
| Interview reflection → Notes | Private archives and saved reflection artifacts already exist. A small reflection handoff could help, but old reflection records mix transcript, learner writing and AI feedback without a learner/profile owner field. | Defer until identity and attribution are designed. Broad transcript import would duplicate existing storage. |
| Glossary/organizer investigations | Remaining issues in the original review were not reproduced. | Keep as maintenance investigations, not this product scope. |

## Verified gap and reuse points

- The current Lesson Plan “Based on” label checks whether resource types exist in **today's History**, not which versions were used to create this plan: [view_lesson_plan_source.jsx:74](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/view_lesson_plan_source.jsx:74).
- The context builder selects resources from the supplied scope and emits bounded summaries: [export_handlers_module.js:2871](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/export_handlers_module.js:2871). It includes glossary **terms**, quiz **counts**, text **excerpts**, and other specific planning fields. It does not send every resource's full content.
- The teacher asset inventory contains resource title, type and ID: [utils_pure_source.jsx:105](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/utils_pure_source.jsx:105). Availability in that inventory is not proof that the model used every item in its written plan.
- There are two creation paths to cover: the shared dispatcher at [generate_dispatcher_source.jsx:6905](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/generate_dispatcher_source.jsx:6905) and the sidebar handler, which currently creates a plan with an empty config at [concept_map_handlers_source.jsx:604](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/concept_map_handlers_source.jsx:604).
- Guided readiness already detects changes to the current Guided lesson: [view_guided_mode_banner_source.jsx:755](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/view_guided_mode_banner_source.jsx:755). The proposed feature addresses a saved plan opened independently and does not add another Guided gate.
- Reuse the existing deterministic [ResourceContentFingerprint helper](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/resource_content_fingerprint_module.js:4) on the **planning-input projection**, and the existing resource-ID mutation helper for persisted review state. Hashing whole History would introduce unrelated changes and false notices.

## Concrete user journey

1. A teacher creates a plan with a glossary containing “evaporation” and a five-question exit ticket.
2. They edit the plan's introduction manually.
3. Later, they change the glossary term list and expand the exit ticket to eight questions.
4. They reopen the saved plan directly from History.
5. The existing view shows a quiet notice and identifies Vocabulary and Assessment as changed planning inputs.
6. They inspect those resources, edit the plan if needed, then mark the displayed versions reviewed. Their edited introduction remains intact.

Example content for the existing view:

> **Planning inputs changed**  
> Vocabulary and assessment inputs differ from the versions used to create this plan. Review whether the plan needs an update.  
> **Review input changes**
>
> Vocabulary — terms changed · **Open glossary**  
> Assessment — question counts changed · **Open quiz**  
> **Mark these input versions reviewed**

The interface should say “Available when this plan was created” for the saved inventory. It should not imply every listed resource was actually used by the model.

## First version

### Capture a truthful generation record

Before awaiting generation, freeze a versioned record of:

- Teacher-plan mode, creation route and the effective input projection format.
- The ordered resource scope supplied to generation, the selected resource IDs for each context segment, and eligible inventory IDs.
- Per-segment fingerprints and an overall fingerprint of the context actually sent.
- Inventory fingerprints only when that generation path actually sends the inventory.
- Stable origin/source identity and the frozen settings needed to rebuild the same comparison. Store only necessary metadata and fingerprints, not another full transcript or lesson text copy.

Persist this metadata with the resulting plan in both creation paths and in the active view object. The current sidebar path's smaller active object must not hide the new record until reopening.

Cloud teacher generation consumes context plus inventory. Dispatcher local generation uses a truncated context and does not send that inventory. Fingerprint the actual consumed projection **after** truncation; do not pretend these inputs are identical. Preserve current generated prompt text while adding trace metadata.

Scope first-version UI to teacher plans. Study/family modes must be distinguishable and must not inherit teacher-specific assumptions.

### Compare only the recorded origin

Resolve the recorded inputs by ID within the recorded scope. A Full Pack plan keeps its pack scope; it must not be compared to all current History. Scope IDs define the lookup boundary; only resources that contributed to the actual consumed context or inventory, after truncation, are dependencies. Deleting an unused scope member or material entirely beyond the local cutoff must not trigger a notice or unavailable state.

- Changes to consumed planning fields produce a review notice.
- Missing consumed dependencies produce a clearly named missing-input state.
- New unrelated History resources, current sidebar settings, timestamps and audio-preparation metadata do not trigger the notice.
- If the original source cannot be resolved reliably, show that comparison is unavailable. Do not substitute whichever source happens to be open now.
- Duplicate/ambiguous IDs, missing hydration, or an unsupported snapshot version produce an unavailable state, not a false “up to date.”
- Do not automatically relink a deleted resource to the latest resource of the same type.

### Review in the existing plan view

Use a compact status/disclosure next to the existing attribution. List the affected input categories and original resource names, with working links where those resources still exist.

Keep the plan editable and exportable. A change means review may be useful; it does not prove the plan is incorrect.

“Mark these input versions reviewed” records an explicit teacher review baseline. Keep the original generation snapshot unchanged. Bind acknowledgement to the exact versions visible at the click, so another edit during review cannot be silently acknowledged. Persist the baseline through the ordinary plan save/load path and expose save failure/retry through existing patterns.

This review state is independent of Guided readiness and Curriculum Audit results. It does not certify either one.

## Coverage boundary

This is **planning-input change detection**, not a full comparison of teaching materials or a semantic accuracy check.

| Change | First-version result |
| --- | --- |
| A term is added to the consumed glossary term list | Review notice |
| Quiz question/reflection count changes | Review notice |
| A consumed primary/adapted text excerpt changes | Review notice |
| An inventory resource is renamed or removed, on a path that consumed that inventory | Review/missing notice |
| Quiz wording changes but counts stay the same | No notice from that context segment; wording was not consumed |
| Glossary definition changes but terms stay the same | No notice from that context segment; definitions were not consumed |
| Text changes beyond the actual consumed/truncated excerpt | No notice from that segment |
| An unrelated lesson's resource is added | No notice |
| Playback state, audio readiness or a timestamp changes | No notice |
| An older plan has no recorded input versions | “Earlier input versions were not recorded” |
| A teacher edits the plan itself | Preserve edits; this alone does not establish that inputs were reviewed |

Keep the limited coverage visible in the details: “Checks the planning inputs used to create this plan. Review the full materials for content accuracy.”

## Implementation boundaries and sequence

1. Extract a shared input collector/trace around the existing context and inventory helpers without changing their prompt output. Return the same text plus structured origin metadata.
2. Add snapshot capture to dispatcher and sidebar generation, including history overrides, backend truncation and teacher-mode tagging.
3. Add a pure comparison function and a separate review-baseline record. Reuse the current fingerprint primitive; no new global dependency graph.
4. Replace inferred attribution with saved attribution and add the small teacher review disclosure.
5. Verify save/load, imports, missing resources, asynchronous completion and review-state persistence. Preserve snapshots through copying/translation where IDs remain resolvable; after an ID-remapping import that cannot remap dependencies, show unavailable.
6. Regenerate only the relevant modules and shell when implementation occurs.

Not included: automatic regeneration, merging AI output into an edited plan, changing generated instructional content, retroactive guessing for older plans, a new readiness score/dashboard, expanded AI prompts, all-resource content diffing, new learner evidence storage, or deployment.

## Acceptance criteria

- The same plan and resolved inputs show no change after reopening or save/load.
- Cloud and local snapshots represent the inputs actually sent; omitted/truncated material does not generate false notices.
- Both generation entry points capture before the AI wait. If an input changes in flight, the completed plan opens with that change visible.
- Full Pack history overrides remain isolated from other lessons.
- Relevant edits, renames and deletions are attributed to recorded inputs; unresolved IDs cannot be silently replaced.
- Manual plan edits survive every comparison, review acknowledgement and input change.
- Review acknowledgement applies only to observed versions and reopens after another relevant edit. A save failure is visible.
- Legacy and unsupported records show unavailable comparison and remain usable.
- Role changes do not reinterpret a study/family guide as a teacher-plan snapshot.
- The disclosure, input links and review action work by keyboard, have clear accessible names, and announce meaningful changes without repeated interruptions.
- No model call, remote write or learner-data transfer occurs when opening or reviewing the status.

## Fit validation completed

A seven-case deterministic probe executed the **current** context and inventory functions. It confirmed consumed glossary-term and quiz-count changes; excluded wording-only and definition-only changes; detected inventory rename/removal; ignored timestamps; and demonstrated why recorded scope is required when another quiz is added.

Evidence: [probe](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/scratch/lesson-plan-opportunity-fit.cjs) and [results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/scratch/lesson-plan-opportunity-fit-results.json).

Independent read-only comparisons also checked existing readiness and Interview functionality. Interview/archive/response checks passed 38 tests in that comparison; those checks validate existing foundations, not this proposed feature. No app source or generated runtime files were changed for this scoping task.

## Lightweight product validation before expansion

Use a clickable prototype or first implementation with three to five educators; this research has **not** been performed. Give each person a saved plan plus:

1. A consumed vocabulary change and quiz-count change.
2. An unrelated lesson added to History.
3. An older plan with no input record.

Check whether they can identify what needs inspection, understand that the plan is not automatically wrong, preserve their edits, and correctly interpret the unavailable state. Also test the quiz-wording-only limitation explicitly.

Advance if most participants can complete those tasks without explanation and find the information useful during their normal plan review. If they read the status as a blanket accuracy guarantee, revise the wording/scope before expansion. If they mainly need full-material comparison, reassess that separate opportunity rather than overstating this detector's coverage.
