# AlloFlow resource review: foundations (2026-09-04)

Scope: read-only review of the current working tree for Analyze Source (`analysis`), Leveled Text (`simplified`), Glossary, Visual Organizer (`outline`), Visual Supports / Lesson Images (`image`), Scaffolds (`sentence-frames`), FAQ, and Assignment Directions. The repository already contains many ongoing edits. No implementation changes were made. Findings below distinguish concrete defects from refinement opportunities; this is source and focused-test verification, not a production browser or live-provider audit.

## Prioritized verified findings

### P1 — Paragraph scaffold answers are lost or shifted when opening draft feedback

The paragraph renderer splits text with a capturing regular expression and saves each blank using the resulting **split-array index**, e.g. `paragraph-1`, `paragraph-3` (`view_sentence_frames_source.jsx:169`, `:174`, `:175`). `launchGradingSession` instead increments a blank counter from zero and reads `paragraph-0`, `paragraph-1`, etc. (`AlloFlowANTI.txt:48710`–`:48715`).

Reproduction using the actual extracted `launchGradingSession` function:

- Text: `The cause is [cause] and the effect is [effect].`
- Stored answers from the renderer: `paragraph-1 = rain`, `paragraph-3 = flooding`.
- Expected feedback draft: `The cause is rain and the effect is flooding.`
- Actual feedback draft: `The cause is _____ and the effect is rain.`

This directly undermines the writing-to-feedback handoff. Use one shared placeholder enumerator/serializer across editing, completion, feedback, submission, and exports; preserve existing saved split-index keys or migrate them explicitly. Test at least two blanks and leading/trailing placeholders.

### P1 — Replacing a single lesson image changes the preview but not the resource

The upload handler only calls `setSingleImageOverride` (`view_image_source.jsx:94`–`:101`), and the preview displays that override (`:91`). The state is one global unkeyed value (`AlloFlowANTI.txt:29196`); there is no resource update or history write in the upload path. Download still uses `generatedContent.data.imageUrl` (`content_engine_source.jsx:2003`). The override also does not reset on resource changes: its declaration, view prop wiring, upload, and explicit restore/regeneration paths use the setter/value.

Reproduction: open a single-image resource, choose Replace, upload an image, then Download. The downloaded image is the original. Open a different single-image resource: the same override is still the displayed image. A saved/reloaded project loses the replacement.

Alt text edits already write into the persisted resource (`view_image_source.jsx:125`–`:128`), while their image context is the transient replacement (`:123`–`:145`), so the saved alt text can describe a different picture than the exported one. Persist the replacement and provenance on the resource through the normal history update path, retain an explicit original if Restore is desired, and make preview, download, alt text, and sharing resolve the same image.

### P2 — Analysis grammar dismiss/fix changes bypass history and text-mutation bookkeeping

Grammar dismissal/restoration calls only `setGeneratedContent` (`view_analysis_source.jsx:122`–`:138`). Applying grammar fixes also writes only the active object and `inputText` (`:199`–`:210`). Neither path updates history. The host setter only normalizes an artifact instance ID (`AlloFlowANTI.txt:12262`–`:12268`); it does not synchronize history. In contrast, the host's ordinary analysis text edit records undo, refreshes complexity, invalidates checks, and updates both active content and history (`AlloFlowANTI.txt:48353`–`:48372`).

Implication: the active panel can show resolved notices/corrected text while history-based translation, exports, re-opening, and subsequent resource generation retain the older analysis. Translation explicitly reads the history item (`AlloFlowANTI.txt:33000`–`:33002`). Grammar correction also retains the old local readability/complexity evidence.

Route grammar mutations through an artifact-ID-bound host update function; corrections should also use the existing text mutation/undo/complexity mechanism. The current 8 grammar dismissal tests verify the component setter but do not cover history/reopen/export behavior (`tests/grammar_dismiss_without_ai.test.js:128`).

### P2 — Scaffolds show “Saved” after storage errors

The host explicitly sets `studentWorkStatus = 'error'` if writing student work fails (`AlloFlowANTI.txt:12249`–`:12257`). The scaffold status badge shows a green check and `status.saved` for **every** non-idle status other than `saving` (`view_sentence_frames_source.jsx:47`–`:58`).

Reproduction: reject the device-storage write while a learner types. The host reaches `error`, but this resource reports Saved. Render the full shared status enum, expose retry/recovery, and use a status announcement. The learner should not close the assignment believing unsaved answers are durable.

### P2 — Translating Directions leaves choice-board text and links in the original language pack

The dedicated directions translator only sends title, body and objective labels (`phase_k_helpers_source.jsx:2805`–`:2815`), then spreads the original object into the result (`:2898`–`:2904`). Therefore choice-board title, prompt, labels and descriptions remain untranslated. The translate-all handoff remaps only `objectives[].resourceRef` (`AlloFlowANTI.txt:33030`–`:33038`), leaving `choiceBoard.items[].resourceId` pointing at original resources.

Reproduction: create directions with two choice-board activities, translate the full pack, then open the translated board. Its cards retain source-language prose and navigate to original resources; if packaging only the translated copies, those links become missing. Translate visible board prose and remap all resource references together. The current directions adapter resolves chosen IDs to resources before navigation (`AlloFlowANTI.txt:52403`–`:52413`), so stale IDs are consequential.

## Coverage and resource-specific refinements

| Resource | Current strengths verified in source | Recommended refinement |
|---|---|---|
| Analyze Source | Editable original, reading complexity, selectable issues, distinct fixed/dismissed notices, original-source audio download (`view_analysis_source.jsx:53`–`:59`). | Fix shared mutation/persistence issue above. Keep source revision and analysis evidence aligned after any correction. |
| Leveled Text | Explicit primary/supplemental roles and replacement authorization (`view_simplified_source.jsx:216`–`:230`); linked comparison-source resolution (`:290`); content-aware complexity refresh/stale notices (`:2196`); durable per-sentence audio and teacher narration (`:1813`); RTL rendering (`:2330`). No additional confirmed blocker in the reviewed paths. | Extend these existing resource-aware mechanisms to older resource views rather than rebuilding this view. Regression coverage should verify that changing the current app language/grade after generating a saved text does not silently change that text's playback/complexity context. Some playback helpers still begin with current `leveledTextLanguage` (`:1290`, `:1356`), whereas rendering prefers saved `config.language`. This is a targeted review opportunity, not a demonstrated playback bug. |
| Glossary | Editing persists to history (`AlloFlowANTI.txt:47350`–`:47365`); per-item pronunciation/definition/translation speech; clear academic/subject vocab labels and accessible edit drawer (`view_glossary_source.jsx:718`, `:1378`–`:1414`); per-resource filter reset (`AlloFlowANTI.txt:32225`). | Consolidate the two audio warm-up paths. One starts the entire glossary on every active-object mutation with no cancellation or edit guard (`AlloFlowANTI.txt:20860`–`:20874`); another already debounces and depends on visible glossary/edit/voice settings (`:29925`–`:29927`). Typing in a glossary field therefore repeatedly launches the first loop. Shared TTS caching may prevent repeat synthesis, so provider-cost impact is unmeasured; cancellation and resource/language-aware cache keys would still improve responsiveness and avoid stale work. |
| Visual Organizer | Static/interactive views, multiple diagram forms, 3D launch and Free Forms remix (`view_outline_source.jsx:113`–`:160`); branch edits persist (`AlloFlowANTI.txt:46945`–`:46986`); spatial arrangements persist by named store (`:47145`–`:47158`); live-launch readiness/retry checks (`:21165`–`:21198`). No new fully reproduced blocker. | Add round-trip coverage for edited branches versus saved interactive `nodes`/`edges`: hydration prefers saved nodes (`AlloFlowANTI.txt:21202`–`:21206`), while branch edits change only `branches` (`:46981`–`:46986`). Ensure editing a static concept is reflected when reopening the interactive form. Treat this as an architectural consistency check until reproduced with a saved interactive map. |
| Visual Supports / Lesson Images | Multi-panel refinement/animation, annotations persisted to history, labeling challenge outcomes, editable alt text with stale-image hash detection (`view_image_source.jsx:42`–`:86`, `:120`–`:146`). | Fix the single-image Replace path above. Give single-image upload/download the same persist/error behavior as the more mature multi-panel implementation. |
| Scaffolds | List and paragraph authoring, saved student responses, rubric generation, feedback handoff and translation fields (`view_sentence_frames_source.jsx:94`–`:218`). | Fix paragraph answer mapping and false Saved status first. Keep the shared serializer at the host boundary so voice input, draft feedback and exports cannot disagree about a blank's identity. |
| FAQ | Editable bilingual fields, dedicated keyboard-accessible accordion controls, stable sentence indexes across collapsed rows, TTS auto-expansion, cached-audio compatibility/status checks (`view_faq_source.jsx:89`–`:161`, `:172`–`:244`). No additional confirmed blocker. | Finish localization of learner-facing controls/statuses. `Show all`, `Hide all`, the question-tap tip, `Reading FAQ...`, and `Speed` are hard-coded English (`view_faq_source.jsx:164`, `:172`). Also align the tip with the interaction: the question sentence activates read-aloud; the chevron is the disclosure control (`:229`, `:244`). Existing tests already protect their separate semantics. |
| Assignment Directions | Manual/AI drafting, optional goal checks, choice-board preview, semantic resource-ID callbacks, fallback list navigation for the quest map, student-safe adapter boundary (`view_directions_composer_source.jsx:125`, `view_directions_result_source.jsx:396`, `AlloFlowANTI.txt:52379`). | Fix translation of board prose and references above. Preserve the existing fallback list and nonblocking goals while adding a full translated-pack navigation regression. |

## Validation

Executed the focused suite for `grammar_dismiss_without_ai`, `visual_supports_resource_polish`, `faq_audio_parity`, `faq_controls_a11y`, `directions_objectives`, `directions_result_extraction_contract`, `glossary_helpers`, `view_simplified_wcag_a11y`, and `view_glossary_wcag_a11y`: **86 tests, 84 passed, 2 failed**.

Both failures are `directions_objectives.test.js` wiring assertions that expect strings from the now-extracted directions composer in the monolithic source (`choice-board authoring validates, previews, and supports optional card descriptions`; `NO GATING anywhere in Phase 1`). The preview string is present in `view_directions_composer_source.jsx:125`. These are stale test-location contracts, not evidence the preview or nonblocking goals fail at runtime. Update the tests to inspect the extracted source/component and keep the actual behavior checks.

The paragraph feedback mismatch was additionally reproduced by evaluating the actual host function with representative saved responses, without modifying implementation files. Raw compact test results are in `scratch/resource-foundations-tests.json`.
