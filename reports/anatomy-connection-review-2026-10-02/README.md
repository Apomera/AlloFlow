# Anatomy: focused connections and reusable practice

Implemented a focused lesson view and separate practice attempts. Changes are left uncommitted, as requested.

## What changed

- The topic chooser shows whether each connection is unanswered, correct on the first answer, or needs review. Opening a topic shows its lesson alone; **All connections** returns to the compact topic overview and puts keyboard focus on the chooser.
- Lessons have clear reading, understanding-check, and anatomy sections. Reading controls and the source link sit with the reading text. Prose, choices, feedback, and controls use 16px text; larger-text mode uses at least 17px. The layout wraps at 320px and supports Arabic and right-to-left reading.
- **Hide explanation and try again** starts a separate practice attempt. The first saved answer and its score remain unchanged. Practice results identify the chosen answer and best answer, and **Return to saved feedback** restores the first response. Practice survives topic changes, diagram detours, activity switches, and reloads.
- Accepted answers move focus to named feedback; starting practice focuses the question. Deferred effects verify the current connection and attempt, so stale or duplicate callbacks cannot announce, play sounds, or move focus. Notes, confidence, quiz work, and cards merge from the latest state.
- Twelve new labels are translated into French, Latin American Spanish, and Arabic. Two reused English labels are registered. Runtime and catalog mirrors match.

## Verification

| Check | Result |
| --- | --- |
| Dedicated practice, state, and focus checks | 124 passed across both runtime copies |
| Scoped regression and localization checks | 448 passed across eight fixtures |
| Browser journeys | 4 passed |
| Scoped accessibility scans | 30 passed |
| Runtime source copies | Byte-identical |

Source LF SHA256: `5835e6a9e7ccaa741824cc7a9ad4cc81c6d2ee63935c2fc1d23cfa1ed758a53c`.

The browser matrix covers desktop and 320px phone layouts, Arabic with larger text, light/dark/contrast themes, and forced-color controls. It measures text sizes, target sizes, overflow, feedback/action contrast, and control-label pixels, alongside saved-state and keyboard journeys. See [browser validation](browser-validation.json), [screenshots](screenshots), [unit summary](final-unit-results.json), and [verification](verification.json). These journeys use the 2D atlas; this pass does not change 3D rendering.

The final browser audit found a read-aloud button narrower than 44px. The last source change adds only a minimum-width CSS rule and prevents the audio button shrinking; all functions, markup, and translator calls remain byte-identical to the full regression snapshot. After that adjustment, the 124 practice checks and 14 mobile checks were rerun, and all browser journeys and scans were repeated against the final hash. See [touch target proof](target-size-fix-proof.json).

## Evidence and scope

The initial test run was interrupted by a full disk and environment restart. Diagnostic reports remain alongside the final results. One browser fixture used a desktop tab hidden on phones and was corrected to use the visible mobile activity chooser. Two old static tests expected the announcement inside the answer handler; they now inspect its guarded result helper, while the dedicated behavioral tests verify accepted and rejected effects. The complete earlier regression report is retained, and the final unit summary replaces only that fixture's result with its passing rerun.

The [localization audit](localization-audit.json) records exact insertion preservation and later unrelated additions in the dirty English catalogs. Those concurrent edits and existing Git index contents are preserved. The newly used labels are registered; pre-existing Anatomy registration gaps remain outside this pass.

No staging, commit, amendment, or push was performed.
