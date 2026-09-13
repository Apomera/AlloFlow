# Behavior Lens implementation

Implemented locally on September 12, 2026, following the [deep review](README.md). This change addresses the reproduced defects and strengthens the affected workflows. The original audit and reproduction artifacts are retained as historical evidence.

## Record integrity

- Practice scenarios use a separate, durable workspace identity. Returning to real data restores the previous student; practice records remain local.
- Imports resolve and persist the destination identity before hydration, including students newly added to the roster. Imported simulations enter the practice workspace.
- Delayed AI results are checked against student identity, input context, and request generation before being applied. Cloud-copy responses also verify the destination identity.
- ABC edits preserve phase, tags, linked observations, and other existing metadata. Custom and AI-filled narratives remain visible and editable. Occurrence date/time can be corrected while retaining recorded-at information.
- Primary record collections are no longer silently clipped at their former count limits. Import byte-size limits remain, and larger primary collections produce warnings.
- Rosters retain students beyond twenty. Batch CSV imports support quoted commas, doubled quotes, and embedded newlines, validate dates/intensity, and populate canonical student workspaces.

## Measurement and analysis

- Graph sessions are ordered chronologically; phase boundaries use stable anchors. Graph CSV imports read the measurement column correctly, and percentage/interval series use the appropriate values and units.
- Session completion finalizes active duration episodes and clears their timers. Live Observation excludes paused time, including pauses partway through an interval.
- Timed zero-event observations can be saved. Zero-valued targets, their observation time, and observation-only phases are retained in downstream summaries.
- Target IDs remain unique after deletion and reinsertion. Rate and phase calculations match the selected behavior and phase, including explicit Unassigned phases and custom target IDs.
- Progress Monitor uses the actual goal date, supports zero goals, and groups observations using local occurrence dates.
- Unknown intensity and timezone offsets remain unknown. Data quality counts distinct incomplete records. AI freshness fingerprints include narrative/context fields and target definitions; full summaries use stratified sampling and actual observation exposure.

## Interaction and accessibility

- The hub leads with primary tasks and gives specific prerequisite guidance. Quick actions and Family Mode entry points are more consistent.
- The mobile header reserves room for Close and wraps secondary actions. Styling is scoped to Behavior Lens.
- ABC choices, navigation, and progress indicators have meaningful accessible names and states. Tool-card heading structure and sandbox contrast are corrected.
- Recording dialogs contain keyboard focus, make the background inert, and restore focus on exit.
- Per-student recording drafts can be kept and resumed paused. Leaving a recording offers Keep draft, Continue recording, or Discard; successful saving clears the draft. Draft persistence failures block dismissal rather than silently losing work.
- Save messaging distinguishes locally saved records from exported backups.

## Verification

**224/224 regression tests passed across 31 files.** Final results are recorded in [test-results-final.json](implementation/test-results-final.json). Browser verification used synthetic students and isolated Chromium:

- Opened **96 tool panels** without JavaScript page errors.
- Confirmed that an old student's delayed AI summary is discarded and a current student's summary saves normally.
- Confirmed keyboard containment and recovery of a paused frequency draft with its tally intact; saving clears the draft.
- Confirmed that editing custom ABC narratives preserves metadata and unrated intensity.
- Checked the populated hub at **1280, 390, and 320 pixels**: Close remains fully visible, with **zero axe violations** at each width.
- Both JavaScript modules pass syntax checks. Root and desktop copies are byte-identical.

See [workflow results](implementation/flow-results.json), [layout/accessibility results](implementation/browser-results.json), and screenshots at [390px](implementation/hub-390.png) and [320px](implementation/hub-320.png).

The focused regression suite includes new mounted/component/runtime coverage for safe selection and imports, AI identity, measurement flows, interval pause timing, draft recovery, and normalization. Existing UI contracts and six golden snapshots were updated for the intentional interface changes. The AlloSheet handoff fixture now seeds the canonical workspace with an in-range date.

Run from the repository root:

```text
node node_modules/vitest/vitest.mjs run tests/behavior_lens tests/behaviorlens_i18n.test.js --maxWorkers=1 --pool=threads --testTimeout=30000
node reports/behavior-lens-deep-review-2026-09-12/verify-layout.cjs
node reports/behavior-lens-deep-review-2026-09-12/verify-flows.cjs
```

The original audit probes intentionally assert earlier defects. Use the regression tests and verification scripts above for the corrected behavior.

## Limits and remaining design work

Browser verification substitutes icons, AI responses, and host callbacks. Live Firebase/authentication, actual model output, native assistive technology, and the complete surrounding application were not exercised. Opening 96 panels verifies navigation and mounting, not every control within them. The axe result applies to the tested hub states, not a claim of complete accessibility conformance. These changes have not been deployed.

Broader product work remains: a common target/phase/goal model across all tools; interactive CSV column mapping and preview; one consistent provenance/exposure view across graphs and exports; and complete cross-tool unification of task navigation, save status, and family-facing language. This patch repairs specific affected paths and adds a task-oriented starting point without replacing every tool's underlying model.

Supporting implementation notes: [data integrity](data-integrity-implementation.md) and [UI/accessibility](ux-implementation-notes.md).
