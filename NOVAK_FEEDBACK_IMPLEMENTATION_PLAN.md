# Novak feedback: scoped implementation plan

Date: 2026-09-19  
Status: core reading implementation completed locally on 2026-09-19; see reports/novak-feedback-implementation/README.md for validation and remaining release limits.  
Reviewed checkout: `749347d7b` (other work is active in this shared checkout).  
Companion: [NOVAK_FEEDBACK_HANDOFF.md](NOVAK_FEEDBACK_HANDOFF.md).

## 1. Recommended outcome and architecture

Make **Read original with supports** the first action for a pasted or selected source. Opening it must not require an AI call or a completed analysis. Keep **Create adapted companion** as an explicit teacher action, supplemental by default. Both versions must retain access to the exact source selected for that work.

Reuse the existing reader and retain the internal `type: 'simplified'` for readable text artifacts. Distinguish the instructional form with the existing `instructionalText.form`, rather than introducing a new resource type or passing an analysis object into a string-based reader. The contract module explicitly describes `simplified` as a renderer/persistence identifier.

The work is more than adding a button, but does not require a second reader. The substantial parts are source identity, preservation across mutations and transport, and annotation rendering. Most routing and reader capabilities can be reused.

Recommended release sequence:

1. Establish exact source snapshots and text-safe persistence.
2. Add the original-reader entry points, honest labels, and mutation protection.
3. Carry originals through student sharing and exports. Student paired reading begins in step 2, as refined in section 9.
4. Add generated gloss annotations, with source-preserving rendering and audio.

Steps 1–3 constitute the first complete response to the replacement concern. Step 4 answers the specific request for glosses throughout the text. Quick Start loading is a separate workstream.

## 2. What the source investigation establishes

References below are repo-relative paths and line numbers from this review. They are evidence anchors, not stable API locations.

| Area | Verified behavior | Implication |
| --- | --- | --- |
| Existing contract | `instructional_context_module.js:392` normalizes all three forms; `:419` reads profiles; neither persists an artifact. | Reuse the contract and add shared preservation helpers. Metadata support alone does not establish preservation. |
| Source shape | Analysis uses `data.originalText`; simplified uses a string `data`. | Do not pass the analysis object directly as reader text. |
| What “original” contains | `generate_dispatcher_source.jsx:5519–5542` chooses `analysisData.translatedText` when present, cleans formatting, and stores the result as `originalText`; `rawEnglishText` receives the then-current `textToProcess`. | Neither field name proves that it contains the unmodified user input. Capture the selected text before these transformations. |
| Source choice | `generate_dispatcher_source.jsx:2746–2777` chooses the latest analysis body for ordinary generation, but selects the primary ID separately. Explicit `textOverride` can still acquire an ambient source ID. | Resolve text and source identity together. Cover overrides, batches, and multiple lessons. |
| Bilingual generation | `generate_dispatcher_source.jsx:2778–2786` can select the English block before generation. | Retain the complete selected source separately from the generation working text, and record the transformation. |
| Source edits/deletion | `host_handlers_source.jsx:5862`, `:9677`, and `:4311` change analysis text or remove its history item. | A link alone is insufficient. Existing companions must keep their own source snapshot. |
| Generation defaults | `generate_dispatcher_source.jsx:3904` passes `configOverride.instructionalText` to the normalizer with adapted/supplemental defaults. | The default is overridable. Generic rewrite generation must not mint a preserved-text claim from supplied metadata. |
| Existing comparison | `view_simplified_source.jsx:2231–2275` compares linked source and adapted text, including language selection and bounded diff work. `:920` makes comparison teacher-only. | Extend this surface; do not build another original/adapted comparison. |
| Wrong-source fallback | `view_simplified_source.jsx:292–315` falls back from missing links to the latest analysis, then current input. | A missing source must not silently become another lesson. |
| Reader preparation | `view_simplified_source.jsx:1095–1125` strips references, normalizes line endings, converts some formatting to headings, and trims the read-aloud body. | Preserve canonical text separately from display/audio projections; bypass inappropriate adapted-text cleanup for originals. |
| Role change | `view_simplified_source.jsx:221–239` resets every simplified artifact's form to `adapted`. Role labels near `:2125` also assume primary means replacement. | Preserve form when role changes; original primary text requires no replacement authorization. |
| Audit fallback | `generate_dispatcher_source.jsx:1694–1756` builds vocabulary input and labels its adapted fallback `adapted-fallback-not-primary`. | This is not evidence of persisted source replacement. Keep useful vocabulary fallback semantics; add preservation evidence separately. |
| Offline retention | `AlloFlowANTI.txt:23080` saves only the retained tail of history and serializes `data`. | A source may age out while its adaptation remains. Snapshot ownership must not depend on history order. |
| Hydration | `firestore_sync_module.js:535–565` attempts JSON parsing on any string `data`; local serialization at `AlloFlowANTI.txt:23087` also tries parsing strings. | Text that is valid JSON needs a typed round-trip contract, including compatibility with older serialized envelopes. |
| Session limits | `firestore_sync_module.js:377–395` has a 256 KiB resource budget and trims individual strings after 120,000 characters. `:465` can compact an item without its body. | Long text and annotations need an explicit complete/partial/unavailable outcome. Never retain a verified-original label on altered content. |
| Student packs | `live_aac_source.jsx:401–413` applies the session sanitizer to generic student-pack resources, even though pack transport is chunked. | A pack is not automatically exempt from the text-trimming path. |
| Community sharing | `view_history_panel_source.jsx:507–531` explicitly selects fields for the shared resource. | New snapshot/support fields need deliberate safe projection; object spreading elsewhere will not save them here. |
| Student filtering | `AlloFlowANTI.txt:3343–3372` does not exclude `analysis` from the shared candidate rule. | Do not claim the source is universally absent from sessions. The actual issues are reader access, source identity, and packaging. |
| Export selection | `view_export_preview_source.jsx:3687–3688` labels types as Source Analysis and Adapted Text. `doc_pipeline_source.jsx:40034–40046` filters by those types and treats analysis separately for student copies. | Form-aware labels and original inclusion are needed. Turning on the entire analysis export would include teacher review material. |

### Corrections to the original handoff

- The return at reader line 384 belongs to alignment checking; line 515 belongs to rigor regeneration. Neither is a top-level renderer rejection.
- The existing comparison already handles original versus adapted text. Its student availability is the gap.
- The audit fallback is explicitly labeled and does not mutate history.
- Source-level UI gating cannot establish which mode the Novak reviewer used or why a specific model response occurred. Treat those causal claims as unverified.
- The launch-pad class setter is in `view_launch_pad_source.jsx:541`, so source is available for it.
- The root shell and desktop source shell matched by SHA-256 during this review. The root, public, and app-build simplified modules also matched. File parity is not proof of the live deployed browser state.

## 3. Proposed data contract and invariants

Extend the existing contract with versioned fields alongside `instructionalText`. Do not hide new data inside `instructionalText`: its normalizers whitelist fields and would discard it at several boundaries.

Proposed fields, subject to implementation naming review:

| Field | Purpose |
| --- | --- |
| `sourceSnapshot` | Exact selected source string, format, source language, optional source artifact ID, fingerprint/version, and capture provenance. The text is authoritative; the ID is navigation/context. |
| `readingSupports` | Versioned annotations referencing that snapshot fingerprint. Each annotation has a stable ID, exact quote/range anchor, support kind, and plain-text explanation. |
| Preservation evidence | A derived result from checking the artifact against its snapshot. Recalculate on creation, import, mutation, and transport; never trust an imported boolean. |

Keep `data` a string for reader compatibility. For a supported-original artifact, it must equal the canonical source text. For an adaptation it is the rewritten text, while the source snapshot remains unchanged. This initially duplicates some text, so size checks must account for the complete payload. Deduplicated storage can follow measured need; a referenced-only snapshot would reintroduce deletion and retention failures.

Required invariants:

1. **Original means the exact selected text at capture time.** Capture before translation, reference stripping, heading cleanup, or model calls. This is a text-string guarantee, not byte fidelity to an imported PDF/DOCX file.
2. **Source lineage is coherent.** Source text, ID, language, and capture provenance come from one resolution result. Store generation transformations separately from the canonical source.
3. **History is not the source of truth for existing companions.** Deleting or editing the analysis, changing input, or opening another lesson does not alter their original.
4. **Only a preservation-valid artifact receives the supported-original claim.** Generic rewriting always produces an adapted form. Educator replacement authorization applies only to adaptations.
5. **Supports never become canonical prose.** Toggling glosses, density, voice, focus, or theme does not change `data` or the snapshot.
6. **Mutation cannot leave a false form label.** All supported-text editing routes either refuse body replacement or create an adapted copy with its own ID and the same source snapshot.
7. **Transport never silently degrades preservation.** Validate after hydration. Trimming, compaction, missing bodies, and invalid anchors produce explicit incomplete/unavailable states.
8. **No provenance invention for legacy resources.** An exact linked analysis can be offered as the saved source; do not describe it as verified original input when it may have been translated or edited. Ambiguous history requires an explicit source choice.

The existing `fingerprintText()` normalizes CRLF to LF. Its complexity fingerprint should not be reused as the sole proof of exact text equality. Use direct equality for the preservation invariant and a versioned fingerprint over the agreed exact representation for identity and annotation binding.

## 4. Work packages

### A. Source capture and persistence foundation — medium/high scope

Primary files: `instructional_context_module.js`, `generate_dispatcher_source.jsx`, `generation_helpers_source.jsx`, `AlloFlowANTI.txt`, `firestore_sync_module.js`; inspect project load compatibility in `misc_handlers_source.jsx`.

Work:

- Add shared source resolution, snapshot construction, preservation validation, and form-aware capability helpers to the contract module.
- Resolve source once for direct generation and Full Pack/Blueprint fan-out. Explicit source overrides take precedence and cannot inherit an unrelated primary ID.
- Capture a source snapshot when opening the original reader or starting adaptation. Do not require analysis generation merely to retain a source.
- Preserve the selected canonical text before bilingual extraction and display cleanup. For an educator-selected revised analysis, record that it is the selected revised source rather than claiming recovery of the initial paste.
- Fix text versus JSON-envelope ambiguity in local storage, cloud hydration, and relevant imports. Avoid globally disabling JSON parsing for object-shaped legacy resource types.
- On source edits, preserve snapshots held by existing companions. A newly selected revision creates a new snapshot identity.
- Preserve the existing vocabulary fallback labels; add source availability/preservation evidence without turning adapted vocabulary counts into original-text evidence.

Done when: direct paste, explicit override, latest-analysis selection, a translated analysis, multiple lessons, and Full Pack all have coherent source text/identity; save/load preserves exact strings; deleting the source history item does not break an existing companion.

### B. Original reader and instructional framing — medium scope

Primary files: `view_sidebar_panels_source.jsx`, `view_analysis_source.jsx`, `view_simplified_source.jsx`, `host_handlers_source.jsx`, `generation_helpers_source.jsx`, `content_engine_source.jsx`, `AlloFlowANTI.txt`, shared contract and translation packs.

Work:

- Add **Read original with supports** beside the current Text Adaptation entry point, and **Read with supports** on a selected analysis. The first action uses the intended current source explicitly and works without AI configuration.
- Construct a `simplified` history item with `role: 'primary'`, `form: 'same-text-supported'`, preserved source data, source provenance, and no replacement authorization. Use workflow-default designation for automatic creation; use educator designation only for an actual educator choice.
- Deduplicate repeated opens by source identity while preserving distinct intentional versions. Keep resource-instance identity and full-history hydration semantics intact.
- Show form-aware status to all modes: Original with supports, Adapted companion, or Educator-designated adapted primary. Keep role editing teacher-only.
- Preserve form in `updateSimplifiedInstructionalRole`; do not show a primary-replacement warning for original text.
- Add an original-appropriate body projection. Preserve verse line breaks, punctuation, speaker labels, stage directions, language, and references. Avoid the adapted heading heuristics.
- Reuse TTS, Define, Explain, immersive view, line focus, and keyboard selection. Opening/reading must not be gated by AI availability; AI-backed support actions retain their existing capability requirements.
- Add an **Original / Adapted companion** switch whenever an adaptation has a recoverable original. Stop old audio and clear help/focus state on version changes.
- Make supplemental-purpose prompt guidance independent of attached standards. Add it only to adaptation generation paths, including cloud/local variants; do not force it onto every resource type. Put brief instructional-use guidance beside the mode choice.

Mutation coverage must include:

| Path | Current seam | Required behavior on supported originals |
| --- | --- | --- |
| Manual editing and formatting | `host_handlers_source.jsx:10795`; shell `handleSimplifiedTextChange` | Body replacement guarded centrally; explicit Create adapted copy can fork. |
| Selection revision | `content_engine_source.jsx` / generated module `:2607` | Explanation stays additive; Apply must not rewrite original. Validate again after asynchronous results. |
| Complexity adjustment | `generation_helpers_source.jsx:3368` | Hidden/disabled for originals; handler enforces the restriction even if invoked directly. |
| Rigor regeneration | `view_simplified_source.jsx:486`, body replacement near `:731` | Do not mutate originals; any requested rewrite becomes adapted. |
| Role changes | `view_simplified_source.jsx:221` | Change role without changing form or fabricating replacement authorization. |
| Undo/redo and generic updates | `host_handlers_source.jsx` `_applyTextDomain`, `onUpdateResource` wiring | Cannot restore mismatched body/form/support combinations. |
| Analysis edits | `handleAnalysisTextChange`, `onCorrectAnalysisText`, `handleAiRefineSource` | Do not change snapshots already used by reader artifacts. |

For the first release, suppress writing controls on originals and offer one explicit adapted-copy action. Supporting every editor as an automatic fork in the same release adds avoidable complexity. Read-only practice can remain if it does not change stored text; a cloze worksheet is a derived activity and must not substitute for the original in export.

Done when: a bare Macbeth paste opens the full reader without rewriting; changing role or triggering any mutation handler cannot silently alter the original; adapted companions remain available and clearly framed.

### C. Sharing, exports, audit, and student comparison — high scope

Primary files: `firestore_sync_module.js`, `live_aac_source.jsx`, `session_transport_module.js`, `view_history_panel_source.jsx`, `export_source.jsx`, `export_handlers_module.js`, `doc_pipeline_source.jsx`, `view_export_preview_source.jsx`, plus existing shell/session orchestration. Review `agent_core_resource_pack_module.js` if headless pack output is included in the release.

Work:

- Introduce a shared collection/projection step that makes a readable original travel with an adaptation when sending a lesson or exporting a student pack. Do not include the entire analysis object just to expose its prose.
- Preserve source snapshots and annotations through student-pack serialization and the community field allowlist. Carry only intended reading data and provenance, not arbitrary teacher configuration.
- Treat the 120,000-character string limit and 256 KiB session resource limit explicitly. Keep complete originals locally. For oversized sharing, use an existing complete-pack route where it can preserve the text, or report that the original cannot be delivered through that route. Do not bypass limits or silently send an adaptation as a complete pair.
- Make export selection and labels depend on instructional form as well as resource type. The existing includeSimplified toggle must not misleadingly classify supported originals as adaptations or accidentally remove both versions together.
- Use form-aware rendering in the common document pipeline. Student HTML/printable/PDF/DOCX outputs should include the original and separately marked supports. Check structured project/resource packs independently; metadata round-trip is not proof of rendered access.
- Do not infer that all export formats use the same path. PowerPoint has type-specific rendering in `export_source.jsx`; optional format support must be implemented/tested or explicitly excluded from the initial release claim.
- Extend the existing comparison UI for students with read-only source selection and version switching. Retain teacher source-choice controls. Fix missing-link fallback before exposing it more widely.
- Audit supported-primary evidence against readable preserved content, not just metadata. Verify the exported/shared collection, since its original can be filtered out even when the full teacher history has one.

Recommended first-release coverage: browser reader, normal project/history restoration, live student delivery within supported size limits, complete student resource packs, and the common student document export path. Community sharing must either carry the new fields correctly or explicitly refuse an unsupported preserved-reading payload; it must not silently strip the source contract.

Done when: a student opening a shared or exported adaptation can read the matching original without relying on the teacher's current input or private analysis; missing/oversized resources are accurately represented; source equality survives successful round-trips.

### D. Generated glosses — high scope, after A–C

Primary files: shared preservation helpers, `generate_dispatcher_source.jsx` or a bounded support generator, `view_simplified_source.jsx`, audio/word-timing integration as required, export and sharing projections, vocabulary controls, translation packs.

Work:

- Ask the model for **annotations**, never a replacement passage with insertions. The application renders glosses around the immutable source.
- Reuse glossary generation's definition conventions and provider handling, but not its entire selection contract. Its current prompts emphasize Academic/Domain-Specific terms; the local path uses an excerpt and caps term count. That is not full coverage of archaic/literary vocabulary or an entire long passage.
- Include archaic usage, unfamiliar referents, literary senses, and idioms in candidate selection. The four Macbeth terms are a required fixture, not a sufficient universal acceptance test.
- Bind annotations to exact occurrences: source fingerprint, start/end offsets in a documented coordinate system, and exact quote. Prefer application-generated candidate anchors the model selects by ID. Validate range bounds, quote equality, overlap, repetition, and current source identity before accepting results.
- For formatted sources, define the mapping from canonical text to rendered text explicitly. Do not apply raw offsets blindly to Markdown/HTML after formatting transformations. Start with prose/verse and supported formatting; mark unsupported structures accurately until they have mapping coverage.
- Keep generated definitions plain text and escape them in rendering. Reject malformed anchors individually with an explicit partial result; a failed generation leaves the original fully readable.
- Chunk long inputs with stable global anchors. Report covered/skipped ranges; do not silently treat a local model's first excerpt as complete-document support.
- Offer inline glosses by default, with Show/Hide and density controls. Density changes presentation, not source text. Allow one-off Define/Explain independently of generated glosses.
- For audio, provide original-only and original-plus-gloss playback projections. Keep sentence highlighting and stored audio identity consistent; invalidate only derived audio affected by changed supports. Do not splice gloss words into a source-indexed karaoke stream without a mapping.
- In screen readers and exports, distinguish the source quotation from its explanatory gloss. Preserve original line breaks; do not count gloss text as the source's readability score.

Done when: original text is exactly unchanged before/after generation, toggles, playback, save/load, and export; repeated words receive the right contextual gloss; invalid or stale model output cannot damage the source.

## 5. Legacy behavior and product defaults

- New single-source reading starts with the original; adaptation remains an explicit choice. Keep existing saved artifacts and existing Full Pack decisions rather than silently converting them.
- A legacy adaptation without a trusted source shows **Original not captured** and offers source attachment. Do not attach the newest analysis automatically.
- A saved analysis can be opened with supports, but distinguish its current saved text from a verified initial input. Do not use `rawEnglishText` blindly as a recovery source.
- Explicitly attaching a source records educator selection, not a claim that the system proved historical provenance.
- A role label is instructional intent, not a certification of grade level, source authenticity, UDL compliance, or a student's plan.
- Existing primary replacement authorization remains available for adaptations. Reading an original must not create or request that authorization.
- Generated glosses are optional. TTS/reading access must work before generation and remain available if generation fails.

## 6. Verification and release gates

### Baseline established in this review

Existing suites were run without application changes:

```powershell
node node_modules/vitest/vitest.mjs run tests/instructional_context.test.js tests/instructional_role_ui.test.js tests/instructional_text_downstream.test.js tests/instructional_context_orchestration.test.js tests/curriculum_audit_logic.test.js tests/deferred_module_pump.test.js --maxWorkers=1
```

Result: 6 files, 81 tests passed.

```powershell
node node_modules/vitest/vitest.mjs run tests/firestore_sync.test.js tests/session_transport.test.js tests/adapted_reading_enhancements.test.js tests/standalone_reader_export.test.js tests/history_panel_share.test.js --maxWorkers=1
```

Result: 4 files passed, 1 file failed; 130 tests passed, 2 failed. Combined: 211 passed, 2 failed across 11 files. The standalone-reader suite covers the PDF remediation HTML wrapper; it is adjacent regression coverage, not evidence that lesson-pack exports already meet this plan.

The two pre-existing failures are in `tests/firestore_sync.test.js:551` and `:659`: Memory Aid artwork-budget expectations require `visualAlt` fields that are absent after cleanup. Track these separately from Novak changes; do not weaken tests to obtain a green baseline.

Read-only runtime probes additionally confirmed:

- `sanitizeHistoryForCloud` followed by `hydrateHistory` preserves ordinary prose but turns string `42` into a number, `null` into null, and a JSON-looking passage into an object.
- Changing a supported simplified artifact's role changes its form to `adapted`.
- Resolving a missing source link returns an unrelated newer analysis with selection `latest-analysis-fallback`.

### Required regression matrix for implementation

| Scenario | Required result |
| --- | --- |
| Macbeth 1.1; no standards, no analysis, AI unavailable | Original opens intact with available reader tools; no model request on open. |
| Plain text, verse, Markdown, citations, Unicode/RTL, CRLF, JSON-looking strings | Canonical text round-trips exactly; display remains readable with correct language and structure. |
| Two unrelated analyses; explicit override; changed input | Source and source ID match the selected material; no ambient fallback. |
| Source renamed, edited, deleted, or aged out | Existing companions retain the original snapshot; navigation degrades honestly. |
| Manual edit, revision, complexity, rigor, undo/redo, generic update | Original cannot be mutated or falsely relabeled; adapted copies retain source linkage. |
| Late AI response after switching source or resource | No update to the wrong artifact or stale annotation set. |
| Original-only, adapted-only selection, paired export, worksheet | Form-aware inclusion and labels; original remains available in claimed paired deliverables. |
| Project/cloud/session/pack/community round-trip | Snapshot/support fields survive; partial/oversized payloads never masquerade as complete originals. |
| Imported malformed or unsupported preservation metadata | Read safely with unverified status; do not grant audit evidence solely from the label. |
| Repeated term, overlapping anchors, absent quote, long source | Correct occurrence mapping or explicit partial failure; no change to canonical text. |
| Original/gloss audio, keyboard help, focus reader, version switch | Stable source/support mapping; old audio and popup state cleared correctly. |
| English and one RTL or unspaced language | Reader direction, segmentation, source language, gloss language, and export labels remain coherent. |

Extend the existing contract, role, reader, audit, session, and export suites. Add a small dedicated preservation-contract suite for the new cross-boundary invariants. Add browser integration tests for the actual paste → original → adapted → student/share flow; static source assertions are insufficient.

### Build/release handling

- Author root `*_source.jsx` files where a source exists. `instructional_context_module.js`, `firestore_sync_module.js`, and `session_transport_module.js` are direct module sources in the reviewed tree.
- Reader, analysis, and dispatcher builders write the root module and `desktop/web-app/public` mirror: `_build_view_simplified_module.js`, `_build_view_analysis_module.js`, `_build_generate_dispatcher_module.js`.
- Host handlers use `node _build_first_wave_view_modules.js HostHandlers`. Use each affected module's registered builder; inspect its output paths before execution.
- `build.js` generates `desktop/web-app/src/App.jsx` and the desktop ANTI mirror. Production mode also restamps the root ANTI file. Some modules use SHA-256 content pins, others a revision pin; preserve the registered policy.
- `node build.js --mode=prod --dry-run` is the inspection starting point. Inspect generated diffs before a real build because the central build can touch more than the selected feature.
- The separate cache-bust utility requires committed matching modules and checks all three loader files. It is not a generic uncommitted-build stamping shortcut.
- Rebuild and verify only affected outputs, then check loader/mirror parity. Reconfirm the packaged app-build path when producing a desktop release; do not hand-edit generated copies independently.
- No build, deployment, commit, or external publication was performed for this scoping task.

## 7. Separate workstream: Quick Start loading

Verified: the background pump at `AlloFlowANTI.txt:14680–14682` remains parked while either concealment class is present. Its current tests intentionally assert this behavior. Foreground `loadModule()` at `:14062–14072` can promote a queued module immediately, and the lazy simplified reader has a loading/retry surface. Therefore the background pause alone does not prove the reported click-error path.

Scope in two stages:

1. Reproduce a named failing action on a fresh local build with a cold cache and throttled network. Capture the requested module, registry transitions, console error, and whether it bypasses a loading gate. Include normal Quick Start completion, immediate clicks, and direct/deep-link launch.
2. Fix that action's pending/retry behavior independently. Then trial limited background prefetch while the launch surface is stable: one pump-owned request in flight, conservative delay, hidden-tab pause, input/idle checks, and existing starvation/Data Saver behavior retained. Keep initial boot readiness distinct from a ready but concealed workspace.

Extend `tests/deferred_module_pump.test.js`; do not create a competing pump harness. Test each concealment class independently, both together, hidden tab, idle timeout, continual input, pre-existing foreground loads, retries, and transition to the normal budget. Preserve the current distinction between pump-owned requests and foreground requests.

Measure time to usable Quick Start, interaction delays during it, time from chosen action to ready tool, errors, and background bytes against the current baseline. Queue drain speed alone is not a success criterion. Choose delay values from these measurements; the handoff's guessed reading window is not performance evidence.

Priority ordering can follow once the selected action's real module dependencies are mapped. Do not change the full queue order based only on a broad mode name.

No real cold-load browser measurement was performed in this scoping pass. Loader tuning and a diagnosis of the specific reported click error remain pending that reproduction; they do not block the text-preservation design.

## 8. Scope decision for the next implementation task

Start with package A and the minimal original-reader slice of B, including mutation guards and an explicit source snapshot. Verify that vertical path before adding generated glosses. Complete C before claiming that shared/exported adaptations always carry a readable original.

Keep lexical annotation generation as its own package. Its anchoring, long-text coverage, audio mapping, and export behavior are a larger change than reusing the glossary prompt suggests.

Defer unrelated comprehension activities, automatic decisions about whether a source may be adapted, broad reader rewrites, and whole-app loader refactoring. The only unresolved product choices that materially change scope are whether PowerPoint/other specialized exports join the first release, and how broad formatted-source gloss coverage must be initially. The proposed defaults above allow the core work to proceed without either decision.

## 9. Design refinements: paired reading and source style

Added after the follow-up design discussion. These are recommendations for review, not approval to change application defaults. Where scheduling differs from the earlier packages, this section brings student paired reading forward into package B.

### 9.1 Make paired reading part of the core experience

The plan already reuses `renderSimplifiedComparison`. Strengthen that commitment by including student paired reading in the first reader release, once source resolution is safe.

- Offer **Original / Adapted / Both** when both versions exist. Opening a source alone starts on Original. After creating a companion on a sufficiently wide screen, propose Both as the initial presentation; respect the user's later layout preference. On narrow screens, use a clear version switch or readable stacked layout instead of squeezed columns.
- Keep both panes clearly labeled. Make the original a usable reading surface in Both: read-aloud, Define, Explain, and focus tools must operate on the selected pane. Share rendering/help logic rather than duplicating the entire reader. Preserve unique DOM IDs, source anchors, language, and audio ownership across panes.
- Show clean reading text by default for students. Keep the existing insertion/deletion diff as an optional review aid, rather than covering the original in editorial markup.
- Do not assume paragraph counts align. Preserve the bounded diff fallback, allow independent scrolling, and add linked navigation only where correspondence is known. A genre transformation must not pretend to provide sentence-for-sentence alignment.
- When translation is present, keep two panes. Let the user choose the comparison purpose/language; suppress lexical diffs across different languages and explain the pairing. Do not add a permanent third pane.
- A word selected in the original must not request an explanation using an adapted sentence or start audio in the wrong pane.

Additional acceptance checks: the same source words and verse line breaks appear in Original and Both; a student can listen to either pane; switching panes stops previous playback; focus returns predictably; narrow/zoomed and RTL layouts remain readable; comparison never falls back to another lesson.

Package C must carry this paired experience through sharing and export. Merely exposing the teacher's current redline view to students does not satisfy this requirement.

### 9.2 Add an explicit source-format-and-tone option for adaptation

Verified current behavior:

- `AlloFlowANTI.txt:23301` initializes `textFormat` to `Standard Text`.
- `view_sidebar_panels_source.jsx:1332-1346` offers Standard Text, Dialogue Script, Mock Advertisement, News Report, Podcast Script, Social Media Thread, Poetry, and Narrative Story.
- `generate_dispatcher_source.jsx:3772-3849` starts with an empty format directive and adds directives for explicit transformations. Standard Text has no affirmative source-form preservation directive.
- Complexity guidance can independently require short paragraphs, a formal tone, or prioritizing readability over stylistic flair. A new dropdown label alone would not reconcile those instructions.

Recommendation: add **Keep source format and tone** as the proposed default for newly requested adaptations. Keep Standard Text as an explicit prose option, with clearer display wording such as **Standard prose**. Retain existing transformation choices. Use the current format control rather than another checkbox that could conflict with a selected genre.

| Reading choice | What changes | What is preserved |
| --- | --- | --- |
| Original with supports | Optional gloss/help presentation | Exact canonical text; original form and voice follow from that preservation. |
| Adapted companion — keep source format and tone | Vocabulary/syntax as needed for the selected adaptation | Aim to retain genre, speaker/narrator identity, point of view, sequence, meaningful structure, and broad tone. This remains an adaptation. |
| Adapted companion — chosen new format | Language and an explicitly requested genre/presentation transformation | Source snapshot, meaning, and factual relationships; the new form is intentional and labeled. |

For Macbeth, the middle choice should remain a dramatic scene with the same speakers and stage directions, rather than becoming an expository summary. A poem should remain recognizably a poem; an argument should retain its claim/evidence structure. Exact meter, rhyme, ambiguity, rhetorical effects, or authorial voice cannot be guaranteed after rewriting. Do not call this option “preserve the author's exact style.”

Implementation implications:

- Resolve the selected format policy once and persist it in artifact configuration. Apply it to initial generation, local/cloud paths, chunking, repair/relevel passes, complexity adjustment, and Full Pack overrides.
- Make prompt priorities coherent: preserve meaning, source identity, speaker attribution, and citations; adapt language within the selected form. If readability and a literary feature conflict, prefer an honest limited adaptation or offer more supports on the original. Do not silently change genre or claim both exact style and aggressive simplification were achieved.
- Keep desired length separate. Preserving format is not preserving word count, and retaining the original text does not require glosses to fit within its original length.
- Preserve explicit saved settings. Apply a new default only to fresh choices; do not reinterpret existing Standard Text artifacts or override an educator's selected transformation.
- Do not require a new AI classification call on every source just to choose this default. Derive structure where available and instruct generation to follow the supplied source; handle ambiguity through preview/review rather than blocking reading.
- Treat automated structure checks as evidence, not proof of stylistic quality. Review a play, poem, narrative, informational passage, and argument with a small rubric: meaning, speaker/point-of-view fidelity, genre/structure retention, broad tone, and usefulness of the adaptation.

This is a useful complement to original preservation, not a prerequisite for the original-reader foundation. It should be a bounded follow-on within package B's adaptation controls, with its own tests and review examples. The default remains provisional while the user explores the choice.

### 9.3 Strengthen acceptance beyond technical correctness

Separate two kinds of success:

1. **Hard guarantees:** exact source equality, correct source association, no mutation under a supported-original label, valid annotation anchors, and complete successful transport. These are automated release gates.
2. **Quality goals:** helpful glosses, faithful adaptation, appropriate tone, and easy movement back to the original. Use representative teacher-reviewed examples and student-mode usability checks; metadata and passing serialization tests cannot establish these outcomes.

Give the source and its companion a stable relationship even after titles change, and name the selected version in downloads and sharing previews. A user should be able to tell what students will receive before delivery.

The implementation should proceed through an end-to-end example: paste a passage, open the original, generate a form-retaining companion, use Both, save/reopen, and deliver the pair to a student. Keep the style-default decision provisional while making source preservation and paired reading concrete.
