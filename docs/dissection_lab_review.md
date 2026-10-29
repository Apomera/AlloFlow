# Virtual Dissection Lab improvement review

Updated: 2026-10-29

## Learning workflow and recovery follow-up

- Learning objectives now offer a direct action for the first missing inspection, note, confidence rating, or Guided identification check. Locked targets lead to layer preparation; navigation does not unlock anatomy or award observation credit. Actions pause during assessments and technique animations.
- Lab tools now offer a readable full-report preview, plain-text download, and manual text selection as alternatives to clipboard access. Reports include objective next steps and saved records awaiting inspection, distinguish reference functions from learner observations, and explicitly identify missing confidence or notes. Evidence images remain separate; text reports are not restorable session backups.
- Storage warning and protected-save states offer direct access to the current session report. Reference-bearing report exports are unavailable during assessments.
- Specimen hydration now uses a cancelable queue per mounted lab. Repeated renders coalesce pending loads, while resets, specimen switches, retries, newly restored state, and unmounts invalidate obsolete work. Reset marks the new specimen session loaded before subsequent notes are entered.
- Fullscreen focus follows actual native or CSS-fallback entry, including delayed browser rejection. Entry announcements wait for the visible transition, repeated pending requests are ignored, and lifecycle listeners are released on exit or unmount.

Behavioral coverage: `dissection_objective_handoff.test.js`, `dissection_report_export.test.js`, `dissection_load_lifecycle.test.js`, and `dissection_fullscreen_lifecycle.test.js`. Desktop and phone workflow coverage: `tests/e2e/dissection-learning-report.spec.ts`.

Verification for this follow-up: 346 focused regression cases verified across the integrated run and targeted reruns, plus two Chromium workflows at 390px and 1440px. The integrated run exposed two obsolete assertions, an assessment failure cascading from an earlier test's incomplete cleanup, and one keyboard-test timeout; the corrected assertions and affected tests passed on rerun. The unrestricted dissection sweep was stopped after resource-related timeouts, so this is not a full-suite certification. JavaScript syntax, scoped whitespace checks, and source/deployment-mirror byte parity passed.

## Observation review and interaction integrity

- Observation review now separates self-rated confidence, documentation, and checked identifications. Search-aware filters show structures that need a check or have a successful Guided/first-attempt assessment record. The list, larger reading view, and exported summary show the source of verification.
- Available unchecked observations can open a one-structure Guided check directly from the list or reading view. Navigation preserves notes, confidence, observation credit, and layer locks. Successful focused checks award identification credit without granting completion of a full Guided investigation.
- Assessment entry now clears teaching overlays, baseline comparison, replay state, and active gestures consistently for new assessments, missed-item review, and timed practicals. Pending reveals block entry, and restarting cannot reset an active practical.
- Saved annotation coordinates must be finite numbers within the model bounds, with complete previous-point pairs. Invalid records remain protected byte-for-byte. Defensive drawing skips malformed live marks and avoids drawing a connecting line across them; valid legacy marks remain supported.
- A late fullscreen rejection cannot activate CSS fullscreen after its stage is detached. Closing a dissection stage releases its own CSS lock without exiting another element's native fullscreen.

Focused coverage includes `dissection_observation_checks.test.js`, `dissection_annotation_integrity.test.js`, `dissection_assessment_entry.test.js`, and the expanded fullscreen lifecycle suite. `tests/e2e/dissection-observation-checks.spec.ts` covers desktop/phone review filters, accessible reading-view navigation, and evidence-preserving check handoffs.

Verification: 296/296 tests passed across 12 focused suites. All 10 observation-review Chromium workflows passed, including the new desktop/phone checks and scoped WCAG audits. The dissection deployment mirror and all three shared STEM runtime copies are byte-identical; scoped whitespace checks are clean.

## Guided follow-through and evidence repair

- Completing an observation's Guided check now focuses a result summary that separates checked identification from note/confidence completion. It offers the exact missing record action, the next available unchecked observation, and a return to the existing review search/filter. Locked observations remain locked, and finishing all inspected observations does not imply mastery of the whole specimen.
- Guided and keyboard feedback now preserves the actual outcome: first inspection, existing-record review, pending observation check, or verified identification. A generic inspection announcement no longer replaces the checkpoint instruction, and successful verification no longer leaves a stale “step has not advanced” message.
- Supported assessment review removes a missed item only after a correct response in that review session. Showing an answer keeps the item queued; unasked items remain for later batches, and first-attempt evidence is unchanged.
- Notebook identity repair preserves images and metadata while assigning stable distinct IDs to missing, duplicated, or DOM-colliding frame identities. Removing one frame removes one entry. Repair also preserves valid zero-valued IDs and the selected reference wherever the old reference identifies a frame unambiguously.

Focused coverage includes `dissection_observation_checks.test.js`, `dissection_review_resolution.test.js`, `dissection_evidence_identity.test.js`, and expanded keyboard tests. Desktop/phone browser checks exercise actual Guided completion, result focus, scoped accessibility, and return to the unchanged review filter.

Verification: 270/270 regression tests passed across 11 suites, plus all 10 desktop/phone observation-review browser workflows. Source/deployment-mirror byte parity, JavaScript syntax, and scoped whitespace checks passed.

## Recall continuity, notebook capacity, and fullscreen keys

- Flashcards can pause on a specific structure to find it in the specimen or review an existing evidence record. A visible resume control restores the same draft, self-ratings, card, answer visibility, and focused round. Recall drafts remain separate from observed evidence; navigation does not grant credit or unlock anatomy. Successful layer/specimen changes, confirmed reset, a new flashcard round, or explicit end clear the paused activity.
- Valid notebooks with more than six frames retain all existing frames during hydration, drawing, and autosave. Six remains the limit for new captures. Over-capacity guidance explains how many frames must be removed before capturing again; comparison and individual deletion continue to work, including the oldest selected frame. Explicit storage-quota fallback remains separate and visible.
- Plain Escape inside the active fullscreen stage exits fullscreen without also clearing selection or observation tools. Tab and Shift+Tab stay within visible enabled stage controls; modified shortcuts, editable controls, and unrelated labs retain their own behavior.

Focused coverage includes `dissection_flashcard_handoff.test.js`, expanded evidence-identity tests, and fullscreen lifecycle tests. The flashcard and fullscreen keyboard browser suites exercise both phone and desktop interactions.

Verification: 294/294 tests passed across 13 focused suites, plus all six desktop/phone flashcard and fullscreen browser scenarios. The dissection runtime and deployment mirror are byte-identical; JavaScript syntax and scoped whitespace checks passed.

## Technique restart review and repeat practice

- Starting a new technique attempt now checks whether the current work matches its saved baseline. Changed or legacy attempts open a review with save-and-restart, discard-and-restart, and cancel choices. Both normal save and save-and-restart explicitly identify replacement of the oldest attempt when the six-attempt archive is full. Unchanged saves do not add duplicate baselines. Cancel preserves the current work, and stale reviews cannot restart another layer, specimen, or changed attempt.
- Guided identifications and whole-investigation completion award XP only when first earned for the specimen's current progress. Repeated rounds remain available as practice, retain the original verification evidence, and explain why no additional XP was awarded. Duplicate submissions cannot advance a checkpoint or grant credit twice.
- Fullscreen exit stays outside the scrolling tool area. The controls retain their bounded scroll region on narrow and short screens, so the exit remains visible and usable after reaching the last tool.

Focused coverage includes `dissection_attempt_restart.test.js`, Guided credit regressions, and the existing fullscreen lifecycle tests. Browser workflows cover restart review at phone and desktop sizes, repeated Guided rounds, and fullscreen exit visibility on narrow, landscape, and large-text displays.

Verification: 283/283 tests passed across 15 focused suites. Nine Chromium workflows passed across the initial run and targeted reruns. The initial browser failures came from tests trying to use a collapsed technique panel, a directory hidden by the selected-record view, and a button's visible text instead of its accessible name; the corrected tests use the native panel and directory navigation. Restart reviews passed scoped WCAG checks at 390px and 1440px. Source/deployment-mirror byte parity, JavaScript syntax, and scoped whitespace checks passed.

## Assessment input and action boundaries

- Assessment responses now claim the displayed question or retry before state updates commit. Rapid wrong-then-correct inputs preserve the wrong first attempt, duplicate correct inputs grant credit once, and a deliberate supported retry remains available after feedback. Answer and Show answer share the same guard; question changes, assessment modes, and separate labs remain isolated.
- Clipboard results belong to the originating lab and copy request. Delayed results cannot replace newer action feedback after a specimen, layer, or learning-route change, and older requests cannot override newer copy outcomes. Routine timer updates still allow pending copies to complete normally.
- Undo waits until pending layer reveals, view transitions, and direct gestures finish, with an explanation beside the disabled control. Assessments also protect technique work. Stale Undo actions cannot alter a different specimen, layer, or newer attempt; practice on an already revealed layer still supports Undo.

Focused coverage includes `dissection_assessment_submission.test.js`, `dissection_clipboard_lifecycle.test.js`, and `dissection_undo_boundaries.test.js`. Browser workflows exercise rapid assessment inputs and supported retry, delayed clipboard outcomes, and Undo during a real layer reveal at phone and desktop sizes.

Verification: 261/261 tests passed across 17 focused suites, plus all five Chromium workflows across the initial run and a targeted clipboard rerun. The clipboard browser test initially used the visible button text instead of its accessible name; correcting the selector exercised the intended workflow successfully. JavaScript syntax, source/deployment-mirror byte parity, and scoped whitespace checks passed.

## Interrupted review and failed-reset recovery

- Correct supported-review responses now leave the missed-structure queue immediately, so leaving a batch or reloading the lab preserves completed review work. Each batch keeps a fixed set of up to five questions while the pending queue shrinks; unasked and answer-revealed items remain queued. First-attempt assessment evidence is unchanged.
- A failed specimen reset leaves active layer reveals and their timers intact. Timer and pending-save cleanup now follows successful deletion, so a refused reset neither stalls the current activity nor erases its work. Successful resets still prevent old callbacks from restoring deleted progress.
- Previous/Next structure navigation hands focus into the record when it reaches an end and disables its own button. Navigation between middle structures keeps the control focused for repeated keyboard use; Guided checks retain their checkpoint handoff.

Coverage includes `dissection_review_interruption.test.js`, `dissection_reset_failure.test.js`, recovery browser workflows, and terminal-structure keyboard navigation.

Verification: 206 distinct regression cases verified across the 203-case integrated run and targeted reruns. Two older focus fixtures lacked the captured review batch; after updating their setup, all 23 focus cases and three legacy review-summary regressions passed. All six browser workflows passed, including interrupted review at 390px/1440px, failed reset during a real reveal, both terminal navigation directions, and unchanged middle navigation. JavaScript syntax, source/deployment-mirror byte parity, and scoped whitespace checks passed.

## Completed-result consistency and protected navigation

- Completed assessments now save their supported-answer count alongside the completed score and total. Reports, certificates, and review summaries retain that count when a newer assessment starts or is abandoned. A known zero remains zero; older or invalid records without a trustworthy count say Not recorded.
- Specimen switching now checks saved bytes even when autosave has already finished. Same-page changes, deleted or incompatible records, and newly unavailable storage block departure before in-memory work is cleared. The existing report-export and protected-save recovery controls remain available.
- Layer selection and observation-edit handoffs wait for an active reveal to finish. Disabled actions explain the temporary restriction, and observation reading views remain open and readable. The legitimate reveal completes normally, then navigation becomes available again.

Coverage includes completed-result snapshot tests, specimen-switch conflict tests, observation reveal-navigation tests, and browser workflows for reports, recovery exports, and reveal-time navigation.

Verification: 163/163 tests passed across 16 focused suites. All six Chromium workflows passed across the initial run and targeted navigation rerun. Two navigation tests initially paused the test clock at an instant that had already elapsed; moving the pause slightly forward fixed the setup without changing application behavior. JavaScript syntax, source/deployment-mirror byte parity, and scoped whitespace checks passed.

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
