# Header reading-support and language-picker coverage

Date: 2026-09-07. Scope: current local main-24 resource views, shared prose formatters, and header settings. This records source inspection and focused component regressions. It does not claim manual screen-reader/browser verification, translation quality evaluation, or live AI evaluation.

## Changes implemented by this workstream

- **Adapted Reading Line Focus:** The four ordinary/bilingual reading and plain revision paragraph branches previously changed focus only on mouse enter/leave. Keyboard-focused sentences and learner response fields could remain dimmed/blurred. Paragraphs now become tab stops while Line Focus is on, focus events reveal their paragraph, movement between descendants preserves it, and leaving with the pointer does not dim an active keyboard response. Turning Line Focus off removes the additional paragraph tab stops. Narration retains its existing playback-driven paragraph selection.
- **Shared interactive prose:** `formatInteractiveText` in PhaseN treated `**bold**` as both bold and italic and sliced twice, leaking literal asterisks. The italic slice is now exclusive. Tests cover Bionic on/off, fully bold text, italic text, links, math, and the deliberate cloze exclusion.
- **Header language picker:** The extraction's old unresolved-confirmation reference was already guarded against ReferenceError, but the missing dialog dependency fell through to immediate regeneration. The picker now receives the shared `setConfirmDialog` callback; standalone usage requires native confirmation instead of silently bypassing it. Choosing Custom focuses the existing manual language input. File selections reset after import so the same corrected language-pack file can be imported again. Toolbar buttons explicitly use `type="button"`. Language-pack content was not edited.

Parent integration threads `setConfirmDialog` through HeaderBar and implements Bionic persistence/pressed state, more accurate Bionic scope copy, and the size/spacing reset label. Those shared host/header changes belong to the parent workstream.

## What Bionic actually changes

The header's `focusMode` is the word-start emphasis preference. It is separate from `isLineFocusMode` (paragraph dimming) and the immersive `FocusReaderOverlay` (paced/chunked reading). The header is not a document-wide DOM text transform.

The production `toFocusText` helper bolds the beginning of each whitespace-separated word. It is invoked by:

1. PhaseK `formatInlineText` for ordinary inline strings.
2. PhaseN `formatInteractiveText` for ordinary, non-cloze strings.
3. `renderFormattedText` indirectly through PhaseK's inline formatter.
4. The host `BilingualFieldRenderer` indirectly through `renderFormattedText`.

The following is an exact **source-level consumer map**, not a claim that every label or every mode within a resource is transformed. Direct JSX strings, inputs, SVG/canvas text, and independently rendered HTML do not automatically inherit Bionic. Math expressions and interactive cloze strings are intentionally excluded by the shared formatter. Existing interactive glossary elements are left intact.

| Main resource | Shared Bionic-aware prose path in reviewed source |
| --- | --- |
| Analyze Source | `formatInlineText` and `renderFormattedText`; also bilingual field rendering. Form inputs remain plain text. |
| Glossary | No calls to these shared prose helpers in `view_glossary_source.jsx`; terms, definitions, flashcards and phonetic fields use their own rendering. |
| Adapted Reading | `formatInteractiveText` and `renderFormattedText`. Ordinary prose participates; math/cloze and separate immersive display modes have their own rules. |
| Word Sounds | No shared formatter calls in its preview. Practice words/phonemes and studio controls use dedicated rendering. |
| Graphic Organizer | Delegates to `renderOutlineContent`/`renderInteractiveMap`; these diagram renderers have no `formatInlineText` dependency. Diagram labels are not a general Bionic surface. |
| Note-Taking | No shared formatter calls in `note_taking_templates_source.jsx`; template and response rendering is independent. |
| Anchor Chart | No shared formatter calls in `anchor_charts_source.jsx`; section/reference content is independent. |
| Memory Aid | No shared formatter calls in `memory_aid_source.jsx`; card content is independent. |
| Applied Challenge | No shared formatter calls in `applied_challenge_source.jsx`; challenge content is independent. |
| Lesson Images | No shared formatter calls in `view_image_source.jsx`; images, prompts, labels and description controls are independent. |
| FAQ | Both question and answer sentences call `formatInteractiveText`. |
| Writing Scaffolds | The rubric calls `renderFormattedText`; scaffold prompts and learner inputs are direct JSX/plain fields. |
| Activities | Structured discussion/jigsaw prose, packets, synthesis tasks and some guidance use `renderFormattedText`; other labels and direct fields remain unchanged. |
| Interview | Conversation text uses `formatInteractiveText` in `view_persona_chat_source.jsx`. |
| Sequence Builder | No shared formatter calls in `view_timeline_source.jsx`; event/card text uses independent rendering. |
| Concept Sort | No shared formatter calls in `view_concept_sort_source.jsx`; sort labels/items use independent rendering. |
| Document-Based Question | No shared formatter calls in `view_dbq_source.jsx`; document/question and response rendering is independent. |
| STEAM Lab | Tool-owned text, graphics and controls; the header preference is not a general canvas/iframe text transform. Individual tools were not audited in this header pass. |
| Adventure | Narrative and review text uses `formatInteractiveText` and `renderFormattedText`; other game surfaces are independent. |
| Assess | Question/explanation paths use `formatInlineText`/`renderFormattedText`; interactive inputs and specialized assessment visuals retain their own rendering. |
| Curriculum Audit | No shared formatter calls in `view_alignment_report_source.jsx`; report fields use independent rendering. |
| Lesson Plan / guides | Most prose uses `BilingualFieldRenderer`, which delegates to `renderFormattedText`; extension guides also call the latter directly. |
| Assignment Directions | Sanitized prepared HTML and direct goal/choice-board JSX; no shared formatter calls in `view_directions_result_source.jsx`. |
| Preview, Package & Deliver | Independent prepared/export HTML and route controls; no shared formatter calls in `view_export_preview_source.jsx`. This preference is not automatically baked into downloaded documents. |

This is why the header needs wording such as supported reading text, rather than implying that every word in every resource changes. Extending Bionic to independent resource renderers would be a separate coordinated renderer change, with care around math, word/phoneme tasks, links, and editable responses.

## Overlay, Help, persistence, and reset boundaries

- **Color overlay:** `colorOverlay` persists under `allo_color_overlay` with valid values none/blue/peach/yellow. The existing portal covers the viewport and stacks above the Launch Pad and portalled app dialogs. It is pointer-transparent and excluded from the accessibility tree. This visual overlay therefore has broader on-screen coverage than Bionic. It does not alter saved resource text or exported document styling. The existing `tests/color_overlay_coverage.test.js` and browser spec document the established coverage contract; source inspection found no new overlay-coverage defect.
- **Help mode:** `isHelpMode` is deliberately transient. Capture-phase document clicks resolve explicit `data-help-key` targets or fall back to descriptions of native/ARIA interactive controls. Enter/Space on native buttons use this same click route. The question-mark shortcut toggles outside text fields; Escape closes help or exits the mode. Explicit tags vary across resources, so some controls receive generic help. Controls inside independent iframe documents do not bubble to this parent-document listener.
- **Help limitation:** The handler intercepts clicks, not every edit gesture. Typing in a field or using arrows in sliders/selects can still change their value in Help mode. The existing spoken explanation is English fallback prose in the host. These are recorded scope/localization opportunities, not new changes in this workstream.
- **Text Reset:** At the start of this review, `resetFontSize` reset size to 16, line height to 1.6, and letter spacing to zero. It did not reset font family, Bionic, reading theme, overlay, or audio settings. Parent work clarifies the button as size/spacing reset and preserves those independent preferences.
- **Bionic persistence:** At the start of this review, `focusMode` initialized false each session while ruler/overlay and typography preferences persisted. Parent work fixes this preference inconsistency and adds the missing header pressed-state semantics.
- **Separate ruler follow-up:** Reading Ruler is in the reading toolbar, not the current header. Its enabled preference persists, but `rulerY` starts at zero and only mouse movement repositions it. Reloading with the ruler enabled leaves nearly all content veiled until mouse movement, and keyboard/touch positioning is missing. Recommended follow-up: center/clamp its initial position and follow focused controls plus passive pointer/touch input. This host change was explicitly kept outside the current header refinement to avoid scope expansion.

## Validation and artifacts

- `node _build_view_simplified_module.js`
- `node _build_phase_n_misc_helpers_module.js`
- `node _build_ui_language_selector_module.js`

Each compiler rebuilds both the root runtime module and its `desktop/web-app/public` mirror. The reading-support batch passed **36/36 tests across 7 files**. The language-picker batch passed **26/26 tests across 2 files**. Total: **62/62** checks passed, with zero failures. The focused results are saved in `scratch/header-reading-support-results.json` and `scratch/header-language-selector-results.json`, with logs beside them.

All three root runtime modules exactly match their corresponding desktop public copies. Scoped `git diff --check` passed. No application source changed after these successful test batches.

No deployment, commit, or language-pack content changes were performed.
