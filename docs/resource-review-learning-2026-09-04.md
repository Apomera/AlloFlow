# AlloFlow resource review: learning and activity tools

Reviewed 2026-09-04. Scope: Assessment/Quiz, Concept Sort, Timeline, Activities (including simulation prompts), Adventure, Interview/Persona, DBQ, and Math/STEM entry. This is a read-only review of current root source and generated modules; no application implementation was changed. Existing unrelated work was preserved. Findings concern the current working tree, not a verified production deployment.

## Confirmed functional findings

### P1 — Concept Sort's asynchronous actions silently return before running

`AlloFlowANTI.txt:47505-47516` derives the active document identity only when `generatedContent.type === 'concept_sort'`. The actual resource identifier is `concept-sort` (`generate_dispatcher_source.jsx:6521`, and the application catalog/routes). Consequently `csBeginAsyncRun()` returns null for a normal generated resource. Add, regenerate text/image, refine image, and upload actions all use that guard, e.g. `AlloFlowANTI.txt:47678-47708`, `47729`, `47782`, `47821`. A second wrong-type check exists in `csUpdateData` at `47639`.

Reproduction: open an ordinary Concept Sort; use Add Item or Regenerate. The guard exits without entering the operation. An isolated execution of the exact root identity/start-handler code with `{id:'sort-1',type:'concept-sort'}` returned `{id:'',run:null}` and called the async-start helper zero times. Manual text/category editing uses a separate path and is not evidence that these controls work.

Refinement: use the canonical `concept-sort` identifier in both guards; add a focused regression around the real resource type and successful Add/Regenerate/Upload starts. Preserve the existing cancellation and history mirroring, which are useful protections once reachable.

### P1 — A delayed Timeline revision replaces the newly selected resource's data

`timeline_revision_source.jsx:277` merges the returned timeline data into whichever resource is current at completion, without checking its ID or type. The image-completion branch at `306-317` checks only type, so it can overwrite a different timeline. The root delegator passes raw setters (`AlloFlowANTI.txt:36058-36065`), with no outer request-ownership protection.

Reproduction: start a sequence revision, then select another history item before the AI result returns. An isolated execution of the actual built `timeline_revision_module.js` began with `timeline-1`, switched active content to `quiz-2`, and resolved the AI response. The result retained `id:'quiz-2',type:'quiz'` but replaced its question data with timeline items. This can break the current renderer and risks later saving the wrong payload under that resource.

Refinement: bind revisions and image completions to a captured resource ID and revision token. Update the intended history record explicitly, and update active content only if it is still that same version. Apply the same ownership pattern to timeline verification/image/auto-fix handlers during remediation.

### P2 — Timeline revisions without visuals are absent from history

The revision initially updates only active content (`timeline_revision_source.jsx:277`). Its only `setHistory` call is inside the `includeTimelineVisuals` branch at `280-317`. The function ends at `323-329` without committing nonvisual revisions to history.

Reproduction: revise a sequence with visuals disabled, then reopen it from history. An isolated built-module execution confirmed that active content received the revision while the history item retained the original event. This is separate from the navigation race above and also happens without switching during generation.

Refinement: commit the text revision to history as soon as it succeeds; treat generated images as subsequent updates to that same resource.

### P2 — DBQ timer work continues after leaving the resource and pollutes learner response state

`view_dbq_source.jsx:209-227` starts `setInterval` while rendering, writes its browser interval handle into `_dbqTimerInterval`, and routes every second's `_dbqTimerTick` through `handleStudentInput`. There is no effect or unmount cleanup in this view. The common input handler writes these fields into `studentResponses` (`AlloFlowANTI.txt:12498-12506`).

Reproduction: start a DBQ timer, then open a different resource. The old interval continues calling the old DBQ response setter because its cleanup runs only when that DBQ renders again. Reopening a persisted snapshot can also restore a meaningless nonzero interval handle, causing the renderer to assume a live interval already exists.

Refinement: retain only the timer deadline in resumable response state. Own the browser interval in an effect/ref, keep display ticks in local component state, and clean up on resource changes and unmount. This avoids a full application response update every second and makes resume reliable. This finding is source-verified; no live session transport load was measured.

### P2 — DBQ source-analysis rewards collide across different DBQ resources

Reliability and source-analysis calls use `dbq-reliability-${activeDoc.id}` and `dbq-analysis-${activeDoc.id}` (`view_dbq_source.jsx:441`, `519`). The global `handleScoreUpdate` deduplicates solely by the supplied identifier (`AlloFlowANTI.txt:15636-15657`); it does not add the parent resource ID. DBQ documents commonly repeat IDs such as A/B. Corroboration and essay already include `resId` (`view_dbq_source.jsx:568`, `601`).

Reproduction: earn a source-analysis/reliability award on Document A in DBQ one, then complete the same category on Document A in DBQ two. The second is treated as a repeat of the first; equal scores give no new points and a higher score gives only the difference.

Refinement: include the DBQ resource ID, document ID, and task in all award keys, consistent with the essay/corroboration path.

### P2 — Activities' Edit mode does not edit discussion or jigsaw content

The view exposes Edit at `view_brainstorm_source.jsx:243-253`, but the main renderer selects `DiscussionKitBody`/`JigsawBody` before testing `isEditingBrainstorm` (`257-261`). Those bodies display prompts, expert packets, talk stems, and checks without editable controls (`54-218`). Guide/worksheet editing lower in the card does not edit those main fields.

Reproduction: generate a Discussion Kit or Jigsaw Activity and select Edit. The main instructional fields remain read-only even though the header switches to Done Editing.

Refinement: add structured editing for those two schemas and persist through the existing `handleBrainstormChange`/history update (`AlloFlowANTI.txt:48575-48587`). Reuse derivative metadata so changing source content can mark existing worksheets/rubrics for review. Student discoverability of these new activity kinds is also being reviewed in the shared-shell report; avoid treating all Activities output as teacher-only automatically.

## Coverage and additional refinements

| Resource | Assessment and concrete next refinement |
| --- | --- |
| Assessment / Quiz | Strong existing machinery: draft/attempt namespaces, delivery settings, multiple response types, teacher quality audit, live quiz, and AlloSheet handoff. Relevant inspected areas: `view_quiz_source.jsx:488-723`, `1428-1564`, `2701-2848`, `3519-3617`. Existing answer-key and preset tests passed. No additional confirmed bug was established here. Prioritize end-to-end resume/submission coverage across the same learner, a new learner, and different resources; keep generated question semantics and live/export answer keys tied to one canonical item model. Root review separately covers generation-matrix identity. |
| Concept Sort | Core gameplay and category/item review exist and dialog accessibility tests pass. Fix the unreachable asynchronous editor actions first. Existing manual edits already mirror history (`AlloFlowANTI.txt:47635-47647`). Afterward, verify teacher edit → play → save/reopen with actual `concept-sort` artifacts and ensure data validation catches empty or orphaned categories/items before play. |
| Timeline | Topic modes, ordering validation, teacher editing, keyboard reordering, generated image controls and learner game are implemented (`view_timeline_source.jsx:90-129`; `timeline_revision_source.jsx:32-149`). Existing topic-mode integration tests passed. Fix request ownership and history persistence before adding features; then verify teacher revision → game → export/reopen uses identical ordering and item IDs. |
| Activities | Idea cards, discussion kits, jigsaw packets, generated guides/worksheets/rubrics, and an AlloStudio worksheet round trip are implemented (`AlloFlowANTI.txt:48589-48624`). Fix structured editing and align student access with the learner-facing packets. The simulation mode currently creates sequential external coding prompts (`generate_dispatcher_source.jsx:6481-6520`), and its output view provides per-step Copy buttons (`AlloFlowANTI.txt:52950-52990`); it does not run a simulation in AlloFlow. Treat clearer naming and a guided handoff/completion record as a product refinement, not a broken simulator. `view_gemini_bridge_source.jsx` is the unrelated translation/conversation bridge despite its filename. |
| Adventure | Extensive session/turn/save and learning-support flows exist. Existing runtime regression tests passed. No new confirmed bug was established in this bounded review. A useful integration refinement is to link the saved adventure outcome, glossary gains, and teacher review to the originating lesson/resource so teachers can continue the same learning objective in a follow-up assessment. Relevant save/session implementation: `adventure_session_handlers_source.jsx`, `adventure_handlers_source.jsx`, and `view_student_save_adventure_source.jsx`. |
| Interview / Persona | Resume is scoped by app, resource and learner (`view_persona_chat_source.jsx:377-418`), and archived session artifacts support listing/reopening (`persona_session_artifact_source.jsx:330-427`). Session artifact and runtime tests passed. No new confirmed bug was established. Preserve those identity boundaries while improving explicit links from an interview's cited source/questions to DBQ or assessment follow-ups and the teacher's saved lesson. These are opportunities, not claims of absent archive/export capability. |
| DBQ | Documents, annotation, HAPP, reliability, corroboration, essays, rubric, AI feedback and packet printing form a substantial learner workflow. Fix timer lifecycle and reward IDs first. Also refine progress reporting: `countAnswers` (`view_dbq_source.jsx:32-55`) counts sourcing, analysis, HAPP and essay but omits corroboration/reliability/rubric work shown elsewhere. Align progress with the assigned tasks, and make submitted feedback visibly associated with the text revision it evaluated. These latter two points are improvements beyond the confirmed findings above. |
| Math / STEM entry | MathView has defensive normalization, resource/problem-scoped response identities, accessible math input and manipulative return-context guards (`view_math_source.jsx:15-41`, `320-441`, `706`, `897-919`). Existing lifecycle/null-content tests passed. No new confirmed issue in that entry path was established. Keep generated Math tasks and their STEM manipulative launches visibly tied to the same problem; prefer a shared return-to-question action and completion receipt. This is an entry/integration review, not an audit of every individual STEM lab. Existing separate 2026-09-04 basic-math reviews already cover deeper basic-math refinements. |

## Verification

Existing test run: **9 files, 100 tests passed**, using Vitest with one worker:

- `quiz_answer_key_single_source.test.js`, `quiz_mode_presets.test.js`
- `concept_sort_dialog_a11y.test.js`, `timeline_topic_mode_integration.test.js`
- `persona_session_artifact.test.js`, `persona_runtime_deep_dive.test.js`
- `adventure_runtime_regressions.test.js`
- `math_state_lifecycle.test.js`, `math_view_null_content.test.js`

Additional isolated, in-memory probes executed the exact Concept Sort identity/start-handler code and actual compiled Timeline revision module. They reproduced the blocked Concept Sort async start, cross-resource timeline overwrite, and stale history after nonvisual revision. They did not edit app data, connect to a live class, or call an AI provider. DBQ lifecycle/reward and Activities editing findings were verified by tracing the current source and shell contracts. Existing passing tests do not cover those failing contracts.
