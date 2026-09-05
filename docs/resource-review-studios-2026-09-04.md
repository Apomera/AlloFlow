# Resource review: studios, note-taking, planning and alignment

Date: 2026-09-04. Read-only audit of the current workspace. No app implementation was changed or rebuilt. This report covers six of the main 24 resources; Poll and Async Poll are outside this scope.

## Coverage

| Resource | Current integration verified | Refinement assessment |
| --- | --- | --- |
| Note-Taking Templates | Six template renderers, editable notebook/history entries, feedback and score integration, shared document export. Main host: `AlloFlowANTI.txt:52756`; template dispatch: `note_taking_templates_source.jsx:1248`; export: `doc_pipeline_source.jsx:41107`. | Fix the runtime AI setting mismatch. Then adopt learner-response ownership and durable feedback, using the newer studio boundary as the model. |
| Anchor Charts | Type-aware poster, keyboard reorder, image regeneration, interactive response mode, Notebook discovery, Pictionary handoff, PNG and document export. Host: `AlloFlowANTI.txt:52761`; view: `anchor_charts_source.jsx:414`. | Highest priority in this group: learner answers are lost, can appear under another chart, and are absent from submissions. Also guard async image writes and honor runtime AI restrictions. |
| Memory Aid Studio | Separate learner responses, isolated teacher preview, bounded submission adapter, teacher reference/worksheet printing, saved reference read-aloud, private practice isolation, explicit AI capabilities. Host: `AlloFlowANTI.txt:52769`; implementation: `memory_aid_source.jsx:2261`; boundary: `studio_response_module.js:75`. | Earlier integration gaps are substantially closed. Resolve the current generated-module freshness failure, then improve discovery and complete localization/manual assistive-technology validation. No additional functional failure established by this review. |
| Applied Challenge Studio | Separate learner response document, teacher preview, structured submission/evidence adapters, worksheet/reference/portfolio export, phase navigation, read-aloud and explicit AI gating. Host: `AlloFlowANTI.txt:52788`; view: `applied_challenge_source.jsx:1207`. | Strongest integration pattern in this group. Expand common work discovery and continue realistic classroom delivery/accessibility validation. No new functional failure established by this review. |
| Lesson Plan | Role-specific teacher/student/family generation, history-derived lesson context and asset manifest, editing, copy/PDF/print, extension guides, next-lesson progression and recommended STEAM tools. Host: `AlloFlowANTI.txt:52937`; dispatcher: `generate_dispatcher_source.jsx:6901`. | Guard late extension-guide results so they cannot overwrite edits or reopen a previous plan. Capture the actual source/dependency manifest in the plan to keep its provenance accurate. |
| Standards/UDL Alignment (Curriculum Audit) | Teacher-only comprehensive audit with evidence scope, dimension findings, apply-fix actions, audio/accessibility qualification and a rerun notice. Host: `AlloFlowANTI.txt:52812`; renderer: `view_alignment_report_source.jsx:1082`. | The existing stale-report notice misses edits to audited resources. Compare content versions/fingerprints, not only added/deleted IDs. |

## Confirmed functional findings

### P1 — Interactive Anchor Chart learner work has no durable response path

**Evidence:** `anchor_charts_source.jsx:520` initializes `studentAnswers` as local React state. `anchor_charts_source.jsx:699` changes only that state. The host passes no learner response document or update callback (`AlloFlowANTI.txt:52761`), and the submission path serializes canonical history entries (`AlloFlowANTI.txt:40701`). Only Memory Aid and Applied Challenge receive response adapters (`studio_response_module.js:6`; `AlloFlowANTI.txt:40703`). Anchor document export likewise reads `item.data.sections` (`doc_pipeline_source.jsx:41745`).

**Reproduced in the current runtime module with real React:** enter “Learner original response” into chart A. The canonical update callback receives zero writes. Re-render chart B with the same section ID and A's response is still visible. Unmount/reopen chart A and its answer becomes empty. `awardedXp` resets on resource ID (`anchor_charts_source.jsx:527`), but answers and feedback do not.

**Impact:** visiting another resource can discard learner work; switching directly between charts can misattribute it; assignment submission contains the teacher chart without the learner's interactive answers. A “submit for feedback” action does not mean the work reached the teacher.

**Refinement:** add resource/profile-scoped response autosave, hydrate/reset on resource change, use stable section/item IDs, include learner answers and feedback in the standard submission adapter, and project answers into learner exports. Reuse `StudioResponse.Boundary` rather than adding a separate storage system.

### P2 — Anchor Chart async image completion can update the wrong section or resource

**Evidence:** auto-generation captures the numeric `idx` and later writes that index after `callImagen`/image refinement complete (`anchor_charts_source.jsx:541`, `anchor_charts_source.jsx:568`). The effect has no cancellation/identity check. Manual regeneration similarly captures `s` and replaces it after awaits (`anchor_charts_source.jsx:580`, `anchor_charts_source.jsx:595`). The host updater targets whatever resource is currently active and accepts all four note/studio types (`AlloFlowANTI.txt:29174`).

**Source-derived reproduction:** open chart A with a missing icon, switch to chart B before the image returns, then resolve A's image request. A's callback updates B's same numeric section. Reordering/deleting sections while generation runs can also attach the image to a different section. A manual regeneration can restore stale section text over an edit made while it runs.

**Refinement:** bind mutations to the originating resource ID and stable section ID, merge only the returned image field into the latest section, and ignore/cancel results after resource changes or section deletion. The existing concurrent-icon test covers parallel writes on one unchanged chart, not these navigation/reorder cases (`tests/anchor_icon_gen_persist.test.js:40`).

### P2 — Notes and Anchor Charts ignore the student “hide AI features” setting

**Evidence:** `studentAiFeaturesHidden` combines the teacher setting and unconfigured QR student mode (`AlloFlowANTI.txt:11164`). Nevertheless, Note-Taking receives the live `callGemini` provider (`AlloFlowANTI.txt:52759`) and Anchor receives `callGemini`, `callImagen`, and `callGeminiImageEdit` (`AlloFlowANTI.txt:52763`, `AlloFlowANTI.txt:52767`). Notes' feedback action only checks provider existence (`note_taking_templates_source.jsx:373`); Anchor's feedback action does the same (`anchor_charts_source.jsx:726`). Anchor can start icon synthesis merely by rendering an incomplete chart (`anchor_charts_source.jsx:541`).

**Reproduction:** enable “hide student AI features,” enter student mode with a notes template or armed chart, and inspect the resource controls. Feedback actions remain available and retain AI callbacks. A missing chart icon can trigger synthesis on mount. An unconfigured device may fail at provider configuration later, but the intended feature restriction has already been ignored.

**Refinement:** pass explicit capability flags and null providers, hide/disable unavailable feedback actions, and never fall back from an explicit null to a global provider. Memory Aid and Applied Challenge already show the correct host pattern (`AlloFlowANTI.txt:52776`, `AlloFlowANTI.txt:52795`; `memory_aid_source.jsx:2387`; `applied_challenge_source.jsx:1269`).

### P2 — Audit freshness does not detect edits to resources already audited

**Evidence:** `computeAuditFreshness` returns immediately for every included resource ID (`view_alignment_report_source.jsx:1063`). It calculates staleness solely from newly created resources and missing IDs (`view_alignment_report_source.jsx:1065`–`1069`). Existing resource edits commonly preserve the timestamp, such as Lesson Plan editing (`AlloFlowANTI.txt:47141`) and notebook/chart editing (`AlloFlowANTI.txt:29186`).

**Reproduced:** run the exact current pure function with an audit containing quiz ID `q1`, then pass the same ID with changed quiz content and even a later timestamp. Result: `{"added":[],"removed":0,"stale":false}`.

**Impact:** teachers can edit text, questions, scaffold content, or a plan in a way that invalidates standards/readiness conclusions, while the audit displays no rerun notice.

**Refinement:** store the content fingerprint/revision of each included artifact and compare it when displaying the report; mark modified, added and removed dependencies distinctly. Persist the same provenance into exported reports.

### P2 — A late Lesson Plan extension guide overwrites newer edits and active selection

**Evidence:** `handleGenerateExtensionGuide` captures `generatedContent` and `activity`, awaits AI (`AlloFlowANTI.txt:42000`), then reconstructs the whole old `data` object and writes it to active content/history (`AlloFlowANTI.txt:42001`–`42007`). There is no resource-current check or functional merge of the completed extension.

**Source-derived reproduction:** request an extension guide, edit a plan objective while generation runs, and let the request finish: the captured old objective is restored. If a different resource was selected, completion resets active content to the earlier plan. Two extension guides generated concurrently can overwrite each other's completed work.

**Refinement:** update the originating history record by ID with a functional merge that changes only the matching extension's `guide`, and update active content only if its ID still matches. Use a stable extension ID and ignore obsolete requests.

## Refinements that are not established bugs

- **Unify notebook ownership:** Notes intentionally persist directly to canonical history (`AlloFlowANTI.txt:29174`). Move learner-written fields and feedback into the existing response store while retaining authored cues/source excerpts as immutable scaffolds. This would align profile isolation, teacher preview, save-status and submission behavior with the newer studios. This review did not reproduce cross-profile leakage in Notes, so it is an architectural refinement rather than a claimed privacy incident.
- **Make feedback durable and accurately represented:** Notes keep detailed feedback in component state (`note_taking_templates_source.jsx:362`, `398`), while persisting only the score/count (`423`–`425`). Preserve feedback with a draft fingerprint so returning learners can act on it and teacher review can distinguish current feedback from feedback on an earlier draft.
- **Broaden the common work shelf:** Notebook currently recognizes Notes and Anchor Charts only (`note_taking_templates_source.jsx:1285`–`1291`; host count at `AlloFlowANTI.txt:22699`). Include Memory Aid and Applied Challenge learner work, or provide an equivalent common “My work” entry. This is discovery consistency, not missing History support.
- **Show actual Lesson Plan dependencies:** Generation already uses `getLessonContext(historySource)` and an asset manifest (`generate_dispatcher_source.jsx:6903`–`6912`). The view's “based on” label instead checks which kinds happen to be in current history (`view_lesson_plan_source.jsx:74`), and its topic/grade come from current project props (`view_lesson_plan_source.jsx:39`). Store the used artifact IDs/versions and generation settings on the plan; link those exact resources and warn when they change.
- **Finish shared accessibility/localization treatment:** Notes and Anchor use many literal English field headings, hints and feedback labels (examples: `note_taking_templates_source.jsx:540`, `556`; `anchor_charts_source.jsx:1084`, `1098`). New studios already use the shared translator/read-aloud and explicit preparation controls (`memory_aid_source.jsx:3450`; `applied_challenge_source.jsx:1757`). Prefer the same accessible reading controls and font/settings behavior, followed by human-reviewed translation and manual screen-reader checks. The prior review already records real browser responsive checks for both newer studios; those are not claimed as newly run here.

## Validation and build status

Ran 11 existing suites covering Notes helpers/focus, Anchor helpers/icon persistence, Memory Aid schema/review flow, Applied Challenge schema/interaction/export, the shared response boundary and studio read-aloud:

- **238 tests passed; 1 failed (239 total).** Ten suites passed; one suite had the single failure.
- The only failure is `tests/memory_aid.test.js:80`: `_build_memory_aid_module.js --check` reports both `memory_aid_module.js` and `desktop/web-app/public/memory_aid_module.js` stale relative to source. This is a **source/build parity finding**, not evidence that the Memory Aid interaction tests failed. No rebuild was performed in this read-only review, and the preexisting dirty working tree was preserved.
- Additional in-memory diagnostics used the current Anchor runtime module and real React to verify response carryover/loss, and the exact current audit freshness function to verify missed edits. These diagnostics wrote no app or test files.
- Async image/extension races are supported directly by current mutation paths and source-derived reproduction steps, rather than a browser/network test. AI provider calls, live mailbox delivery, physical printing, manual assistive technology and end-to-end multi-profile sessions were not exercised.

The previously implemented Memory Aid/Applied Challenge changes in `docs/STUDIO_INTEGRATION_REVIEW_2026-09-04.md` were checked against current code and are counted as existing strengths, not reopened findings.

## Implementation follow-up after authorization

The sections above record the original audit. The subsequent authorized changes now give Notes and Anchor Charts the shared response boundary, resource/profile isolation, teacher previews, local recovery, bounded submissions and learner export projections. Anchor image completion targets stable section/bullet identities on the originating resource, and Notes feedback persists with a compact draft fingerprint and is invalidated by edits. Both resources and Notebook insights honor runtime AI restrictions. The shared Notebook includes Memory Aid and Applied Challenge entries and reopens canonical resources.

Audit scope now records deterministic content versions through the new data-only `ResourceContentFingerprint` module. The report notices edited dependencies and explicitly qualifies older reports without stored versions. The host integration and canonical Notebook selection were reviewed against these APIs.

Validation after implementation: 139 checks passed across ten focused suites. The final boundary/migration set contains 19 new behavior checks; its final two-suite rerun passed all 32 checks after three earlier 5-second scheduling timeouts under concurrent build load. Anchor and Notes source/build freshness checks pass, all five affected runtime mirrors match, and module registration finds all 209 consumers with zero missing or suspect producers. The Windows build transient was resolved with atomic generated-module replacement; no unresolved build error remains in this group. External providers, live delivery and physical printing were not exercised by these checks.
