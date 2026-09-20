# Visual organizer and live activity review — September 19, 2026

> Latest: [private LAN submissions, teacher review, revisions and feedback](PRIVATE-LAN-REVIEW.md).

> See [the implemented follow-up](FOLLOWUP.md) for KWL live reflections, mount/receipt reliability, reasoning activities, clearer controls, and real LAN verification. The findings below describe the initial audit.

Reviewed the 15 organizer types in Create Diagrams, the generated-data normalizer, static and interactive renderers, game adapters, teacher launch/retry handlers, student resource delivery, progress contracts, and session transports. This is a code and local runtime review. No AI generation request, classroom session, account data write, deployment, or packaged application build was performed.

## Outcome

Fourteen of the 15 selectable diagram types now have an associated scored activity. KWL has editable local responses, but it still lacks a live response/submission workflow. Existing “interactive diagram” editing and the diagram-specific learning activities remain separate surfaces; that distinction needs clearer product copy.

This pass adds CER sorting, corrects Problem–Solution scoring, and fixes concrete problems in launch ordering, normalized data, queued actions, student navigation, and nested game dialogs. It does **not** establish that a deployed classroom provider is functioning end to end; that requires two real participants on the selected provider and the newly built application.

## Type-by-type findings

| Organizer | Current activity support | Assessment and recommended improvement |
| --- | --- | --- |
| Venn Diagram | Teacher-curated three-region sorting; local practice and live launch | Finalized region data travels with the live activity. Requires a card in every region and four total. Launch now waits for the session write before opening the preview. Add clearer review of shared-region membership and support defensible alternative placements. |
| T-Chart | Two-column sorting | Requires exactly two populated columns and four cards. Good fit for classification. Add an optional explanation for ambiguous items rather than treating every category assignment as indisputable. |
| Fishbone | Details sorted into cause categories | The existing game matches the source diagram. Useful recognition practice; it does not assess whether the proposed causes actually explain the effect. Add evidence or justification after sorting. |
| Structured Outline | Details sorted under headings | Supported locally and live. Distinguish organizing headings hierarchically from assigning individual details. A reorder/build-outline mode would exercise the former. |
| Key Concept Map | Details sorted onto branches; separate editable graph/challenge view | Branch sorting does not assess labeled relationships. A subsequent connect-and-explain step would make better use of the diagram. Explicitly distinguish editing the graph from launching its activity. |
| Flow Chart | Pipeline Builder, including forks and merges | Branch destinations are preserved into the game; existing checks cover convergence and missing paths. Show clear guidance when the source lacks enough populated steps. Do not silently flatten branching diagrams into linear sequences. |
| Cause and Effect | Cause/effect sorting, including stable semantic roles | Normalized roles support translated section labels. Sorting classifies statements but does not necessarily pair each cause with its effect. Add causal-link matching and a separate chain-order activity. |
| Problem Solution | **Changed:** match details to the actual solution paths | The previous adapter assigned Try First/Try Next/Last Resort by dividing item order into thirds, without source evidence for that priority. This pass removes that answer key. Generation now requests named solution paths and a stable optional outcome role. Still requires two populated paths and six cards; unsupported short sources should keep the disabled activity and repair guidance. |
| Frayer Model | Four-zone vocabulary sorting | Requires all four sections, with enough total cards. This pass ensures the activity receives the same normalized items shown in the diagram. Add learner-created examples/non-examples and justification as a deeper follow-up. |
| KWL Chart | Writable notes saved on the device; **no live activity/submission** | Highest-priority remaining capability gap. Use an ungraded reflection workflow: prior knowledge, questions, then learned/revised thinking. Do not grade predicted “Know” statements as if the student personally supplied them. Add explicit submit/revise, teacher progress, and clearly scoped draft persistence. |
| Claim–Evidence–Reasoning | **Added:** Claim/Evidence/Reasoning sorting, local and live | Reuses the existing outline-sort lifecycle, validated three-section data, and existing progress receipt contract. The label identifies CER in the game. This checks recognition of statement roles; a later claim-writing and evidence-to-reasoning activity should assess argument construction. |
| Story Map | Five-part narrative sorting | Requires a complete five-section narrative. Incomplete or non-narrative source data gets a fallback instead of invented sections. Normalized items now reach the activity. Consider sequencing within stages and evidence for turning points. |
| See–Think–Wonder | Three-zone sorting | Normalized items now reach the activity. Classification can introduce observation/inference/question distinctions, but students also need to record their own observations and questions. Avoid presenting one generated interpretation as the only legitimate interpretation. |
| 3D Concept Space | Strand Challenge plus Concept Recall | Both have live readiness/launch hooks; recall requires concept artwork. Keep stable data identity for the 3D scene. Add a clear two-dimensional equivalent for learners unable to use the scene; a complete multi-device 3D classroom exercise remains outside this local test. |
| Memory Palace | Recall activity and live arm/stop callbacks | Existing recall engines and remote-stop behavior were included in the validation scope. A clearly surfaced nonspatial list alternative and route-review guidance remain worthwhile. Verify loading and reconnect behavior on the actual devices/provider used in class. |

The renderer also accepts the legacy aliases Mind Map and Process Flow / Sequence, mapped to concept-map sorting and Pipeline Builder respectively; they are not additional options in the current picker.

## Implemented integration improvements

1. **Diagram → launch consistency.** Readiness and resource revisions use the shared diagram normalizer when available. The host derives the launch structure from that same normalized data. Frayer, Story Map, and See–Think–Wonder no longer render normalized text and then pass raw object-shaped items into the game.
2. **Reliable teacher launch.** Shared two-dimensional activity controls, including the Venn setup launch, await a successful live write before opening the teacher preview. A rejected write leaves the diagram and launch feedback visible. Local practice does not issue a misleading request to start a live session.
3. **Queued actions retain context.** Launches capture their session and diagram before awaiting earlier writes. They do not silently target a different session or a different diagram opened while waiting. Targeted retries check the still-current activity after the queue resolves, preventing a queued retry from restoring an activity that was stopped or replaced.
4. **Student delivery is consumed once.** An activity delivery is marked consumed even if its exact diagram is already open. Later roster updates therefore do not pull a learner back after navigation. A targeted retry has its own delivery token and can reopen the diagram once for that student.
5. **Evidence-aligned solution matching.** Problem–Solution grades matching against its real branch membership. Optional translated outcomes use an explicit role, and generation instructions describe the expected solution-path structure without requiring invented content to fill a quota.
6. **CER activity support.** CER offers an accessible launch control, validates populated Claim/Evidence/Reasoning sections, and uses the existing outline activity type for transport and completion reporting. No new provider permission schema was introduced.
7. **Game dialog keyboard behavior.** The shared workspace listener yields Escape/Tab to nested dialogs. Multi-bucket completion keeps focus on Play Again instead of allowing a delayed item-focus callback to move behind the completion dialog.

## Remaining work, in priority order

**1. KWL live reflection.** Add a non-scored activity with an activity/resource identity, learner-scoped draft key, explicit submission, revision, and teacher-visible progress. The current localStorage key is based on topic and section titles, not resource or learner identity; charts with the same labels on a shared device can reuse notes. Access to localStorage also occurs outside the storage try/catch. Address both while adding persistence. Responses must remain learner-authored; generated examples should be labeled as examples.

**2. Clarify creation, editing, practice, and delivery.** The toolbar's generic interactive-diagram control and each diagram's activity button represent different actions. Prefer explicit labels such as Edit diagram, Practice activity, and Start for students. Surface the activity's prerequisites before generation where possible. Preserve short-source fallbacks rather than manufacturing cards solely to enable an activity.

**3. Improve live receipt reliability and meaning.** The student launch effect treats registered two-dimensional game modules as ready; it does not prove a particular game mounted successfully. Mismatched-resource exits cancel the stall timer, so undelivered data can remain loading. Receipt signatures are recorded before network success, which can suppress an identical retry after a rejected write. These need focused mount acknowledgments and delivery/retry tests. Many sorts report completion rather than continuous per-card progress; the dashboard should not imply more detailed evidence than was actually reported.

**4. Add reasoning and flexible answer evaluation.** Sorting is useful introductory practice, but repeated categorization does not assess causal explanation, argument quality, alternative solutions, or student-generated thinking. Add short explanations, alternate valid placements, source references, and teacher review before increasing the number of scored game variants.

**5. Maintain the live contract tests.** The initial 11-file baseline had 70 passing and 45 failing tests. Many failures came from tests searching the old monolith for handlers now extracted into host_handlers_source.jsx, or assuming all three host files must be byte-identical despite existing desktop URL/build differences. New behavior tests exercise the actual built host-handler factory and game components. The old broad suites were not rewritten wholesale or represented as passing. A newline-sensitive Pipeline assertion and the activity/golden expectations affected by this change were updated.

## Verification and practical limits

357 focused checks passed with 0 failures across 15 test files. Runtime module syntax, public mirror parity, host dependency wiring, and scoped whitespace checks passed. See validation.json for the final machine-readable counts and browser-results.json for the Chromium result. Focused runtime checks cover successful and rejected writes, stale resource revisions, queued resource/session changes, current and stopped retries, normalized legacy diagrams, local versus live launch, CER section readiness and completion, solution-path scoring, and consume-once student navigation.

Chromium ran the production renderer and game bundles with a deterministic CER fixture. Enter selected every card, destination buttons completed all four placements, Escape closed the activity once, and the activity control was available at a 390-pixel viewport. This is a keyboard/DOM check, not a full styled mobile visual audit or a real provider test. Run the reproducible browser harness from the repository root with `node reports/visual-organizer-review-2026-09-19/verify-browser.cjs`.

The targeted tests use local fixtures and mocked provider writes. A final classroom smoke test still needs an actual teacher and student: join; generate/save a diagram; wait for resource delivery; start the activity; complete it; inspect the teacher receipt; navigate away; retry the intended learner; stop; disconnect/rejoin; confirm no stale launch or repeated navigation. Repeat on the provider actually selected (LAN, mailbox, or Firebase). Existing live activities should be stopped and relaunched after adopting the new normalization/revision behavior.

No deployment or packaged desktop build was performed. Existing unrelated changes in the shared workspace were preserved.
