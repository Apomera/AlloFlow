# Behavior Lens deep review

> **Implementation update:** The reproduced defects and affected workflows have now been improved locally. See [implementation details and verification](IMPLEMENTATION.md). The findings below describe the original audit state; their source line references and defect probes are historical.

Reviewed September 12, 2026. **The main risks are record integrity and measurement correctness, followed by accessibility and mobile navigation.** Several workflows can lose records or produce misleading results without a visible error. Address those before expanding the tool catalog.

At the time of this audit, no application source had been changed. The root and desktop copies of both Behavior Lens modules are identical. All test data was synthetic.

## What was checked

- Reviewed the 30,883-line main module and 1,335-line workspace module across persistence, imports, recording, graphs, AI results, navigation, forms, and accessibility.
- Ran the existing focused suite: initially **184 of 186 tests passed** across 25 files. On a serial rerun, the accessibility timeout passed. One AlloSheet test still fails because it seeds an obsolete storage key; this is a test-fixture problem, not evidence that a correctly populated AlloSheet transfer is broken.
- Used isolated Chromium with the current module, installed React, and locally generated Tailwind styles at **1280, 390, and 320 pixels**. Opened **96 tool panels** without a JavaScript page error. This verifies basic mounting/navigation, not every control in those panels.
- Reproduced delayed AI delivery across student switching, recording-dialog focus escape, and dismissal without saving in Chromium. Ran additional mounted React persistence tests and actual-source calculation/component probes.
- Ran axe on the populated hub. It identified an unnamed progress bar, three low-contrast sandbox labels, and additional lower-impact semantic findings.

The browser fixture substitutes icons, AI responses, and host callbacks. It does not exercise production authentication, live Firebase, actual model output, native assistive technology, or the complete surrounding application. Calculations and mounted persistence findings below identify their evidence separately. A reproduction probe passing means it successfully demonstrated the current defect; it does not mean the product is fixed.

## Priority findings

**P1**: protect records, correct measurements, or restore a blocked core interaction. **P2**: fix workflow reliability, misleading feedback, or secondary accessibility. Each item includes a concrete correction direction.

### 1. P1 — Practice Sandbox overwrites the selected real student's records

**Reproduced with mounted React and saved-storage assertions.** Start with a saved student, open Practice Sandbox, select a scenario, and choose Load This Scenario. The real student's canonical backup is replaced by simulated ABC/observation data. Clear Practice Data then saves an empty array to that same student. The saved workspace contains no practice marker, so reopening also loses the indication that those entries were simulated.

The practice loader replaces shared state at [main module:26159](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:26159); autosave at [26878](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:26878) writes that state under the active student identity.

**Fix:** give practice a separate workspace identity and storage namespace. Preserve and restore the prior workspace when entering/exiting. Do not rely only on a banner or an autosave exception; reload, export, and cloud sync also need the same isolation.

### 2. P1 — Importing a previously unseen student can immediately lose the imported records

**Reproduced with a mounted file-input import.** Import a valid version-4 workspace for a student not in the local roster. The app creates a roster entry, but the resulting student workspace lacks the imported entry.

The pending import is consumed before the new immutable student ID has stabilized. The next hydration pass, triggered by assigning that ID, resets the imported state and loads an empty destination. See [main module:26734](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:26734).

**Fix:** resolve/create the destination identity first, then apply and persist the import once against that identity. Report success only after verifying the destination snapshot. Test both existing and new students, including importing after switching from another student.

### 3. P1 — A delayed AI response can be saved to the wrong student

**Confirmed in Chromium, including durable storage.** Request Full Student Summary for Eagle, switch to Falcon before it resolves, then deliver the response. Eagle's summary appears under Falcon and is saved in `behaviorLens_workspace_audit-falcon`; Eagle's own saved summary remains empty.

[handleFullSummary:26467](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:26467) applies the awaited result without checking the current student or request generation. [handleAiAnalyze:26971](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:26971) has the same unguarded result-application pattern; its wrong-student path is source-supported, while the summary path was reproduced end to end.

**Fix:** bind each request to immutable student ID, request generation, and input fingerprint. Ignore or deliberately store a completed response under its original identity if the current context changed. Invalidate requests on switching, importing, replacing practice data, or issuing a newer request. See [browser evidence](flow-results.json) and [screenshot](ai-summary-wrong-student.png).

### 4. P1 — Ordinary ABC edits erase phase and other saved metadata

**Reproduced with mounted React.** Open an existing ABC entry, change only its notes, and save. Its phase, function, tags, linked observation session, and metadata are reset to null/empty values.

[ABCModal save:780](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:780) builds a new object from visible fields instead of preserving the rest of the existing record. This can move an observation out of a baseline/intervention grouping without the user editing its phase.

**Fix:** merge permitted edits into the existing normalized entry, preserving immutable identity, occurrence metadata, phase, and provenance. Make deliberate changes to those fields explicit.

### 5. P1 — ABA Graph can reverse the apparent trend

**Reproduced using actual graph calculations and save-order code.** Sessions recorded chronologically as **10 → 5 → 1** are stored newest first and graphed as **1 → 5 → 10**. Numerical phase boundaries can also shift historical records as newer sessions are added.

The parent prepends sessions at [29694](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:29694); the graph maps that order directly at [16723](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:16723).

**Fix:** sort a derived series chronologically before assigning graph positions. Keep stable session IDs and anchor phases to stable sessions/timestamps. Test that saving another session cannot reassign earlier observations to different phases.

### 6. P1 — Ending a session loses an active duration episode and carries its timer forward

**Reproduced with actual component callbacks.** Start a duration target, let it run, and end/save the session without explicitly stopping that target. The saved target contains no duration. Begin another session: the old timer is still active, and stopping it includes time outside the new observation.

See [Session Data Tracker:16445](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:16445) and [16455](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:16455).

**Fix:** finalize every active episode at one session-end timestamp, then clear all episode timers. Define whether pause suspends duration recording and make that behavior consistent.

### 7. P1 — Valid zero-event observations are rejected or omitted

**Reproduced with actual save callbacks and bridge inspection.** Frequency Counter has an enabled Save button but silently does nothing for a timed session with zero events. In a mixed-counter session, a target with zero events is removed when constructing graph history.

The early return is at [2493](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:2493); the bridge filters out zero counts at [27048](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:27048). Phase summaries can also omit a phase containing observation time but no ABC incidents.

**Fix:** represent an observed zero explicitly and retain its observation duration and target identity. Separate zero from “not observed.” Preserve zero-valued targets in graphs, summaries, and exports.

### 8. P1 — Graph imports and automatic measurement selection can plot the wrong numbers

**Reproduced with actual source calculations.** The documented CSV form `1,12 / 2,8 / 3,4` imports measurements **1,2,3**, taking the first number on each line instead of **12,8,4**. A percentage target with three correct trials out of four graphs **3**, not **75%**. An interval observation with two occurrences across four intervals can likewise graph the count rather than the percentage.

See [graph adapters:16727](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:16727) and [CSV parser:16758](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:16758).

**Fix:** preview parsed columns and require an explicit measurement when ambiguous. Share a typed measurement adapter across recorders and graphs: value, unit, numerator, denominator, target, and exposure. Prevent incompatible measurement types from silently sharing a series.

### 9. P1 — Custom and AI-filled ABC narratives disappear from the editor

**Confirmed by rendering the actual ABC component.** An entry containing custom antecedent, behavior, and consequence text reopens with none of those narratives visible. Quick Fill can create the same state: freeform strings are assigned internally, but the original input clears and no custom field appears. Save remains available.

[Initial state:633](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:633) retains freeform values, while [the picker:823](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:823) only shows an editable text field when the value equals the literal `Other`.

**Fix:** map unmatched text into a visible custom editor, or separate category choice from narrative. Always show the final ABC values for review before saving AI-assisted entries.

### 10. P1 — Core ABC controls have indistinguishable accessible names

**Confirmed by actual rendered markup.** Twenty-seven distinct ABC options are all named **“Toggle value”**, overriding their meaningful visible labels. The wizard's answers are all “Select,” and category navigation repeats “Toggle active cat”/“Toggle Cat,” generally without selected/expanded state.

See [ABC picker:813](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:813), [wizard:24629](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:24629), and [categories:28719](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:28719).

**Fix:** use the visible option text as its accessible name, group choices by question, and expose selection state. Give navigation controls their destination/action names. Test computed names and keyboard behavior rather than the presence of an `aria-label` string.

### 11. P1 — The mobile header clips the Close button

**Confirmed in Chromium.** At 390px, Close occupies x=385.4–429.4; almost all of it is off-screen. At 320px it is entirely outside the viewport. The document itself reports no horizontal overflow, so a simple document-width check misses the defect.

The unwrapped header begins at [29010](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:29010). See [390px screenshot](hub-390.png), [320px screenshot](hub-320.png), and [measurements](browser-results.json).

**Fix:** reserve space for Close and wrap or collapse secondary status/actions. Test bounding rectangles of essential controls at small widths, with long names, extra sync badges, and zoom.

### 12. P2 — Recording dialogs lose both keyboard context and unsaved observations

**Confirmed in Chromium.** Shift+Tab from Frequency Counter's Close button moves focus to the obscured hub's Load Workspace button. Add a tally and press Escape: the dialog disappears with zero saved observation sessions. No draft/recovery step is offered.

The overlay lacks its own Tab containment; the outer handler explicitly ignores nested dialogs at [25694](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:25694). Escape clears overlay state at [26961](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:26961). Ordinary X/Save exit also needs consistent focus restoration.

**Fix:** use a shared dialog primitive with background inertness, bidirectional focus containment, and opener restoration. Preserve an in-progress recording draft; distinguish Save, Keep draft, and Discard when leaving a session containing data.

## Additional confirmed issues and follow-ups

| Priority | Finding and consequence | Correction |
|---|---|---|
| P1 | ABC normalization silently truncates 5,001 valid entries to 5,000 while reporting `droppedCount: 0` ([workspace:439](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_workspace_module.js:439)). | Reject oversized imports explicitly, or retain all records through chunked storage; report every omitted record accurately. |
| P2 | Session target IDs use array length. Add three, delete the middle, then add another: two targets share an ID and edits affect both ([16438](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:16438)). | Generate immutable unique IDs; apply the same check to similar target/task editors. |
| P2 | Unassigned phase rates borrow observation time from named phases; behavior-specific phase comparisons do not consistently filter exposure ([workspace:649](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_workspace_module.js:649)). | Use matching behavior/phase scope for numerator and denominator, and include observation-only phases. |
| P2 | Progress Monitor ignores Goal Date and hides an aim line for a valid zero goal ([23098](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:23098), [23172](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:23172)). | Extend the time axis to the actual goal date and distinguish zero from no goal. |
| P2 | AI freshness fingerprints omit prompt inputs such as setting and notes; editing these can leave analysis labeled current ([workspace:681](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_workspace_module.js:681)). | Fingerprint all normalized analysis inputs and configuration. |
| P2 | Re-normalizing an unknown timezone offset converts null to UTC zero; Progress Monitor independently uses UTC date grouping ([workspace:250](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_workspace_module.js:250), [23113](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:23113)). | Preserve unknown offsets and use one occurrence/local-date convention. |
| P2 | Data quality counts incomplete records using the largest missing-field count, undercounting records missing different fields ([workspace:673](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_workspace_module.js:673)). | Count distinct records with any missing required field. |
| P2 | Several older paths turn unrated intensity into 3, despite newer analytics treating it as unknown ([637](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:637), [22453](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:22453)). | Preserve Not rated across entry, editing, analysis, and reports; disclose rated sample size. |
| P2 | Panel navigation focuses the first `h2/h3` in the entire document, potentially outside Behavior Lens ([26346](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:26346)). | Focus the destination heading inside a scoped content ref and announce its displayed name. |
| P2 | Populated hub axe check finds one unnamed progressbar and three sandbox labels at 2.66:1 contrast. | Name progress indicators and fix the actual foreground/background combinations; retain rendered-state checks. |
| P2 | Injected CSS broadly targets `.fixed.inset-0` and remains after closing, potentially changing unrelated host dialogs ([113](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/behavior_lens_module.js:113)). | Scope overrides to a dedicated Behavior Lens root. Host-wide visual impact remains a follow-up integration check. |

## Functionality and UX improvements worth building

1. **Create one coherent observation-to-report workflow.** Define a target → record → review/correct → compare over time → export. Share the same target, phase, goal, units, and session identity across tools. The present parallel models are the root of several confirmed disagreements.
2. **Make occurrence time editable.** ABC entry stamps new incidents with the current time and offers no occurrence date/time correction. Support after-the-fact entry while retaining a separate recorded-at audit timestamp.
3. **Make the hub task-based.** The current fixture presents 101 tool cards. Lead with a few primary tasks, recent work, and favorites; move the complete catalog behind a clearly labeled browse/search view. Present sample work in a visibly separate workspace.
4. **Make prerequisites explain the next action.** Replace generic unavailable messages with “Choose a student,” “Record an observation,” or the precise missing input. Apply this equally to cards, favorites, quick launch, onboarding, and wizard routes. Preserve the requested destination after setup.
5. **Make Family Mode consistent.** Its filtered catalog should agree with its quick actions, language, and onboarding. Opening a parent-oriented destination should also choose the intended role when the control says it does.
6. **Use a consistent save model.** Distinguish saved locally, pending cloud sync, exported backup, and unsaved recording draft. Avoid generic “unsaved changes” messages for data already persisted locally. Include recovery and export actions at the point they matter.
7. **Show provenance and uncertainty in one place.** Display measurement type, observation time, included/excluded records, missing ratings, local date range, and whether an AI analysis still matches those inputs. Make these conventions agree between screen, graph, and export.

## Recommended implementation order

1. **Protect records:** isolate practice, stabilize import identity, guard asynchronous AI results, preserve fields on edit, handle storage bounds explicitly.
2. **Correct the measurement pipeline:** chronological graphs, units/CSV parsing, duration finalization, zero-event observations, unique target IDs, phase exposure.
3. **Repair core interaction:** visible custom ABC text, meaningful choice names/states, phone header, recording drafts/dialogs, scoped panel focus.
4. **Simplify and unify:** shared target/goal/phase models, task-oriented entry, coherent save status, consistent family experience, then additional tools.

Use regression tests that span **record → save → switch/reopen → graph → export**. Source-string tests remain useful for narrow contracts but currently allow significant behavior and accessibility defects to pass.

## Evidence and reproduction files

- [Data integrity findings](data-integrity.md) and [mounted reproduction suite](data-integrity.probe.test.js).
- [Analytics findings](analytics-findings.md), [12 calculation/component probes](analytics-probes.cjs), and [results](analytics-probe-results.json).
- [UX/accessibility findings](ux-accessibility.md), [rendering probes](ux-source-probe.cjs), and [results](ux-source-probe-results.json).
- [Browser harness](browser-audit.cjs), [flow harness](flow-audit.cjs), [layout/axe results](browser-results.json), and [flow results](flow-results.json).

Run commands from the repository root:

```text
node node_modules/vitest/vitest.mjs run tests/behavior_lens tests/behaviorlens_i18n.test.js --maxWorkers=2 --reporter=dot
node node_modules/vitest/vitest.mjs run --config reports/behavior-lens-deep-review-2026-09-12/vitest.data-integrity.config.mjs
node reports/behavior-lens-deep-review-2026-09-12/analytics-probes.cjs
node reports/behavior-lens-deep-review-2026-09-12/ux-source-probe.cjs
node reports/behavior-lens-deep-review-2026-09-12/browser-audit.cjs
node reports/behavior-lens-deep-review-2026-09-12/flow-audit.cjs
```

The audit-only reproduction suites intentionally assert the current defective behavior. When implementing corrections, convert those assertions into expectations for the desired behavior rather than preserving them as product acceptance tests.
