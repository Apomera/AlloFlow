# AlloFlow: review of the 24 main resources

Date: September 4, 2026. Scope: the current local working tree.

**Yes, refinements are needed. The strongest opportunities are to make edits durable, preserve learner work, and make generation, grading, previews, and delivery agree about the same resource.** Initial generation is substantially healthier than several of the subsequent edit and handoff paths.

This was an analysis task. Application implementation files were not changed. Review notes, diagnostic scripts, and test-result files were added locally.

## Scope and evidence

The 24 entries are the main sidebar/guided resources, including Word Sounds, Assignment Directions, and Preview, Package & Deliver. The exact sidebar list is in `AlloFlowANTI.txt:29243`; guided entries are in `guided_mode_config_source.jsx`. The generation catalog has 22 dispatcher types: it includes legacy Gemini Bridge, while the three workflow entries above use other paths. Gemini Bridge was reviewed as the simulation mode of Activities. Polls and the individual STEM/SEL plugins are outside this 24-entry review; the STEAM Lab entry and its handoff were reviewed.

Evidence includes source inspection, generated-module inspection, existing automated tests, and focused runtime/logic reproductions. Passing generation tests does not establish that edits, learner responses, and exports round-trip correctly. External AI providers, live classroom/mailbox delivery, and a manual screen-reader walkthrough of all 24 resources were not exercised.

Priority used below: **High** means lost work, incorrect grading, an unusable control, or an update applied to the wrong resource; **Medium** means a material integration inconsistency; **Low** means a focused usability improvement. Suggestions are explicitly distinguished from reproduced defects.

## Repairs with the greatest immediate value

### 1. Restore the Concept Sort refinement actions — High, confirmed

`AlloFlowANTI.txt:47506` and `AlloFlowANTI.txt:47639` compare the resource type to `concept_sort`. The actual catalog, dispatcher, and view use `concept-sort`. The asynchronous-operation guard therefore cannot identify a normally generated Concept Sort, and guarded regenerate/add/refine/upload operations return without starting.

Use the canonical type consistently and add an integration check that opens a normal generated sort and exercises its refinement controls. Existing accessibility tests passing did not catch this host-level mismatch.

### 2. Make Lesson Images replacement an actual resource edit — High, confirmed

The replacement path writes `singleImageOverride`, while the saved resource still contains the old image. Download uses the original `generatedContent.data.imageUrl` in `content_engine_source.jsx:2003`. The displayed replacement and the resource saved/exported by the app can consequently disagree.

Commit the replacement, image description, and provenance to the identified history artifact. Scope any temporary upload state to that artifact and reset it when switching resources. Verify replace → navigate away/back → download → project save/load.

### 3. Give Writing Scaffolds and grading the same response keys — High, confirmed

Paragraph scaffold inputs use indexes from a split text array (`view_sentence_frames_source.jsx:169-175`), producing keys such as `paragraph-1` and `paragraph-3`. The grading collector reads sequential placeholder indexes (`AlloFlowANTI.txt:48710-48715`), such as `paragraph-0` and `paragraph-1`. Filled responses can be omitted or associated with the wrong blank in Check My Work.

Create response descriptors once and use the same IDs in rendering, autosave, grading, submission, and export. Also correct the scaffold save indicator so a storage error cannot be displayed as Saved.

### 4. Persist Anchor Chart learner responses separately from templates — High, reproduced

Anchor Chart responses live in component state (`anchor_charts_source.jsx:520,699-706`). A real React diagnostic found no persistence callback when entering an answer, retention of an answer when switching to another chart with the same section ID, and loss of that answer on unmount/reopen. The submission path sends the canonical chart, rather than those component-owned answers (`AlloFlowANTI.txt:40701-40705`).

Use the shared learner-response boundary already used by Memory Aid and Applied Challenge. Key work by profile/assignment/resource/field; restore it on reopen and explicitly include it in submission. Apply the same ownership model to Note-Taking, whose current host update handler writes learner fields into resource/history objects (`AlloFlowANTI.txt:29174-29189`). The latter is an architectural refinement; cross-profile disclosure was not demonstrated.

### 5. Prevent delayed revisions from overwriting the wrong resource — High, confirmed source paths

Sequence Builder applies a delayed revision with an unconditional active-resource setter (`timeline_revision_source.jsx:277`). An isolated execution of the actual built module started a revision on `timeline-1`, switched to `quiz-2`, and resolved the response: `quiz-2` retained its quiz ID/type but received timeline data. Its later image guard checks only type, not artifact identity. When visuals are disabled, the revised text is not committed to history. Lesson Plan extension generation also commits a pre-await resource snapshot (`AlloFlowANTI.txt:42000-42007`), allowing newer edits/selection to be overwritten. Anchor Chart icon generation has a similar index-based update pattern; the Chart and Lesson Plan races were traced in source rather than exercised with a browser/provider.

Introduce a shared mutation function that accepts the artifact ID, expected revision, and patch. Update history atomically; update the active view only when it still shows the same artifact. Cancel or discard stale requests. Verify by starting a revision, navigating or editing while it waits, and resolving the request afterward.

### 6. Move the DBQ timer into the component lifecycle — High, confirmed

`view_dbq_source.jsx:205-227` starts a timer during render and stores timer bookkeeping in learner responses. There is no matching component-unmount cleanup. Moving to another resource can leave response writes running. DBQ reward keys also need resource scoping to avoid collisions between different DBQs using the same document IDs.

Use an effect with cleanup and a timer ref; store only the meaningful learner timer state. Scope reward/feedback IDs to the DBQ artifact. Verify start → switch resource → reopen, and repeat with a second DBQ containing the same document labels.

### 7. Include meaningful generation options in resource-reuse identity — Medium, reproduced

`generation_matrix_module.js:61-100` defines which options affect resource identity. It omits quiz visual mode and the structured discussion/jigsaw options used by `generate_dispatcher_source.jsx:4391,5243-5295`.

The local diagnostic `scratch/main-24-generation-probe-2026-09-04.cjs` produced:

| Requested change | Current planner result | Expected behavior |
|---|---|---|
| Quiz visuals: none → both question and option visuals | Same identity; reuse old quiz | New/refreshable visual quiz |
| Jigsaw group size: 3 → 6 | Same identity; reuse old jigsaw | Regenerate the six-expert structure |
| Discussion: think-pair-share → fishbowl | Same identity; reuse old discussion | Generate the requested protocol |
| Control: quiz question count 4 → 8 | Different identity; create variant | Already correct |

This is a planner/reuse problem. It does not mean that every direct Generate click reuses a resource. Derive identity from the same normalized options that the generator actually consumes. Keep unrelated settings excluded.

### 8. Make Curriculum Audit freshness follow content, not just membership — Medium, reproduced

`view_alignment_report_source.jsx:1063` skips resources whose IDs are already included in the audit. Editing an included resource's content and timestamp therefore produces `stale: false` in the audit diagnostic.

Store content/revision fingerprints in the audit evidence manifest. Mark only affected findings stale when an audited artifact changes, and let the teacher rerun against the updated pack. Extend the same dependency tracking to synthesized Lesson Plans where appropriate.

### 9. Finish integrating the new Activities modes — Medium, confirmed

Discussion and jigsaw bodies are rendered before the generic edit branch in `view_brainstorm_source.jsx:243-261`, so their displayed Edit control does not expose an editor for their structured fields. The host also excludes all `brainstorm` resources from student history (`AlloFlowANTI.txt:47998-48004`), despite the new modes having learner-facing material.

Provide mode-specific editing. Define which parts are teacher facilitation notes and which are student packets, then expose only the student projection in history/delivery. Do not simply remove the filter and expose the complete teacher object. Let Blueprint/AlloBot plans carry the activity mode and configuration instead of defaulting all Activities requests to idea starters.

### 10. Bring older resources up to the newer runtime-AI boundary — Medium, confirmed wiring gap

Note-Taking and Anchor Chart receive provider functions directly (`AlloFlowANTI.txt:52756-52767`); Memory Aid and Applied Challenge have explicit runtime capabilities, restricted providers, and separate preview/response handling.

Use the same explicit capability contract for older resources, hide unavailable actions, and give them prepared/offline alternatives. Test the actual student renderer with providers that throw if called. This finding concerns inconsistent capability wiring; an external request from a restricted live student session was not performed.

### 11. Persist Analysis grammar decisions through the normal text-edit path — Medium, confirmed

Grammar dismissal/restoration and applying fixes change active content without updating history (`view_analysis_source.jsx:122-138,199-210`). The normal analysis edit path already records undo, recalculates complexity, invalidates checks, and updates history (`AlloFlowANTI.txt:48353-48372`). Grammar actions bypass it.

Use the common mutation path so reopening, translation, exports, and later resource generation see the same corrected analysis as the active panel.

### 12. Translate and remap the complete Directions choice board — Medium, confirmed

Directions translation includes title/body/objective labels but omits choice-board prose (`phase_k_helpers_source.jsx:2805-2815`). Translate-all remaps `objectives[].resourceRef` but omits `choiceBoard.items[].resourceId` (`AlloFlowANTI.txt:33030-33038`). Translated boards retain source-language cards linked to original resources; packaging only translated copies can leave missing links.

Translate all visible board text and use a shared reference remapper for objectives and board items. Verify translated directions → choice card → intended translated resource, then repeat after packaging only that language.

## All 24 resources: disposition and recommended refinement

| # | Main resource | Current assessment | Most useful next refinement |
|---:|---|---|---|
| 1 | Analyze Source Material | Initial generation works; grammar actions have persistence gaps. | Commit fix/dismiss actions to history and invalidate downstream evidence when source changes. Medium. |
| 2 | Glossary & Language Selection | Strong reusable vocabulary, language, audio, and practice foundation; no new blocking defect established. | Consolidate overlapping audio warm-up effects (`AlloFlowANTI.txt:20860-20874,29925-29927`) and cancel stale work while editing/changing resources. Repeat synthesis cost was not measured. Low, integration improvement. |
| 3 | Text Adaptation | Source identity and text-edit/history handling are relatively mature; no new blocking defect established. | Verify saved-text playback consistently uses its stored language/grade after ambient app settings change. Some helpers begin with current language settings; a failure was not reproduced. Low, targeted follow-up. |
| 4 | Word Sounds | Prepared student activities, audio coverage, and activity-state survival have substantial test coverage. | Translate the launch/review/coverage screen and use logical text alignment. `view_word_sounds_preview_source.jsx:38-100` still hardcodes English learner/teacher copy. Low, confirmed localization gap. |
| 5 | Visual Organizer | Multiple structures and interactive modes are available. | Check that edited `branches` update previously saved interactive `nodes`/`edges`, which hydration prefers. Verify static edit → interactive reopen → export. Low, consistency check pending reproduction. |
| 6 | Note-Taking Templates | Useful persistent templates, but learner edits pass through canonical-resource updates. | Migrate to separate learner responses, explicit preview, truthful saving status, and runtime capability gating. Medium. |
| 7 | Anchor Chart | Reference creation works; learner answer ownership and persistence are broken. | Fix response save/restore/submission and artifact-scoped asynchronous icon edits. High. |
| 8 | Memory Aid Studio | Recent response, preview, read-aloud, privacy, and export integration is already implemented. | Resolve the current source/generated-module freshness failure; retain the newer boundary as the model for older tools. Medium release verification issue. |
| 9 | Applied Challenge Studio | Recent schema, response, evidence, preview, audio, and export integration is already implemented. | Add its learner work and Memory Aid to the common work shelf, which currently recognizes Notes/Charts; extend evidence handoffs using explicit artifact references. Low, improvement. |
| 10 | Lesson Images / Visual Supports | Generated visuals render, but image replacement is transient. | Persist replacements and descriptions so display, reopening, download, and export agree. High. |
| 11 | FAQ Generator | Source-based generation works. | Translate hardcoded Show all/Hide all/reading/speed copy (`view_faq_source.jsx:164,172`); clarify that the question plays audio and the chevron expands the answer. Low, usability gap. |
| 12 | Writing Scaffolds | Multiple scaffold modes and grading exist; paragraph response indexing is inconsistent. | Share stable response IDs across input/grading/export and fix storage-error feedback. High. |
| 13 | Activities | Discussion/jigsaw add real instructional value; edit and student-discovery paths lag behind them. | Add typed editors, teacher/student projections, planner mode support, and configuration-sensitive reuse. Medium. |
| 14 | Interview Mode | Session-artifact and runtime tests pass. | Make the interview transcript/reflection an explicit reusable evidence artifact for writing, notes, and assessment; preserve its source/persona references. Low, improvement. |
| 15 | Sequence Builder | Generation and topic routing work; later revisions can target the wrong view or fail to persist. | Guard asynchronous commits by artifact/revision and always save text-only revisions. High. |
| 16 | Concept Sort | Generation/accessibility checks pass; host refinement actions are blocked by a type mismatch. | Fix canonical ID checks and test host-mounted edit/regenerate/upload actions. High. |
| 17 | Document-Based Question | Rich sourcing, response, and assessment workflow; timer lifecycle is unsafe. | Clean up the timer on resource change and scope feedback/reward IDs to the resource. High. |
| 18 | STEAM Lab | Math entry/lifecycle tests pass; the entry leads to a much larger plugin collection. | Pass lesson source, goal, grade, and an explicit tool/preset; return an evidence artifact that can be used by Notes, Applied Challenge, or assessment. Medium, integration improvement; not an audit of every plugin. |
| 19 | Adventure Mode | Runtime and session behavior have focused test coverage; no new blocking defect established here. | Preserve meaningful decisions, reasoning, and outcome evidence in a reusable reflection/assessment handoff. Low, improvement. |
| 20 | Assess | Answer-key and mode tests pass; visual-mode changes are missing from planner identity. | Correct option-sensitive reuse and use the shared response descriptors when grading work produced in other resources. Medium. |
| 21 | Standards & UDL Alignment / Curriculum Audit | Structured audit view exists; freshness misses edits to existing members. | Fingerprint audited content and surface stale evidence after changes. Medium. |
| 22 | Lesson Plan / Study Guide / Family Guide | Synthesizes other resources and changes by user role. | Guard asynchronous extension edits and track dependencies on the exact resource versions referenced by the plan. High for overwritten edits; Medium for freshness. |
| 23 | Assignment Directions & Goals | Teacher-authored directions and resource-linked objectives exist. | Preserve all resource links through translation/cloning, including choice-board item references; validate them in the final learner package. Medium. |
| 24 | Preview, Package & Deliver | Existing plan, QR/package, export, and student-preview checks pass in the reviewed paths. | Show one route-specific readiness summary based on the actual exported resources: what is included, where work saves/submits, and which prepared media/interaction features survive that route. Medium, integration improvement. |

## Improvements that would make the whole app more coherent

1. **One artifact mutation API.** Replace scattered active-view/history setters with an artifact-ID/revision-aware commit. This directly addresses Images, Analysis, Sequence Builder, Chart icons, and Lesson Plan races.
2. **One learner-response contract.** Extend the StudioResponse pattern to Anchor Charts, Notes, Scaffolds, DBQs, and interactive organizers. Use shared field descriptors for rendering, saving, grading, submission, and export. Keep teacher templates and teacher previews separate.
3. **One resource capability registry.** Extend the current catalog with canonical ID, generation options, supported roles, learner-response adapter, preparation requirements, and delivery projections. Derive planner fingerprints and availability from these declarations. The existing 22-type catalog and 24-step UI are different inventories by design; make their mapping explicit rather than forcing all workflow steps into the dispatcher.
4. **Dependency-aware resource links.** Connect glossary terms, scaffold prompts, audit evidence, lesson plans, directions, and generated practice to exact artifact IDs/revisions. Edits should visibly stale affected derived resources; they should not silently trigger model calls.
5. **Validate the final delivery projection.** Preview the actual student payload for each selected route. Keep teacher-only notes, reference answers, private practice records, and learner responses in their intended channels. Add targeted round-trip tests for each resource as its adapter is migrated.

## Recommended implementation order

**First pass: correctness.** Concept Sort ID, scaffold response indexing/status, image replacement persistence, Anchor Chart responses, Sequence Builder/Lesson Plan asynchronous commits, DBQ timer, and generated-module freshness.

**Second pass: shared integration.** Artifact commit helper, legacy-resource response adapters/capability gates, configuration-sensitive reuse, and content-sensitive audit freshness.

**Third pass: smoother teaching workflows.** Activities editing/student projection/planning, reliable translated resource links, evidence handoffs, Word Sounds launch localization, and route-specific package readiness.

For each repair, verify the relevant real user sequence: create/open → edit/respond → switch away and back → save/load → student preview → export or submit. Add an in-flight navigation test for asynchronous editors and a throwing-provider test for restricted student views.

## Validation record

- Catalog check: **22 generation tools, zero errors or warnings**.
- Deterministic generation smoke: **63/63 passed**, covering 21 resource cases across source, root generated module, and desktop public module. Uses canned model responses; not a measure of real model quality or every submode. Curriculum Audit and the nongenerator workflow steps are outside this harness.
- View-prop scan: **63 views checked, zero missing-prop candidates**.
- Root integration batch: **134/134 passed across 9 files**. Results: `scratch/main-24-root-tests-2026-09-04.json`.
- Word Sounds/delivery batch: **93/93 passed across 6 files**. Results: `scratch/main-24-delivery-tests-2026-09-04.json`.
- Learning-resource batch: **100/100 passed across 9 files**. Details in the learning review below.
- Studio batch: **238/239 passed across 11 files**. The failure is the Memory Aid source/generated-module freshness check, not a demonstrated response-boundary failure. Details in the studio review below.
- Foundation batch: **84/86 passed across 9 files**. Two Directions tests still expect extracted composer strings in the monolith. The extracted composer contains the preview string; these are stale source-location assertions, not demonstrated runtime failures. Results: `scratch/resource-foundations-tests.json`.
- Test batches overlap and should not be summed as a count of distinct tests. No claim is made that the entire repository suite or all 24 live-browser workflows passed.

Detailed supporting reviews:

- [Foundations: analysis, reading, vocabulary, organizers, images, scaffolds, FAQ, directions](resource-review-foundations-2026-09-04.md)
- [Learning: assessment, sorting, sequence, activities, adventure, interview, DBQ, STEAM](resource-review-learning-2026-09-04.md)
- [Studios: notes, charts, Memory Aid, Applied Challenge, plans, audit](resource-review-studios-2026-09-04.md)
