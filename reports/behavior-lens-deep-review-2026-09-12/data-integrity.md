# Behavior Lens data integrity review — 2026-09-12

Scope: canonical workspace normalization, browser persistence, cloud save/load and conflict handling, workspace import/export, practice mode, ABC editing, and CSV import. Product files were inspected without edits. Audit probes use the existing React/jsdom harness and mock localStorage.

## Confirmed findings

### P1 — Practice mode overwrites the selected student's real workspace

**Code:** `behavior_lens_module.js:26159–26179`, `26554–26567`, `26878–26921`.

**Reproduce:** Open a student with a real ABC record. Open Practice Sandbox, choose a prebuilt scenario, then Load This Scenario. After the 300 ms local save delay, the student's canonical `behaviorLens_workspace_<id>` contains the simulated records instead of the real record. Clear Practice Data then writes an empty ABC/observation collection to that same workspace.

**Confirmed in mounted probe:** The original `real-entry` disappeared, simulated entries were saved under Student A, and Clear Practice Data persisted `[]`. The snapshot does not contain `isPracticeMode`, so a subsequent reload treats the simulated records as normal student data without the practice banner.

**Why:** Practice reuses the live student state; local and cloud autosave do not exclude practice; the previous workspace is never restored.

**Improve:** Give practice a separate workspace identity/store, preserve the active real workspace on entering it, and restore that workspace on exit. Persist a simulation flag with any exported practice artifact. Test load, reload, clear, student switch, and cloud sync.

### P1 — Importing a new student's JSON workspace loses the imported records

**Code:** `behavior_lens_module.js:26230–26235`, `25962–25985`, `26720–26741`, `26744–26774`.

**Reproduce:** With Student A active, load a valid JSON workspace for Student New, a name absent from the roster. The UI reports successful import. The roster then contains Student New, but the canonical workspace associated with its new immutable ID lacks the imported ABC entry.

**Confirmed in mounted probe:** Uploaded a version-4 file with `student: 'Student New'`, `studentId: 'new-student-export-id'`, and `id: 'imported-entry'`. After 350 ms, the new roster student's canonical workspace did not contain `imported-entry`.

**Why:** The pending import is consumed during the temporary name-based hydration. The auto-add effect then creates a roster ID, triggering a second hydration that resets the state and loads an empty ID-based workspace. The imported studentId is ignored.

**Improve:** Resolve/create the destination roster identity first, bind the pending import to that ID, and consume it only in the final identity's hydration. Do not announce success until the imported workspace is applied and persisted. Test new-student and existing-student imports separately.

### P1 — Editing an ABC record discards phase and other existing metadata

**Code:** `behavior_lens_module.js:780–801`; defaults in `behavior_lens_workspace_module.js:406–430`.

**Reproduce:** Open an ABC record carrying `phase: 'baseline'`, a function, tags, an observationSessionId, and metadata. Change only Notes and save.

**Confirmed in mounted probe:** The saved Notes changed correctly, while phase/function/observationSessionId became null, tags became [], and metadata became {}.

**Why:** The editor builds a fresh object containing only visible inputs before normalizing it. Existing fields that the editor does not expose are missing and therefore normalized to empty defaults.

**Improve:** Merge editable values over the original record before normalization; retain immutable timestamps/IDs and all non-edited fields. Add an end-to-end edit round-trip that verifies the record's phase still participates in graphs and rate calculations.

### P1 — Record limits silently discard accepted data on reload

**Code:** `behavior_lens_workspace_module.js:439–445`, `486–491`; unbounded CSV append in `behavior_lens_module.js:23009–23010`; import limits in `behavior_lens_workspace_module.js:960–966`.

**Reproduce:** Append enough observations through CSV or ongoing collection to exceed 5,000 ABC records. The in-memory collection and saved snapshot can contain all records. Reopening normalizes only the first 5,000. The equivalent observation-session ceiling is 1,000.

**Confirmed pure runtime probe:** Input 5,001 ABC records -> output 5,000; normalization report says `inputCount: 5001, outputCount: 5000, droppedCount: 0`. The latest appended record is lost.

**Implications:** Normalization does not report the truncation as a dropped record. A backup exported above the limit is also rejected by the workspace importer, even though the app generated it.

**Improve:** Prevent additions/imports that cross limits before mutating state, or use a storage model that supports larger collections. Never silently truncate persisted user data. Report exact omitted counts and offer archive/export options before capacity is reached.

## Additional code-confirmed improvement opportunities

- **CSV fidelity:** `behavior_lens_module.js:22960–22975` splits physical lines before parsing quotes and removes every quotation mark. A valid quoted multiline note is split into separate rows; doubled embedded quotes disappear. Use an established CSV parser and verify quoted commas, quotes, and multiline fields with export/import round trips.
- **CSV measurement validation:** `behavior_lens_module.js:22980–22981` changes missing, invalid, or zero intensity to 3, clamps out-of-range values, and accepts invalid timestamp strings. Preserve missing measurements as unknown and surface per-row validation before import.
- **Student Profiles CSV:** `behavior_lens_module.js:23012–23018` writes grade/diagnosis/accommodations/notes into roster entries, while the actual student profile comes from workspace data. Imported profile details are not applied to the profile panel. Create immutable IDs and populate each canonical student workspace during onboarding.
- **Roster retention:** `behavior_lens_module.js:25953–25956`, `25971` cap the visible/persisted roster at 20 without an archive/recovery flow. A newly added student can remove an older roster entry while leaving its UUID-keyed workspace behind.
- **Cloud-copy action race:** `behavior_lens_module.js:26615–26626` awaits a cloud read then applies the result without checking the active hydration identity. This needs the same generation guard already used in ordinary hydration. This specific action was not exercised in a mounted race probe.

## Verification and limits

Command:

```text
node node_modules/vitest/vitest.mjs run --config reports/behavior-lens-deep-review-2026-09-12/vitest.data-integrity.config.mjs
```

Result: **4/4 audit probes passed**, asserting the current defects: practice overwrites/clear, new-student import loss, ABC edit metadata loss, and silent 5,001-to-5,000 normalization truncation. The tests intentionally assert current broken behavior and are audit evidence, not passing regression protection for intended behavior.

Files: `data-integrity.probe.test.js`, `vitest.data-integrity.config.mjs` in this report directory.

Existing AlloSheet test failure at `tests/behavior_lens_allosheet_handoff.test.js:499` is consistent with **fixture drift**: it seeds only legacy `behaviorLens_abc_Eagle` at lines 433–441 and no stable-ID roster. Current hydration reads stable-ID keys and has no legacy-key arguments (module lines 26744–26762); line 25999 explicitly documents removal of migration. The empty data preview therefore disables transfer. No AlloSheet product failure is established by that assertion.
