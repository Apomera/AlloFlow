# AquacultureLab controlled comparison enhancement

Completed locally on 2026-10-03, continuing the pass started on 2026-10-02. Everything remains unstaged and uncommitted; nothing was pushed or deployed.

## What changed

When several live B inputs differ from fixed A, learners can open **Focus this comparison on one input**. A native selector chooses which existing B change to keep. The preview separately lists that change and every B input to restore from A, with original values and units. Selection changes only the preview. **Apply focused comparison** builds a detached copy of fixed A and copies exactly the selected B value; all other inputs match A.

Environment isolation copies only the environment ID, so it retains the original A water values and event rather than invoking the environment selector's default resets. Stock removal deletes the selected organism's count when B is zero. Environment and disturbance choices retain cautions about bundled effects, and stocking choices explain changes in initial biomass, composition and weighting. No written claim or explanation is generated.

Fixed A, prediction, investigation context, observation, CER, frozen captures, archives and parked draft are preserved. Captures retain their original settings and model numbers; the existing notebook flags earlier settings after Apply. **Undo input isolation** restores only the previous B inputs while keeping writing and readings added since Apply. It is transient and expires after an A/B edit or page reload. Chart changes and archive renames keep it. Returning to a parked draft preserves the earlier design and writing.

Stable typed input keys are independent of display labels. Previews update from the current A/B inputs. If a selected change disappears, the selector shows a placeholder and Apply stays disabled until another current change is selected. Missing or incomplete A/B settings cannot create a focused scenario from invented defaults. Controls use native disclosure/select semantics, explicit Apply/Undo actions, visible focus, 44px targets and stacked phone layouts. The interactive preview sits outside the existing broad changed-input live region; a concise status announces the preview.

The model version **2026.10-stock-feedback**, physiology rules and prior uncommitted enhancements are preserved.

## Verification

- One final complete serial run passed **168/168 focused cases across 14 files**, including **16 new controlled-comparison cases**. One worker, unchanged 30-second case limit and zero pending cases. See [focused-tests.json](focused-tests.json) and [case accounting](resolved-tests.json).
- **5 final Chromium workflows** passed at desktop 1280px, phone 390px and narrow phone 320px, with additional disappearing-key/Undo-expiry and environment/disturbance/stock guards. See [browser/results.json](browser/results.json).
- Browser checks cover view-only selection, exact retained/restored values, fixed-A preservation, live/captured/archive/parked work, explicit Apply/Undo, later-writing/readings retention, earlier-settings notices, keyboard focus, reload behavior, native controls and reflow.
- All **18 scoped WCAG A/AA scans** recorded zero violations; **9 scans required manual review**. Root and independent UX review accepted normal/forced-color desktop and phone screenshots. This is scoped widget QA, not a full host audit.
- Syntax, byte parity and scoped Git whitespace checks passed. Canonical/public runtimes are byte-identical LF with no CR bytes, and the scoped index is empty. See [verification.json](verification.json).

Runtime SHA256: 832aa4d4f8a1dcebc75c99d4fd1960b23ac697b651aab8e735045de4496446cd

The first new-file invocation collected no cases and is retained in [initial-no-tests.json](initial-no-tests.json). An unchanged visible diagnostic passed all 16 cases and is recorded in [control-tests-recovery.log](control-tests-recovery.log). An earlier full run hit two time limits and then ended before producing a structured report; its process had exited and its complete partial log is retained in [interrupted-full-tests.log](interrupted-full-tests.log). The final full run used unchanged source and normal limits; resolved-tests.json accounts for every unique case. The initial browser run completed desktop but stalled during a phone focus check; its evidence remains in [browser-initial/results.json](browser-initial/results.json). Root visual review also improved Apply/Undo button styling before the final checks. Final browser/results.json records the complete final run. No timeout increase, automatic retry or permanent exclusion was introduced.

## Reproduce

From the repository root:

~~~powershell
node --max-old-space-size=512 --max-semi-space-size=4 node_modules/vitest/vitest.mjs run tests/aquaculture_3d_accessibility.test.js tests/aquaculture_controlled_comparison.test.js tests/aquaculture_ecosystem_runtime.test.js tests/aquaculture_evidence_recovery.test.js tests/aquaculture_guided_questions.test.js tests/aquaculture_investigation_runtime.test.js tests/aquaculture_learning_runtime.test.js tests/aquaculture_measurement_notebook.test.js tests/aquaculture_mussel_health_runtime.test.js tests/aquaculture_pedagogy.test.js tests/aquaculture_saved_comparison.test.js tests/aquaculture_saved_investigations.test.js tests/aquaculture_seasonal_explorer.test.js tests/aquaculture_stock_feedback.test.js --maxWorkers=1 --testTimeout=30000
node reports/aquaculture-controlled-comparison-2026-10-02/controlled-comparison-browser-qa.cjs
~~~

The portable harness uses installed Playwright/Chromium, React UMD, axe-core and the repository's aquatic HTTP fixture/cache. It starts a temporary loopback server and closes its own browser/server. The packaged copy normalizes newlines and adjusts only its opening comment and repository/output paths. Validation covers the widget fixture; a full host/installer build was not run.

## Artifacts

All sample screenshots use actual current-model scenarios, annual outputs and captured readings.

- [Desktop preview](browser/sample-controlled-comparison-before-1280.png)
- [Phone preview](browser/sample-controlled-comparison-before-390.png)
- [320px preview](browser/sample-controlled-comparison-before-320.png)
- [Applied phone comparison with Undo](browser/sample-controlled-comparison-focused-390.png)

This pass changes the canonical/public aquaculture runtime, tests/aquaculture_controlled_comparison.test.js, this report folder and the append-only handoff log. Previous aquaculture enhancements, shared staging and unrelated work remain intact.
