# Virtual Dissection Lab improvement review

Updated: 2026-07-22

## Implemented

- Progress now loads and saves per specimen, including revealed layers, explored structures, assessment totals, active layer, annotations, investigation time, evidence notes, confidence ratings, and objectives.
- Specimen switching clears transient state before restoring that specimen's saved progress. Reset affects only the current specimen.
- Quiz order and distractors are deterministic within a session instead of changing during render. Questions alternate between function and diagram-location evidence.
- Learners can answer by accessible multiple choice or by selecting a structure on the canvas. Timed practical mode uses the live score and cleans up its timer.
- The canvas uses pointer events for mouse, touch, and pen; zoomed panning uses pointer capture. The redraw loop is throttled by the selected animation speed and records active investigation time.
- Sound effects have an explicit on/off preference. Print now invokes a clean print stylesheet. The misleading dorsal/ventral and nonfunctional print-mode controls were removed.
- Reports and completion summaries use the current specimen's actual revealed-layer, structure, quiz, time, evidence-note, and confidence data.
- The primary learning flow is framed as orient, predict, reveal, identify, record evidence, and compare. Virtual-practice safety and ethics limitations are stated.
- Selected structures provide an evidence-note field and a three-level confidence check.
- Sheep-eye and sheep-heart copy was revised where human-specific measurements or anatomy had been presented as species-identical. Human clinical material is labeled separately from specimen anatomy.
- Primary route, evidence, scope, and mission strings now use translation keys with English fallbacks.

## Verification

Focused Vitest coverage lives in:

- `tests/dissection_canvas_loop.test.js`
- `tests/dissection_lab_improvements.test.js`
- `tests/stem_widgets_smoke.test.js`

The source and deployment mirror are expected to remain byte-identical:

- `stem_lab/stem_tool_dissection.js`
- `desktop/web-app/public/stem_lab/stem_tool_dissection.js`

## Remaining subject-matter review

The code now distinguishes specimen observations from human comparisons, but a qualified comparative-anatomy educator should still review every hard-coded structure description, landmark, numerical claim, and clinical correlation. That review should record sources and course-level suitability. It is intentionally not represented as complete by this engineering pass.

## Recommended follow-up

1. Run a short moderated usability session with keyboard-only, touch, and screen-reader users.
2. Have an anatomy educator sign off on specimen-specific content and add citations.
3. Feed the new `stem.dissection.*` keys through the normal translation extraction pipeline.
4. Consider a later module split separating specimen data, canvas rendering, persistence, and assessment logic; the current file remains large even though its high-risk state behavior is now covered.
