# Virtual Dissection Lab improvement review

Updated: 2026-08-31

## Implemented

- Progress now loads and saves per specimen, including revealed layers, explored structures, assessment totals, active layer, annotations, investigation time, evidence notes, confidence ratings, and objectives.
- Debounced progress writes are keyed per specimen. A specimen switch flushes the departing record before loading the next one, reset cancels pending pre-reset writes so deleted progress cannot be recreated, and pending writes flush when the page is hidden or closed.
- A visible, polite save-health indicator reports saved, storage-limited, failed, and recovered states. If image-heavy evidence exceeds browser storage, the lab retries with the newest frame and then with text-only evidence so notes, procedure state, inquiry work, and assessment progress are retained whenever possible.
- Evidence capture no longer silently evicts the oldest frame when the six-frame notebook is full. Learners are directed to download or remove a frame first, and duplicate millisecond capture IDs are avoided.
- The evidence notebook now supports confirmed per-frame removal and confirmed clear-all cleanup. Reference selection is repaired after deletion, notes and non-image progress are preserved, focus returns to the notebook, and incomplete legacy frame metadata receives readable fallback labels.
- Delayed layer-reveal work is now owned and cancelable. Switching specimens, confirming reset, or unmounting the canvas clears pending reveal and transition timers so progress, XP, and visual state cannot leak into another specimen or reappear after reset.
- Technique comparison replay honors both the in-tool and operating-system reduced-motion preferences by showing a static full-path frame, and replay progress no longer produces dozens of live-region announcements.
- Timed-practical answers keep explanations hidden for both correct and incorrect responses, removing a correctness side channel and accurately describing when feedback is withheld.
- Lab report, structure information, and completion-summary copy actions now report success only after the Clipboard API resolves; unavailable or rejected access produces visible, announced failure feedback.
- Specimen switching clears transient state before restoring that specimen's saved progress. Reset affects only the current specimen.
- Quiz order and distractors are deterministic within a session instead of changing during render. Questions alternate between function and diagram-location evidence.
- Learners can answer by accessible multiple choice or by selecting a structure on the canvas. Timed practical mode uses the live score and cleans up its timer.
- The canvas uses pointer events for mouse, touch, and pen; zoomed panning uses pointer capture. The redraw loop is throttled by the selected animation speed and records active investigation time.
- Sound effects have an explicit on/off preference. Print now invokes a clean print stylesheet. The misleading dorsal/ventral and nonfunctional print-mode controls were removed.
- Reports and completion summaries use the current specimen's actual revealed-layer, structure, quiz, time, evidence-note, and confidence data.
- The primary learning flow is framed as orient, predict, reveal, identify, record evidence, and compare. Virtual-practice safety and ethics limitations are stated.
- Selected structures provide an evidence-note field and a three-level confidence check.
- The advanced inquiry simulator now saves normalized hypotheses, explanations, and up to 20 logged approaches per specimen. Specimen changes and resets cannot leak inquiry work between specimens, and reports include the current model evidence.
- Inquiry sliders have explicit labels and value text, modeled outcomes use a polite live status, disclosures retain keyboard focus, and simulator actions meet the lab's minimum touch-target convention.
- Sheep-eye and sheep-heart copy was revised where human-specific measurements or anatomy had been presented as species-identical. Human clinical material is labeled separately from specimen anatomy.
- Primary route, evidence, scope, and mission strings now use translation keys with English fallbacks.

## Verification

Focused Vitest coverage lives in:

- `tests/dissection_canvas_loop.test.js`
- `tests/dissection_lab_improvements.test.js`
- `tests/stem_widgets_smoke.test.js`

The source and deployment mirror are enforced as byte-identical by the focused regression suite:

- `stem_lab/stem_tool_dissection.js`
- `desktop/web-app/public/stem_lab/stem_tool_dissection.js`

## Focused comparative-anatomy correction

The fetal-pig, sheep-eye, and sheep-heart copy no longer describes another
species as a percentage match, anatomically identical, functionally identical,
or the closest equivalent to a human. Shared mammalian structures are stated
alongside concrete species differences, and the three specimen descriptions
are synchronized across the English source, all language-pack fallbacks, and
their deployment mirrors.

Sources used for this focused correction:

- U.S. Food and Drug Administration, [Xenotransplantation](https://www.fda.gov/vaccines-blood-biologics/xenotransplantation)
- Crick et al., [Anatomy of the pig heart: comparisons with normal human cardiac structure](https://pubmed.ncbi.nlm.nih.gov/9758141/)
- Nakakuki, [Bronchial tree, lobular division and blood vessels of the pig lung](https://pubmed.ncbi.nlm.nih.gov/7999892/)
- Shinozaki et al., [Topography of ganglion cells and photoreceptors in the sheep retina](https://pubmed.ncbi.nlm.nih.gov/20437529/)
- Hinton et al., [Profiling development of abdominal organs in the pig](https://pubmed.ncbi.nlm.nih.gov/36171243/)

This focused correction is not a substitute for the broader educator review
below.

## Remaining subject-matter review

The code now distinguishes specimen observations from human comparisons, but a qualified comparative-anatomy educator should still review every hard-coded structure description, landmark, numerical claim, and clinical correlation. That review should record sources and course-level suitability. It is intentionally not represented as complete by this engineering pass.

## Recommended follow-up

1. Run a short moderated usability session with keyboard-only, touch, and screen-reader users.
2. Have an anatomy educator sign off on specimen-specific content and add citations.
3. Feed the new `stem.dissection.*` keys through the normal translation extraction pipeline.
4. Consider a later module split separating specimen data, canvas rendering, persistence, and assessment logic; the current file remains large even though its high-risk state behavior is now covered.
