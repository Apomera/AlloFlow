# Virtual Dissection Lab improvement review

Updated: 2026-08-31

## Implemented

- Progress now loads and saves per specimen, including revealed layers, explored structures, assessment totals, active layer, annotations, investigation time, evidence notes, confidence ratings, and objectives.
- Debounced progress writes are keyed per specimen. A specimen switch flushes the departing record before loading the next one, reset cancels pending pre-reset writes so deleted progress cannot be recreated, and pending writes flush when the page is hidden or closed.
- A visible, polite save-health indicator reports saved, storage-limited, failed, and recovered states for the active specimen only. A conflict in an inactive specimen cannot replace the active specimen's status or recovery controls. If image-heavy evidence exceeds browser storage, the lab retries with the newest frame and then with text-only evidence so notes, procedure state, inquiry work, and assessment progress are retained whenever possible.
- Saved progress is now schema-gated and fail-closed. Future-version, malformed, empty-string, non-object, and unsafe nested records are preserved byte-for-byte instead of being replaced by defaults.
- Each writable specimen save tracks the exact bytes it loaded or last wrote. Before each write, the lab compares the stored bytes with that baseline; detected valid current-version changes, deletions, or creations from another tab pause local saving instead of knowingly overwriting the record. Storage events surface detected conflicts, and pagehide repeats the comparison as a missed-event fallback. This is best-effort conflict detection, not atomic concurrency control: `localStorage` has no compare-and-set operation, so another tab can still write between the final comparison and `setItem`, leaving near-simultaneous writes subject to last-writer-wins.
- Protected saves offer a nondestructive retry that keeps saving locked until the record is successfully reread and validated. A successful retry reloads the saved version; if storage becomes readable and no record exists, the lab keeps temporary-session work and resumes saving from it; a failed retry preserves that work in memory. Confirmed reset remains the explicit destructive alternative.
- Evidence capture no longer silently evicts the oldest frame when the six-frame notebook is full. Learners are directed to download or remove a frame first, and duplicate millisecond capture IDs are avoided.
- The evidence notebook now supports confirmed per-frame removal and confirmed clear-all cleanup. Reference selection is repaired after deletion, notes and non-image progress are preserved, focus returns to the notebook, and incomplete legacy frame metadata receives readable fallback labels.
- Delayed layer-reveal work is now owned and cancelable. Switching specimens, confirming reset, or unmounting the canvas clears pending reveal and transition timers so progress, XP, and visual state cannot leak into another specimen or reappear after reset.
- Technique comparison replay honors both the in-tool and operating-system reduced-motion preferences by showing a static full-path frame, and replay progress no longer produces dozens of live-region announcements.
- Timed-practical answers keep explanations hidden for both correct and incorrect responses, removing a correctness side channel and accurately describing when feedback is withheld.
- Timed practicals now use an absolute wall-clock deadline, resume accurately after canvas remounts or browser throttling, settle exactly once from the current assessment score, and end safely before Advanced-only controls are hidden by an Essentials workspace switch.
- The timed-practical control has a stable accessible name plus a non-live `timer` output, allowing screen-reader users to inspect the remaining duration without receiving an announcement every second.
- Learning objectives require observation, an evidence record, and verified understanding for every mapped structure. Invalid or ambiguous target mappings fail closed below demonstrated status; progress copy shows each denominator and names the structures still needing verification.
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

### Deep integrity follow-up

- Save queues, loaded-byte baselines, conflict state, and status messages are now owned by the rendered lab instance as well as the specimen key. Two same-specimen labs can initialize from identical bytes, but a stale instance cannot overwrite newer work from another lab; only the stale owner is protected, and its queued timers/access state are released on unmount.
- Persistence ownership now uses a stable object token created by the real plugin bridge. The host may recreate its deferred setter wrapper on every parent render without rotating the mounted lab's owner, multiplying pending queues, or falsely protecting its own latest work.
- Layer peel, layer reveal, technique demonstration, attempt replay, comparison replay, view-turn, and layer-browse timers now live in a registry on the originating canvas. Starting or unmounting a sibling lab cannot cancel another lab's work, and callbacks clear transient state only when their specimen and start token still match.
- Specimen changes require a complete departing snapshot. Transient write failures retain the pending snapshot for retry, storage-limited partial writes remain explicitly incomplete, and protected or unavailable saves prevent a silent specimen switch.
- Root-local keyboard and focus behavior no longer falls through to another lab. Skip links, return links, reset recovery, specimen navigation, fullscreen focus, and dynamic ID lookup stay within the originating root even when duplicate legacy IDs exist elsewhere in the document.
- Persisted learning checks, action metrics, points, tissue snapshots, and action-specific undo state are validated before use. Undo snapshots now serialize explicit defaults, restore only whitelisted fields, and preserve the earlier state when an action is repeated.
- Assessment review ignores retired target IDs, preserves items beyond a five-question batch, freezes practical targets, keeps first-attempt scoring honest, and withholds mastery completion when required objective evidence is missing.

## Verification

Focused Vitest coverage lives in:

- `tests/dissection_canvas_loop.test.js`
- `tests/dissection_lab_improvements.test.js`
- `tests/stem_widgets_smoke.test.js`

The source and deployment mirror are enforced as byte-identical by the focused regression suite:

- `stem_lab/stem_tool_dissection.js`
- `desktop/web-app/public/stem_lab/stem_tool_dissection.js`

Latest verification for this pass:

- `tests/dissection_lab_improvements.test.js`: 91 passed
- `tests/dissection_canvas_loop.test.js`: 3 passed
- `tests/microdissection_anatomy3d.test.js`: 70 passed
- `tests/stem_widgets_smoke.test.js`: 29 passed, 2 intentionally skipped
- Shared plugin-bridge hook-order suites: 11 passed
- Canonical module, desktop mirror, regression file, and shared smoke harness: JavaScript syntax clean
- Canonical and desktop dissection modules: byte-identical (SHA-256 `CDE3879C9DD0C239F71D7E5093A85733E52B0E4C550291164532885E1CFBA3E8`)
- Canonical plugin bridge and both desktop copies: byte-identical (SHA-256 `C0E251F0A79682D6AF78C87907B11A7D52E15C2DBCFA843B6630E58AD52111B2`)
- `git diff --check`: clean; existing line-ending conversion notices remain in unrelated files

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
5. If strict simultaneous multi-tab editing must be supported, migrate specimen records to transactional storage or add a cooperative locking protocol; the current `localStorage` compare-then-write guard cannot make the read/write pair atomic. Until then, avoid editing the same specimen in multiple tabs or windows at once.
