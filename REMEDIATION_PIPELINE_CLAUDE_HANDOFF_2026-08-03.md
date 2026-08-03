# Remediation Pipeline Diagnostic and Fix Handoff

Date: 2026-08-03  
Status: diagnosis complete; production code has **not** been changed for these findings  
Intended next agent: Claude

## User intent

The user wants auto-continuation to keep running until remediation is genuinely finished, especially when earlier work was deferred by throttling. Its progress must remain visible in the UI. It must not disappear because of a false idle timeout and then be reported as “stale” without an actual replacement document/run.

The user also reported:

- The Preview & Edit X button did nothing.
- The Preview & Edit “Generate Tagged PDF” button did nothing.
- Logs continued after the UI appeared finished.
- veraPDF reported a failure.
- The saved filename ended in `TEST`, although the original filename did not.
- The remediated document appeared to have extra ending content.

## Supplied artifacts

- Original: `C:\Users\cabba\OneDrive\Documents\High Impact Reports 89-92 App E.pdf`
- Saved remediated copy: `C:\Users\cabba\OneDrive\Documents\Accessible Document — High Impact Reports 89-92 App E TEST.pdf`
- Run log: `C:\Users\cabba\.codex\attachments\959c31ee-3c73-4b9e-8ca2-2b878a0e8c26\pasted-text.txt`
- Screenshot: `C:\Users\cabba\AppData\Local\Temp\codex-clipboard-d0f543a9-0cec-4593-bd99-90b300854b52.png`

The bundled validator used for local reproduction is `verapdf/verapdf-cli.jar` (veraPDF 1.30.2).

## Executive diagnosis

| Symptom | Confirmed cause | Confidence |
|---|---|---|
| Auto-continuation indicator vanished while work was active | Auto-continuation creates its own owner ID, but normal Gemini transport calls are stamped with the completed primary run’s stale `_pipelineStats` ID. The watchdog rejects those real heartbeats and falsely fires after eight minutes. | Confirmed by source and timestamps |
| Auto-continuation later said it was stale | The false watchdog itself aborts the controller and increments `window.__alloPdfRunGen`; the loop then observes that generation mismatch and labels itself stale. No new document initialization appears in the log. | Confirmed |
| Preview X, Escape, bottom Close Preview, and Generate Tagged PDF are inert | `_cancelRemediationOperationPrefix()` calls `.startsWith()` on a null/undefined `kind` when no view-owned operation exists. Each affected handler calls it before its real action, so the thrown `TypeError` stops the handler. | Confirmed |
| Generate Tagged PDF is additionally unreliable | It closes the preview, waits a hard-coded 220 ms, finds a DOM element by ID, and synthetically clicks it. The relay can silently miss an unmounted target and loses transient user activation needed for popup-backed validation. | Confirmed design defect |
| UI/log says complete while more work runs | `fixAndVerifyPdf` logs `Pipeline complete` before the host’s intended auto-continuation, final re-audit, tagged export, and veraPDF tail work have settled. The one-click wrapper is still busy, but the primary phase’s wording is terminal. | Confirmed |
| Logged veraPDF failure | The hidden/in-memory tagged artifact failed PDF/UA-1 §7.2 test 10 four times: a `TR` had a direct child other than `TH` or `TD`. | Confirmed from log/profile |
| Attached PDF’s current veraPDF failure | The supplied saved file is a separate Chrome/Skia print-style PDF. It fails only PDF/UA-1 §7.1 test 8 because its Catalog lacks a `/Metadata` XMP stream. | Reproduced locally |
| `TEST` suffix | `TEST` exists only in the Windows filename. It is absent from the internal title and is not trailing visible content. The browser-print helper accepts a filename argument but never uses it, so the Save As dialog/title governs the name. | Confirmed |
| Extra ending content/page | The ninth page contains a false-positive “Preserved source content” appendix. An exact duplicate sentence and a truncated quote were appended because the recovery duplicate guard is skipped for short candidates and does not normalize straight/curly punctuation early enough. | Confirmed by PDF text and source |

## 1. Auto-continuation is killed by an ownership/heartbeat mismatch

### Log proof

- 12:47:58 AM, log lines 399–401: primary Step 4 and `[DocPipe][Done][q8vdc6/e1]` report completion.
- 12:47:59 AM, lines 402–405: intended `auto-continue-ai-round-1` starts immediately.
- Auto-continuation’s normal API events still carry `q8vdc6/e1`, the completed primary run’s identity.
- 1:01:19 AM, line 428: call #57 **actually starts**.
- 1:02:09 AM, line 429: only 50 seconds later, the 8-minute dead-man switch claims there has been no activity and clears the run.
- 1:02:19 AM, lines 430–432: call #57 is canceled, and the loop reports that it is stale after a “newer document/run” took ownership.
- There is no new `[DocPipe][Init]` for another document between these events.

The export begins at 1:02:21 AM, after the watchdog cancellation. Do not attribute the stale transition to export without new evidence; the watchdog already invalidated the generation.

### Source chain

1. `misc_handlers_source.jsx`, `runAutoFixLoop`, around lines 1286–1299:
   - Builds `_loopRunId = 'autocontinue-...'`.
   - Publishes that owner in `window.__alloActivePdfRemediation`.
   - Builds `_loopOwner` with run ID, document epoch, and stats.

2. `misc_handlers_source.jsx`, around lines 1425–1431:
   - Passes `owner: _loopOwner` into `aiFixChunked`’s `_control` object.

3. `doc_pipeline_source.jsx`, `aiFixChunked`, representative calls around lines 7571, 7622, and 7645:
   - Calls `callGemini(..., _control.signal)`.
   - It does **not** pass `_control.owner` through to the transport wrapper.

4. `doc_pipeline_source.jsx`, `callGemini`, around lines 5779–5788:
   - Reconstructs `_callOwner` exclusively from factory-level `_pipelineStats`.
   - Those stats still identify the completed primary run, which explains the `q8vdc6/e1` prefixes after `Done`.

5. `AlloFlowANTI.txt`, 8-minute watchdog around lines 22161–22273:
   - `onActivity` accepts only matching document epoch and run ID.
   - It rejects normal auto-continuation API events because they carry the primary run ID while the live owner is `autocontinue-...`.
   - `fire()` aborts the loop, sets the stop ref, increments `__alloPdfRunGen`, clears UI state, and dispatches cancellation.

Occasional calm-wait/probe pulses do receive `_loopOwner`, which is why the watchdog is rearmed sporadically. Normal queued/start/done/failure transport events do not.

### Required fix

Make owner identity an explicit, end-to-end transport parameter:

- Extend the `callGemini` adapter so it can accept an explicit owner in addition to the explicit abort signal.
- Have every `aiFixChunked` call path pass `_control.owner`, including full chunk, half-chunk, image-token retry, and any audit/reverification calls launched by auto-continuation.
- Ensure `_geminiCall`, `_pipeLog`, `_pulsePipelineWatchdog`, and remediation-progress emission all use that same owner.
- Do not infer live ownership from mutable factory `_pipelineStats` when an explicit owner exists.
- Preserve existing callers by making the new owner argument optional and unambiguous; avoid confusing it with the signal slot.

### Acceptance criteria

- Every event from an auto-continuation round carries the auto-continuation run ID and current document epoch.
- A real `API-start`, retry, cooldown, probe, completion, or failure rearms the watchdog.
- A call that starts 50 seconds before the deadline cannot trigger an 8-minute idle timeout.
- A watchdog cancellation is reported as a watchdog cancellation, not as an invented newer document/run.
- The purple busy indicator remains visible until auto-continuation actually settles or the user explicitly stops it.

## 2. Preview controls throw before doing anything

### Exact defect

`view_pdf_audit_source.jsx`, around lines 3484–3488:

```js
const _cancelRemediationOperationPrefix = (prefix) => {
  const owned = _remediationOperationOwnerRef.current.getCurrent();
  const kind = owned && owned.metadata && String(owned.metadata.kind || '');
  if (!kind.startsWith(String(prefix || ''))) return false;
  return _cancelRemediationOperation(owned);
};
```

With no current owned operation, `kind` is null/undefined and `.startsWith()` throws. The following handlers all invoke this helper first:

- Preview Escape: around line 15568
- Preview X: around line 15574
- Preview “Generate Tagged PDF”: around line 15588
- Bottom “Close Preview”: around line 18448

The exception occurs before `setPdfPreviewOpen(false)`, before edited HTML is synchronized, and before export is triggered. It is likely visible only in the browser console because it does not pass through `warnLog`.

### Minimal safe fix

Use an empty string or return early when no owned operation exists, for example:

```js
const kind = owned?.metadata ? String(owned.metadata.kind || '') : '';
if (!kind.startsWith(String(prefix || ''))) return false;
```

Add a direct unit test for the no-owner path. Also exercise all four UI entry points.

## 3. Replace the fragile Generate Tagged PDF relay

The Preview button currently:

1. Cancels preview operations.
2. copies iframe HTML into React state;
3. closes the preview;
4. waits 220 ms;
5. searches for `#allo-tagged-pdf-btn`;
6. calls `b.click()` if found, otherwise silently scrolls.

This is at `view_pdf_audit_source.jsx` around lines 15586–15596.

Problems:

- Fixed timing is a race with React rendering/state propagation.
- A missing target produces no diagnostic or user-facing failure.
- A delayed synthetic click no longer has transient user activation, so popup-backed veraPDF can be blocked.
- The tagger may read a stale `pdfFixResult` rather than the edited HTML just captured.

Recommended design:

- Extract the real tagged-export logic into a callable async function/callback.
- Pass the edited HTML or a commit token directly to that function.
- Invoke it from both the results button and the Preview button.
- If validator transport needs a popup, open/reserve it synchronously from the original user click and continue work through that handle.
- Emit explicit start, success, withheld, and failure diagnostics.
- If auto-continuation is active, honor the user’s preference that it persist. Prefer queueing export until the continuation’s final verified snapshot is ready, with visible “finishing remediation before export” status. Do not silently cancel it.

## 4. Completion wording and UI lifecycle are misleading

The log’s `Pipeline complete` describes only `fixAndVerifyPdf`, not the whole user-visible one-click operation.

`view_pdf_audit_source.jsx`, one-click continuation/finalization around lines 7380–7500, still performs or awaits:

- hands-off auto-continuation;
- final re-audit/recovery;
- hidden tagged-PDF generation;
- auto-veraPDF validation;
- finalizer cleanup.

`oneClickRemediationBusy` is cleared only in the outer `finally`, but the primary pipeline already emitted terminal wording. Preview & Edit also has no busy guard and can open during tail work.

Required behavior:

- Treat “primary remediation pass complete” as a phase transition, not global completion.
- Keep a single visible operation state through `primary -> auto-continuation -> final audit -> tagged export -> veraPDF -> complete`.
- Show the active phase and last heartbeat in the UI.
- Emit global “complete” only after intended auto-continuation and finalization settle.
- If a phase is skipped, show the reason explicitly.
- Provide a user-controlled “Stop after this round” path; do not make watchdog expiry the normal stop mechanism.

Additional log issue: calls #58–#60 begin around 1:13 AM with the old `q8vdc6/e1` identity and no new `Init` or phase label. The trigger cannot be proven from the supplied log. Add a trigger/source label to every output-audit launch so future logs distinguish auto-continuation, preview mutation, style change, manual re-audit, and export validation.

## 5. There are two different veraPDF failures on two different artifacts

Do not conflate the log’s hidden tagged artifact with the attached saved file.

### A. Hidden/in-memory tagged artifact from the run

Log line 441:

```text
[veraPDF-telemetry] export: §7.2t10 | cumulative failures={"§7.2 t10":4} | clean 0/1 exports
```

The bundled PDF/UA-1 profile defines §7.2 test 10 as:

> A `TR` structure element may contain only `TH` and `TD` children.

There were four failed checks. Telemetry retained only the aggregate rule/count, not the offending object IDs or child roles.

Likely source area:

- `doc_pipeline_source.jsx`, table/cell tag-tree construction around lines 28464 and 28672–28729.
- `th` and `td` are treated as leaves rather than containers. A nested HTML table inside a cell can therefore be attached incorrectly, potentially putting an inner `Table` directly under the outer `TR`.

Next steps:

- Add a nested-table fixture.
- Run veraPDF JSON/verbose output against generated bytes and record the actual offending child types/contexts.
- Enforce the invariant that every `TR` child resolves to `TH` or `TD`; nested cell content must stay beneath its cell structure element.
- Improve telemetry to include sanitized object context and offending child role, without document content.

### B. Attached saved PDF

Local veraPDF 1.30.2 result in explicit PDF/UA-1 mode:

- 105 rules passed, 1 failed.
- 17,177 checks passed, 1 failed.
- Failure: ISO 14289-1 §7.1 test 8.
- Exact cause: Catalog has no valid `/Metadata` XML stream (`/Type /Metadata`, `/Subtype /XML`).

Forensics show that this file is a browser-print artifact:

- Creator: Chrome 150
- Producer: Skia/PDF m150
- PDF 1.4
- 130,715 bytes
- 9 pages
- Has `StructTreeRoot`, `MarkInfo /Marked true`, `Lang en`, `DisplayDocTitle true`, page `StructParents`, and `Tabs /S`
- Lacks Catalog XMP metadata and PDF/UA identification metadata

This matches `downloadAccessiblePdf` in `doc_pipeline_source.jsx` around lines 31367–31419. That helper opens sanitized HTML in a new window and instructs the user to use browser Save as PDF. It explicitly calls this a print-style copy. It cannot post-process the saved browser PDF to add XMP.

Recommended product behavior:

- Do not present the browser-print copy as the verified tagged artifact.
- Restore/use the direct `createTaggedPdf`/typeset-tagged path for the verified download.
- Keep the print copy clearly labeled “Print-style PDF (browser-dependent tags; not independently verified).”
- If the print path remains, use the requested filename to set a sensible document title/suggestion, while acknowledging that the browser ultimately controls Save As naming.

## 6. `TEST` is a filename-only issue; the real extra content is a recovery false positive

### Filename

The string `TEST` is:

- present in the Windows filename;
- absent from the PDF Info Title (`Accessible Document — High Impact Reports 89-92 App E`);
- absent as a trailing visible text marker;
- absent from the log.

`downloadAccessiblePdf(htmlContent, filename)` accepts `filename` but never reads it. The browser print dialog derives its suggestion from document title/user input. The code did not append `TEST` to document content.

### Actual extra ending content

The original is an 8-page, 5,541,389-byte scan-only PDF with eight image pages, no searchable text, no tags, and no language metadata.

The attached browser-print output is a 9-page regenerated selectable-text layout. Page 9 contains a “Preserved source content” section. Two entries are false positives:

- `What are the consequences of not submitting work?` is appended even though the exact sentence already occurs earlier.
- A truncated straight-punctuation fragment, `"Tyrone's mother, Ms.`, is appended although the complete curly-punctuation sentence already occurs earlier.

Root cause in `restoreSentencesDeterministic`:

- The whole-document already-present guard runs only when a candidate has at least three “distinctive” words of length five or more.
- The first sentence has only two words meeting that threshold (`consequences`, `submitting`).
- The truncated quote is also below the threshold.
- Straight/curly quotes and apostrophes are not normalized early enough for the short-fragment check.
- `detectAndHandleDuplicates` deliberately skips `section[data-source-preserved-block]`, so false positives in that appendix survive cleanup.

Required fix:

- Before the three-long-word heuristic, run a normalized exact/near-exact whole-document presence check for every candidate.
- Fold curly/straight apostrophes and quotes, whitespace, dash variants, and harmless punctuation.
- Reject short/truncated fragments that are already contained in a longer existing sentence.
- Either gate insertions before building the preserved block or allow exact-duplicate cleanup within that block.
- Preserve the fallback for genuinely missing content; do not simply remove the appendix mechanism.

## 7. Related layout warnings

At 1:02:21–1:02:28 AM:

- Per-leaf MCID patching reports 133/136 leaves.
- Pages 2–8 abandon positioned drawing because OCR leaf-word counts diverge from detected boxes by more than 20%.
- Those pages fall back to block layout.

These warnings explain visual/reflow differences and deserve fidelity testing, but they do not themselves prove either veraPDF failure. Keep them as a separate scanned-document mapping issue.

## Recommended implementation order

1. **Protect the dirty worktree.** Run `git status --short` and inspect overlapping diffs before editing. Do not reset or overwrite unrelated work.
2. **Fix the null crash** in `_cancelRemediationOperationPrefix` and add UI regressions. This immediately restores all Preview close paths and allows Generate to reach its next stage.
3. **Propagate explicit auto-continuation ownership** through every Gemini call/heartbeat and correct watchdog cancellation reporting.
4. **Unify lifecycle/progress semantics** so the UI remains visibly active through intended auto-continuation and finalization.
5. **Replace the delayed synthetic export click** with a shared direct export callback and queue it behind active continuation.
6. **Fix table-tag nesting** for PDF/UA §7.2 test 10 and validate a nested-table fixture with veraPDF.
7. **Fix short-sentence recovery deduplication** and punctuation normalization.
8. **Clarify print-style versus verified tagged downloads**, and wire/use the filename input where feasible.
9. **Add trigger/owner diagnostics** for every late audit and export stage.

## Regression tests to add or extend

Suggested existing suites:

- `tests/remediation_operation_ownership.test.js`
- `tests/remediation_view_lifecycle_regressions.test.js`
- `tests/remediation_run_ownership_visibility.test.js`
- `tests/remediation_progress_trace.test.js`
- `tests/make_accessible_autocontinue.test.js`
- `tests/storm_wait_autocontinue.test.js`
- `tests/watchdog_pulse.test.js`
- `tests/watchdog_breaker_reset.test.js`
- `tests/auto_verapdf.test.js`
- `tests/verapdf_rule_telemetry.test.js`
- `tests/createtaggedpdf_catalog_recipes.test.js`
- `tests/view_pdf_audit_tagtree.test.js`
- `tests/pdfua_selfcheck_and_truncation.test.js`
- `tests/integrity_recovery_coverage.test.js`
- `tests/roundtrip_coverage_gate.test.js`

Required new assertions:

1. `_cancelRemediationOperationPrefix('preview-')` with no current owner returns false and does not throw.
2. Preview X, Escape, bottom Close, and Generate all work with no view-owned operation.
3. Generate uses the exact edited HTML and does not rely on a 220 ms DOM click relay.
4. All normal and retrying auto-continuation Gemini events carry the auto-continuation owner ID/epoch.
5. A heartbeat just before the idle deadline prevents watchdog firing.
6. Watchdog cancellation has its own reason/category and is not described as a newer document.
7. Global completion is emitted only after auto-continuation/finalization settle.
8. Nested-table tagged output has only `TH`/`TD` children under every `TR` and passes PDF/UA §7.2 test 10.
9. Short exact duplicate sentences are not appended to the preserved block.
10. Curly/straight quote variants and truncated fragments do not produce duplicate appendix entries.
11. Print-style output is labeled unverified and is never substituted silently for verified tagged output.

Example focused test command:

```powershell
npx vitest run tests/remediation_operation_ownership.test.js tests/remediation_view_lifecycle_regressions.test.js tests/remediation_run_ownership_visibility.test.js tests/remediation_progress_trace.test.js tests/make_accessible_autocontinue.test.js tests/storm_wait_autocontinue.test.js tests/watchdog_pulse.test.js tests/auto_verapdf.test.js tests/view_pdf_audit_tagtree.test.js tests/integrity_recovery_coverage.test.js --maxWorkers=1
```

Local veraPDF reproduction:

```powershell
& 'C:\Users\cabba\.alloflow-tools\jdk-21.0.11+10-jre\bin\java.exe' `
  -jar 'verapdf\verapdf-cli.jar' `
  -f ua1 --format json --maxfailuresdisplayed 50 -- '<path-to-pdf>'
```

## Build/mirror workflow

Canonical module sources implicated here:

- `view_pdf_audit_source.jsx`
- `misc_handlers_source.jsx`
- `doc_pipeline_source.jsx`
- `AlloFlowANTI.txt` for host state/watchdogs

Relevant builders:

- `node _build_view_pdf_audit_module.js`
- `node _build_misc_handlers_module.js`
- `node _build_doc_pipeline_module.js`
- `node build.js`

Then run the focused tests plus at least:

```powershell
npm run verify:pdf
npm run verify:source-pair
npm run verify:mirror
npm run verify:build
```

Inspect generated diffs before accepting them. Do not hand-edit generated mirrors independently of canonical source.

## Worktree warning

At handoff creation, the worktree was already dirty with unrelated work, including modifications to `AlloFlowANTI.txt`, STEM modules/tests, memory-palace files, audio/phase source, and other files. These changes belong to the user/other agents. Claude must inspect and preserve them. In particular, `AlloFlowANTI.txt` overlaps the watchdog work, so merge the fix into its current diff rather than replacing that file wholesale.

## Remaining questions that require implementation-time instrumentation

- What exact UI action launched calls #58–#60 at 1:13 AM? Add an explicit trigger label before trying to infer it.
- What were the four non-cell child roles/contexts behind the hidden artifact’s §7.2 test 10 failures? Capture verbose veraPDF JSON for regenerated bytes.
- Should an export click during auto-continuation queue automatically or present “wait/export snapshot” choices? The user’s stated priority is that auto-continuation persist until finished, so queueing is the safer default.

## Definition of done

- Auto-continuation remains visible and alive through genuine throttle waits and transport activity.
- It stops only at a real terminal condition or explicit user stop.
- No false watchdog fire, fabricated stale-owner message, or premature global completion occurs.
- All Preview close paths work.
- Generate Tagged PDF directly exports the current edited/final snapshot and provides explicit status.
- The verified tagged artifact passes the addressed veraPDF table rule; browser-print copies are clearly separate.
- No duplicate/truncated source fragments are appended to the recovery section.
- The supplied regression scenario completes with an auditable phase timeline and no hidden late work.

