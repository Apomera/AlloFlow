# Remediation pipeline audit — 2026-07-26

## STATUS — all 55 findings addressed (last updated 2026-07-26)

Fixed, pinned and committed on `main` across ten commits. Every fix carries a regression pin in
`tests/remediation_pipeline_audit_fixes.test.js` (142 tests) or in the suite that owns the
behaviour; behavioural pins were preferred over source-substring pins throughout, since the audit's
own headline test finding was that this repo's pins are mostly raw-source matches that cannot see
runtime behaviour and drift into permanent redness. Three suites that had been quarantined for
exactly that reason are green again and have left `tests/QUARANTINE.txt` (92 → 90 entries).

**Decisions Aaron made during the work**

- **H6 — fresh evidence may CLEAR an expert-review warning, not only raise one.** Implemented
  two-way, gated on a scored deterministic audit actually existing: a missing or crashed axe run is
  not evidence of a clean document. The parity suite's divergence is documented as
  `H6_DIVERGENT_KEYS` and replaced with a six-case truth table against the live reducer.

**Deliberately scoped, with reasons**

- **M12** — the link half is fixed with a real baseline (pdf.js Link annotations). The TABLE nets
  remain inert on born-digital input: a PDF has no table object to count without layout analysis,
  and a fabricated count would be worse than an honestly silent net.
- **L4** — the partial-coverage reframe is now reachable, but stays MESSAGING ONLY. Whether a
  29-of-30-section partial should be allowed to show a score is a product judgement about how much
  coverage is enough, not a mechanical fix.
- **M11** — the banner is inert markup that survives sanitization and the handler no longer
  rewrites the whole document. Rendering a real React retry button from its data attributes is a
  view-side feature rather than a defect fix, and was not built.
- **M20** — the half that stands alone is done (a completed run can no longer be adopted as a live
  owner). Giving `runAutoFixLoop` its own ownership identity so its heartbeats carry a runId is a
  larger change and was not made.
**Follow-on work, since completed (2026-07-26, same day)**

- **L1** — the merge is driven for real now. Doing so immediately exposed a defect the mirror could
  not see: `pages` was dereferenced unguarded in four places, so one malformed record threw a
  TypeError out of the LAST step of a multi-day workflow and cost the teacher every session. A
  range with unusable page numbers now keeps its HTML and only loses its position.
- **L12** — both auto-continue round decisions moved into `_alloLoopPolicy`; the tests call the
  shipped functions.
- **M20** — the remainder: `runAutoFixLoop` publishes its own ownership slot and threads that
  identity into its inner calls, so the stuck-flag watchdog is no longer inert when the loop is
  entered directly (the "Continue a previous session" path).

Both L1 and L12 were verified by MUTATION, not by assumption: reintroducing the original
blank-document bug turns six merge tests red, and dropping the axe-clean gate on the issue-count
revert turns the F5 case red. Under the old mirrors, both stayed green.

**Known unrelated red:** `tests/individual_remediation_polish.test.js` is quarantined at "4 failing"
and now shows 3. Those are pre-existing and outside this audit's scope.

**Method.** Eight read-only reviewers over the canonical sources, one per dimension
(run-lifecycle, failure-recovery, throttle-gate, extraction-fidelity, html-integrity,
verification-honesty, observability, test-coverage). Every finding was then handed to a
separate adversarial verifier told to REFUTE it from source — to check the anchor is real,
to hunt for a guard elsewhere, to confirm the path is reachable in production, and to
default to REFUTED when it could not substantiate the claim.

**Tally.** 57 surveyed → 50 CONFIRMED, 5 PLAUSIBLE, 1 REFUTED, 1 unmatched.

**Re-verified by hand before publication:** C1, C2, H1, H16, M1. C2 was settled empirically by
loading the real `doc_builder_renderer_module.js` and running the pipeline's actual splice
regex against its real output. Everything else rests on the two-pass agent review; treat
PLAUSIBLE as "needs a look", not "known broken".

> Line numbers are as of this audit, i.e. **with** the 2026-07-26 run-ownership fix applied.
> Anchors in `view_pdf_audit_source.jsx` sit roughly 35 lines later than in git HEAD.

## Index

| ID | Sev | Verdict | Anchor | Effort | Title |
|---|---|---|---|---|---|
| C1 | critical | CONFIRMED | `view_pdf_audit_source.jsx:8983` | small | "Fix Remaining" replaces the whole fidelityNotes array with only the 3 recomputable kinds, silently deleting OCR-quality, alt-quality, folio-leak, page-edge and active-content disclosures |
| C2 | critical | CONFIRMED | `doc_pipeline_source.jsx:22487` | small | Extracted-image splice regex requires `data-img-placeholder` as the FIRST attribute; the renderer emits `id` first, so no image is ever placed |
| C3 | critical | CONFIRMED | `doc_pipeline_source.jsx:21476` | medium | Whole-engine OCR failures produce zero pageErrors, so lost pages never reach the partial-extraction banner — and the hole is then banked in the OCR evidence cache |
| H1 | high | CONFIRMED | `.github/workflows/verify.yml:80` | medium | The blocking `unit` CI job runs the whole vitest suite with no known-failure allowlist while ~21 raw-source pins in the pdf/remediation slice are dead — the one blocking regression gate is permanently red, which is why finding #1's red pin went unnoticed |
| H2 | high | CONFIRMED | `tests/e2e/remediation_corpus_golden.spec.ts:259` | medium | No test ever executes fixAndVerifyPdf in interactive mode — every full-run test passes `onProgress`, which sets `_silentMode` and skips all 28 teacher-facing branches |
| H3 | high | CONFIRMED | `tests/honesty_disclosure_gating.test.js:21` | medium | The pin guarding the "fully verified!" victory branch is dead — the `!needsExpertReview` gate no longer exists in the code, and the file's third test is a mirror that passes regardless |
| H4 | high | CONFIRMED | `doc_pipeline_source.jsx:7621` | small | FERPA: repairAndParseJsonShared logs 200 raw characters of AI output — verbatim student document text — into the copyable diagnostics log |
| H5 | high | CONFIRMED | `doc_pipeline_source.jsx:20828` | small | FERPA: the raw filename is written into the teacher-copyable diagnostics log on the very line next to one that deliberately redacts it |
| H6 | high | CONFIRMED | `doc_pipeline_source.jsx:5804` | medium | _finalizeRemediationRound never re-derives the accessibility half of needsExpertReview from the round's fresh axe/Equal Access evidence — it is inherited from the previous result forever |
| H7 | high | CONFIRMED | `doc_pipeline_source.jsx:5792` | small | _finalizeRemediationRound treats coverage.ai === 'complete-with-review' as "AI verification incomplete", so a fully-completed audit is reported to the teacher as throttled and its score is hidden |
| H8 | high | CONFIRMED | `doc_pipeline_source.jsx:22073` | small | Chunked extraction accepts any JSON array as a successful chunk — a refusal-shaped or string array renders to nothing and is recorded `status:'success'` with no placeholder and no fallback |
| H9 | high | CONFIRMED | `doc_builder_renderer_source.jsx:71` | small | Inline `<a href>` links — which the extraction prompt explicitly instructs the model to emit — are HTML-escaped into visible literal markup, destroying every hyperlink |
| H10 | high | CONFIRMED | `doc_pipeline_source.jsx:7309` | small | `detectAndRepairLegends` DELETES a flagged table's rows when both re-extract calls return null — a Canvas throttle turns score tables into an empty placeholder |
| H11 | high | CONFIRMED | `doc_pipeline_source.jsx:20233` | medium | Image crops are index-paired against every paintImageXObject on the page after decorative images were filtered out, so a letterhead logo can be shipped under the figure's alt text |
| H12 | high | CONFIRMED | `doc_pipeline_source.jsx:2000` | small | RTL documents lose intra-line reading order in the deterministic text-layer path — the RTL detector exists but is never consulted by the within-line sort |
| H13 | high | CONFIRMED | `doc_pipeline_source.jsx:21357` | small | Gemini Vision's truncation sentinel is accepted as chunk content, so a truncated extraction becomes the authoritative ground truth and coverage still reports 100% |
| H14 | high | CONFIRMED | `doc_pipeline_source.jsx:22511` | medium | Partial-range runs extract images from the WHOLE document and pair them to placeholders positionally, overwriting each figure's correct caption with another page's description |
| H15 | high | CONFIRMED | `doc_pipeline_source.jsx:19664` | medium | Throttle waits inside a fix pass are never budgeted against the batch per-file wall, so a throttled file blows the 8-minute `_withTimeout` and its completed passes are discarded |
| H16 | high | CONFIRMED | `doc_pipeline_source.jsx:14125` | medium | The batch runner calls the raw fixAndVerifyPdf, bypassing _wrapFixAndVerify — so the new isRemediationRunning() busy probe reports "idle" for the entire batch |
| H17 | high | CONFIRMED | `view_pdf_audit_source.jsx:3213` | small | A companion operation cancels a pdfFixLoading-owning ticket that has no cancelUi, stranding the busy flag permanently |
| H18 | high | CONFIRMED | `AlloFlowANTI.txt:19772` | small | Auto-continue dead-man switch clears pdfAutoContinueRunning but not pdfFixLoading, and the pdfFixLoading watchdog cannot fire on view/loop-owned work |
| H19 | high | CONFIRMED | `doc_pipeline_source.jsx:24916` | small | Watchdog-cancelled remediation returns before the resumable-project capture, discarding the banked OCR/extraction |
| H20 | high | PLAUSIBLE | `doc_pipeline_source.jsx:21524` | small | Office file with no text layer falls through to Gemini Vision chunking; the literal string "[Chunk N could not be extracted]" becomes both the document body and the ground truth |
| M1 | medium | CONFIRMED | `tests/pdf_remediation_reentry.test.js:101` | small | `pdf_remediation_reentry.test.js` class-invariant pin hard-codes the guard expression the 2026-07-26 fix superseded, so the two mid-run modal-teardown buttons still trust bare `pdfFixLoading` and the fix cannot be applied without breaking the test |
| M2 | medium | CONFIRMED | `doc_pipeline_source.jsx:14120` | small | Batch per-file timeout labels embed the raw filename, so the redacted [Batch] warn line leaks it anyway through the attached error object |
| M3 | medium | CONFIRMED | `AlloFlowANTI.txt:19647` | small | A run that completes with no verified score (afterScore === null) is recorded nowhere — the least trustworthy outcome is invisible to the reliability history |
| M4 | medium | CONFIRMED | `AlloFlowANTI.txt:25587` | medium | Batch remediation writes zero run-history rows, while the code comment claims it "covers single-file + batch + page-range call sites at once" |
| M5 | medium | CONFIRMED | `AlloFlowANTI.txt:25620` | small | A duplicate Fix & Verify click writes a permanent `outcome:'failed'` history row stamped with the CURRENTLY-RUNNING run's API counts and stage |
| M6 | medium | CONFIRMED | `doc_pipeline_source.jsx:24916` | medium | Cancelled and watchdog-killed runs are erased from the reliability history — the success rate systematically excludes the worst outcomes |
| M7 | medium | CONFIRMED | `AlloFlowANTI.txt:18740` | small | 8-min dead-man watchdog can never clear a stranded pdfFixLoading: it treats a missing __alloActivePdfRemediation slot as "superseded", returns, and never re-arms |
| M8 | medium | CONFIRMED | `doc_pipeline_source.jsx:19970` | medium | _runMainFixLoop returns the LAST pass's verification audit while shipping bestHtml, so the "Remaining Issues" list can describe HTML the teacher is not downloading |
| M9 | medium | CONFIRMED | `doc_pipeline_source.jsx:5814` | small | _finalizeRemediationRound carries _estimatedMinimumScore / _estimatedScoreBasis / _finalAuditRetryAvailable forward unchanged, so a superseded round's estimate is displayed against the current document |
| M10 | medium | CONFIRMED | `doc_pipeline_source.jsx:22470` | small | The body sanitizer runs before the image controls are authored, so the renderer's placeholder upload/drag/pick handlers are stripped — the manual image fallback is dead too |
| M11 | medium | CONFIRMED | `doc_pipeline_source.jsx:22263` | medium | The "Retry This Section" control on a failed-chunk banner is stripped by the sanitizers before it ships, and its handler would replace the finished document with the raw Step-2 draft |
| M12 | medium | CONFIRMED | `doc_pipeline_source.jsx:2938` | medium | The structural fidelity nets for lost links and lost tables measure MARKDOWN in the source text, which pdf.js extraction never produces — both nets are permanently inert for PDF input |
| M13 | medium | CONFIRMED | `doc_pipeline_source.jsx:21114` | small | The ~3 KB-per-page size estimate drives the Vision OCR fan-out when pdf.js cannot open the file, producing a thousand-chunk extraction on an encrypted or corrupt PDF |
| M14 | medium | CONFIRMED | `doc_pipeline_source.jsx:21417` | small | Tesseract ignores the page range: it OCRs the entire document, and its out-of-range page failures are reported as this run's extraction failures and block OCR-evidence banking |
| M15 | medium | CONFIRMED | `doc_pipeline_source.jsx:4498` | medium | `_geminiGate` releases the slot and pumps the queue before `_geminiCall` records the failure, so the call that trips the breaker admits fresh full-size calls under the pre-trip cap with no cooldown |
| M16 | medium | CONFIRMED | `doc_pipeline_source.jsx:4561` | medium | A route- or volume-mismatched success can never clear a failure wave, so one Vision/whole-doc storm pins the gate at cap 1 and `storming=true` for the rest of the run |
| M17 | medium | CONFIRMED | `AlloFlowANTI.txt:25642` | small | Every hands-off retry attempt downloads another multi-MB "-unfinished" project file and toasts "Remediation stopped" while the wrapper is still retrying |
| M18 | medium | CONFIRMED | `doc_pipeline_source.jsx:21179` | medium | The "Continue a previous session" OCR seed is consumed at Step 1 of the first attempt and never re-armed, so a failed attempt makes every retry re-run full OCR |
| M19 | medium | CONFIRMED | `doc_pipeline_source.jsx:24916` | small | Watchdog-invalidated stall is classified as "cancelled", so the resumable-incomplete-project bank never runs — the OCR work the feature exists to save is discarded |
| M20 | medium | CONFIRMED | `AlloFlowANTI.txt:19737` | medium | The 12-minute auto-continue dead-man switch can never fire when the loop starts without a preceding in-session pipeline run |
| L1 | low | CONFIRMED | `tests/multisession_dataloss.test.js:15` | small | Multi-session resume is tested against a hand-written copy of itself; the real `mergeRangesToFullHtml` — the function whose bug handed a teacher a blank multi-day IEP — has zero invocations in the entire suite |
| L2 | low | CONFIRMED | `doc_pipeline_source.jsx:4210` | small | The only log a teacher can copy carries no runId and no documentEpoch; the buffer that does carry them has no reader anywhere in the app |
| L3 | low | CONFIRMED | `view_pdf_audit_source.jsx:5113` | small | _reauditAndScore passes the operation's abort signal as a third argument to the two-parameter auditOutputAccessibility, so the signal is silently dropped |
| L4 | low | CONFIRMED | `doc_pipeline_source.jsx:23846` | medium | The partial-audit "honest reframe" (block D) is unreachable dead code — its guard requires !_aiDegraded, which is false for exactly the partial audits it was written to describe |
| L5 | low | CONFIRMED | `doc_pipeline_source.jsx:3043` | small | `integrityCoverage` is a character-count ratio but is reported to the teacher as "% of the source text preserved in reading order"; no reading-order check ever runs against the source |
| L6 | low | CONFIRMED | `doc_pipeline_source.jsx:4715` | small | Recovery-probe traffic bypasses `callGemini` entirely, so its calls, latency, and failures appear in no run telemetry and no log the teacher can read |
| L7 | low | CONFIRMED | `doc_pipeline_source.jsx:23606` | small | A merely-reduced cap is treated as "a storm" at the final-audit sites, contradicting `_geminiThrottleInfo`'s own contract and misattributing a non-throttle coverage shortfall to a rate-limit in the teacher-facing summary |
| L8 | low | CONFIRMED | `view_pdf_audit_source.jsx:3104` | small | window.__alloRemediationProgress is never cleared, so every new document logs a false 'progress events dropped' epoch-mismatch diagnostic |
| L9 | low | PLAUSIBLE | `view_pdf_audit_source.jsx:13679` | small | window.__alloForceOcr is armed before fixAndVerifyPdf and never cleared when the call is rejected, so the next run silently force-re-OCRs the whole document |
| L10 | low | PLAUSIBLE | `doc_pipeline_source.jsx:14148` | small | A batch file whose cancellation drain exceeds 30s aborts the entire remaining batch, justified by a pipeline lock the batch never holds |
| L11 | low | PLAUSIBLE | `misc_handlers_source.jsx:1201` | small | runAutoFixLoop's re-entry guard resolves undefined, so the hands-off wrapper counts a rejected loop as a completed round and posts a false "retrying the loop" progress toast |
| L12 | low | PLAUSIBLE | `tests/autofix_loop_noise_robust.test.js:21` | medium | The auto-fix loop's commit-or-revert and progress decisions are tested only through hand-written mirrors, while the one real behavioural test covers the happy path alone — no abort, no revert, no stagnation |

---

## C1 — "Fix Remaining" replaces the whole fidelityNotes array with only the 3 recomputable kinds, silently deleting OCR-quality, alt-quality, folio-leak, page-edge and active-content disclosures

- **Severity:** critical · **Verdict:** CONFIRMED · **Dimension:** verification-honesty · **Effort:** small
- **Anchor:** `view_pdf_audit_source.jsx:8983`

**What breaks**

A teacher remediates a scanned IEP/assessment PDF. fixAndVerifyPdf attaches durable notes: `{kind:'lowOcrAccuracy', msg:'Estimated OCR quality is POOR (~52%) — the embedded searchable text may be garbled…'}` (doc_pipeline_source.jsx:24213), `{kind:'lowOcrConfidence'}` (24195), `{kind:'altQuality'}` (24251/24270), `{kind:'folioLeak'}` (24152), `{kind:'pageEdge'}` (24181), `{kind:'ocrColumnOrder'}` (24171), `{kind:'activeContent'}` (24286). The teacher then presses "Fix Remaining" to clear the last few axe violations. That handler recomputes ONLY links/tables/refusal (computeStructuralFidelityNotes), numeric, and reading-order, then assigns that array over the whole set. Every OCR/alt/folio/active-content note is gone. `fidelityLimited` recomputes to false, `needsExpertReview` recomputes to false, the amber "⚠ verify content" chip and the fidelity panel (view 11813) go empty, and `_alloDistributionVerdict` — which reads `kinds.lowOcrAccuracy`, `kinds.altQuality`, `kinds.folioLeak` (doc_pipeline_source.jsx:3055-3060) — loses every one of those cautions. With axe clean and integrityCoverage ≥90 (coverage measures QUANTITY, not correctness — the code says so at 24205), `review` and `cautions` are both empty, so the strip flips to level 'ready': "Ready to hand out" on a document whose text is garbled OCR and whose alt text is information-free.

**Evidence**

```
view_pdf_audit_source.jsx:8963  `let _refixNotes = Array.isArray(_fixRemainingSource.fidelityNotes) ? _fixRemainingSource.fidelityNotes.slice() : [];`
8968-8982  `_notes` is filled ONLY from `computeStructuralFidelityNotes` (links/tables/refusal), `numericFidelityLosses` ('numeric'), and `checkReadingOrderPreserved` ('reading-order').
8983  `_refixNotes = _notes; // THIS run's findings replace the prior run's`
8990  `const fidelityLimited = _refixNotes.length > 0 || (typeof _fixRemainingSource.integrityCoverage === 'number' && _fixRemainingSource.integrityCoverage < 90);`
8997-8999  `fidelityNotes: _refixNotes,` / `fidelityLimited,` / `needsExpertReview: fidelityLimited || accessibilityReview,`

The engine's own canonical reducer does exactly the opposite and names the rule — doc_pipeline_source.jsx:5692 `const _RECOMPUTABLE_FIDELITY_KINDS = { links: 1, tables: 1, refusal: 1, placement: 1, numeric: 1 };` and 5750-5752 `(cur.fidelityNotes || []).filter((n) => !(n && _RECOMPUTABLE_FIDELITY_KINDS[n.kind])).concat(_roundFid.fidelityNotes || [])`. The "Fix Remaining" lane has no such filter.
```

**Proposed fix**

In the Fix Remaining handler, merge instead of replace, using the engine's own kind set: `_refixNotes = (_fixRemainingSource.fidelityNotes || []).filter(n => !(n && {links:1,tables:1,refusal:1,placement:1,numeric:1,'reading-order':1}[n.kind])).concat(_notes);`. Better: export `_RECOMPUTABLE_FIDELITY_KINDS` from doc_pipeline_source.jsx (or expose a `mergeFidelityNotes(prevNotes, freshNotes)` helper next to `computeStructuralFidelityNotes` at line 37795) and call that from view line 8983, so the two lanes cannot drift again.

**Verifier**

Anchors are exact in the canonical view. view_pdf_audit_source.jsx:8963 `let _refixNotes = Array.isArray(_fixRemainingSource.fidelityNotes) ? _fixRemainingSource.fidelityNotes.slice() : [];`, 8967-8981 fill `_notes` from ONLY computeStructuralFidelityNotes / numericFidelityLosses / checkReadingOrderPreserved, and 8983 is verbatim `_refixNotes = _notes; // THIS run's findings replace the prior run's`. 8990 recomputes fidelityLimited, 8997-9000 write fidelityNotes/fidelityLimited/needsExpertReview/expertReviewReason. I searched for a merge guard and found none on this lane; the only merge in the codebase is the engine's, doc_pipeline_source.jsx:5692 `_RECOMPUTABLE_FIDELITY_KINDS = { links: 1, tables: 1, refusal: 1, placement: 1, numeric: 1 }` + 5750-5752 filter-then-concat, and it is not exported to or called by the view. The durable kinds are real and all published on the same array: doc_pipeline_source.jsx:24152 folioLeak, 24162 ocrDupeCollapse, 24171 ocrColumnOrder, 24181 pageEdge, 24195 lowOcrConfidence, 24213/24231 lowOcrAccuracy, 24251/24270 altQuality, 24286 activeContent — all pushed onto `_structuralFidelityNotes`, published at 24578 `fidelityNotes: _structuralFidelityNotes`. Reachability confirmed: the button is unconditional after a first remediation (view 8788 comment `Fix Remaining — always visible after first remediation`, handler 8789-9014), and the pending-commit helper at view 3226-3273 clears _estimatedMinimumScore/_estimatedScoreBasis but deliberately does NOT touch fidelityNotes, so the prior notes are live right up to the overwrite. Consumers verified: distributionVerdict is really rendered (view 10621-10622) and reads kinds.lowOcrAccuracy/altQuality/folioLeak/pageEdge/ocrColumnOrder at doc_pipeline_source.jsx:3055-3060; the fidelity panel at view 11813; and the notes also feed the exported accessibility statement (view 13540 `notes: pdfFixResult.fidelityNotes || []`), so the disclosure is lost from the shipped report too, not just the screen. Severity holds: the disclosure loss is unconditional on every Fix Remaining press over a scanned/imaged doc; the full flip to 'ready' additionally needs verificationState==='complete' (doc_pipeline_source.jsx:3031), which is achievable but not the common case.

---

## C2 — Extracted-image splice regex requires `data-img-placeholder` as the FIRST attribute; the renderer emits `id` first, so no image is ever placed

- **Severity:** critical · **Verdict:** CONFIRMED · **Dimension:** html-integrity · **Effort:** small
- **Anchor:** `doc_pipeline_source.jsx:22487`

**What breaks**

Any PDF with figures. The renderer emits `<figure id="pdf-img-ph-xxxx-figure" data-img-placeholder="true" style=...>` (doc_builder_renderer_source.jsx:259, the module loaded at doc_pipeline_source.jsx:21844). The splice regex demands the attribute immediately after `<figure `, so it matches zero figures. Consequence chain: `imgIdx` never increments, `_deferredImageMap` stays empty, so the end-of-pipeline token restore (24318), the dropped-image recovery section (24355-24387), the STEM image-intelligence pass (24346) and the image-reinsertion report (24393-24414, which only emits when `_srcMissing`/`_aiDropped` are non-empty) ALL no-op. The teacher ships a document where every figure is a grey "Image placeholder" box, `data-img-idx`/`data-crop` never exist so the crop UI baked into the wrapper (`window.__pdfCropImage`) is unreachable — and nothing in the log, the fidelity panel, or the report says an image was lost. Verified: `/<figure data-img-placeholder="true"/.test(renderer output)` === false; the sibling helper at 7568 already uses the tolerant form.

**Evidence**

```
doc_pipeline_source.jsx:22486-22487
        // Find figure elements with data-img-placeholder marker (clean, no regex issues)
        bodyContent = bodyContent.replace(/<figure data-img-placeholder="true"[\s\S]*?<\/figure>/gi, (match) => {

Producer — doc_builder_renderer_source.jsx:259 (attribute order: id, THEN data-img-placeholder):
              return `<figure id="${_imgId}-figure" data-img-placeholder="true" style="position:relative;margin:1em 0">`

The already-corrected sibling, doc_pipeline_source.jsx:7568:
    out = out.replace(/<figure\s[^>]*data-img-placeholder="true"[\s\S]*?<\/figure>/gi, function(match) {

doc_pipeline_source.jsx:22559 is the ONLY producer of data-img-idx and it lives inside this dead callback:
            return `<figure id="${imgId}-figure" data-img-idx="${imgIdx}"...
```

**Proposed fix**

In `fixAndVerifyPdf` Step 2, change the splice regex at 22487 to the tolerant form already used by `_stripImagePlaceholdersForAi` — `/<figure\s[^>]*data-img-placeholder="true"[\s\S]*?<\/figure>/gi` — and add an assertion that logs via `_pipeLog` when `extractedImages.length > 0` but `Object.keys(_deferredImageMap).length === 0`, so this class of silent miss can never be invisible again.

**Verifier**

Independently reproduced. doc_pipeline_source.jsx:22487 is verbatim `bodyContent = bodyContent.replace(/<figure data-img-placeholder="true"[\s\S]*?<\/figure>/gi, (match) => {` — a literal space then the attribute. The ONLY producer of that marker is doc_builder_renderer_source.jsx:259 `return `<figure id="${_imgId}-figure" data-img-placeholder="true" style=...`` (grep for data-img-placeholder across *_source.jsx returns exactly this one producer plus consumers at 2775/2778/2892/7568/26217 and view 2237-2239). I looked for a reordering step and found none: bodyContent is produced at 22273 `_stripJsonWrapperArtifacts(renderJsonToHtml(allBlocks))` (and 21964 on the <=8-page path) via the module loaded at 21844; _stripJsonWrapperArtifacts (6933-6960) only removes JSON seam artifacts; figures are tokenized at 22314 and restored VERBATIM at 22467 (_restoreImagePlaceholdersForAi is a plain split/join); _alloSanitizeRemediationBodyFragment (2340) round-trips through DOMParser, which preserves parse-order attributes. So id stays first and the regex matches zero figures. Consequence chain verified: imgIdx/_deferredImageMap are populated ONLY inside that callback (22525) for the PDF path, so the restore loop at 24318-24333, the STEM pass at 24346, the dropped-image recovery at 24355-24387 and the report at 24393-24414 (gated on _srcMissing/_aiDropped, both pushed only inside the dead callback) all no-op. The tolerant sibling at 7568 `/<figure\s[^>]*data-img-placeholder="true"[\s\S]*?<\/figure>/gi` confirms the intended form. Reachability: _extractPdfImages (19985) is not behind a user toggle for application/pdf inputs. Severity upheld at critical — silent total image loss with no log, no fidelity note, and createTaggedPdf:26217 then deletes the imgless placeholders from the exported PDF. Caveat: doc_builder_renderer_source.jsx was not on the stated canonical list, but it is the source of the module the pipeline loads at 21844 and is not a generated artifact.

---

## C3 — Whole-engine OCR failures produce zero pageErrors, so lost pages never reach the partial-extraction banner — and the hole is then banked in the OCR evidence cache

- **Severity:** critical · **Verdict:** CONFIRMED · **Dimension:** extraction-fidelity · **Effort:** medium
- **Anchor:** `doc_pipeline_source.jsx:21476`

**What breaks**

Scanned 30-page IEP packet in Canvas. Tesseract's CDN load fails (`ensureTesseractLoaded`) so `extractPdfTextTesseract` hits its outer catch; 2 of 15 Vision chunks come back as empty 200 bodies (a documented Canvas proxy behavior). Pages 9-12 end up as empty strings inside `pagesOut`. `window.__lastOcrPageErrors` is `[]`, so the view's "Stage 1 partial extraction" banner (view_pdf_audit_source.jsx:9354) never renders. Worse, `window.__lastGroundTruthCharCount` is then set from the SHORTENED text (21536-21538), so every downstream coverage/integrity net measures the output against a ground truth that is already missing 4 pages and reports full coverage. The teacher ships a document missing 4 pages with a green score. Because the equal-char fallback still pushes empty page records for the failed chunks, `_ocrEvidenceCompatible`'s page-coverage check passes and the truncated evidence is BANKED (21630) — every retry in that session replays the same hole.

**Evidence**

```
21476: `window.__lastOcrPageErrors = [].concat(tessResult.pageErrors || [], visionResult.pageErrors || []);` with the comment at 21473 claiming "Per-page OCR failures from BOTH engines".
But `_visionChunkedExtract` never returns a pageErrors field — 21399: `return { fullText: cleanedChunks.join('\n\n---\n\n'), pages: pagesOut };`
And both whole-engine catches drop it too — 21425-21426: `_tesseractExtract().catch(e => { ...; return { fullText: '', pages: [] }; }), _visionChunkedExtract().catch(e => { ...; return { fullText: '', pages: [] }; })`; 10914: `return { fullText: '', pages: [], pageCount: 0, sourceCharCount: 0, error: e && e.message, pageErrors: [] };`
A failed chunk is silently blanked — 21357: `if (!chunk || !chunk.trim()) return '';` then 21389-21395 pushes `pageCount` empty-text pages, which satisfies 11915: `return _ocrEvidenceExpectedPages(identity).every(pageNum => present.has(pageNum));`
```

**Proposed fix**

Have `_visionChunkedExtract` accumulate a `pageErrors` array (push `{pageNum, error}` for every chunk whose promise rejected or returned empty, for each page the chunk covered) and return it; in the two `.catch` handlers at 21425-21426 and in `extractPdfTextTesseract`'s outer catch, synthesize an engine-level error record covering pages 1..effectivePageCount instead of `pageErrors: []`. Additionally, in `_ocrEvidenceCompatible`, require every expected page to have non-empty text, not merely to be present.

**Verifier**

Every cited line matches the canonical source. doc_pipeline_source.jsx:21476 is verbatim `window.__lastOcrPageErrors = [].concat(tessResult.pageErrors || [], visionResult.pageErrors || []);` under the 21473 comment claiming both engines. `_visionChunkedExtract` genuinely never builds a pageErrors array — its only return statements are 21260 `{ fullText: single || '', pages: [...] }` and 21399 `return { fullText: cleanedChunks.join('\n\n---\n\n'), pages: pagesOut };`. Both whole-engine catches at 21425-21426 return `{ fullText: '', pages: [] }`, and extractPdfTextTesseract's outer catch at 10914 returns `pageErrors: []` (10813 `await ensureTesseractLoaded();` is inside that try, so a CDN failure lands there). A failed Vision chunk becomes `''` at 21357, and the equal-char fallback at 21389-21395 still pushes `pageCount` records with empty text (chunkLen 0 → per 0 → pageCount empty entries). I traced the banking claim independently: reconcileOcrPages pushes a merged entry for EVERY pageNum in the union unconditionally (11092 `merged.push({ pageNum: _pn, text: chosen.text, ... })`), so `window.__lastGroundTruthPageMap` (21481) contains every expected page number; `_ocrEvidenceCompatible` only tests membership (11912-11915 `present.has(pageNum)`), never non-emptiness, and its pageErrors refusal at 11910 is satisfied because the array is empty. `_writeOcrEvidence` (11943) re-uses the same predicate, so the truncated evidence banks. The coverage denominator claim also holds: 21536-21538 sets __lastGroundTruthCharCount from the shortened text, and the integrity net at 24031/24045-24059 measures `_srcRaw` (= extractedText) as ground truth, so a hole in extractedText is invisible. The view's banner (view_pdf_audit_source.jsx:9354-9356) reads only `extractionData.metadata.pageErrors`, fed by doc_pipeline_source.jsx:21710. Only partial mitigation found: createTaggedPdf's page-level net at 27684-27697 warnLogs `_ocrPagesEmpty`, but that is a log line in the tagged-PDF stage, does not block, and does not fire the banner. Minor overstatement in the finding: a plain retry replays the banked hole, but the explicit 'Re-scan with OCR' button sets _forceFullOcr and bypasses the cache read at 21145-21148.

---

## H1 — The blocking `unit` CI job runs the whole vitest suite with no known-failure allowlist while ~21 raw-source pins in the pdf/remediation slice are dead — the one blocking regression gate is permanently red, which is why finding #1's red pin went unnoticed

- **Severity:** high · **Verdict:** CONFIRMED · **Dimension:** test-coverage · **Effort:** medium
- **Anchor:** `.github/workflows/verify.yml:80`

**What breaks**

The job is declared BLOCKING and runs `vitest run` unfiltered across 8 shards. With a standing red baseline, a shard failure carries no information: a genuine regression (a lost abort propagation, a broken score binding) is indistinguishable from the refactor drift already sitting there. Finding #1 is the demonstration — a pin protecting a false-accessibility-claim guard has been red long enough for the guard itself to be deleted from the source.

**Evidence**

```
.github/workflows/verify.yml:82 `# BLOCKING. Sharding keeps the 1,200+ file Vitest suite bounded while every` / :99 `run: npm run test:ci:shard -- --shard=${{ matrix.shard }}/8`, with package.json `"test:ci:shard": "vitest run --maxWorkers=2"` — no filter, no allowlist, and vitest.config.js excludes only `tests/translation_pipeline.test.js`. Verified dead source pins (literal absent from every file the test reads): tests/honesty_disclosure_gating.test.js:21; tests/deep_dive_batch3_fixes.test.js:87 pins `const _genStale = () => (!_silentMode && typeof window !== 'undefined' && (window.__alloPdfRunGen || 0) !== _myRunGen);` vs current doc_pipeline_source.jsx:23634 `const _genStale = _runGenStale;`, and :89 pins `if (Date.now() >= _deferHardStop || _genStale()) break;` vs current :23664 `if (Date.now() >= _deferHardStop) break;`; tests/chatgpt_phase2_reliability.test.js:109 pins `var state = reachedTarget && residual === 0 && aiCompleted ? 'success' : 'incomplete';` vs current :2993 which added `axeCompleted &&` and `&& !confirmedResidualFailures`; tests/remediation_wcag22_upgrade.test.js:30 pins `const _PIPELINE_PROMPT_VERSION = '20260711-1';` vs current :11835 `'20260723-1'`. Full inventory: 21 dead raw-source pins across 12 pdf/remediation test files.
```

**Proposed fix**

Re-baseline is cheap and worth doing: 21 literals in 12 files, each a copy-paste from the current source, roughly an hour. Do it in one commit, then keep the job green so a red shard means something. Where the drift is purely file-scope (a pin looking in AlloFlowANTI.txt for code that moved to misc_handlers_source.jsx), copy the corpus idiom already used at tests/storm_wait_autocontinue.test.js:14 and tests/autofix_loop_noise_robust.test.js:18.

**Verifier**

CI mechanics verified: .github/workflows/verify.yml:79-99 defines `unit`, comment at :81 reads `# BLOCKING. Sharding keeps the 1,200+ file Vitest suite bounded while every`, :99 runs `npm run test:ci:shard -- --shard=${{ matrix.shard }}/8`, package.json:6 defines that as `vitest run --maxWorkers=2` (no filter), vitest.config.js:14 excludes only `tests/translation_pipeline.test.js`, and the job has no `continue-on-error` (unlike verify-full :118, smoke :140, verapdf :216, cdn-goldens :272). I independently confirmed five dead pins across four files, each reading the canonical source: honesty_disclosure_gating.test.js:22 (grep 0, see finding #1); deep_dive_batch3_fixes.test.js:87 pins the arrow form of `_genStale` while doc_pipeline_source.jsx:23634 is `const _genStale = _runGenStale;`, and :89 pins `if (Date.now() >= _deferHardStop || _genStale()) break;` (grep 0 — the shipped line at :23664 is `if (Date.now() >= _deferHardStop) break;`); chatgpt_phase2_reliability.test.js:108 and :109 both grep 0 against the current `_alloRemediationOutcome` (:2981, :2993); remediation_wcag22_upgrade.test.js:30 pins `'20260711-1'` while doc_pipeline_source.jsx:11835 is `'20260723-1'`. All four files load `doc_pipeline_source.jsx`/`AlloFlowANTI.txt` directly, so the failures are unavoidable — the blocking vitest job is red. Two corrections: the full '21 pins across 12 files' inventory is unverified by me (I substantiated 5 in 4), and `unit` is not 'the one blocking gate' — `gate` (:49), `docs-integrity` (:34), `adventure-journey` (:62), `research-integrations` (:101) and `tag-tree` (:153) are also blocking. Severity kept high: it is the only blocking job that carries the vitest regression signal, and finding #1 shows a false-verification guard was deleted while its pin sat red.

---

## H2 — No test ever executes fixAndVerifyPdf in interactive mode — every full-run test passes `onProgress`, which sets `_silentMode` and skips all 28 teacher-facing branches

- **Severity:** high · **Verdict:** CONFIRMED · **Dimension:** test-coverage · **Effort:** medium
- **Anchor:** `tests/e2e/remediation_corpus_golden.spec.ts:259`

**What breaks**

`const _silentMode = !!_onProgress;` (doc_pipeline_source.jsx:20696) gates 28 sites. All three executable whole-run tests supply `onProgress: () => {}`, so none of them ever reaches: the completion toast/chord ladder (:24802-24842), `setPdfFixResult(_result)` / `setPdfFixLoading(false)` / `setPdfFixStep('')` (:24741-24743), the zombie-run guard `return null` on generation mismatch (:24735-24738), the multi-session auto-save and its quota-failure warning toast (:24748-24788), and the integrity toasts at :24073 / :24079 / :24093 / :24110. That is the entire surface a real teacher sees. Any regression in which message fires, whether the spinner clears, or whether a page-range's work is persisted, ships green — finding #1 is the proof it already has.

**Evidence**

```
doc_pipeline_source.jsx:20696 `const _silentMode = !!_onProgress;`. tests/e2e/remediation_corpus_golden.spec.ts:259 and :364, and tests/e2e/remediation_fault_injection_golden.spec.ts:109 all pass `onProgress: () => {},`. The only vitest calls to `fixAndVerifyPdf` are tests/remediation_run_ownership_visibility.test.js:109/113/124/136/149/162, which use `base64: 'QUFBQUFB'` (6 bytes, not a PDF) so the worker bails in microseconds by design — the file's own comment at :148-151 says so: "base64:'' makes the worker bail on its first check, so this pin cannot leave the shared lock held".
```

**Proposed fix**

Add one interactive-mode e2e case to remediation_corpus_golden.spec.ts: call `fixAndVerifyPdf` WITHOUT `onProgress`, with a state bag whose `addToast`, `setPdfFixResult`, `setPdfFixLoading` and `setPdfFixStep` are recording stubs (the bag shape already exists at tests/remediation_run_ownership_visibility.test.js:34-71). Assert the toast kind/text chosen, that `setPdfFixLoading(false)` and `setPdfFixStep('')` fire exactly once, and that a `pageRange` run calls the multi-session save.

**Verifier**

Anchors check out. doc_pipeline_source.jsx:20696 is exactly `const _silentMode = !!_onProgress;` (`_onProgress` from :20695). All three whole-run executable tests pass `onProgress: () => {}` — tests/e2e/remediation_corpus_golden.spec.ts:259 and :364, tests/e2e/remediation_fault_injection_golden.spec.ts:109 — so `if (_silentMode) return _result;` at doc_pipeline_source.jsx:24731 short-circuits before every cited site: the zombie-run guard :24735-24738, `setPdfFixResult(_result)`/`setPdfFixLoading(false)`/`setPdfFixStep('')` :24741-24743, the multi-session auto-save + quota toasts :24748-24788, and the completion ladder :24802-24842. The integrity toasts are also `!_silentMode`-gated at the cited lines :24073, :24079, :24093, :24110. These e2e specs DO run in CI (verify.yml:194, :196, :244), so silent mode is the only whole-run coverage that exists. Two precision corrections that do not change the verdict: (1) the title's absolute is slightly wrong — tests/remediation_run_ownership_visibility.test.js:109/113/124/136/162 call `fixAndVerifyPdf` WITHOUT `onProgress` (interactive mode), but with `base64: 'QUFBQUFB'` they never reach the completion path; only :149 passes `onProgress`, and the quoted `base64:''` comment at :146-149 belongs to that managed-batch case, not to the others; (2) `grep -c "_silentMode"` = 28 counts the declaration too, so it gates 27 sites, not 28. The substantive claim — zero coverage of the interactive completion surface — is confirmed, and finding #1 is a live instance of what that void permits.

---

## H3 — The pin guarding the "fully verified!" victory branch is dead — the `!needsExpertReview` gate no longer exists in the code, and the file's third test is a mirror that passes regardless

- **Severity:** high _(verifier revised from critical)_ · **Verdict:** CONFIRMED · **Dimension:** test-coverage · **Effort:** medium
- **Anchor:** `tests/honesty_disclosure_gating.test.js:21`

**What breaks**

A teacher remediates a PDF that (a) originally contained embedded files/JavaScript, or (b) lost a hyperlink or table during the fix. `_structuralFidelityNotes` gets a note (doc_pipeline_source.jsx:24286 pushes the activeContent note unconditionally; :2941/:2947 push link/table notes), so `_contentFidelityConcern` and therefore `needsExpertReview` are true at :24306-24307 — but `integrityWarning` stays null. Structural audits are clean and the score clears target, so `_alloRemediationOutcome` returns state 'success' (it never reads needsExpertReview or the fidelity notes; see :2976-3007). The ladder at :24824 then fires `✅ PDF remediated and fully verified!` plus `window.remediationAudio.sessionComplete()` — the victory chord — and the branch written for exactly this case at :24827 is unreachable whenever the outcome is 'success'. The teacher distributes a document with known fidelity damage under a green 'fully verified' claim.

**Evidence**

```
tests/honesty_disclosure_gating.test.js:21 — `expect(dp).toContain('finalAfterScore !== null && finalAfterScore >= 80 && !needsExpertReview');`  → `grep -c "finalAfterScore >= 80 && !needsExpertReview" doc_pipeline_source.jsx` = **0**. The only surviving occurrence is the negative form at doc_pipeline_source.jsx:24827 `} else if (finalAfterScore !== null && finalAfterScore >= 80 && needsExpertReview) {`, which sits AFTER doc_pipeline_source.jsx:24824 `} else if (_remediationOutcome.state === 'success') {`. The same test file's fallback assertion is a mirror that can never fail: tests/honesty_disclosure_gating.test.js:27-31 `const successBranch = (score, needsExpert) => score !== null && score >= 80 && !needsExpert; expect(successBranch(90, true)).toBe(false);` — this exercises a local arrow function, not the pipeline. No test anywhere references the toast text: `grep -rn "PDF remediated and fully verified" tests/*.test.js tests/e2e/*.spec.ts` returns nothing.
```

**Proposed fix**

Two parts. (1) Restore the gate: change doc_pipeline_source.jsx:24824 to `} else if (_remediationOutcome.state === 'success' && !needsExpertReview) {`, or move the :24827 branch above it. (2) Replace the mirror in tests/honesty_disclosure_gating.test.js:27-31 with a behavioural test that drives the real ladder: extract the toast-selection block into a pure `_selectCompletionToast({outcomeState, integrityWarning, aiVerificationIncomplete, slicedAudit, needsExpertReview, finalAfterScore})` helper, export it, and assert the branch chosen for each of the six shapes — including outcome='success' + needsExpertReview=true.

**Verifier**

Reproduced every step. (a) The pin is dead: tests/honesty_disclosure_gating.test.js:22 asserts `toContain('finalAfterScore !== null && finalAfterScore >= 80 && !needsExpertReview')`; `grep -c "!needsExpertReview" doc_pipeline_source.jsx` = 0. The only surviving form is the NEGATIVE one at doc_pipeline_source.jsx:24827 `} else if (finalAfterScore !== null && finalAfterScore >= 80 && needsExpertReview) {`, which sits AFTER doc_pipeline_source.jsx:24824 `} else if (_remediationOutcome.state === 'success') {` → 24825 `addToast(`✅ PDF remediated and fully verified!...`)` + 24826 `window.remediationAudio.sessionComplete()`. (b) The third test at :28-31 is a local arrow function `successBranch`, exercising nothing from the pipeline; the toast text appears in zero test files (`grep -rn "PDF remediated and fully verified" tests/` = empty). (c) I hunted for the guard elsewhere and found none. `_alloRemediationOutcome` (doc_pipeline_source.jsx:2976-3007) never reads needsExpertReview or fidelityNotes; its `canonicalComplete` term comes from `_verificationState.requiresManualReview`, which is produced by `_alloDeriveVerificationState` (verification_policy_source.jsx:5-192) — that function is fed only ai/axe/equalAccess evidence (call site doc_pipeline_source.jsx:24527-24556) and has no knowledge of fidelity notes. (d) Reachability is real and not exotic: `_contentFidelityConcern` at :24306 is `!!integrityWarning || _structuralFidelityNotes.length > 0`, and notes are pushed WITHOUT setting integrityWarning at :24251 (information-free alt text), :24270 (Vision spot-check alt mismatch), :24286 (active content), :24162/:24171/:24181/:24195/:24213/:24231 (OCR notes), plus the links/tables/refusal notes from `_computeStructuralFidelityNotes` (:2941/:2947/:2962/:2968, assigned at :24143). None of those are visible to axe/EqualAccess/the AI rubric, so a clean 95 with placeholder alt text or a dropped table lands in the 'success' branch and plays the victory chord. The three earlier branches (:24802 integrityWarning, :24809 aiVerificationIncomplete, :24817 slicedAudit) do not catch it. Severity corrected critical→high: the false claim is real and is exactly what the M4 fix existed to prevent, but it is a contradictory toast rather than a fully silent claim — view_pdf_audit_source.jsx:11745 still renders the expert-review banner, :11813 the fidelity-notes list, and :10621 the distribution verdict.

---

## H4 — FERPA: repairAndParseJsonShared logs 200 raw characters of AI output — verbatim student document text — into the copyable diagnostics log

- **Severity:** high · **Verdict:** CONFIRMED · **Dimension:** observability · **Effort:** small
- **Anchor:** `doc_pipeline_source.jsx:7621`

**What breaks**

Its only caller feeds the model a 5000-char slice of the actual document HTML and instructs it "Be specific — use the actual document content" (doc_pipeline_source.jsx:8359-8362). When the model returns malformed JSON — common under a Canvas throttle that truncates responses — the recovery path dumps `String(raw).slice(0, 200)` of that response as the `data` payload. Those 200 characters are surgical directives quoting the document: names, dates of birth, disability categories, evaluation findings. They land in `window.__alloDiagLog` via `warnLog(prefix + msg, data)` and are rendered and exported verbatim by the diagnostics panel's Copy button. The neighbouring guard at 8379 shows the house rule being violated: it logs `'(directive details redacted)'`.

**Evidence**

```
doc_pipeline_source.jsx:7621:
```
_pipeLog('repairAndParseJsonShared', 'gave up — returning null', String(raw).slice(0, 200));
```
doc_pipeline_source.jsx:8359-8364 — the raw comes from a document-bearing prompt:
```
'HTML SECTION ' + (ci + 1) + '/' + chunks.length + ':\n"""\n' + _neutralizePromptFence(chunk.substring(0, 5000)) + '\n"""\n\n' +
... 'Return ONLY a JSON array. Be specific — use the actual document content.';
const surgRaw = await callGemini(surgPrompt, true);
const directives = repairAndParseJsonShared(surgRaw);
```
doc_pipeline_source.jsx:8379 — the contrasting convention: `warnLog('[SurgicalThenAI] directive rejected (growth>1.25x): tool=' + fix.tool + ' (directive details redacted)');`
```

**Proposed fix**

Replace the payload at doc_pipeline_source.jsx:7621 with non-identifying shape metrics only — e.g. `{ rawChars: String(raw).length, startsWith: String(raw).trim().slice(0, 12).replace(/[^\[{`a-z]/gi, '?'), hadFence: String(raw).indexOf('```') !== -1 }`. That preserves the diagnostic value (was it truncated? was it fenced? was it prose?) without exporting document text.

**Verifier**

doc_pipeline_source.jsx:7621 is verbatim inside repairAndParseJsonShared (7590-7623), on the terminal give-up path after four parse attempts. Grep confirms exactly one call site, 8364, and the prompt feeding it (8356-8362) is verbatim: it embeds `chunk.substring(0, 5000)` of the live document HTML and ends 'Return ONLY a JSON array. Be specific — use the actual document content.' The 200-char payload is a string arg, so warnLog/__alloPushLog (AlloFlowANTI.txt:3218 `return String(a)`) puts it straight into window.__alloDiagLog and thus into the panel render (view 2862) and the Copy export (view 2813). The contrasting convention at 8379 ('directive details redacted') is verbatim. Held at high: the trigger — a truncated/prose response under a Canvas throttle — is the exact regime this repair function exists for, and the leaked text is model output that was explicitly instructed to quote document content (find/replace strings, headings, table cells). Caveat noted: it is the directive JSON, not the document verbatim, so the amount of identifying text per incident varies.

---

## H5 — FERPA: the raw filename is written into the teacher-copyable diagnostics log on the very line next to one that deliberately redacts it

- **Severity:** high · **Verdict:** CONFIRMED · **Dimension:** observability · **Effort:** small
- **Anchor:** `doc_pipeline_source.jsx:20828`

**What breaks**

Every run's first log entry embeds the unredacted filename. School-psych PDFs are routinely named `IEP_Jordan_Marquez_2026.pdf` / `Eval_Smith_A_confidential.pdf`. `_pipeLog` forwards its `data` object to `warnLog`, which JSON.stringifies it into `window.__alloDiagLog` (AlloFlowANTI.txt:3215-3221) — the exact buffer the in-app "🔧 Log" panel renders and its Copy button exports (view_pdf_audit_source.jsx:2802, 2862, 2813). So when a teacher does what the panel exists for — copy the log and paste it into a support ticket or email to Aaron — a student's name leaves the FERPA boundary. The line immediately below proves the intent: it passes the same value through `_alloDiagnosticDocumentLabel`, which reduces it to `[document.pdf]`.

**Evidence**

```
doc_pipeline_source.jsx:20828-20829:
```
_pipeLog('Init', 'Pipeline starting', { file: _fileName, batch: _isBatch, hasAudit: !!_auditResult, pageCount: _auditResult?.pageCount, base64KB: ... }, _runTelemetry);
warnLog('[fixAndVerifyPdf] Starting — batch:', _isBatch, 'base64:', !!_base64, 'audit:', !!_auditResult, 'file:', _alloDiagnosticDocumentLabel(_fileName));
```
doc_pipeline_source.jsx:4210 — `if (data) warnLog(prefix + msg, data);`
AlloFlowANTI.txt:3215-3220 — `if (a && typeof a === 'object') { try { return JSON.stringify(a); } ... } ... __alloDiagLog.push({ t: Date.now(), level, msg });`
view_pdf_audit_source.jsx:2813 — `const text = rows.map((e) => '[' + _time(e) + '] ' + ... + e.msg).join('\n');` (Copy button).
```

**Proposed fix**

Change the `file` field at doc_pipeline_source.jsx:20828 to `_alloDiagnosticDocumentLabel(_fileName)`, matching line 20829. Identity for correlating runs is already carried by `_runTelemetry.runId`/`documentEpoch`.

**Verifier**

doc_pipeline_source.jsx:20828 is verbatim (`{ file: _fileName, batch: _isBatch, ... }`) and 20829 immediately redacts the same value via `_alloDiagnosticDocumentLabel(_fileName)` — whose definition at doc_pipeline_source.jsx:64-67 does reduce to '[document.pdf]'. The export path is real: _pipeLog:4210 `if (data) warnLog(prefix + msg, data)`; doc_pipeline_source.jsx:5 binds `warnLog = window.warnLog`, which AlloFlowANTI.txt:5166 sets to the host warnLog (3225), which pushes through __alloPushLog (3213-3221) where `if (a && typeof a === 'object') return JSON.stringify(a)` — the whole object including `file` — into window.__alloDiagLog. view_pdf_audit_source.jsx:2802 reads that buffer, 2862 renders `e.msg`, 2813 builds the Copy payload from the same rows, and the panel is mounted at 5940. Grep over the whole pipeline shows 20828 is the ONLY log site that passes an unredacted filename — every other one (14094, 14184, 14203, 14233, 14282, 20829) redacts. Severity held at high, and independently corroborated in-repo: doc_pipeline_source.jsx:24845-24848 states 'The raw filename routinely embeds student PII (e.g. "IEP_JohnDoe.pdf")' and gates it behind explicit telemetry consent for a far less exposed sink than a teacher-copied log.

---

## H6 — _finalizeRemediationRound never re-derives the accessibility half of needsExpertReview from the round's fresh axe/Equal Access evidence — it is inherited from the previous result forever

- **Severity:** high · **Verdict:** CONFIRMED · **Dimension:** verification-honesty · **Effort:** medium
- **Anchor:** `doc_pipeline_source.jsx:5804`

**What breaks**

Two directions, both wrong. (a) Under-warning: a run finishes with `needsExpertReview:false`. An auto-continue round's AI rewrite introduces a critical axe violation (or an Equal Access confirmed FAIL) while net deterministic score holds — the loop's revert guard only fires on `_det < _curDet - 1` (misc_handlers_source.jsx:1428), so the round commits. The reducer has the fresh audits in hand (`_freshAxe`, `_freshEa`, lines 5734-5737) but consults neither for `critical.length` or `failViolations`; `_baseAccessibilityReview` stays false and `needsExpertReview` stays false. The expert-review card (view 11745) never appears even though a confirmed critical WCAG barrier is now in the shipped document. (b) Sticky over-warning: a run that started with `expertReviewReason:'accessibility'` because axeCritical>0 keeps that reason through every subsequent round even after the criticals are fixed, because `_rawExpertBase` reads `cur.needsExpertReview`/`cur.expertReviewReason` and the returned object writes `_expertReviewBeforeVerification: null` and `_verificationExpertReview: false`, so the next round re-reads the same inherited value. The card never clears, and runAutoFixLoop's success toast is permanently suppressed by `_expertOrFidelityReview` (misc_handlers_source.jsx:1464/1468).

**Evidence**

```
doc_pipeline_source.jsx:5734-5737  `const _freshAxe = _scored(round && round.axeAudit) ? round.axeAudit : …;` / `const _freshEa = _scored(round && round.eaAudit) ? round.eaAudit : …;`  // available, never used for expert review
5804-5811:
`const _rawExpertBase = _storedExpertBase || (_hadVerificationContribution ? { needed: false, reason: null } : { needed: !!cur.needsExpertReview, reason: cur.expertReviewReason || null });`
`const _baseAccessibilityReview = !!(_rawExpertBase.needed && (_rawExpertBase.reason === 'accessibility' || _rawExpertBase.reason === 'both' || !_rawExpertBase.reason));`
`const _freshContentFidelityReview = !!_nextFidelityLimited;`
`const _expertBaseReason = _baseAccessibilityReview ? (_freshContentFidelityReview ? 'both' : 'accessibility') : (_freshContentFidelityReview ? 'content-fidelity' : null);`
5838-5841  `needsExpertReview: !!_expertBaseReason,` … `_verificationExpertReview: false,` `_expertReviewBeforeVerification: null,`

Both other lanes DO recompute it from fresh evidence: view_pdf_audit_source.jsx:8991-8993 `const accessibilityReview = !!((prev.axeAudit && Array.isArray(prev.axeAudit.critical) && prev.axeAudit.critical.length > 0) || (prev.secondEngineAudit && Number.isFinite(prev.secondEngineAudit.failViolations) && prev.secondEngineAudit.failViolations > 0) || (Number.isFinite(prev.afterScore) && prev.afterScore < 50));` and view 5179-5181.
```

**Proposed fix**

In `_finalizeRemediationRound`, replace the inherited `_baseAccessibilityReview` with the same predicate the view uses, computed from this round's evidence: `const _freshAccessibilityReview = !!((_freshAxe && Array.isArray(_freshAxe.critical) && _freshAxe.critical.length > 0) || (_freshEa && Number.isFinite(_freshEa.failViolations) && _freshEa.failViolations > 0) || (Number.isFinite(afterScore) && afterScore < 50));` and use it in place of `_baseAccessibilityReview` when building `_expertBaseReason`. Keep the stored base only as a floor for reasons the fresh audits cannot see.

**Verifier**

Verbatim at doc_pipeline_source.jsx:5804-5811: `_rawExpertBase` reads only `cur.needsExpertReview`/`cur.expertReviewReason`, `_baseAccessibilityReview` is derived from that inherited object, and only `_freshContentFidelityReview = !!_nextFidelityLimited` is fresh. `_freshAxe`/`_freshEa` exist at 5734-5737 and are used for _det, axeScore, axeViolations, secondEngineAudit — never for critical.length or failViolations. The stickiness loop closes: 5838-5841 write `needsExpertReview: !!_expertBaseReason`, `_verificationExpertReview: false`, `_expertReviewBeforeVerification: null`, so on the next round _storedExpertBase is null and _hadVerificationContribution is false, and _rawExpertBase re-reads the value the previous round just wrote. I grepped both sentinel fields across every canonical file: only 5800/5803/5840/5841 in the pipeline, plus AlloFlowANTI.txt:25503-25504 (pass-through) and 36870-36892 (project load) — nothing recomputes them mid-loop. The caller does not fix it either: misc_handlers_source.jsx:1440 commits the merged round unchanged, and 1464/1468 `_expertOrFidelityReview` does gate the success toast exactly as claimed. The two other lanes DO recompute from fresh evidence (view 8991-8993 and 5178-5183), so the drift is real. On reachability I checked the revert guard rather than taking it on faith: a newly-introduced axe CRITICAL costs 15 points (SEVERITY_WEIGHTS at doc_pipeline_source.jsx:24, applied at 15593), so direction (a) needs offsetting fixes in the same round to hold _det — plausible but not the easy path. The easier under-warning is the score<50 half: `_moreIssues` is gated `(_vio === 0)` (misc_handlers 1431), so in the axe-violation branch an AI-score collapse to <50 commits with _det intact, the view's predicate would fire and the reducer's inherited base will not. Direction (b) (sticky 'accessibility' reason after the criticals are fixed) is straightforwardly reachable. Severity held at high on the strength of the under-warning half.

---

## H7 — _finalizeRemediationRound treats coverage.ai === 'complete-with-review' as "AI verification incomplete", so a fully-completed audit is reported to the teacher as throttled and its score is hidden

- **Severity:** high · **Verdict:** CONFIRMED · **Dimension:** verification-honesty · **Effort:** small
- **Anchor:** `doc_pipeline_source.jsx:5792`

**What breaks**

Any auto-continue round whose AI audit returns even one issue the model could not classify (`ruleId:'other'`, which `_alloCanonicalizeAuditIssue` stamps `requiresManualReview = true` at line 3947, and which the strict validator explicitly permits — `_AUDIT_RULE_ID_RE` at 12844 ends in `|other`). The policy then sets `aiStatus = 'complete-with-review'` (verification_policy_source.jsx:54-55), so `_verificationCoverage.ai !== 'complete'` is true even though the audit read every requested section and produced a grounded score. The merged round result gets `_aiVerificationIncomplete: true` and `_scoreIsBlended: false`. The view then: hides the after-score entirely (`{_aiIncomplete ? '—' : afterDisplay}`, view 11080-11082 and 10750), and prints "AI semantic verification incomplete (8 of 8 sections audited — the AI service was throttled). The score shown is structural/automated checks; re-run for a full AI-verified score." (view 11286) — self-contradictory (8 of 8) and factually false (nothing was throttled). `_alloDistributionVerdict` adds the false caution 'the AI verification could not fully complete (service throttling)' (doc_pipeline_source.jsx:3049), and a "🔁 Complete final audit" button appears (view 11304), inviting the teacher to burn another full chunked audit on an already-complete one. `_scoreSource` is simultaneously written as 'deterministic-only' while `afterScore` at line 5741 is still `min(aiAudit.score, _det)` — i.e. the label contradicts the arithmetic.

**Evidence**

```
doc_pipeline_source.jsx:5792  `const _aiVerificationIncomplete = _verificationCoverage.ai !== 'complete';`
5793-5795  `const _scoreSource = _aiVerificationIncomplete ? (_det !== null ? 'deterministic-only' : 'unverified') : (_det !== null ? 'min' : 'content-only');`
5741  `const afterScore = (_det !== null) ? _alloComputeHeadline(aiAudit.score, _det) : aiAudit.score;`  // always min(), regardless of the label above

verification_policy_source.jsx:37-40, 54-57:
`var aiReviewCount = aiIssues ? aiIssues.filter(function (issue) { return !!(issue && issue.requiresManualReview === true); }).length : 0;`
`} else if (aiReviewCount > 0) { aiStatus = 'complete-with-review'; } else { aiStatus = 'complete'; }`

Every other lane uses audit health, not the coverage string — view_pdf_audit_source.jsx:5119/5154 `const _wvOk = !!(_wv && Number.isFinite(_wv.score) && !_wv._partialAudit && !_wv._scoreDegraded && !_wv.synthesized);` … `_aiVerificationIncomplete: !_wvOk,`; and doc_pipeline_source.jsx:48-53 `_alloUsableCompleteAiAudit`.
```

**Proposed fix**

In `_finalizeRemediationRound`, derive the flag from the audit itself, matching every other lane: `const _aiVerificationIncomplete = !_alloUsableCompleteAiAudit(aiAudit);` (or at minimum accept both terminal states: `!/^complete(-with-review)?$/.test(_verificationCoverage.ai)`). Manual-review findings already drive `verificationState: 'review-required'` and `requiresManualReview` through the policy — they must not additionally be reported as an incomplete/throttled AI run.

**Verifier**

doc_pipeline_source.jsx:5792 is verbatim `const _aiVerificationIncomplete = _verificationCoverage.ai !== 'complete';` and 5793-5795 the _scoreSource ternary; 5741 `const afterScore = (_det !== null) ? _alloComputeHeadline(aiAudit.score, _det) : aiAudit.score;` is unconditional, so the 'deterministic-only' label does contradict the arithmetic. The policy anchor is exact: verification_policy_source.jsx:37-39 counts requiresManualReview===true issues, 54-55 `} else if (aiReviewCount > 0) { aiStatus = 'complete-with-review'; }`. Trigger is reachable in production, not hypothetical: doc_pipeline_source.jsx:3946-3948 `if (ruleId === 'other') { normalized.requiresManualReview = true; ... }`, 'other' is an explicitly permitted ruleId in the strict validator (12844 `_AUDIT_RULE_ID_RE` ends `|other)$/`) and in the output-audit schema handed to the model (14941), and the canonicalizer is applied to output-audit issues at 12919 `parsed.issues = parsed.issues.map((issue) => _alloCanonicalizeAuditIssue(issue, issue.severity));`. The self-contradictory string is real: chunksAudited/chunksRequested are stamped on EVERY chunked audit, equal on a complete one (15389-15390 `chunksAudited: _auditedCount, chunksRequested: chunks.length`), so view 11286 renders '(N of N sections audited — the AI service was throttled)'. Downstream consumers verified: view 11055 `const _aiIncomplete = !!pdfFixResult._aiVerificationIncomplete;`, 11080-11082 renders '—' instead of the score, 11304 shows the 'Complete final audit' CTA, and doc_pipeline_source.jsx:3049 pushes the false 'service throttling' caution. I looked for a caller-side correction in misc_handlers_source.jsx:1404-1457 — the loop commits `cur = _mergedRound` at 1440 and setPdfFixResult(snapshot) at 1454 with no override of these fields. No guard found.

---

## H8 — Chunked extraction accepts any JSON array as a successful chunk — a refusal-shaped or string array renders to nothing and is recorded `status:'success'` with no placeholder and no fallback

- **Severity:** high · **Verdict:** CONFIRMED · **Dimension:** html-integrity · **Effort:** small
- **Anchor:** `doc_pipeline_source.jsx:22073`

**What breaks**

The single-pass path guards exactly this case with `_asBlockArray`/`_renderableBlock` (21929-21933, added 2026-07-02 for precisely 'a refusal-shaped reply that parses as valid JSON'). The chunked path has no such guard: `if (parsed && Array.isArray(parsed)) return parsed;`. So a chunk that replies `[{"error":"I cannot reproduce this content"}]`, `[{}]`, or `["Heading", "paragraph text"]` is returned as blocks. `renderJsonToHtml` drops all of them (`if (!block || typeof block !== 'object') return ''` and the no-recognised-field early return), yielding zero HTML. Because `blocks.length !== 0`, line 22260 computes `failed = false`, so chunkMeta records `status:'success'`, NO `data-chunk-fail` banner is emitted, the `catch` recovery (chunkText / structureTextHeuristic) never runs, and the 2026-06-15 non-throw fallback at 22229 is also bypassed. Three pages vanish from a document that reports full extraction; on a 30+ page doc the loss is under the 97% char-coverage gate at 24061 too.

**Evidence**

```
doc_pipeline_source.jsx:22072-22073
              let parsed = repairAndParseJson(cleaned);
              if (parsed && Array.isArray(parsed)) {

The guard the single-pass path has, doc_pipeline_source.jsx:21929-21933:
          const _renderableBlock = (b) => !!(b && typeof b === 'object' && (b.type || b.tag || ...));
          const _asBlockArray = (v) => { ... return (Array.isArray(v) && v.some(_renderableBlock)) ? v : null; };

The failure detection that never fires, doc_pipeline_source.jsx:22260-22261:
          const failed = !blocks || blocks.length === 0;
          chunkMeta.push({ index: ci, ..., status: failed ? 'failed' : 'success' });
```

**Proposed fix**

In `processJsonChunk`, replace `if (parsed && Array.isArray(parsed))` with a call to the same `_asBlockArray` predicate used by the single-pass branch (hoist it out of the `pageCount <= 8` block so both paths share one definition), and treat a null result as a parse failure so it falls into the existing object-by-object recovery / direct-HTML / heuristic ladder.

**Verifier**

Reproduced. doc_pipeline_source.jsx:22072-22073 is verbatim `let parsed = repairAndParseJson(cleaned); if (parsed && Array.isArray(parsed)) {` and the branch returns `parsed` at 22081 after the legend pass — no renderability predicate. The single-pass guard is real and is scoped OUT of reach: _renderableBlock/_asBlockArray are declared at 21929-21935 inside the `pageCount <= 8` branch and used only by repairSingle (21940/21945). The renderer does drop the shapes cited: doc_builder_renderer_source.jsx:33 `if (!block || typeof block !== 'object') return '';` kills a string array, and :53 `if (!block.type && !block.text && !block.html && !block.title && !block.items) return '';` kills `{}` and `{"error":"I cannot reproduce this content"}` (no salvage — the default/salvage case at 356 is only reached when block.type exists). Failure detection verified at 22260-22261 `const failed = !blocks || blocks.length === 0;` so a 1-element junk array records `status: 'success'`, skips the data-chunk-fail banner at 22263, and never reaches the catch-side recovery (22283+) or the non-throw fallback at 22229-22243. I checked the upstream guard `if (chunkResult)` at 22030 — it only catches a falsy body, not a parseable refusal. Reachable on any document with pageCount > 8 (the chunked branch at 21986+), which is the normal case for the reports this tool handles.

---

## H9 — Inline `<a href>` links — which the extraction prompt explicitly instructs the model to emit — are HTML-escaped into visible literal markup, destroying every hyperlink

- **Severity:** high _(verifier revised from critical)_ · **Verdict:** CONFIRMED · **Dimension:** html-integrity · **Effort:** small
- **Anchor:** `doc_builder_renderer_source.jsx:71`

**What breaks**

The Step-2 prompts tell Gemini to put links inside `text` fields (doc_pipeline_source.jsx:21877 `<a href='url'>descriptive link text</a>`; 22021 "LINKS: Preserve ALL hyperlinks as <a href='URL'>text</a> inside text fields"). `escapeTextField` escapes everything and then re-allows ONLY attribute-less inline tags — `a` is not on the list. Verified by running the function: `See the <strong>full</strong> <a href='https://x.org/a.pdf'>2024 Annual Report</a>` renders as `See the <strong>full</strong> <a href='https://x.org/a.pdf'>2024 Annual Report</a>` — i.e. the student sees raw markup in the body text and the link is gone. Nothing downstream recovers it (no re-linkification exists anywhere in doc_pipeline_source.jsx / view_pdf_audit_source.jsx), and the link-loss net that should catch it is itself inert for PDFs (see the `_computeStructuralFidelityNotes` finding). axe sees no anchors, so the accessibility score stays high while every "Download the 2024 Annual Report" link in a resource handout is destroyed.

**Evidence**

```
doc_builder_renderer_source.jsx:66-73 (module loaded by the pipeline at doc_pipeline_source.jsx:21844 `_rendererModule.createRenderer`)
          const escapeTextField = (val) => {
            const s = String(val == null ? '' : val)
              .replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>')
              .replace(/"/g, '"').replace(/'/g, ''');
            return s
              .replace(/<(\/?(?:strong|em|b|i|u|sub|sup|mark|code|s|small))>/gi, '<$1>')
              .replace(/<br\s*\/?>/gi, '<br>');
          };

The prompt that guarantees the input, doc_pipeline_source.jsx:21877:
- {"type":"p","text":"Full paragraph text with <strong>bold</strong> and <em>italic</em> and <a href='url'>descriptive link text</a>"}

A `safeHref` helper already exists one line below (doc_builder_renderer_source.jsx:75) but is only wired to the `link` BLOCK type, which no prompt asks the model to emit.
```

**Proposed fix**

In `escapeTextField`, after the existing inline-tag re-allow, add a controlled anchor re-allow: match `<a href=("|')(...)\1>` and re-emit `<a href="` + safeHref(decoded) + `">`, plus `</a>` -> `</a>`. Only the href attribute is reconstructed, and it goes through the existing `safeHref` scheme allow-list, so no new injection surface opens.

**Verifier**

Reproduced. doc_builder_renderer_source.jsx:66-73 is verbatim as quoted: escapeTextField escapes & < > " ' then re-allows only `<(\/?(?:strong|em|b|i|u|sub|sup|mark|code|s|small))>` and `<br>` — `a` is absent, and the re-allow requires the tag name immediately followed by >, so even `</a>` stays escaped. The sink is real: renderer:118 `case 'p': return `<p ...>${escapeTextField(block.text)}</p>`` (same for h1-h6/li/blockquote/table cells). Both prompts do demand it: doc_pipeline_source.jsx:21877 `{"type":"p","text":"...<a href='url'>descriptive link text</a>"}` and 22021 `- LINKS: Preserve ALL hyperlinks as <a href='URL'>text</a> inside text fields.` I searched for a recovery pass — grep for `<a` and for anchor re-linkification across doc_pipeline_source.jsx and view_pdf_audit_source.jsx returns nothing; safeHref (renderer:75) is wired only to `case 'link'` (renderer:274), a block type no prompt requests. Downgraded critical->high on one point: the damage is visible (the teacher sees raw `<a href='...'>` text in the body), not wholly silent — but the link itself is destroyed, the axe score is unaffected, and the net that should flag it is inert (see the _computeStructuralFidelityNotes finding), so it still ships a document with unusable references. Same caveat as finding 1 about the renderer file's canonical status.

---

## H10 — `detectAndRepairLegends` DELETES a flagged table's rows when both re-extract calls return null — a Canvas throttle turns score tables into an empty placeholder

- **Severity:** high _(verifier revised from critical)_ · **Verdict:** CONFIRMED · **Dimension:** html-integrity · **Effort:** small
- **Anchor:** `doc_pipeline_source.jsx:7309`

**What breaks**

`_isSuspectExtraction` flags any table with >50% empty cells, or any table with 1-4 headers / <=6 rows / <=16 cells whose caption matches `/\b(legend|key|figure\b)/i` — that regex hits ordinary captions like "Figure 2: WISC-V index scores", "Key accommodations", "Keyword list". The block then goes through `_reextractAsRichTable` and `_reextractAsLegend`; BOTH return null on an empty/throttled Gemini response (`if (!raw) ... return null`, 7235 and 7110), on a parse failure, or on `_validateTableGrid` failure. The `else` branch then pushes an `image` block that carries only the caption — `block.headers` and `block.rows` are discarded outright. A 4x4 subtest-score table becomes a grey placeholder reading "refer to the source PDF image for the full legend". On a long document the 16 lost cells are far under the 3% char-coverage gate at 24061, so the only signal is the WARN-only numeric-fidelity note at 24104 (and nothing at all if the table was text, not numbers).

**Evidence**

```
doc_pipeline_source.jsx:7303-7315
      const replacement = await _reextractAsLegend(block, pdfBase64, pdfMimeType, pageRange, callGeminiVisionFn);
      if (replacement) { out.push(replacement); }
      else {
        if (block.type === 'table') {
          out.push({
            type: 'image',
            description: (block.caption || 'Figure legend') + '. Automatic extraction could not enumerate every entry; refer to the source PDF image for the full legend.',
            alt: block.caption ? String(block.caption).slice(0, 120) : 'Figure legend (full content in source image)'
          });

Trigger, doc_pipeline_source.jsx:7035-7037:
      if (hdrCount >= 1 && hdrCount <= 4 && block.rows.length <= 6 && total <= 16) {
        const cap = String(block.caption || '');
        if (/\b(legend|key|figure\b)/i.test(cap)) return 'small-table-with-legend-caption';

Null-on-throttle, doc_pipeline_source.jsx:7235:
    if (!raw) { _legendDiag({ phase: 'rich-table-empty', pageRange }); return null; }
```

**Proposed fix**

In `detectAndRepairLegends`, never discard source cells: keep the ORIGINAL table block (`out.push(block)`) and, if a downgrade note is wanted, push the explanatory image block as a SIBLING (the same additive pattern already used for `image-structured-panel` at 7288-7289). Separately, distinguish "vision said this is not a legend" from "vision returned nothing" so a throttled empty body never reaches the downgrade branch at all.

**Verifier**

Reproduced. doc_pipeline_source.jsx:7303-7316: after `const replacement = await _reextractAsLegend(...)`, the else branch at 7309-7316 does `out.push({ type: 'image', description: (block.caption || 'Figure legend') + '. Automatic extraction could not enumerate every entry...' })` — block.headers and block.rows are never pushed, so the cells are discarded. Trigger verified at 7035-7037 `if (hdrCount >= 1 && hdrCount <= 4 && block.rows.length <= 6 && total <= 16) { ... if (/\b(legend|key|figure\b)/i.test(cap)) return 'small-table-with-legend-caption'; }` — the leading \b binds the whole alternation and only `figure` carries a trailing \b, so 'Key accommodations', 'Keyword list' and 'Figure 2: WISC-V index scores' all match; the >50%-empty rule above it is a second entry point. Null-on-throttle verified on both helpers: 7235 `if (!raw) { _legendDiag({ phase: 'rich-table-empty', pageRange }); return null; }` and 7110 `if (!raw) { _legendDiag({ phase: 'reextract-empty-response', pageRange }); return null; }`, plus catch-returns-null at 7108/7234. I searched for a caller-side revert and found none: at 21958 the caller only reverts if detectAndRepairLegends THROWS (`catch (legendErr) { _legendRepairedBlocks = blocks; }`), and the chunked caller at 22078 is the same shape — a successful return carrying the downgraded block is accepted. Both call sites are on the live PDF path. Note the additive pattern the finding proposes already exists two branches up (7286-7289, image-structured-panel pushes table AND block). Downgraded critical->high only because it needs a flagged block plus two null vision replies rather than firing on every run; the outcome (a data table replaced by a caption-only placeholder that, per finding 1, never even gets an image) is genuine silent content loss.

---

## H11 — Image crops are index-paired against every paintImageXObject on the page after decorative images were filtered out, so a letterhead logo can be shipped under the figure's alt text

- **Severity:** high · **Verdict:** CONFIRMED · **Dimension:** extraction-fidelity · **Effort:** medium
- **Anchor:** `doc_pipeline_source.jsx:20233`

**What breaks**

A school worksheet with a district logo in the header and one meaningful diagram below it. Vision returns two images and the pipeline drops the logo at 20048 because `type === 'decorative'`, leaving `extractedImages` with just the diagram. But `imagePositions` is built from the raw operator list, which still contains the logo's paintImageXObject, and it is sorted top-to-bottom so the logo is `imagePositions[0]`. `imgOpIdx` starts at 0, so the diagram's entry receives the LOGO's crop rectangle. The student's document then shows the logo with the diagram's alt text and educational-purpose caption — a silently wrong image/description pairing that passes every alt-presence check (axe image-alt, the alt-quality heuristics, and the Vision alt spot-check only samples a couple of images).

**Evidence**

```
20048: `extractedImages = (parsed.images || []).filter(img => img.type !== 'decorative');`
20109-20113 (no decorative filtering on the geometry side): `if (opList.fnArray[opIdx] === OPS.paintImageXObject || opList.fnArray[opIdx] === OPS.paintJpegXObject) { imageOps.push(opList.argsArray[opIdx][0]); }`
20228: `imagePositions.sort((a, b) => a.y - b.y);`
20231-20234: `for (const img of imgs) { ... const pos = imagePositions[imgOpIdx] || imagePositions[0]; imgOpIdx++;`
Nothing correlates `img.position` ("top/middle/bottom", which Vision does return) or the image name with the chosen `pos`.
```

**Proposed fix**

In the crop loop, match each Vision image to a position using its declared `position` band (top/middle/bottom → y-fraction of the page) and its declared size class rather than the bare `imgOpIdx` counter; when the count of XObject positions does not equal the count of `imgs`, refuse the geometric crop and fall through to the existing text-placeholder degradation instead of guessing.

**Verifier**

All anchors verified verbatim: 20048 `extractedImages = (parsed.images || []).filter(img => img.type !== 'decorative');`, 20109-20113 collects paintImageXObject/paintJpegXObject with no decorative filtering, 20228 `imagePositions.sort((a, b) => a.y - b.y);`, and 20231-20234 `for (const img of imgs) { ... const pos = imagePositions[imgOpIdx] || imagePositions[0]; imgOpIdx++;`. The crop is then written to the Vision entry at 20252-20253 `extractedImages[img.idx].generatedSrc = dataUrl;`, whose description flows to the alt at 22514/22563 — so a mismatched pos does ship a different image under this figure's alt text. Nothing in 20207-20259 correlates `img.position` (which Vision is asked for at 20042) or the XObject name with the chosen rectangle. One correction to the finding's framing that does not change the outcome: the loop is per-page (`pageGroups` at 20082-20087) and `imgOpIdx` resets each page, so the mispairing is a same-page mismatch, not a document-wide slide — the finding's own worksheet example (logo and diagram on the same page) is exactly that case. Note also that the 'decorative' filter is only one trigger: the enum at 20042 offers 'logo' separately, so a header logo may well be typed 'logo' and survive the filter; the broader and more common trigger is simply `imagePositions.length !== imgs.length` on a page (extra background/tiled XObjects, or a figure composed of several XObjects). _visionAltSpotCheck (20617, invoked at 24262-24266 with sample 1-2) is a real but sampled, fail-soft, non-blocking net.

---

## H12 — RTL documents lose intra-line reading order in the deterministic text-layer path — the RTL detector exists but is never consulted by the within-line sort

- **Severity:** high · **Verdict:** CONFIRMED · **Dimension:** extraction-fidelity · **Effort:** small
- **Anchor:** `doc_pipeline_source.jsx:2000`

**What breaks**

An Arabic, Hebrew, Farsi or Urdu handout for an ELL student is a born-digital PDF, so it takes the deterministic pdf.js path. `_alloOrderTextItems` sorts items on the same baseline by ascending x unconditionally. For RTL text the pdf.js items on a line are emitted in logical (right-to-left, i.e. descending x) order, so ascending-x sorting reverses the run order within every line: a line rendered as three text runs comes out with its phrases in reverse. The RTL detector at 2068-2075 is computed only AFTER the single-column early return, and even when it does run it is used solely to order whole columns (2081), never `_legacy`. The damage is invisible to every net in the pipeline — the character count, `_numericFidelityLosses`, and the autoRestore word-set comparison are all count/set based, so a pure reordering scores as 100% fidelity, and `_applyDetectedLang` will happily add `dir="rtl"` and report the lang check as a PASS on scrambled text.

**Evidence**

```
1996-2002: `var _legacy = function (arr) { return arr.slice().sort(function (a, b) { var ay = _y(a), by = _y(b); if (Math.abs(ay - by) > 2) return by - ay; return _x(a) - _x(b); }); };`
2058-2060 (single-column early return, reached BEFORE `_rtl` is ever computed): `if (res.cols.length <= 1) { var _single = { items: _legacy(items || []), columns: 1, gutters: [], applied: false }; return _single; }`
2068-2075 computes `_rtl`, and its only use is the column comparator at 2081: `return _rtl ? bx - ax : ax - bx;`
2084 (multi-column path still uses the LTR intra-column sort): `for (var c = 0; c < colsOrdered.length; c++) out = out.concat(_legacy(colsOrdered[c]));`
Caller: 9461-9464 `const _ordered = _alloOrderTextItems(tc.items || [], {}); ... const pageText = items.map(i => i.str || '').join(' ')...`
```

**Proposed fix**

Hoist the `_rtl` detection above the `res.cols.length <= 1` early return and thread it into `_legacy` as a parameter (`return rtl ? _x(b) - _x(a) : _x(a) - _x(b);`), so both the single-column return at 2059 and the per-column concat at 2084 assemble RTL lines in logical order. `_alloColumnReorderOcrText` (2103) inherits the fix through the same helper.

**Verifier**

Every line anchor is exact. 1996-2002 `_legacy` sorts `return _x(a) - _x(b);` on the same baseline with no direction parameter. 2057-2061 is the single-column early return `if (res.cols.length <= 1) { var _single = { items: _legacy(items || []), ... }; return _single; }`, which executes BEFORE `_rtl` is computed at 2068-2075, so on a single-column RTL page the detector never runs at all. Its only consumer is the column comparator at 2081 `return _rtl ? bx - ax : ax - bx;`, and the multi-column path still calls the unmodified `_legacy` per column at 2084. The caller at 9461-9464 passes `{}` for opts and joins `items.map(i => i.str || '')` — I searched the whole file for `.dir` / `rtl` and found no consultation of pdf.js's per-item `dir` anywhere in extraction; the only other RTL handling is cosmetic (`dir="rtl"` on <html> at 6241 and 20889-20922). I also checked the one order-sensitive net: readingOrderSequenceRatio is used only at 29266 comparing `_origText` to `_shipText`, both re-extracted through the same ordering helper, so a consistently reversed source scores ~1 and cannot flag this. Caveat on impact, not on the code defect: the magnitude depends on pdf.js's item emission for RTL runs (external to this repo) and on how often a line is split into multiple text items — a line emitted as one item is unaffected. The code claim (RTL detection exists but is not threaded into the within-line sort, and is unreachable entirely on single-column pages) is fully substantiated.

---

## H13 — Gemini Vision's truncation sentinel is accepted as chunk content, so a truncated extraction becomes the authoritative ground truth and coverage still reports 100%

- **Severity:** high · **Verdict:** CONFIRMED · **Dimension:** extraction-fidelity · **Effort:** small
- **Anchor:** `doc_pipeline_source.jsx:21357`

**What breaks**

`callGeminiVision` does not throw when a response is truncated — on a JSON-truncated body it returns the recovered partial plus a note, and on `finishReason === 'MAX_TOKENS'` it returns ONLY the note (the `if (!text)` guard means `partial` is necessarily empty there). The pipeline has no knowledge of that sentinel: the chunk is non-empty so it survives `if (!chunk || !chunk.trim())`, is page-split, joined into `extractedText`, and becomes `window.__lastGroundTruthCharCount`. A 40-page scan where three chunks truncate silently loses most of six pages, the note text "[Note: Document was partially extracted…]" is handed to the Step-2 transform as document content (and typically renders in the output), and because the coverage/integrity denominator IS the truncated text, the run reports complete coverage and a clean score.

**Evidence**

```
gemini_api_source.jsx:782: `return partial + '\n\n[Note: Document was partially extracted. Some content may be missing due to document size.]';` and 792: `return partial + '\n\n[Note: Document was partially extracted due to length. Some content may be missing.]';`
doc_pipeline_source.jsx:21357: `if (!chunk || !chunk.trim()) return '';` — the only emptiness test; the sentinel passes it.
21536-21538: `if (extractedText && !window.__lastGroundTruthCharCount) { window.__lastGroundTruthCharCount = extractedText.length; ... }`
A repo-wide grep for "partially extracted" matches only the two producer lines in gemini_api_source.jsx — no consumer anywhere strips, detects, or flags it.
```

**Proposed fix**

Have `callGeminiVision` return a structured `{ text, truncated: true }` (or set a well-known marker the caller checks for), and in both chunk-processing maps (21356-21369 and 21523-21532) detect it: strip the note from the text and push a `pageErrors` entry for the chunk's pages so the partial-extraction banner fires and the OCR-evidence write is refused.

**Verifier**

gemini_api_source.jsx:782 and 792 are verbatim as quoted, and the sub-claim about 792 is right: it sits inside `if (!text)` at 788, and `partial` is re-read from the same falsy path (`data.candidates?.[0]?.content?.parts?.[0]?.text || ''`), so a MAX_TOKENS chunk returns ONLY the note string. Neither producer throws. On the pipeline side, doc_pipeline_source.jsx:21357 `if (!chunk || !chunk.trim()) return '';` is the only emptiness test in the scanned path (and 21524 in the generic path) — a ~90-char sentinel passes both, is then equal-char page-split at 21389-21395 into the run's per-page map, joined at 21399, and becomes __lastGroundTruthCharCount at 21536-21538. I re-ran the repo-wide grep for 'partially extracted' across *.jsx: it returns only the two producer lines in gemini_api_source.jsx — zero consumers, so nothing strips, detects, or flags it, and the coverage denominator at 24045-24059 is the truncated text itself. Because the sentinel is non-empty, the run also has no pageErrors and (per finding 1's machinery) can bank the truncated evidence. Severity high is honest: reachability depends on how often a 2-page chunk truncates at maxOutputTokens 65536 (gemini_api_source.jsx:739) versus how often the Canvas proxy returns a JSON-truncated body, and the latter is a documented behavior here.

---

## H14 — Partial-range runs extract images from the WHOLE document and pair them to placeholders positionally, overwriting each figure's correct caption with another page's description

- **Severity:** high _(verifier revised from critical)_ · **Verdict:** CONFIRMED · **Dimension:** extraction-fidelity · **Effort:** medium
- **Anchor:** `doc_pipeline_source.jsx:22511`

**What breaks**

Multi-session remediation of pages 11-20 of a 20-page science packet. `_extractPdfImages` is called with no page range and asks Vision for "ALL images from this PDF document", so `extractedImages` is ordered over pages 1-20. The body being remediated only contains the `[Image: …]` markers Vision emitted for pages 11-20, so the placeholder `<figure>`s in `bodyContent` correspond to the range's figures. The splice pairs them by ordinal: the first placeholder in the range's body receives `extractedImages[0]` — a page-1 image and a page-1 description. Because `desc` prefers `imgInfo.description` over the figure's own caption text, the CORRECT in-context description is discarded and replaced by the wrong one, and that wrong string is written into the `alt` attribute the screen-reader user hears (22563). The same off-by-N happens on full-document runs whenever Vision's image count differs from the number of `[Image: …]` markers the text extraction produced.

**Evidence**

```
21654: `const _imgOut = await _extractPdfImages({ base64: _base64, mimeType: _mimeType, silentMode: _silentMode, updateProgress, signal: _runAbortSignal, shouldAbort: _runGenStale });` — no `pageRange` is passed, and `_extractPdfImages` (19985) has no range parameter.
20042: `Identify and extract ALL images from this PDF document.`
22511-22516: `const imgInfo = extractedImages[imgIdx] || null; imgIdx++; ... const desc = imgInfo ? imgInfo.description : altText;`
22563: `<img src="${srcToken}" alt="${desc.replace(/"/g, '"')}" ...>`
Nothing between 22484 and 22582 compares `imgInfo.page` to the placeholder's page or to `_pageRange`.
```

**Proposed fix**

Pass `_pageRange` into `_extractPdfImages` and filter `parsed.images` to `img.page` inside the range before cropping; then replace the ordinal pairing at 22511 with a match on the figcaption text (or an explicit `data-img-page`/index the transform prompt is told to emit), and fall back to the figure's own caption (`altText`) rather than a positionally-guessed `imgInfo.description` when no confident match exists.

**Verifier**

All cited anchors are exact. 21654 is verbatim `const _imgOut = await _extractPdfImages({ base64: _base64, mimeType: _mimeType, silentMode: _silentMode, updateProgress, signal: _runAbortSignal, shouldAbort: _runGenStale });` — no pageRange — and _extractPdfImages (19985-19995) destructures only base64/mimeType/silentMode/updateProgress/signal/shouldAbort, so it has no range parameter to honor. The prompt at 20042 is verbatim 'Identify and extract ALL images from this PDF document.' The splice at 22511-22516 is verbatim `const imgInfo = extractedImages[imgIdx] || null; imgIdx++; ... const desc = imgInfo ? imgInfo.description : altText;` and 22563 writes `alt="${desc.replace(/"/g, '"')}"`. I read 22484-22582 in full: nothing compares imgInfo.page against the placeholder or against _pageRange. I also verified the premise that the placeholder count is range-scoped rather than image-array-scoped — the `<figure data-img-placeholder="true">` markers are emitted by renderJsonToHtml (doc_builder_renderer_source.jsx:259) from the AI's JSON for the extracted text, and on a range run extractedText contains only the range's pages (20428-20439), so the placeholders correspond to range figures while extractedImages spans pages 1..N. Downgraded from critical to high because the mispairing is visible in the preview alongside the figcaption, the image-review panel lets the teacher correct alt text, and _visionAltSpotCheck (20617, called at 24262 with sample 2 for single-file runs) is a partial net that can catch it on low-image documents.

---

## H15 — Throttle waits inside a fix pass are never budgeted against the batch per-file wall, so a throttled file blows the 8-minute `_withTimeout` and its completed passes are discarded

- **Severity:** high · **Verdict:** CONFIRMED · **Dimension:** throttle-gate · **Effort:** medium
- **Anchor:** `doc_pipeline_source.jsx:19664`

**What breaks**

Batch of 12 IEP handouts. File 7 hits a Canvas throttle in pass 3. The pass-loop deadline guard reserves only 90 seconds, then hands control to machinery that has no idea a wall exists: `aiFixChunked` can spend 2 × 90s of calm waits in the single-chunk path (:6669) plus 2 × 90s in the catch-up drain (:6826), and the drain then re-fixes each deferred chunk SERIALLY at cap 1 with a 180s per-call timeout (:5048, :6832-6837); then the loop's verify wait adds another 120s (:19803). One pass entered at deadline−91s can therefore run for many minutes past the wall. `_withTimeout(_fixPromise, _remainingMs())` at :14140 then rejects, `_fileCtrl.abort()` kills the run, and the H7 keep-best design — "end the pass loop BEFORE the wall so keep-best work ships instead of being discarded" — is defeated: every completed pass on that file is thrown away, the file is marked FAILED, and the retry pass at :14267 pays the full 8 minutes again against the same rate limit.

**Evidence**

```
The only deadline awareness in the loop, `_runMainFixLoop` (19664-19667):
```
          if (loopCtx.perFileDeadlineTs && Date.now() > loopCtx.perFileDeadlineTs - 90000) {
            warnLog('[Auto-fix] Per-file time budget nearly exhausted (batch wall) — ending the fix loop after ' + fixPass + ' pass(es) ...');
            break;
          }
```
The waits inside the pass, all fixed constants with no deadline term:
- 19774: `waitForGeminiCalm({ maxWaitMs: 120000, shouldAbort: _shouldAbort, signal: _controlSignal, owner: _controlOwner })`
- 19803: `waitForGeminiCalm({ maxWaitMs: 120000, ... })`
- 6669 / 6826 (inside `aiFixChunked`): `waitForGeminiCalm({ maxWaitMs: 90000, shouldAbort: _control && _control.shouldAbort, ... })`
`aiFixChunked` is invoked at 19713 with `{ shouldAbort, signal, owner, onThrottleDeferred }` — `perFileDeadlineTs` is never threaded in, and the catch-up drain loop at 6819 (`for (let _round = 0; _round < 2 && _todo.length; _round++)`) has no wall-clock check at all.
The wall it must fit inside, `_processOne` (14076-14078, 14140):
```
      const _PER_FILE_MS = 8 * 60 * 1000;
      const _deadlineAt = Date.now() + _PER_FILE_MS;
...
          result = await _withTimeout(_fixPromise, _remainingMs(), 'batch fix: ' + item.fileName);
```
The correct pattern already exists 3800 lines later for the deferred re-audit (23653-23659), which clamps its wait to `Math.max(0, _deferHardStop - Date.now())` and additionally `_withTimeout`-wraps it, with the comment "could otherwise overshoot a batch file's wall by minutes and get a FINISHED remediation discarded by the outer Promise.race (the R5 class, re-opened)."
```

**Proposed fix**

Thread `perFileDeadlineTs` through `loopCtx` into `aiFixChunked`'s `_control`, and clamp every `waitForGeminiCalm` call in the pass path the way :23653 already does: `maxWaitMs: Math.max(0, Math.min(120000, perFileDeadlineTs - 30000 - Date.now()))` at 19774/19803 and `Math.min(90000, ...)` at 6669/6826. Add the same wall check at the top of the catch-up-drain round loop (6819) and before each serial `_fixOneChunk` revisit (6832) so a drain that can no longer fit inside the budget ships the originals instead of overshooting.

**Verifier**

Every anchor checks out. :19664-19667 is verbatim: `if (loopCtx.perFileDeadlineTs && Date.now() > loopCtx.perFileDeadlineTs - 90000) { warnLog('[Auto-fix] Per-file time budget nearly exhausted (batch wall) ...'); break; }` — a 90s reserve checked only at PASS ENTRY. Grepping the deadline shows it exists at exactly :14136 (batch passes it in), :19664, :23613 and :23628 (deferred re-audit budget). It is threaded into `_runMainFixLoop` at :23317 but NOT into `aiFixChunked`: the call at :19713-19718 passes only `{ shouldAbort, signal, owner, onThrottleDeferred }`, and `aiFixChunked`'s `_control` consumers (:6571-6581) read nothing else. The unbudgeted waits are as cited — :6669 and :6826 `maxWaitMs: 90000`, :19774 and :19803 `maxWaitMs: 120000` — all fixed constants. The drain at :6819 `for (let _round = 0; _round < 2 && _todo.length; _round++)` has no wall-clock check, and its serial revisit (:6832-6837 `_again.push({ ci: ci, out: await _fixOneChunk(chunks[ci], ci) })`) re-fixes each deferred chunk through `callGemini`, whose per-attempt timeout is 180000ms (:5048). A pass entered at deadline−91s can therefore run minutes past the wall. The wall is hard: :14076-14078 `const _PER_FILE_MS = 8 * 60 * 1000; const _deadlineAt = Date.now() + _PER_FILE_MS;` and :14140 `result = await _withTimeout(_fixPromise, _remainingMs(), 'batch fix: ' + item.fileName)`. On rejection :14146 aborts `_fileCtrl` and rethrows, :14204 marks the file `status: 'failed'`, and the retry pass at :14265-14275 re-enters `_processOne`, which recomputes a fresh full 8-minute `_deadlineAt` at :14077. Keep-best HTML from completed passes is discarded because the result never returns. No guard two frames up — the loop's `_shouldAbort` is the run-generation/signal check, not a deadline. The correct clamp exists at :23653-23659 (`maxWaitMs: Math.max(0, _deferHardStop - Date.now())` plus a `_withTimeout` wrapper) carrying the exact R5 comment quoted. Batch-only, which is production. High stands: lost remediation work plus a doubled quota spend against the same rate limit.

---

## H16 — The batch runner calls the raw fixAndVerifyPdf, bypassing _wrapFixAndVerify — so the new isRemediationRunning() busy probe reports "idle" for the entire batch

- **Severity:** high · **Verdict:** CONFIRMED · **Dimension:** failure-recovery · **Effort:** medium
- **Anchor:** `doc_pipeline_source.jsx:14125`

**What breaks**

Only the EXPORT is wrapped (`fixAndVerifyPdf: _wrapFixAndVerify(fixAndVerifyPdf)` at 37833); the batch loop resolves the closure-local `const fixAndVerifyPdf` declared at 20684 and never acquires `_activeSingleFixPromise`. Consequences: (1) `_isRemediationRunning()` returns false for the full 8-minutes-per-file batch, and batch runs skip `setPdfFixLoading(true)` (gated on `!_silentMode` at 20838), so the view's `_remediationBusy = pdfFixLoading || pipelineRunActive` (view_pdf_audit_source.jsx:3330) is false throughout — the single-file "Fix & Verify" (view:9031) and "Make Accessible" (view:6880) buttons stay armed over a live batch. (2) Starting one is not blocked by the lock either, so two runs execute concurrently over `_pipelineStats`, which is a single module-level global re-pointed at run entry (20775 `const _runStats = _pipelineStats = {...}`): `callGemini`/`callGeminiVision` read it at call time (5038, 5142), so the single-file run's API calls, retries and `runId`/`documentEpoch` on every `_pipeLog`/watchdog heartbeat get stamped with the batch file's identity — and the single-file 8-min watchdog drops heartbeats whose `detail.runId !== watchdogRunId` (AlloFlowANTI.txt:18777), so it can fire on a run that is demonstrably alive. The batch's own per-file `finally` also resets the shared `window.__lastGroundTruth*`/`__lastOcr*` globals mid-flight under the concurrent run (14237-14240).

**Evidence**

```
20684: `const fixAndVerifyPdf = async (batchOverrides = null) => {` — the only declaration in the file (grep confirms no shadowing).
14125: `const _fixPromise = fixAndVerifyPdf({ documentEpoch: owner.documentEpoch, base64: item.base64, ... onProgress: (step, msg) => progress(msg), ... });`
37833: `fixAndVerifyPdf: _wrapFixAndVerify(fixAndVerifyPdf),`
37695-37698: `var _getActiveRemediationRun = function() { if (!_activeSingleFixPromise || _activeRemediationManaged) return null; ...` — `_activeSingleFixPromise` is set only inside `_wrapFixAndVerify` (37743).
20775: `const _runStats = _pipelineStats = { apiCalls: 0, ... runId: _runId, documentEpoch: _runDocumentEpoch, ... };`
5038: `var _callStats = _pipelineStats;`
```

**Proposed fix**

Have `_runPdfBatchRemediationOwned` call the wrapped entry point (hoist the wrapped function to a `_fixAndVerifyPdfGuarded` const built once at factory time and use it at 14125 and 14719) so batch files take the lock with `_activeRemediationManaged = true`. That preserves the intended "managed batches report false to the single-file UI" behavior for the probe while still rejecting a concurrent single-file start with `RemediationAlreadyRunningError`. Separately, give each run its own stats object rather than re-pointing the `_pipelineStats` module global.

**Verifier**

The mechanical claims all hold: `const fixAndVerifyPdf = async (batchOverrides = null) =>` at doc_pipeline_source.jsx:20684 is the sole declaration (grep of the whole file shows no shadow/reassignment); 14125 and 14719 call it raw; only the export at 37833 is `_wrapFixAndVerify(fixAndVerifyPdf)`, and `runPdfBatchRemediation` is exported via `_wrapAsync` (37900), not the lock wrapper. `_activeSingleFixPromise` is assigned only inside `_wrapFixAndVerify` (37743/37751), so the batch never takes it. `_pipelineStats` is a module-level var (4114) re-pointed at 20775 (`const _runStats = _pipelineStats = {...}`) and read at call time with no owner override at 5038 and 5142, confirming cross-run stamping of runId/documentEpoch on `_pipeLog` entries (4197-4203) and the watchdog heartbeat detail (4217). BUT one stated consequence must be corrected: consequence (1) is by design, not a bug — 37689-37690 says explicitly 'Managed batches report false on purpose: the batch runner owns its own progress UI and must not disable the single-file controls', and `_getActiveRemediationRun` returns null whenever `_activeRemediationManaged` is true (37696), so routing the batch through the wrapper as the fix proposes would produce the IDENTICAL probe answer. The substantive defect is consequence (2), and it is reachable: I confirmed `pipelineRunActive` derives solely from `_docPipeline.isRemediationRunning()` (view 3300-3328) and `setPdfFixLoading(true)` is skipped for silent runs (20838), so `_remediationBusy` (view 3330) is false throughout a batch; the mode toggle 'Single PDF' at view 5973 has no `disabled` on `pdfBatchProcessing`, and Fix & Verify at 9031 is gated only on `_remediationBusy || remediationReady === false`. Starting one concurrently is not rejected because 37731 sees a null lock. Beyond the stats aliasing, the concurrent single-file run overwrites `window.__alloPdfAbortSignal` at 20859 (the slot the batch file published at 14114), and its finally aborts that controller at 24987 — so a batch file's ambient-signal Gemini calls (captured at enqueue, 4936) can be cancelled by an unrelated run. Severity high stands on the concurrency half, not on the probe half.

---

## H17 — A companion operation cancels a pdfFixLoading-owning ticket that has no cancelUi, stranding the busy flag permanently

- **Severity:** high · **Verdict:** CONFIRMED · **Dimension:** run-lifecycle · **Effort:** small
- **Anchor:** `view_pdf_audit_source.jsx:3213`

**What breaks**

'Additional Sweep' and 'Fix Remaining' each open a ticket with `ownsPdfFixLoading` defaulted to true and NO `cancelUi`, then call `setPdfFixLoading(true)` themselves. The companion buttons — Translate, Plain Language, Glossary, Easy-Read summary — are disabled only on their own busy flags (e.g. `disabled={pdfTranslateBusy}` at L14742), never on `_remediationBusy`. So a teacher can click Translate while a sweep is mid-flight. `_beginRemediationOperation` calls `owner.begin(...)`, which calls `cancel()`: `current = null; generation += 1;` and aborts the sweep's controller. `_releaseRemediationOperationUi(previous)` then does nothing because the sweep ticket carries no `cancelUi`. When the sweep's `finally { _finishPdfRemediationOperation(_sweepOperation, true) }` runs, `_completeRemediationOperation` fails `isCurrent()` and returns false, so `_finishPdfRemediationOperation` returns at its first line and NEVER reaches `setPdfFixLoading(false)`. The translation finishes through `_completeRemediationOperation` and only clears `pdfTranslateBusy`. `pdfFixLoading` is now stuck true with no run behind it; the 8-min watchdog cannot clear it because `window.__alloActivePdfRemediation` is null for view-owned operations, so `superseded` short-circuits. Every remediation control in the results panel stays disabled and a spinner shows a frozen step until the teacher closes the modal.

**Evidence**

```
view_pdf_audit_source.jsx:3212-3225
```
  const _finishPdfRemediationOperation = (ticket, clearMode) => {
    if (!_completeRemediationOperation(ticket)) return false;
    ...
    if (!ticket || !ticket.metadata || ticket.metadata.ownsPdfFixLoading !== false) {
      setPdfFixLoading(false);
      setPdfFixStep('');
    }
```
view_pdf_audit_source.jsx:117-124 `const cancel = (ticket) => { ... current = null; generation += 1; try { if (owned && owned.controller) owned.controller.abort(); } catch (_) {} return !!owned; };`
view_pdf_audit_source.jsx:3151-3158 `_releaseRemediationOperationUi` only invokes `ticket.metadata.cancelUi`; `_beginRemediationOperation` calls it on the previous ticket.
view_pdf_audit_source.jsx:8747,8750,8784 sweep: `_beginRemediationOperation('additional-sweep')` (no metadata, no cancelUi) → `setPdfFixLoading(true)` → `finally { _finishPdfRemediationOperation(_sweepOperation, true); }`
view_pdf_audit_source.jsx:8790,8793,9014 same shape for 'fix-remaining'
view_pdf_audit_source.jsx:14742 `<button disabled={pdfTranslateBusy} onClick={...}` then 14746 `_beginRemediationOperation('translate-companion', false, {...})`
AlloFlowANTI.txt:18730-18743 the pdfFixLoading watchdog bails when `!liveOwner` (`window.__alloActivePdfRemediation`), which is null for all view-owned operations.
```

**Proposed fix**

Make the flag-owning tickets self-releasing rather than relying on the completion path. Give every `_beginRemediationOperation(kind)` call that owns pdfFixLoading an explicit `cancelUi: () => { setPdfFixLoading(false); setPdfFixStep(''); }` (sites at view_pdf_audit_source.jsx:5261, 5288, 8747, 8790), OR — better, one place — have `_beginRemediationOperation` synthesize that cancelUi automatically whenever `ownsPdfFixLoading !== false` and the caller supplied none. Separately, gate the companion buttons (translate/plain/glossary/easy-read) on `_remediationBusy` so they cannot pre-empt a fix operation at all.

**Verifier**

Reproduced line by line. view_pdf_audit_source.jsx:8747 `_beginRemediationOperation('additional-sweep')` passes no metadata, so 3162 `ownsPdfFixLoading: ownsPdfFixLoading !== false` → true and `metadata.cancelUi` is undefined; 8750 then calls `setPdfFixLoading(true)`; 8785 is `disabled={pdfFixLoading}` (not `_remediationBusy`); 8784 `finally { _finishPdfRemediationOperation(_sweepOperation, true); }`. 'fix-remaining' at 8790/8793 is the same shape. The translate button at 14742 is `disabled={pdfTranslateBusy}` only and 14746 calls `_beginRemediationOperation('translate-companion', false, { sourceHtml, cancelUi })`. `_beginRemediationOperation` (3156-3164) calls `_releaseRemediationOperationUi(previous)` (3151-3155) which is a no-op for a ticket without cancelUi, then `begin()` → `cancel()` (117-124) `current = null; generation += 1;` + `controller.abort()`. The sweep's `_finishPdfRemediationOperation` (3212-3225) returns at its first line because `complete()` (134-139) fails `isCurrent()` (112-116, both `current === ticket` and the aborted-signal test fail), so 3220 `setPdfFixLoading(false)` is never reached. The translate finally at 14784 clears only pdfTranslateBusy. No watchdog rescue: same `!liveOwner` short-circuit at AlloFlowANTI.txt:18730-18743, since `window.__alloActivePdfRemediation` is written only by fixAndVerifyPdf (doc_pipeline_source.jsx:20800). Same correction as the previous finding: the escape is worse than stated — with pdfFixLoading pinned true, `_modalWorkBusy` (view 5909) disables the close button (5958), Escape (5932) and backdrop close (5927), so the modal cannot be closed at all. The same stranding also occurs via the effect cleanup at 3277-3284 (`cancelOwnedOperation` on epoch change/unmount). High stands.

---

## H18 — Auto-continue dead-man switch clears pdfAutoContinueRunning but not pdfFixLoading, and the pdfFixLoading watchdog cannot fire on view/loop-owned work

- **Severity:** high · **Verdict:** CONFIRMED · **Dimension:** run-lifecycle · **Effort:** small
- **Anchor:** `AlloFlowANTI.txt:19772`

**What breaks**

After Fix & Verify completes, the auto-continue loop runs and sets `setPdfFixLoading(true)` on every round (misc_handlers_source.jsx:1286). If the loop goes 12 silent minutes on an unchanged step, the auto-continue watchdog fires: it sets `pdfAutoContinueAbortRef`, aborts the controller, NULLS `pdfAutoContinueAbortCtrlRef.current`, and calls `setPdfAutoContinueRunning(false)` — but never `setPdfFixLoading(false)`. When the loop then unwinds, its finally computes `_ownsExit = pdfAutoContinueAbortCtrlRef.current === _abortCtrl` — now false because the watchdog nulled it — and `_staleAtExit` is false (the auto-continue watchdog does NOT bump `__alloPdfRunGen`, unlike the 8-min one), so it takes neither branch and skips `setPdfFixLoading(false)`. The 8-minute pdfFixLoading watchdog cannot rescue it either: its `fire()` requires `window.__alloActivePdfRemediation` to be a live matching owner, and that slot is only ever written by `fixAndVerifyPdf` and nulled in its finally (doc_pipeline_source.jsx:20800 / 24995) — during auto-continue it is null, so `superseded` is true and the watchdog returns without clearing. Result: `pdfFixLoading` is stuck true forever. The teacher is told 'Auto-continue appeared stuck and was reset — your latest result is kept', but `_remediationBusy` stays true, so Fix & Verify, Fix Remaining, Additional Sweep, Re-OCR and 'Complete final audit' are all permanently disabled, and a fake progress bar renders over a stale step string. The only escape is closing the modal.

**Evidence**

```
AlloFlowANTI.txt:19767-19773
```
      if (pdfFixStep === stepAtStart) {
        warnLog('[PdfFix] Dead-man switch fired: pdfAutoContinueRunning stuck ...');
        try { pdfAutoContinueAbortRef.current = true; } catch (_) {}
        try { watchdogAbortCtrl.abort(); } catch (_) {}
        if (pdfAutoContinueAbortCtrlRef.current === watchdogAbortCtrl) pdfAutoContinueAbortCtrlRef.current = null;
        setPdfAutoContinueRunning(false);
```
misc_handlers_source.jsx:1502-1514 `const _staleAtExit = _genStale(); const _ownsExit = pdfAutoContinueAbortCtrlRef.current === _abortCtrl; if (!_staleAtExit && _ownsExit) { setPdfFixLoading(false); setPdfFixStep(''); } else if (_staleAtExit) { warnLog(...) }`
misc_handlers_source.jsx:1286 `if (_canPublish()) setPdfFixLoading(true);`
AlloFlowANTI.txt:18730-18743 `const liveOwner = (typeof window !== 'undefined' && window.__alloActivePdfRemediation) || null; const superseded = ... || !liveOwner || ...; if (superseded) { warnLog('[PdfFix] Ignoring superseded remediation watchdog timeout...'); return; }`
doc_pipeline_source.jsx:24992-24996 (the only writer of that slot clears it on exit)
```

**Proposed fix**

Two changes. (a) In the auto-continue watchdog `fire()` (AlloFlowANTI.txt:19768-19773), clear the flags it actually stranded: add `setPdfFixLoading(false); setPdfFixStep('');` alongside `setPdfAutoContinueRunning(false)`, mirroring the 8-min watchdog at 18766-18767. (b) In `runAutoFixLoop`'s finally, track whether this loop ever wrote `setPdfFixLoading(true)` (a local `let _tookLoadingFlag = false` set at line 1286) and clear it on any exit where no *newer* owner exists — i.e. when `!_staleAtExit`, regardless of `_ownsExit`, since a vacant controller slot means nobody else claimed the flag.

**Verifier**

Every link verified. AlloFlowANTI.txt:19767-19773 is quoted correctly: fire() sets `pdfAutoContinueAbortRef.current = true`, aborts, `if (pdfAutoContinueAbortCtrlRef.current === watchdogAbortCtrl) pdfAutoContinueAbortCtrlRef.current = null;`, `setPdfAutoContinueRunning(false)` — and no setPdfFixLoading. `watchdogAbortCtrl` is captured at 19741 from the same ref the loop wrote at misc_handlers_source.jsx:1204 (`pdfAutoContinueAbortCtrlRef.current = _abortCtrl`) before `setPdfAutoContinueRunning(true)` at 1229, so the null-out does hit. In the loop's finally, `_genStale` is misc_handlers_source.jsx:1216 `() => (window.__alloPdfRunGen || 0) !== _myRunGen` — signal-independent, and the 12-min watchdog never bumps that counter, so `_staleAtExit` is false; `_ownsExit` (1503) is false because the ref was nulled; 1509-1514 therefore takes NEITHER branch and pdfFixLoading is never cleared. The rescue path is genuinely dead: grep shows `window.__alloActivePdfRemediation` is written ONLY at doc_pipeline_source.jsx:20800 and nulled at 24995, so during auto-continue it is null and AlloFlowANTI.txt:18730-18743 short-circuits on `!liveOwner` (and on `!watchdogRunId`, since 18712-18716 reads the same null slot with no `__alloRemediationProgress` fallback — unlike 19735-19736). The only writers of setPdfFixLoading(false) in the host are 18766 (that dead watchdog), 19153 (_closePdfAuditModal), 19199 (startNewPdfAudit), 19948. One correction that makes this WORSE, not better: the finding says 'the only escape is closing the modal', but view_pdf_audit_source.jsx:5909 `_modalWorkBusy = ... || _remediationBusy || ...` disables the close button (5958), the Escape handler (5932) and the backdrop click (5927); Start New Audit is disabled at 10909. With pdfFixLoading pinned true the modal is a trap requiring a page reload / Canvas re-paste. High stands (arguably critical).

---

## H19 — Watchdog-cancelled remediation returns before the resumable-project capture, discarding the banked OCR/extraction

- **Severity:** high · **Verdict:** CONFIRMED · **Dimension:** run-lifecycle · **Effort:** small
- **Anchor:** `doc_pipeline_source.jsx:24916`

**What breaks**

A 40-page scanned IEP/handout finishes Step 1 (5 Vision OCR passes + Tesseract, several minutes) and then stalls in Step 2/4 under a Canvas rate-limit storm. At 8 minutes of pipeline silence the host dead-man switch (AlloFlowANTI.txt:18726 `fire`) bumps `__alloPdfRunGen` and calls `window.__alloPdfFixAbortCtrl.abort()`. The in-flight Gemini call rejects with an AbortError, which reaches the pipeline catch. `_runWasCancelled` is true (both because `err.name === 'AbortError'` and because `_runGenStale()` is true), so the function returns null at L24919 — ABOVE the resumable-incomplete-project capture at L24927. `window.__lastIncompleteProject` was nulled at run start (L21024) and is never refilled, so the host wrapper `_maybeSaveIncompleteProject` (AlloFlowANTI.txt:25594) finds nothing and writes no .alloflow.json. The teacher sees only 'PDF fix appears stuck — reset' and has to re-OCR the whole document from scratch. The watchdog is the single most likely way a long scanned run dies, and it is precisely the case the 2026-06-20 resumable feature was built for. Before the cancellation branch was added, the same run reached the capture and only the *UI writes* were suppressed by the `_runGenStale()` guard at L24959.

**Evidence**

```
doc_pipeline_source.jsx:24889 `const _runWasCancelled = !!((err && (err.name === 'AbortError' || err.isAbort || err.code === 'ALLO_REMEDIATION_CANCELLED')) || _runGenStale());`
doc_pipeline_source.jsx:24914-24920
```
      // Cancellation is an ownership outcome, not a failed remediation. Branch before
      // resumable capture so a stale run cannot overwrite the current run's recovery slot.
      if (_runWasCancelled) {
        if (_silentMode) throw err;
        warnLog('[PDF Fix] Stale run failed ... — suppressing failure history, recovery capture, UI writes, and toast.');
        return null;
      }
```
doc_pipeline_source.jsx:24927-24935 (never reached) `if (!_silentMode && typeof extractedText === 'string' && extractedText.trim().length >= 50) { ... window.__lastIncompleteProject = { incomplete: true, extractedText, base64: _base64, ... }`
doc_pipeline_source.jsx:21024 `window.__lastIncompleteProject = null;` (reset at run start)
AlloFlowANTI.txt:18755 (watchdog) `window.__alloPdfRunGen = (window.__alloPdfRunGen || 0) + 1;` and 18761 `window.__alloPdfFixAbortCtrl.abort();`
```

**Proposed fix**

In `fixAndVerifyPdf`'s catch, split the two concerns the cancellation branch currently merges. Move the resumable capture (L24927-24952) ABOVE the `if (_runWasCancelled)` block, and gate it on ownership of the recovery slot rather than on cancellation: capture only when this run still owns the document epoch (`_readCurrentDocumentEpoch() === _runDocumentEpoch`), which is exactly the condition the original comment ('a stale run cannot overwrite the current run's recovery slot') was trying to express. A watchdog-killed run still owns its own document, so it banks its text; a run superseded by a NEW document does not.

**Verifier**

Anchors are exact. doc_pipeline_source.jsx:24889 `const _runWasCancelled = !!((err && (err.name === 'AbortError' || err.isAbort || err.code === 'ALLO_REMEDIATION_CANCELLED')) || _runGenStale());`; the cancel branch at 24916-24920 `if (_runWasCancelled) { if (_silentMode) throw err; warnLog(...); return null; }` sits ABOVE the resumable capture at 24927-24952 (`window.__lastIncompleteProject = {...}` at 24935). The reset at 21024 `window.__lastIncompleteProject = null;` is real. Reachability verified: `_runGenStale` (20864-20865) is true when either `_runAbortSignal.aborted` OR `window.__alloPdfRunGen !== _myRunGen`, and the 8-min dead-man switch does BOTH — AlloFlowANTI.txt:18755 bumps `__alloPdfRunGen` and 18761 calls `window.__alloPdfFixAbortCtrl.abort()`. Its supersession guard at 18730-18739 passes during a live single-file run because doc_pipeline_source.jsx:20800 is the writer of `window.__alloActivePdfRemediation` and it is only nulled in the finally (24992-24996). I searched for an alternate bank and found none: `window.__lastIncompleteProject` is written in exactly one place (24935) and read in exactly one place (AlloFlowANTI.txt:25596), and the host wrapper's success path (25614-25616) does call `_maybeSaveIncompleteProject()` on the returned null — it just finds nothing. Manual rescue is also unavailable: saveProjectToFile's non-override path returns false without `cur.accessibleHtml` (AlloFlowANTI.txt:25466), which a watchdog-killed run never has. The `extractionData` host state (19512/19559) feeds only the fidelity-repair effect (25880-26104), not any save. The stated design reason in the comment ('so a stale run cannot overwrite the current run's recovery slot') applies to supersession by a NEWER run, not to a watchdog kill where no successor exists — the guard conflates the two. Severity high stands: banked multi-minute OCR of a student document is lost with no recovery path.

---

## H20 — Office file with no text layer falls through to Gemini Vision chunking; the literal string "[Chunk N could not be extracted]" becomes both the document body and the ground truth

- **Severity:** high _(verifier revised from critical)_ · **Verdict:** PLAUSIBLE · **Dimension:** extraction-fidelity · **Effort:** small
- **Anchor:** `doc_pipeline_source.jsx:21524`

**What breaks**

A teacher uploads a Word document whose pages are pasted scans (or any .docx in a session where the mammoth/jszip CDN is blocked — `extractDocxTextDeterministic` returns `{ fullText: '', sourceCharCount: 0, method: 'failed' }` at 11531/11628/11652 without throwing). `extractedText` stays ''. The scanned dual-OCR branch is gated to `_mimeType === 'application/pdf'`, so control falls to the generic chunked-Vision `else`. DOCX returns no pageCount, so `effectivePageCount` comes from the ~3KB/page size estimate (a 600 KB .docx → ~200 "pages" → ~100 chunks), each firing `callGeminiVision` with DOCX bytes and a DOCX MIME type. Every chunk fails, every failure is swallowed, and `extractedText` becomes "[Chunk 1 could not be extracted]\n\n---\n\n[Chunk 2 could not be extracted]…" — thousands of characters, so the <20-char abort at 21541 passes. Step 2 then builds a WCAG-remediated HTML document out of those placeholder strings, `__lastGroundTruthCharCount` is set from them (21536), and the coverage/integrity nets all measure output against the placeholders and report success. The teacher gets a scored, "accessible" document containing nothing but error strings, plus ~100 wasted Vision calls.

**Evidence**

```
21497 `} else {` (the generic branch is NOT gated to PDF, unlike 21214 `else if (_base64 && _mimeType === 'application/pdf')`).
21506-21509: `callGeminiVision(...,_base64, _mimeType).catch(err => { warnLog(...); return null; })`
21524: `if (!chunk || !chunk.trim()) return `[Chunk ${i + 1} could not be extracted]`;`
21533: `extractedText = chunks.join('\n\n---\n\n');`
21541: `if (!extractedText || extractedText.length < 20) { ... throw ... }`
21536-21538: `if (extractedText && !window.__lastGroundTruthCharCount) { window.__lastGroundTruthCharCount = extractedText.length; window.__lastGroundTruthMethod = 'vision-ocr'; }`
The Office branch itself only toasts — 20393-20394: `warnLog('[Det] DOCX extraction sparse ...'); if (typeof addToast === 'function') addToast(t('toasts.office_no_text_layer') ...)` with no throw.
```

**Proposed fix**

In `_runExtractionPhase`, make the sparse-DOCX/PPTX branches throw a typed abort (same `_alloAbortRun` mechanism as the 0-page guard at 20521-20524) carrying the existing teacher-facing message, and/or gate the two trailing Vision branches (21490, 21497) on `_mimeType === 'application/pdf'`. Separately, in the chunked branch, count failed chunks and abort the run when every chunk failed instead of joining placeholder strings.

**Verifier**

The MECHANISM is exactly as described and I could not find a guard for it: 21497 `} else {` is not gated on mime type (contrast 21214 `else if (_base64 && _mimeType === 'application/pdf')`), _mimeType is the DOCX/PPTX MIME for Office inputs (20752), 21524 emits `[Chunk ${i+1} could not be extracted]`, 21533 joins them into extractedText, 21536-21538 makes that the ground truth, and 21541's `< 20` abort passes on thousands of placeholder chars. A repo-wide grep for 'could not be extracted' returns exactly one hit — the producer at 21524 — so no consumer ever detects it. The Office sparse branches at 20387-20395 / 20406-20410 do only warnLog + addToast with no throw, and extractDocxTextDeterministic returns `{ fullText: '', sourceCharCount: 0, method: 'failed' }` at 11531/11628/11652 without throwing, as claimed. Note the code's own comment at 11631-11632 asserts 'the Vision fallback is gated to application/pdf and never runs for Office files' — that comment is false. However, the finding's PRIMARY trigger is guarded, which it does not account for: runPdfAccessibilityAudit's Office branch returns a sparse result with `score: -1` whenever the extracted text is <=50 non-whitespace chars (13112-13113), and every call site refuses to remediate at that score — the modal renders the 'Audit Unavailable' panel instead of the Fix & Verify button (view_pdf_audit_source.jsx:8033), and batch skips at doc_pipeline_source.jsx:14121 `if (!auditResult || auditResult.score === -1)`. So a genuinely text-free .docx cannot reach 21497 through the normal flow. Two narrower routes remain real: (a) the audit cache is read at 12985-12998 BEFORE the Office branch, so a previously-cached good audit plus a now-blocked mammoth/jszip CDN reaches remediation with an empty det; (b) an Office file whose text is >50 non-whitespace chars but <=100 total chars passes the audit gate yet fails fixAndVerifyPdf's `extractedText.length > 100` test at 21211 and falls straight into the chunked branch (for DOCX, pageCount is undefined at 13167 so effectivePageCount comes from the 21114 size estimate exactly as described). Downgraded from critical because the primary path is blocked and the placeholder-filled output is plainly visible in the preview.

---

## M1 — `pdf_remediation_reentry.test.js` class-invariant pin hard-codes the guard expression the 2026-07-26 fix superseded, so the two mid-run modal-teardown buttons still trust bare `pdfFixLoading` and the fix cannot be applied without breaking the test

- **Severity:** medium _(verifier revised from high)_ · **Verdict:** CONFIRMED · **Dimension:** test-coverage · **Effort:** small
- **Anchor:** `tests/pdf_remediation_reentry.test.js:101`

**What breaks**

This is the exact field regression fixed today, still live on the two most destructive controls. If the one-shot `setPdfFixLoading(true)` write is lost or cleared over a live run, `disabled={pdfFixLoading || pdfAutoContinueRunning}` evaluates false and both 'Make learning materials' and 'Full Differentiation Pipeline' are armed. Clicking either loads the in-flight HTML into the editor and calls `_closePdfAuditModal()` (view_pdf_audit_source.jsx:14627), nulling `pdfAuditResult` and tearing the modal down mid-remediation — which the test file's own header at :10-12 describes as "leaving the auto-fix loop running detached against stale state". Worse, the test enforces the old expression as a class invariant, so applying `_remediationBusy` there turns the suite red — the pin actively defends the bug.

**Evidence**

```
tests/pdf_remediation_reentry.test.js:101 `const guard = 'disabled={pdfFixLoading || pdfAutoContinueRunning}';` then :107 `expect(window.includes(guard), \`un-guarded teardown button near source offset ${idx}\`).toBe(true);` looped over every teardown button. Both matched buttons still carry that literal: view_pdf_audit_source.jsx:10938 and :14629. Meanwhile the controls the 07-26 fix touched moved on: :9031 `disabled={_remediationBusy || remediationReady === false}` and :10909 `disabled={_remediationBusy}`, with :3330 `const _remediationBusy = pdfFixLoading || pipelineRunActive;`. tests/pdf_remediation_reentry.test.js:91 pins the same stale expression a second time for the 'Make learning materials' button.
```

**Proposed fix**

Change `guard` at tests/pdf_remediation_reentry.test.js:101 (and the literal at :91) to `'disabled={_remediationBusy || pdfAutoContinueRunning}'`, then update view_pdf_audit_source.jsx:10938 and :14629 (both the `disabled` prop and the two `(pdfFixLoading || pdfAutoContinueRunning)` className/title ternaries) to read `_remediationBusy`.

**Verifier**

Every citation is literal. tests/pdf_remediation_reentry.test.js:101 `const guard = 'disabled={pdfFixLoading || pdfAutoContinueRunning}';` with the loop at :103-108 asserting it inside every window that follows the teardown signature `setInputText(temp.textContent || temp.innerText || '');`, and :91 pinning the same literal for 'Make learning materials'. Both teardown buttons still carry it: view_pdf_audit_source.jsx:10938 and :14629, each with the same expression repeated in the className and title ternaries, and each calling `_closePdfAuditModal()` on the preceding line (:10936, :14627). The 07-26 controls did move on — :3330 `const _remediationBusy = pdfFixLoading || pipelineRunActive;`, used at :9031, :10909, :6880, :5909 — so the inconsistency is real and the pin does block the repair (switching the source to `_remediationBusy` fails the literal `window.includes(guard)` check). Severity corrected high→medium on two mitigations the finding does not account for: (1) doc_pipeline_source.jsx:4176-4179 now re-asserts `setPdfFixLoading(true)` on every non-terminal progress heartbeat, so an ordinary lost write self-heals within one event — the residual hole is narrow (chiefly the `_activeRemediationProgress.runId` early return at :4150, where no re-assert happens at all and only the 1s `pipelineRunActive` poll would notice); (2) the worst case is a mid-run modal teardown with the loop detached, not lost work — `_closePdfAuditModal` preserves `pdfFixResult` (pinned at tests/pdf_remediation_reentry.test.js:41) and the 'Return to remediation' pill re-mounts it.

---

## M2 — Batch per-file timeout labels embed the raw filename, so the redacted [Batch] warn line leaks it anyway through the attached error object

- **Severity:** medium · **Verdict:** CONFIRMED · **Dimension:** observability · **Effort:** small
- **Anchor:** `doc_pipeline_source.jsx:14120`

**What breaks**

`_withTimeout` builds `new Error('Timeout after 480s (batch audit: IEP_Jordan_Marquez.pdf)')`. When that file times out, doc_pipeline_source.jsx:14203 logs it as `warnLog('[Batch] ' + _alloDiagnosticDocumentLabel(item.fileName) + ' FAILED:', err)` — the label is correctly redacted to `[document.pdf]`, but `__alloPushLog` renders the Error argument as `(a.message || 'Error') + (a.stack ? '\n' + a.stack : '')` (AlloFlowANTI.txt:3216), putting the real filename right back on the same log line. The same message is also stored as `queue[i].error` and surfaced in `pdfBatchSummary.failedFiles` and the exported batch report. A teacher batching a folder of evaluations and copying the log to report "the batch timed out" exports the student names of exactly the files that failed.

**Evidence**

```
doc_pipeline_source.jsx:4070 — `reject(new Error('Timeout after ' + (ms / 1000) + 's' + (label ? ' (' + label + ')' : '')));`
doc_pipeline_source.jsx:14118-14120:
```
const auditResult = await _withTimeout(
  runPdfAccessibilityAudit(item.base64, { ... }),
  _remainingMs(), 'batch audit: ' + item.fileName);
```
doc_pipeline_source.jsx:14140 — `result = await _withTimeout(_fixPromise, _remainingMs(), 'batch fix: ' + item.fileName);`
doc_pipeline_source.jsx:14203 — `warnLog(\`[Batch] ${_alloDiagnosticDocumentLabel(item.fileName)} FAILED:\`, err);`
AlloFlowANTI.txt:3216 — `if (a instanceof Error) return (a.message || 'Error') + (a.stack ? '\n' + a.stack : '');`
```

**Proposed fix**

Use the redacted label in the timeout labels: `'batch audit: ' + _alloDiagnosticDocumentLabel(item.fileName) + ' #' + (i + 1)` at doc_pipeline_source.jsx:14120 and the same at 14140. The queue index already gives the teacher-facing UI (setPdfBatchStep) the identification it needs, and that path renders the real name locally without exporting it.

**Verifier**

Every link verified verbatim: doc_pipeline_source.jsx:4070 `reject(new Error('Timeout after ' + (ms / 1000) + 's' + (label ? ' (' + label + ')' : '')))`; 14120 `_remainingMs(), 'batch audit: ' + item.fileName`; 14140 `'batch fix: ' + item.fileName`; 14203 `warnLog(\`[Batch] ${_alloDiagnosticDocumentLabel(item.fileName)} FAILED:\`, err)`; AlloFlowANTI.txt:3216 `if (a instanceof Error) return (a.message || 'Error') + (a.stack ? '\n' + a.stack : '')`, joined into the same __alloDiagLog line that the panel renders (view 2862) and the Copy button exports (view 2813). Propagation confirmed — the audit timeout reaches the 14196 catch directly, and the fix timeout is rethrown at 14156 after the drain — so the label lands on the redacted line, defeating it. Medium is right: unlike finding 5 this fires only on a per-file wall timeout, and the `failedFiles` mapping at 14335 renders the name locally rather than exporting it. One sub-claim I could not verify: I found no exported batch REPORT artifact carrying `queue[i].error`, only the in-memory pdfBatchSummary — the confirmed leak is the diagnostics-log path.

---

## M3 — A run that completes with no verified score (afterScore === null) is recorded nowhere — the least trustworthy outcome is invisible to the reliability history

- **Severity:** medium · **Verdict:** CONFIRMED · **Dimension:** observability · **Effort:** small
- **Anchor:** `AlloFlowANTI.txt:19647`

**What breaks**

The pipeline explicitly supports finishing with `finalAfterScore === null` — the terminal `else` at doc_pipeline_source.jsx:24839 toasts "PDF transformed to accessible HTML" with no score when neither the AI rubric nor a deterministic engine produced a usable number. That is the outcome a reviewer most needs counted. But the history effect returns early on `cur.afterScore == null`, so the run appears in neither `_succeeded`, `_incomplete`, nor `_failed` (view_pdf_audit_source.jsx:7850). The session's success rate is computed over a denominator that has silently dropped every unverifiable run, biasing it upward.

**Evidence**

```
AlloFlowANTI.txt:19645-19647:
```
useEffect(() => {
  const cur = pdfFixResult;
  if (!cur || !cur.accessibleHtml || cur.afterScore == null) return;
```
doc_pipeline_source.jsx:24839-24841 — the null-score completion path is real and reached:
```
} else {
  addToast(t('toasts.pdf_transformed_accessible_html_verification'), 'info');
```
doc_pipeline_source.jsx:23793 + 24632 — `let finalAfterScore = verification ? verification.score : afterScore;` … `afterScore: finalAfterScore,` (nullable throughout).
```

**Proposed fix**

Relax the guard at AlloFlowANTI.txt:19647 to `if (!cur || !cur.accessibleHtml) return;` and let the existing `_docPipeline.remediationOutcome(cur, ...)` classify the row (it already returns a non-'success' state without a score). Keep `afterScore: null` in the row so the CSV shows an empty after column rather than fabricating a number.

**Verifier**

AlloFlowANTI.txt:19645-19647 is verbatim, including `|| cur.afterScore == null`. The null-score completion is genuinely reachable, not theoretical: doc_pipeline_source.jsx:23886 `if (_aiDegraded) finalAfterScore = null;` fires when axe AND Equal Access both failed to score and the AI audit was degraded (the throttle regime), 24632 writes `afterScore: finalAfterScore` into _result, 24741 publishes it with accessibleHtml intact, and 24839-24841 is the verbatim terminal `else` that toasts the neutral 'transformed to accessible HTML' message. Since setPdfRunHistory has only the two call sites (19659, 25624) and this path throws nothing, the run enters neither the numerator nor the denominator at view_pdf_audit_source.jsx:7850, which biases the displayed rate upward by dropping runs that would otherwise be 'incomplete'. Medium is right: the run is visibly reported to the teacher in-session, and the panel's own count line ('N document(s)') still includes it — only the outcome rate is skewed.

---

## M4 — Batch remediation writes zero run-history rows, while the code comment claims it "covers single-file + batch + page-range call sites at once"

- **Severity:** medium _(verifier revised from high)_ · **Verdict:** CONFIRMED · **Dimension:** observability · **Effort:** medium
- **Anchor:** `AlloFlowANTI.txt:25587`

**What breaks**

A teacher batches 30 handouts. Successes never set pdfFixResult (silent mode returns at doc_pipeline_source.jsx:24731) so the success effect never fires; failures never reach the host wrapper because runPdfBatchRemediation calls the pipeline-internal `fixAndVerifyPdf` closure directly (doc_pipeline_source.jsx:14125), not `_docPipeline.fixAndVerifyPdf` which the wrapper wraps. The whole batch lane — the highest-volume path, where per-file 8-minute wall timeouts and quota stops actually happen — leaves nothing in pdfRunHistory, nothing in the project file's `runHistory`, and nothing in the CSV. The pdfBatchSummary is in-memory only and is discarded on Start New Audit. So the reliability record silently describes only hand-run single files, and the comment asserting otherwise means nobody will look.

**Evidence**

```
AlloFlowANTI.txt:25581-25587:
```
// Reliability telemetry (2026-06-13): wrap the pipeline so a FAILED run is
// recorded in the run-history too ...
// Covers single-file + batch + page-range call sites at once.
```
AlloFlowANTI.txt:25665 — the batch entry point is unwrapped: `const runPdfBatchRemediation = _docPipeline ? _docPipeline.runPdfBatchRemediation : _pipelineUnavailable;`
doc_pipeline_source.jsx:14125 — `const _fixPromise = fixAndVerifyPdf({ documentEpoch: owner.documentEpoch, base64: item.base64, ... onProgress: (step, msg) => progress(msg), ... });` resolves to the module-internal const at doc_pipeline_source.jsx:20684, bypassing `_wrapFixAndVerify`.
doc_pipeline_source.jsx:24731 — `if (_silentMode) return _result;` (before any setPdfFixResult).
setPdfRunHistory has exactly two call sites: AlloFlowANTI.txt:19659 and 25624.
```

**Proposed fix**

Have runPdfBatchRemediation emit a per-file outcome the host can record: dispatch a `alloflow:batch-file-outcome` CustomEvent (or accept an `onFileOutcome` callback) from the try/catch at doc_pipeline_source.jsx:14192-14236 carrying `{ runId, fileName, outcome, failStage, pipelineStats }`, and add a listener next to AlloFlowANTI.txt:19645 that appends the row through the same shape. Until that ships, correct the comment at 25587 so it does not assert coverage it does not have.

**Verifier**

Verified end to end. AlloFlowANTI.txt:25587 contains the claim verbatim; 25665 binds `runPdfBatchRemediation` straight off _docPipeline with no wrapper. Inside the pipeline, grep for `fixAndVerifyPdf` shows exactly ONE declaration (20684) and the batch call at 14125 resolves to it directly — the wrapped form exists only in the exports object (37833), so the batch bypasses both _wrapFixAndVerify and the host's telemetry wrapper. Successes are dropped by `if (_silentMode) return _result;` at 24731, before setPdfFixResult, so the AlloFlowANTI.txt:19645 effect never fires. setPdfRunHistory has exactly two call sites (19659, 25624) and neither is reachable from batch, so pdfRunHistory (and therefore the project file's runHistory and the CSV at view_pdf_audit_source.jsx:7873) contains nothing from batch runs; failures land only in `queue[i].error` / pdfBatchSummary.failedFiles (14335), which is in-memory state. Downgraded high→medium: this is missing telemetry plus an inaccurate comment, not a wrong claim about a document's accessibility; the per-file outcome is still shown live in the batch queue UI and the batch summary.

---

## M5 — A duplicate Fix & Verify click writes a permanent `outcome:'failed'` history row stamped with the CURRENTLY-RUNNING run's API counts and stage

- **Severity:** medium _(verifier revised from high)_ · **Verdict:** CONFIRMED · **Dimension:** observability · **Effort:** small
- **Anchor:** `AlloFlowANTI.txt:25620`

**What breaks**

The teacher clicks "♿ Fix & Verify" twice (or clicks it during the brief window before the busy state paints). The re-entry lock rejects the second call with RemediationAlreadyRunningError and shows a reassuring *info* toast ("the duplicate start was ignored"). But that rejection reaches the host wrapper's catch, which — because the error carries no `.pipelineStats` — falls back to `_docPipeline.getPipelineStats()`, i.e. the module-global `_pipelineStats` belonging to the run that is still executing. A `failed` row is appended carrying the live run's apiCalls, visionCalls, totalApiMs, durationMs and `failStage: 'generate accessible HTML'`. The live run then adds its own success row. One document, one successful remediation, and the reliability panel/CSV now report 50% success with a fabricated stage attribution. Same for the pre-flight refusals BaselineAuditRequiredError (doc_pipeline_source.jsx:20716) and DocumentOwnershipError (20698), which never ran anything at all.

**Evidence**

```
doc_pipeline_source.jsx:37731-37737:
```
if (_activeSingleFixPromise) {
  var duplicateError = new Error('A remediation run is already in progress.');
  duplicateError.name = 'RemediationAlreadyRunningError';
  ...
  return Promise.reject(duplicateError);
}
```
AlloFlowANTI.txt:25618-25631:
```
const _st = (err && err.pipelineStats && typeof err.pipelineStats === 'object')
  ? err.pipelineStats
  : ((_docPipeline && _docPipeline.getPipelineStats) ? _docPipeline.getPipelineStats() : {});
...
  outcome: 'failed',
  failStage: _st.lastOpenStepLabel || 'unknown',
  ... apiCalls: _st.apiCalls != null ? _st.apiCalls : null,
```
doc_pipeline_source.jsx:4268-4284 — `_getPipelineStats` reads the module-global `_pipelineStats`, which doc_pipeline_source.jsx:20775 reassigns to the live run: `const _runStats = _pipelineStats = { ... runId: _runId, ... }`.
```

**Proposed fix**

In AlloFlowANTI.txt:25617, classify before recording: skip the history row entirely for errors that mean the run never started — `err.isAlreadyRunning`, `err.code === 'BASELINE_AUDIT_REQUIRED'`, `err.code === 'ALLO_DOCUMENT_EPOCH_REQUIRED'`, `err.code === 'ALLO_STALE_DOCUMENT'`. And never fall back to `getPipelineStats()` when the error carries no `pipelineStats`: an error without run-scoped stats must record nulls, not another run's numbers.

**Verifier**

All three anchors verified. doc_pipeline_source.jsx:37731-37737 rejects with a RemediationAlreadyRunningError that carries NO `.pipelineStats`; 37833 confirms the export is `_wrapFixAndVerify(fixAndVerifyPdf)`, so the rejection propagates to the host wrapper. AlloFlowANTI.txt:25618-25620 then falls back to `_docPipeline.getPipelineStats()`, which reads the module-global `_pipelineStats` (4268-4284) that doc_pipeline_source.jsx:20775 has already re-pointed at the LIVE run — and `_cancelled` (25621) is false because getPipelineStats() returns no `outcome` key, so the row at 25624-25638 is written. Reachability confirmed: the Fix & Verify handler (view_pdf_audit_source.jsx:9019-9030) has no synchronous re-entry guard — `_requireRemediationReady()` (3407-3413) only checks dependency loading, and `await ensurePdfBase64()` at 9023 opens an async gap during which the button is still enabled because nothing has set pdfFixLoading yet. The failed row has no `runId` key, so the later success row cannot upsert onto it (AlloFlowANTI.txt:19710) — two rows, 50%. BaselineAuditRequiredError (20716-20718) and DocumentOwnershipError (20698-20700) confirmed as additional never-ran cases (the ALLO_STALE_DOCUMENT case at 20736 is already excluded, since it uses name 'AbortError'). Downgraded high→medium: the corruption makes the tool look WORSE than reality (a fabricated failure, not an overclaimed success), and no accessibility, work, or student data is affected.

---

## M6 — Cancelled and watchdog-killed runs are erased from the reliability history — the success rate systematically excludes the worst outcomes

- **Severity:** medium _(verifier revised from high)_ · **Verdict:** CONFIRMED · **Dimension:** observability · **Effort:** medium
- **Anchor:** `doc_pipeline_source.jsx:24916`

**What breaks**

A 20-minute run stalls under a Canvas throttle; the 8-min dead-man switch bumps __alloPdfRunGen and aborts. The pipeline classifies this as `_runWasCancelled`, returns null instead of throwing, and writes no failure telemetry. The host's failure-recording wrapper also skips it explicitly (`if (!_cancelled) setPdfRunHistory(...)`), and the success effect never fires because pdfFixResult is unchanged. The same happens when the teacher selects a different document mid-run. So the history panel and CSV that compute "N% success (x/y)" (view_pdf_audit_source.jsx:7850-7858) count only runs that finished — every stall, abort, and superseded run vanishes from BOTH numerator and denominator. Aaron defends this rate to UMaine; it is structurally incapable of showing the failure mode the pilot most needs to know about.

**Evidence**

```
doc_pipeline_source.jsx:24889-24919:
```
const _runWasCancelled = !!((err && (err.name === 'AbortError' || err.isAbort || err.code === 'ALLO_REMEDIATION_CANCELLED')) || _runGenStale());
...
if (_runWasCancelled) {
  if (_silentMode) throw err;
  warnLog('[PDF Fix] Stale run failed (gen ' + _myRunGen + ' != current ' + ... + ') — suppressing failure history, recovery capture, UI writes, and toast.');
  return null;
}
```
AlloFlowANTI.txt:25621-25624:
```
const _cancelled = !!((_st && _st.outcome === 'cancelled') || (err && (err.name === 'AbortError' || err.isAbort || err.code === 'ALLO_REMEDIATION_CANCELLED')));
...
if (!_cancelled) setPdfRunHistory((prev) => { ... outcome: 'failed', ... });
```
AlloFlowANTI.txt:19647 — the only other writer is gated on a fresh result: `if (!cur || !cur.accessibleHtml || cur.afterScore == null) return;`
```

**Proposed fix**

Add a third outcome value. In the pipeline's cancelled branch (doc_pipeline_source.jsx:24916) still attach `_failurePipelineStats` (already built at 24892 with `outcome: 'cancelled'`) to a returned sentinel or rethrow a marked AbortError; in AlloFlowANTI.txt:25624 write the row with `outcome: 'cancelled'` instead of skipping. Then in view_pdf_audit_source.jsx:7850 include 'cancelled' in `_outcomed` (denominator only, never the numerator) and add it to the CSV outcome column.

**Verifier**

Verbatim at doc_pipeline_source.jsx:24889-24919: `_runWasCancelled` ORs in `_runGenStale()` (defined 20864-20865 as aborted-signal OR __alloPdfRunGen mismatch), and 24916-24919 `return null` — no throw, so the host wrapper's catch is never entered at all; the failure telemetry built at 24892 with `outcome: 'cancelled'` is discarded. AlloFlowANTI.txt:25621/25624 is verbatim and skips the row on `_cancelled`. The watchdog path is real: AlloFlowANTI.txt:18755 bumps __alloPdfRunGen, which makes _runGenStale() true, so an 8-min stall kill is classified identically to a user cancel. setPdfRunHistory has exactly two call sites (19659, 25624), and 19647's guard blocks the other one, so the run lands nowhere. view_pdf_audit_source.jsx:7850-7858 confirms the denominator is only success|incomplete|failed. Downgraded high→medium: excluding a user-initiated cancel from a success RATE is a defensible design (the code states it: 'Cancellation is an ownership outcome, not a failed remediation'), so only the watchdog/stall subset is a genuine gap; the numbers shown are incomplete rather than fabricated, and nothing student-facing is misclaimed.

---

## M7 — 8-min dead-man watchdog can never clear a stranded pdfFixLoading: it treats a missing __alloActivePdfRemediation slot as "superseded", returns, and never re-arms

- **Severity:** medium _(verifier revised from high)_ · **Verdict:** CONFIRMED · **Dimension:** observability · **Effort:** small
- **Anchor:** `AlloFlowANTI.txt:18740`

**What breaks**

Teacher runs Fix & Verify, auto-continue rounds follow. The 12-min auto-continue watchdog fires and nulls pdfAutoContinueAbortCtrlRef (AlloFlowANTI.txt:19771). runAutoFixLoop's finally then computes `_ownsExit = false` and `_staleAtExit = false`, so NEITHER branch runs and `setPdfFixLoading(false)` is never called (misc_handlers_source.jsx:1509-1514). pdfFixLoading is now true with no live run. The 8-min dead-man switch exists precisely for this ("a stranded flag would leave Start New Audit permanently disabled"), but `window.__alloActivePdfRemediation` was nulled by the pipeline's finally when the primary run ended, so `!liveOwner` makes `superseded` true: fire() logs one console line and returns WITHOUT clearing and WITHOUT re-arming (arm() is only called from onActivity, which needs a pipeline heartbeat that will never come). Result: the modal shows a permanent "⏳ Fixing..." spinner over a finished result, and `_remediationBusy` disables both Fix & Verify (view_pdf_audit_source.jsx:9031) and Start New Audit (view_pdf_audit_source.jsx:10909). The teacher's only escape is closing the modal.

**Evidence**

```
AlloFlowANTI.txt:18730-18743:
```
const liveOwner = (typeof window !== 'undefined' && window.__alloActivePdfRemediation) || null;
...
const superseded = pdfDocumentSelectionEpochRef.current !== watchdogEpoch
  || !watchdogRunId
  || !liveOwner
  ...
if (superseded) {
  warnLog('[PdfFix] Ignoring superseded remediation watchdog timeout; a newer document or run owns the host.');
  return;
}
```
AlloFlowANTI.txt:18770 — `const arm = () => { clearTimeout(id); id = setTimeout(fire, IDLE_LIMIT); };` is called only at effect setup and inside `onActivity` (18778), which is driven solely by 'alloflow:pipeline-warn'.
doc_pipeline_source.jsx:24992-24996 — every terminal exit clears the slot the watchdog requires:
```
if (!_silentMode && typeof window !== 'undefined'
  && window.__alloActivePdfRemediation
  && window.__alloActivePdfRemediation.runId === _runId) {
  window.__alloActivePdfRemediation = null;
}
```
misc_handlers_source.jsx:1502-1514 — `const _ownsExit = pdfAutoContinueAbortCtrlRef.current === _abortCtrl;` … `if (!_staleAtExit && _ownsExit) { setPdfFixLoading(false); … } else if (_staleAtExit) { warnLog(…) }` — the `_ownsExit === false && _staleAtExit === false` case falls through silently.
```

**Proposed fix**

In the AlloFlowANTI.txt:18708 watchdog fire(): split the two cases. Keep the full `superseded` bail only when a DIFFERENT live owner exists (liveOwner present but epoch/runId mismatched). When `!liveOwner` — i.e. no pipeline run owns the host at all but pdfFixLoading is still true — treat it as the stranded-flag case the switch was written for: clear pdfFixLoading/pdfFixStep and warn via _docPipeline.logHostDiagnostic so it reaches the copyable log. Also make the superseded branch call arm() before returning so it re-checks rather than dying. Separately, add an `else` to misc_handlers_source.jsx:1509 that clears pdfFixLoading when the loop neither owns the slot nor is generation-stale.

**Verifier**

Every anchor checks out and the chain closes. AlloFlowANTI.txt:18730-18743 is verbatim: `const liveOwner = ... window.__alloActivePdfRemediation) || null;` feeds `|| !liveOwner` into `superseded`, and 18740-18743 logs + `return`s with no clear and no re-arm; `arm()` (18770) is called only at effect setup (18780) and inside `onActivity` (18778). doc_pipeline_source.jsx:24992-24996 nulls that slot on EVERY terminal exit of the primary run, and grep shows the slot is written in exactly one place (20800, inside fixAndVerifyPdf) — auto-continue calls aiFixChunked directly, so during every auto-continue round `liveOwner` is null and the 8-min watchdog is structurally inert. The 12-min watchdog survives because it falls back to `window.__alloRemediationProgress` (19736/19755), which _emitRemediationProgress writes at doc_pipeline_source.jsx:4181 and NOTHING ever nulls (the finally at 24991 clears only the module-local `_activeRemediationProgress`) — so it fires, and 19771 nulls pdfAutoContinueAbortCtrlRef WITHOUT bumping __alloPdfRunGen. misc_handlers_source.jsx:1502-1514 then computes `_ownsExit=false` (ref nulled) and `_staleAtExit=false` (`_genStale()` at 1216 compares __alloPdfRunGen, never bumped), so neither branch runs and setPdfFixLoading(false) at 1510 is skipped — while 1286 (`if (_canPublish()) setPdfFixLoading(true);`) had set it true each round. Impact verified: view_pdf_audit_source.jsx:3330 `_remediationBusy = pdfFixLoading || pipelineRunActive` disables Fix & Verify (9031) and Start New Audit (10909). Downgraded high→medium: the trigger needs 12 minutes of TOTAL pipeline silence with an unchanged step, and a documented escape exists that loses nothing — _closePdfAuditModal (AlloFlowANTI.txt:19153) clears the flag, the result survives in pdfFixResult, and the re-entry pill re-mounts it. No wrong accessibility claim and no lost work.

---

## M8 — _runMainFixLoop returns the LAST pass's verification audit while shipping bestHtml, so the "Remaining Issues" list can describe HTML the teacher is not downloading

- **Severity:** medium · **Verdict:** CONFIRMED · **Dimension:** verification-honesty · **Effort:** medium
- **Anchor:** `doc_pipeline_source.jsx:19970`

**What breaks**

Keep-best restores `bestHtml` over the loop's working `accessibleHtml` at the end, but `verification` (line 19867 `if (reVerify) verification = reVerify;`) still holds the audit of the LAST pass — a pass that was deliberately NOT promoted to best. The mismatch is normally erased by the final authoritative audit at 23563, which re-audits the shipped bytes. But when that audit returns null/throws AND the deferred re-audit loop also fails (both the common throttle-storm outcome the deferred loop exists for), `verification` survives as the last-pass audit. It is then published verbatim: `verificationAudit: verification` (24604), `remainingIssues: verification ? (verification.issues || []).length : null` (24655), and `_issueResolution = _diffIssueResolution(_flattenAuditIssues(_auditResult), verification)` (24520-24522). The view renders it unconditionally as "Remaining Issues (N)" (view 11332-11335) and as the resolved/persisted/introduced diff (view 11202+). A teacher works through a list of issues — and a resolved/introduced tally — computed on a different version of the document than the one in the download. `_lastSuccessfulAiScore` (23556-23558) likewise reads that audit to build the "estimated minimum".

**Evidence**

```
doc_pipeline_source.jsx:19970-19974:
`      if (bestHtml && bestHtml !== accessibleHtml) {`
`        warnLog('[Auto-fix] Shipping best verified version (AI ' + bestAiScore + ', axe ' + bestAxeViolations + ') instead of the loop\'s last working state.');`
`        accessibleHtml = bestHtml;`
`      }`
`    return { accessibleHtml, verification, axeResults, autoFixPasses, bestAiScore, bestAxeViolations, lastFullCoverageAiScore: _lastFullCoverageAiScore };`

`verification` was last written at 19867 `if (reVerify) verification = reVerify;` — the audit of the pre-restore `accessibleHtml`, and 19878-19885 shows `bestHtml` is only updated when `_passIsBest`, so the two diverge whenever a pass is kept as working state without being promoted.

Published unguarded at doc_pipeline_source.jsx:24604 `verificationAudit: verification,` and 24655 `remainingIssues: verification ? (verification.issues || []).length : null,`; rendered at view_pdf_audit_source.jsx:11332 `{(pdfFixResult.verificationAudit.issues || []).length > 0 && (` … 11334 `Remaining Issues ({pdfFixResult.verificationAudit.issues.length})`.
```

**Proposed fix**

Track the HTML each audit describes inside `_runMainFixLoop` (e.g. `bestVerification`/`bestVerificationHtml`, updated in the `_passIsBest` block at 19880-19885) and return `bestVerification` alongside `bestHtml`; when no pass was promoted, return `verification: null` rather than a mismatched audit. Downstream, fixAndVerifyPdf already fails closed on a null verification (`_aiDegraded` → deterministic headline), which is the honest outcome.

**Verifier**

Anchors verbatim: doc_pipeline_source.jsx:19970-19974 restores `accessibleHtml = bestHtml` then `return { accessibleHtml, verification, ... }`; 19867 `if (reVerify) verification = reVerify;` runs on EVERY pass, while 19878-19885 promote bestHtml only under `_passIsBest`, so the two provably diverge on a non-promoted final pass. bestHtml is seeded to the pre-loop html at 19611, so even a zero-promotion run diverges. The claimed rescue path and its failure are both real: 23563 re-audits the shipped bytes and 23567 `verification = finalAudit;` normally erases the mismatch, but on null/throw verification is left untouched (23571-23582). I looked hard for a downstream guard and found the opposite — three of them fail open here: (1) the last-resort synthesizer at 23709 is `if (!verification && axeResults)`, so a stale-but-present audit is never replaced; (2) the deferred re-audit is gated `_reAuditNeeded = (verification && verification._partialAudit) || (_finalAuditThrottled && !_finalAuditHadUsableScore)` (23601-23602), so a non-throttle final-audit failure over a non-partial stale audit skips the whole circle-back; (3) the post-mutation re-audit is gated on `typeof _finalAiAuditedHtml === 'string' && _finalAiAuditedHtml !== accessibleHtml` (24426) — when the final audit failed, `_finalAiAuditedHtml` is still null (23550), so that branch is skipped too. The stale object is then published verbatim at 24604 `verificationAudit: verification,` and 24655 `remainingIssues: verification ? (verification.issues || []).length : null,`, and diffed at 24520-24522. Rendered unconditionally at view 11332-11335. The headline score does stay honest (_aiDegraded → deterministic), which is why medium, not high — but the issue list and the resolved/introduced tally describe bytes the teacher is not downloading.

---

## M9 — _finalizeRemediationRound carries _estimatedMinimumScore / _estimatedScoreBasis / _finalAuditRetryAvailable forward unchanged, so a superseded round's estimate is displayed against the current document

- **Severity:** medium · **Verdict:** CONFIRMED · **Dimension:** verification-honesty · **Effort:** small
- **Anchor:** `doc_pipeline_source.jsx:5814`

**What breaks**

The returned object is `Object.assign({}, cur, {…})` and the override list (5815-5846) does not include `_estimatedMinimumScore`, `_estimatedScoreBasis`, or `_finalAuditRetryAvailable`. If the initial fixAndVerifyPdf run was throttled it stamps e.g. `_estimatedMinimumScore: 62` with `_estimatedScoreBasis: {lastSuccessfulAiScore: 64, automatedScore: 62, …}` (doc_pipeline_source.jsx:23868-23879). Auto-continue then runs three rounds that genuinely improve the document. On any later round where `_aiVerificationIncomplete` is true — which, given the coverage.ai bug above, happens on any round with a `ruleId:'other'` finding — the panel renders "Estimated minimum: 62/100 … Basis: AI 64 / automated 62" (view 11288-11296) using numbers from a run that no longer describes the shipped HTML, and offers a "Re-run verification only" CTA driven by the equally stale `_finalAuditRetryAvailable`. Separately, the view's own re-audit lane writes `_estimatedScoreBasis` as a plain string (view 5156), so `_estimatedScoreBasis.lastSuccessfulAiScore` at view 11294 is `undefined` and the panel renders the meaningless "Basis: AI ? / automated ?".

**Evidence**

```
doc_pipeline_source.jsx:5814  `return Object.assign({}, cur, {`  — override keys run 5815-5846 (accessibleHtml, axeAudit, _detScore, verificationAudit, verificationHtmlBinding, verificationCoverage, verificationState, afterScoreVerified, requiresManualReview, verificationReviewCount, verificationReasons, issueResolution, integrityCoverage, integrityWarning, fidelityNotes, fidelityLimited, afterScore, _scoreIsBlended, _aiVerificationIncomplete, _scoreSource, axeScore, axeViolations, secondEngineAudit, needsExpertReview, expertReviewReason, _verificationExpertReview, _expertReviewBeforeVerification, finalText, autoFixPasses, htmlChars, chunkState, chunkWeightedScore). `_estimatedMinimumScore`, `_estimatedScoreBasis` and `_finalAuditRetryAvailable` appear nowhere.

Render sites: view_pdf_audit_source.jsx:11288-11296 `{pdfFixResult._aiVerificationIncomplete && Number.isFinite(pdfFixResult._estimatedMinimumScore) && (… 'Basis'}: AI {pdfFixResult._estimatedScoreBasis.lastSuccessfulAiScore ?? '?'} / automated {pdfFixResult._estimatedScoreBasis.automatedScore ?? '?'}.)}` and 10750.
String-vs-object shape mismatch: view_pdf_audit_source.jsx:5156 `_estimatedScoreBasis: (!_wvOk && Number.isFinite(_wscore)) ? 'deterministic-only re-audit; AI semantic audit unavailable' : null,`
```

**Proposed fix**

Add the three fields to `_finalizeRemediationRound`'s override object: recompute `_estimatedMinimumScore`/`_estimatedScoreBasis` from this round's `aiAudit.score` and `_det` when `_aiVerificationIncomplete`, else null; set `_finalAuditRetryAvailable: _aiVerificationIncomplete && !!html`. Separately, make view_pdf_audit_source.jsx:5156 emit the same object shape (`{kind:'deterministic-only-reaudit', lastSuccessfulAiScore: null, automatedScore: _wdet}`) that view 11294 reads.

**Verifier**

I read the whole override object at doc_pipeline_source.jsx:5814-5847: `return Object.assign({}, cur, {` with keys accessibleHtml…chunkWeightedScore, and none of `_estimatedMinimumScore`, `_estimatedScoreBasis`, `_finalAuditRetryAvailable` appear — so all three ride through from `cur` unchanged. The stamping site is real (23867-23879 sets _estimatedMinimumScore and the {kind, lastSuccessfulAiScore, automatedScore, …} basis object; 24644 `_finalAuditRetryAvailable: !!(_aiVerificationIncomplete && accessibleHtml)`), and the render gate is `_aiVerificationIncomplete && Number.isFinite(_estimatedMinimumScore)` at view 11288-11296 — both satisfied on any round where the coverage.ai bug above fires. The second half is independently confirmed: view 5156 emits `_estimatedScoreBasis` as a plain STRING while 5155 sets a finite `_estimatedMinimumScore`, so view 11294 reads `.lastSuccessfulAiScore ?? '?'` off a string and prints 'Basis: AI ? / automated ?'. One scoping correction to the finding, in its favour: I checked the sibling lane and view 3246-3248 (_commitHtmlPendingVerification) DOES null both estimate fields, so the staleness is specific to the auto-continue reducer, which makes the omission look like an oversight rather than a convention. Medium is honest — a stale/meaningless number inside a panel whose whole job is score provenance.

---

## M10 — The body sanitizer runs before the image controls are authored, so the renderer's placeholder upload/drag/pick handlers are stripped — the manual image fallback is dead too

- **Severity:** medium · **Verdict:** CONFIRMED · **Dimension:** html-integrity · **Effort:** small
- **Anchor:** `doc_pipeline_source.jsx:22470`

**What breaks**

`_alloSanitizeRemediationBodyFragment` removes every `on*` attribute from the model-authored fragment. That fragment contains the renderer's image placeholders, whose entire interaction surface is inline handlers: `ondragover`/`ondragleave`/`ondrop` on the container, `onchange` on the hidden file input, `onclick` on "Pick extracted", and `onclick` on the × remove button (doc_builder_renderer_source.jsx:260-268). The comment at 22468 says "Deterministic image controls are inserted below" — but that insertion is the block at 22484 that only runs `if (extractedImages.length > 0)`, so on any document where image extraction produced nothing (Imagen/extraction both failed, an Office file, a vision-only run) every placeholder ships with a visible "Upload image" label and a "Pick extracted" button that do nothing when clicked. The teacher's only route to fix a missing figure by hand is silently disabled.

**Evidence**

```
doc_pipeline_source.jsx:22468-22470
      // This is the final model-authored boundary. Deterministic image controls are inserted below,
      // and the trusted crop controller is authored only in the wrapper after this fragment is clean.
      bodyContent = _alloSanitizeRemediationBodyFragment(bodyContent);

doc_pipeline_source.jsx:22484 — the "controls inserted below" are gated:
      if (extractedImages.length > 0) {

What gets stripped, doc_builder_renderer_source.jsx:261 / 267 / 268:
                + `<div id="${_imgId}-container" style="..." ondragover="${_dragOver}" ondragleave="${_dragLeave}" ondrop="${_dropHandler}">`
                ... <input type="file" accept="image/*" style="display:none" onchange="${_uploadHandler}"></label>
                + `<button type="button" onclick="${_pickHandler}" ...>`

The strip itself, doc_pipeline_source.jsx:2311-2314:
      if (/^on/i.test(name) || name === 'srcdoc' || ... ) { el.removeAttribute(attr.name); return; }
```

**Proposed fix**

Move the placeholder-control authoring to the trusted side of the boundary: have `renderJsonToHtml` emit a bare, handler-free `<figure data-img-placeholder="true" data-img-alt="...">` shell, and after `_alloSanitizeRemediationBodyFragment` at 22470 run a single deterministic pass (unconditionally, not gated on `extractedImages.length`) that attaches the upload/drag/pick/remove handlers to every remaining placeholder — the same pass that would do the real-image splice.

**Verifier**

Reproduced. doc_pipeline_source.jsx:22467-22470 restores the placeholder figures verbatim and then calls _alloSanitizeRemediationBodyFragment, which delegates to _alloSanitizeRemediationHtml where 2311-2314 `if (/^on/i.test(name) || ...) { el.removeAttribute(attr.name); return; }` removes every handler. The placeholders' entire interaction surface is inline handlers: doc_builder_renderer_source.jsx:266 (`ondragover`/`ondragleave`/`ondrop` on the container), :268 (`onchange` on the file input and `onclick` on 'Pick extracted'), :265 (`onclick` on the x-remove button). The 'controls inserted below' really are gated: 22484 `if (extractedImages.length > 0) {`. I searched for a delegated rebinding on the parent side and found none — the only parent-side hook is `window.__alloflowGenerateImage` (view_pdf_audit_source.jsx:4545), and the `data-allo-genai` button that calls it is emitted ONLY by the splice at 22575, never by the renderer. One amplification worth recording: because the splice regex never matches (finding 1), these handlers are dead on EVERY run, not only when extractedImages is empty, so the placeholder shows 'Upload image' / 'Pick extracted' / 'x' controls that do nothing in all cases. Medium is right — the loss is a manual-repair affordance, not content.

---

## M11 — The "Retry This Section" control on a failed-chunk banner is stripped by the sanitizers before it ships, and its handler would replace the finished document with the raw Step-2 draft

- **Severity:** medium _(verifier revised from high)_ · **Verdict:** CONFIRMED · **Dimension:** html-integrity · **Effort:** medium
- **Anchor:** `doc_pipeline_source.jsx:22263`

**What breaks**

Two compounding problems on the only recovery path offered for a failed chunk. (a) The banner is a `rawhtml` block, so it goes through `_sanitizeRawHtmlBlock`: DOMPurify's `_RAWHTML_PURIFY_CFG` lists `button` in FORBID_TAGS and omits `onclick` from ALLOWED_ATTR, and `_alloSanitizeRemediationBodyFragment` (22470) strips every `on*` attribute again. The teacher sees "Section 3 (pages 7-9) failed to process / 🔄 Retry This Section" rendered as inert text; `window.__retryPdfChunk` is unreachable. Worse, when DOMPurify has not loaded, `_execShaped` matches the ` onclick=` in the banner and the WHOLE banner is replaced by the generic "An embedded HTML block was withheld from this export" notice — so the teacher is not even told which pages failed. (b) If the handler ever did fire, it re-renders `renderJsonToHtml(allBlocks)` (the un-polished, un-sanitized, un-imaged Step-2 draft) and splices it over `prev.accessibleHtml`'s entire `<body>` — discarding the skip link, the `<main id="main-content">` landmark, the contentinfo footer, every Step-3/4 axe fix, the grammar corrections and the restored image data URLs, while the displayed score stays unchanged. It also carries no documentEpoch / run-generation guard.

**Evidence**

```
doc_pipeline_source.jsx:22263 (the banner, note `onclick=` and `<button>`)
            allBlocks.push({ type: 'rawhtml', html: '<div data-chunk-fail="' + ci + '" role="alert" ...><button onclick="window.__retryPdfChunk && window.__retryPdfChunk(' + ci + ')" ...>...Retry This Section</button></div>' });

doc_pipeline_source.jsx:15670 (_RAWHTML_PURIFY_CFG):
    ALLOWED_ATTR: ['href','src','alt','title','class','id','style','colspan','rowspan','scope','headers', ...]   // no on* 
    FORBID_TAGS: ['script','style','iframe','object','embed','svg','math','link','meta','base','form','input','button','textarea','select'],

doc_pipeline_source.jsx:2311-2314 (second strip):
      if (/^on/i.test(name) || name === 'srcdoc' || ... ) { el.removeAttribute(attr.name); return; }

doc_pipeline_source.jsx:22295-22300 (what it would do if it fired):
              bodyContent = renderJsonToHtml(allBlocks);
              ...
              if (storedResult && storedResult.set) storedResult.set(prev => ({ ...prev, accessibleHtml: prev.accessibleHtml.replace(/<body[^>]*>[\s\S]*<\/body>/, () => '<body>' + bodyContent + '</body>') }));
```

**Proposed fix**

Emit the failed-chunk banner as inert markup only (`<div data-chunk-fail="N" data-chunk-pages="7-9">`) and have view_pdf_audit_source.jsx render a real React retry button from those data attributes, so no sanitizer can strip it. Rewrite `window.__retryPdfChunk` to (1) capture and re-check `_runDocumentEpoch` before publishing, and (2) splice ONLY the retried section into the current `accessibleHtml` (replace the `data-chunk-fail="N"` node in a DOMParser copy) instead of re-rendering the whole body from `allBlocks`, then mark the score stale.

**Verifier**

Part (a) reproduced. The banner at doc_pipeline_source.jsx:22263 is a rawhtml block containing `<button onclick="window.__retryPdfChunk && window.__retryPdfChunk(...)">`; renderer:355 routes rawhtml through _sanitizeRawHtmlBlock (doc_pipeline_source.jsx:15674), whose _RAWHTML_PURIFY_CFG at 15662-15672 lists `'button'` in FORBID_TAGS and omits on* from ALLOWED_ATTR, and the on* strip at 2311-2314 runs again at 22470. So the control is inert. Two corrections that lower the severity: (1) the DISCLOSURE survives — div/p/span are in ALLOWED_TAGS, role/aria-live/aria-atomic are in ALLOWED_ATTR, ALLOW_DATA_ATTR is true, and DOMPurify's default KEEP_CONTENT leaves the label text — so the teacher IS still told 'Section N (pages X-Y) failed to process'; only the retry affordance is lost. The whole-banner-withheld path via _execShaped (15689, which does match ` onclick=`) requires DOMPurify to be unloaded at Step-2 time, and _ensureDOMPurify() is fired at module init (15706), so that is a narrow race, not the normal case. (2) Part (b) is unreachable dead code: grep for `__retryPdfChunk` and `data-chunk-fail` across view_pdf_audit_source.jsx, AlloFlowANTI.txt and misc_handlers_source.jsx returns ZERO hits, so nothing else can invoke it. The destructive body-replace at 22295-22300 and the missing epoch guard are real as written but cannot fire today. Downgraded high->medium.

---

## M12 — The structural fidelity nets for lost links and lost tables measure MARKDOWN in the source text, which pdf.js extraction never produces — both nets are permanently inert for PDF input

- **Severity:** medium _(verifier revised from high)_ · **Verdict:** CONFIRMED · **Dimension:** html-integrity · **Effort:** medium
- **Anchor:** `doc_pipeline_source.jsx:2938`

**What breaks**

`_computeStructuralFidelityNotes` is called at 24143 with `extractedText` as the source baseline. For PDFs (the primary input) `extractedText` comes from `extractPdfTextDeterministic`, which joins raw pdf.js text items: no `[text](url)` and no `|---|` rows ever appear. So `_srcLinks` is always 0 (the link note needs `_srcLinks >= 2`) and `_srcTables` is always 0 — which also skips the `else if` branch, so the cell-level partial-collapse net is dead too. The result: a PDF that loses every hyperlink (see the escapeTextField finding) or has a table collapsed to a placeholder (see the detectAndRepairLegends finding) produces ZERO fidelity notes, so `fidelityLimited`, the amber asterisk, and the `_alloDistributionVerdict` 'links'/'tables' bullets never trigger. Only the refusal-text check (#2) actually works on PDFs. The same is true for the OCR path, whose text is also plain.

**Evidence**

```
doc_pipeline_source.jsx:2938-2947
  const _srcLinks = (_src.match(/(?:^|[^!])\[[^\]\n]{1,200}\]\([^)\s]+\)/g) || []).length;
  const _outLinks = (_out.match(/<a\s[^>]*\bhref\s*=/gi) || []).length;
  if (_srcLinks >= 2 && _outLinks < _srcLinks && ...) {
  ...
  const _srcTables = _src.split('\n').filter((l) => { const t = l.trim(); return t.indexOf('|') !== -1 && /-{3,}/.test(t) && /^[|:\-\s]+$/.test(t); }).length;
  if (_srcTables > 0 && _outTables < _srcTables) {

The baseline it is fed, doc_pipeline_source.jsx:24143:
        _structuralFidelityNotes = _computeStructuralFidelityNotes((extractedText || '').replace(_ALLO_MARKER_RE, ''), accessibleHtml);

What extractedText actually is for a PDF, doc_pipeline_source.jsx:9464 / 9473:
          const pageText = items.map(i => i.str || '').join(' ').replace(/\s+/g, ' ').trim();
      const fullText = pages.map(p => p.text).filter(Boolean).join('\n\n');
```

**Proposed fix**

Give `_computeStructuralFidelityNotes` a structural baseline that exists for PDFs instead of markdown counts: pass a `{ linkCount, tableCount, cellCount }` object collected during extraction (pdf.js `page.getAnnotations()` filtered to `subtype === 'Link'` for links; the Step-2 block array's `type === 'table'` count and summed cells for tables) and compare those against the output, keeping the markdown path as the fallback for the Office extractors that do emit markdown.

**Verifier**

Mechanism reproduced, with one factual correction that costs it a severity notch. doc_pipeline_source.jsx:2938 `const _srcLinks = (_src.match(/(?:^|[^!])\[[^\]\n]{1,200}\]\([^)\s]+\)/g) || []).length;` with the `_srcLinks >= 2` gate at 2940, and 2944-2946 counts `_srcTables` from markdown divider rows (`^[|:\-\s]+$`), with the cell-level net at 2948-2962 living in the `else if (_srcTables > 0 ...)` arm — so _srcTables === 0 disables BOTH table nets. The baseline is as cited: 24143 `_computeStructuralFidelityNotes((extractedText || '').replace(_ALLO_MARKER_RE, ''), accessibleHtml)`. For a born-digital PDF extractedText comes from _runExtractionPhase (21122-21123) -> extractPdfTextDeterministic, which builds text from raw pdf.js items at 9464 `items.map(i => i.str || '').join(' ').replace(/\s+/g,' ')` joined at 9473 — no markdown, so both counts are 0 and only the refusal check (#2) can fire. CORRECTION: the finding's claim that 'the same is true for the OCR path' is WRONG. The vision-OCR prompts at 21493 and 21507 explicitly demand `Preserve tables as markdown tables with | pipes and --- dividers` and `Preserve ALL hyperlinks... Format as [link text](URL)`, so on scanned input the nets do work. Downgraded high->medium: the nets are dead for the text-layer path (a large share of runs) but not 'permanently inert for PDF input' as stated.

---

## M13 — The ~3 KB-per-page size estimate drives the Vision OCR fan-out when pdf.js cannot open the file, producing a thousand-chunk extraction on an encrypted or corrupt PDF

- **Severity:** medium · **Verdict:** CONFIRMED · **Dimension:** extraction-fidelity · **Effort:** small
- **Anchor:** `doc_pipeline_source.jsx:21114`

**What breaks**

A password-protected 8 MB scanned IEP export (pdf.js throws PasswordException, `extractPdfTextDeterministic` returns `pageCount: 0` with `error` set, so the 0-page abort at 20521 is deliberately skipped and the run falls through to Vision as the documented rescue). `det.pageCount > 0` is false, so `effectivePageCount` keeps the size estimate: 8 MB → 8192 KB / 3 = ~2731 "pages", `numChunks` ≈ 1366. The extraction loop then queues ~1366 Gemini Vision chunk calls in batches of 5, each prompting for pages that do not exist; `_extractSliceB64` throws 'slice out of range' for all of them, so every chunk falls back to re-uploading the full 8 MB document. The teacher's session burns quota for tens of minutes on a document with at most a few dozen real pages, and any out-of-range chunk that DOES return text contributes hallucinated pseudo-pages to the ground truth.

**Evidence**

```
21112-21119: `let effectivePageCount = pageCount; if (effectivePageCount <= 1 && _base64) { const estimatedFromSize = Math.max(1, Math.round(_base64.length * 0.75 / 1024 / 3)); if (estimatedFromSize > 3) { effectivePageCount = estimatedFromSize; ... } }` — the comment itself calls it "rough: ~3KB base64 per page", which is two orders of magnitude off for a scanned page.
20535-20539 only overrides it on success: `if (det.pageCount > 0) { effectivePageCount = ... }`
20521: `if (det.pageCount === 0 && !det.error) {` — the encrypted/corrupt case deliberately does not abort.
21160: `const numChunks = Math.max(1, Math.ceil(effectivePageCount / PAGES_PER_CHUNK));`
21288-21289: `for (let ii = startPage1 - 1; ii < endPage1; ii++) if (ii >= 0 && ii < _sliceSrcDoc.getPageCount()) idxs.push(ii); if (!idxs.length) throw new Error('slice out of range');`
```

**Proposed fix**

Cap the size-derived estimate (e.g. `Math.min(estimatedFromSize, 150)`) and, when `_sliceSrcDoc` is available, clamp `effectivePageCount` to `_sliceSrcDoc.getPageCount()` before computing `numChunks`; also stop queueing further chunks once `_extractSliceB64` reports 'slice out of range', since page numbers only increase.

**Verifier**

Verified end to end. 21112-21119 is verbatim, including the `~3KB base64 per page` comment and the absence of any upper cap. extractPdfTextDeterministic's catch returns `{ ..., pageCount: 0, ..., error: msg, isEncrypted, isCorrupt, ... }` at 9503, so the deliberate 0-page abort at 20521 `if (det.pageCount === 0 && !det.error)` is skipped and the adoption at 20535-20539 `if (det.pageCount > 0)` never fires — effectivePageCount keeps the size estimate, exactly as claimed. 21160 `const numChunks = Math.max(1, Math.ceil(effectivePageCount / PAGES_PER_CHUNK));` with PAGES_PER_CHUNK = 2 (21159) yields ~1300 chunks for an 8 MB file. The break guard at 21308 cannot help, because `_rangeEnd` is itself derived from the inflated estimate (21239/21247-21248). 21288-21289 `if (!idxs.length) throw new Error('slice out of range');` is verbatim, and the catch at 21317 falls back to a full-document upload with the original prompt — so every out-of-range chunk re-uploads the whole file. The only mitigation is advisory: the >150-page toast at 21226-21228. Medium is the honest severity — the dominant harm is quota/time burn, and the <20-char abort at 21541 (with the correct password-specific message via __lastExtractEncrypted set at 20514) still stops a bad document from shipping in the encrypted case; the hallucinated-pseudo-page risk applies mainly to the corrupt-but-Vision-readable variant.

---

## M14 — Tesseract ignores the page range: it OCRs the entire document, and its out-of-range page failures are reported as this run's extraction failures and block OCR-evidence banking

- **Severity:** medium · **Verdict:** CONFIRMED · **Dimension:** extraction-fidelity · **Effort:** small
- **Anchor:** `doc_pipeline_source.jsx:21417`

**What breaks**

A teacher uses the multi-session control to remediate pages 1-20 of a 200-page scanned textbook — the exact workflow the page-range feature exists for. `extractPdfTextTesseract` receives only `(base64, onProgress, lang)` and loops `for (let p = 1; p <= pdf.numPages; p++)`, so it renders and OCRs all 200 pages before the caller throws 180 of them away at 21440. The progress label reads "Tesseract OCR page 137/200" during a 20-page job. Any of those 180 out-of-scope pages that fail to render lands in `window.__lastOcrPageErrors` unfiltered, so the view's Stage-1 banner names pages the run never touched; and because `_ocrEvidenceCompatible` refuses any record with a non-empty `ocrPageErrors`, one out-of-range render timeout permanently prevents the session from banking the OCR evidence, forcing a full re-OCR on every retry.

**Evidence**

```
21417-21419: `const _tesseractExtract = async () => extractPdfTextTesseract(_base64, (ev) => { updateProgress(1, `Tesseract OCR page ${ev.page}/${ev.total} (${ev.phase})…`); }, _ocrTessLang);` — no range argument; 10830: `for (let p = 1; p <= pdf.numPages; p++) {`
21436-21441 filters the pages but not the errors: `_tessPagesForRec = _tessPagesForRec.filter(p => p && typeof p.pageNum === 'number' && p.pageNum >= _rs && p.pageNum <= _re);`
21476: `window.__lastOcrPageErrors = [].concat(tessResult.pageErrors || [], visionResult.pageErrors || []);`
11910: `if (Array.isArray(record.ocrPageErrors) && record.ocrPageErrors.length) return false;`
```

**Proposed fix**

Add an optional `pageNums`/`range` parameter to `extractPdfTextTesseract` and pass `_pageRange` from `_tesseractExtract`, bounding the render loop and the `total` reported to `onProgress`; and apply the same `_rs`/`_re` filter used for `_tessPagesForRec` to `tessResult.pageErrors` before the concat at 21476.

**Verifier**

21417-21419 is verbatim `extractPdfTextTesseract(_base64, (ev) => { updateProgress(1, \`Tesseract OCR page ${ev.page}/${ev.total} (${ev.phase})…\`); }, _ocrTessLang)` with no range argument, and the callee's signature at 10809 is `(base64, onProgress, lang)` looping `for (let p = 1; p <= pdf.numPages; p++)` at 10830 — so the whole document is rendered and OCR'd. The code's own comment at 21433-21435 concedes 'Tesseract (which OCRs the WHOLE doc)'. The asymmetry is real: 21436-21441 filters `_tessPagesForRec` by `_rs`/`_re`, but 21476 concats `tessResult.pageErrors` unfiltered, so out-of-range failures (pushed at 10835 and 10893) land in __lastOcrPageErrors, feed the metadata at 21710, and render in the Stage-1 banner (view_pdf_audit_source.jsx:9354-9356) naming pages outside the selected range. 11910 `if (Array.isArray(record.ocrPageErrors) && record.ocrPageErrors.length) return false;` is verbatim, so one out-of-range render timeout does block banking for the session. Severity medium is honest: the worst case is wasted OCR time, a misleading progress label, a banner naming untouched pages, and a lost cache — not lost content or a wrong accessibility claim. Partly self-limiting: the render circuit at 10896-10898 opens after two consecutive render failures, which caps runtime but generates a pageError for every remaining page, making the banner noise and the banking refusal worse rather than better.

---

## M15 — `_geminiGate` releases the slot and pumps the queue before `_geminiCall` records the failure, so the call that trips the breaker admits fresh full-size calls under the pre-trip cap with no cooldown

- **Severity:** medium · **Verdict:** CONFIRMED · **Dimension:** throttle-gate · **Effort:** medium
- **Anchor:** `doc_pipeline_source.jsx:4498`

**What breaks**

A pass fans 10 fix chunks into the gate at cap 3. Chunk 1 times out. `_slotUntil` settles → `_free` → `_releaseGeminiSlot` → `_geminiPump`, and the pump sees `_geminiCap` still 3 and `_geminiCooldownUntil` still 0, so it immediately starts chunk 4. Only two-plus microtask ticks later does `_geminiCall`'s `.catch` reach `_geminiNoteTransientFail`/`_geminiNoteAuthFail` and drop the cap to 1 with a 12-25s cooldown. `_free` is one `.then` link off `_slotUntil`, whereas the breaker note is at least two links downstream of the gate promise adopting `_raced`, so `_free` always wins. On a 3-wide fan-out at the moment the storm trips, three additional document-sized calls are admitted into the throttled proxy after the failures that were supposed to stop them — the exact re-fan-out the breaker exists to prevent, and it burns three more ~120-180s timeouts of quota and wall-clock inside a batch file's budget.

**Evidence**

```
`_geminiGate` (4490-4501) — release is chained directly on `slotUntil`, with no hook for the caller to classify the outcome first:
```
      var _free = function () { if (!_released) { _released = true; _releaseGeminiSlot(); } };
      ...
      var _result = Promise.resolve(_isPair ? ret.result : ret);
      Promise.resolve(_isPair ? ret.slotUntil : _result).then(_free, _free);
      return _result;
```
`_releaseGeminiSlot` (4481-4484) pumps unconditionally, and `_geminiPump`'s only brakes are the cap and cooldown that have not been updated yet (4439, 4451):
```
    if (_geminiCooldownUntil > now) { ... return; }
    ...
    while (_geminiInFlight < _geminiCap && _geminiWaiters.length) {
```
The breaker notes live two `.then` links downstream, in `_geminiCall`'s handlers on the gate promise (4968, 4998, 5011):
```
      }, _gateSignal, label).then(function(res) {
        ...
          _geminiNoteTransientFail(_callStats, owner);
      }).catch(function(err) {
        ...
          _geminiNoteAuthFail(_callStats, owner); // trip/escalate the breaker so this AND subsequent calls back off
```
The fix pattern is already in the file for probes only — `_geminiProbe` (4736-4741) folds its cooldown rearm INTO `slotUntil` precisely to close this race: "Rearming is part of slotUntil: a failed cap-1 probe cannot release the gate and start a queued real request in the microtask before its quiet window is restored."
```

**Proposed fix**

Extend the `{result, slotUntil}` contract the same way `_geminiProbe` uses it: in `_geminiCall`, build `_slotUntil` as `Promise.all([existingTransportHold, _raced.then(classifyOutcome, classifyOutcome)])` where `classifyOutcome` performs the `_rememberGeminiFailure` + `_geminiNoteTransientFail`/`_geminiNoteAuthFail` bookkeeping (leaving the retry/backoff decision in the existing `.catch`). The slot then cannot be released, and the pump cannot admit a queued waiter, until the cap and cooldown reflect the failure.

**Verifier**

Anchors exact. :4490-4501 is verbatim, including :4493 `var _free = ...` and :4498 `Promise.resolve(_isPair ? ret.slotUntil : _result).then(_free, _free);`. :4481-4484 `_releaseGeminiSlot` pumps unconditionally, and `_geminiPump`'s only brakes are :4439 `if (_geminiCooldownUntil > now)` and :4451 `while (_geminiInFlight < _geminiCap && _geminiWaiters.length)` — both read state the breaker has not yet updated. The notes are downstream on the gate promise at :4967-4972 (empty-200 → `_rememberGeminiFailure` + `_geminiNoteTransientFail`), :4997 and :5010-5011. Tracing microtask order with the real `_withTimeout` (:4065-4073, `Promise.race([...]).finally(...)`): `slotUntil`'s `_fin` fires one tick after `_underlying` settles (:4953 `_underlying.then(_fin, _fin)`) and `_free` one tick later, while the caller-side note needs race + `.finally` + the outer thenable adoption + the handler — about three ticks later. `_free` wins inside one microtask drain, so `_geminiPump` starts a queued waiter and its transport fires before the cap drops or the cooldown is set. No guard: nothing in `_geminiGate`, `_acquireGeminiSlot`, `_geminiCall` or `callGemini` re-checks `storming` at slot-grant time; the only storming check (:5020) is in the retry path after a failure. The probe fix at :4735-4741 shows the pattern is understood and deliberately applied only to probes. TWO CORRECTIONS: (1) the finding's worked example is the one already-guarded case — on a TIMEOUT `slotUntil` keeps holding the slot until `_underlying` settles (45s ceiling, :4949-4955), so `_free` fires AFTER the breaker note. The race only bites on fast-settling outcomes: empty-200 bodies (:4966 `res == null || (typeof res === 'string' && !res.trim())`) and fast `canvasTransientAuth` rejections — which the file's own comments call the dominant Canvas throttle shape, so it remains reachable. (2) On heavy/scanned docs `_geminiStaggerMs` > 0 (:4616) defers the 2nd and 3rd admissions to a macrotask timer, so only the first extra call fires immediately there. Harm is bounded at `_geminiCap` extra calls per trip, so medium is honest — not cosmetic (it deepens the very throttle window the breaker exists to escape) but not a correctness or data defect.

---

## M16 — A route- or volume-mismatched success can never clear a failure wave, so one Vision/whole-doc storm pins the gate at cap 1 and `storming=true` for the rest of the run

- **Severity:** medium _(verifier revised from high)_ · **Verdict:** CONFIRMED · **Dimension:** throttle-gate · **Effort:** medium
- **Anchor:** `doc_pipeline_source.jsx:4561`

**What breaks**

Teacher remediates a 40-page scanned PDF. In Step 1 the whole-document Vision extraction storms (3 empty 200s → `_GEMINI_TRANSIENT_TRIP`), so `_geminiCap` drops to 1 and `_geminiLastFailureProfile = {kind:'vision', attachmentChars ≈ 6.8M}` (the base64 of the whole PDF). The designed fallback then kicks in and the page-SLICE Vision calls at :21316 all succeed — but a slice is ~0.3M chars, far under `ceil(6.8M * 0.8)`, so `_geminiSuccessRepresentsFailure` returns false and `_geminiNoteSuccess` returns before it can reset anything. From that moment nothing in the run can clear the wave: Steps 2/3/4 are text-only (`callGemini`), and `successProfile.kind !== failure.kind` short-circuits every one of them. Consequences for the rest of the run, on a perfectly healthy service: (a) every fix chunk and every audit chunk is serialized at concurrency 1 instead of 3 — the auto-fix loop is the longest phase of the run; (b) `_geminiThrottleInfo().storming` stays true, so :5020 marks every later transient text error `geminiStormDeferred` and skips its one inline retry, converting recoverable blips into deferred chunks; (c) the final circle-back's stop-improving guard at :23690 (`&& !_stormNow`) can never fire, so a partial final audit caused by malformed JSON grinds re-audits to the 10-minute cap at :23627 under the status line "once the rate limit eases"; (d) the storm early-stop at :19937 fires on a calm gate and cuts the fix loop short. Batch makes it worse — the pinned cap-1 run then blows the 8-minute per-file wall.

**Evidence**

```
`_geminiSuccessRepresentsFailure` (4549-4558):
```
    if (!successProfile || successProfile.kind !== failure.kind) return false;
    var failedVolume = Math.max(0, Number(failure.promptChars) || 0)
      + Math.max(0, Number(failure.attachmentChars) || 0);
    ...
    return failedVolume <= 0 || successVolume >= Math.ceil(failedVolume * 0.8);
```
`_geminiNoteSuccess` (4559-4564) — the early return skips ALL three resets and the `_geminiOkStreak` recovery below it:
```
  var _geminiNoteSuccess = function(requestProfile) {
    var _failureWaveActive = (_geminiAuthStreak > 0 || _geminiTransientStreak > 0) && !!_geminiLastFailureProfile;
    if (_failureWaveActive && !_geminiSuccessRepresentsFailure(requestProfile)) return;
    _geminiAuthStreak = 0;
    _geminiTransientStreak = 0;
    _geminiLastFailureProfile = null;
```
`_geminiAuthStreak` / `_geminiTransientStreak` / `_geminiLastFailureProfile` are assigned in exactly four places: incremented at 4504 / 4531, cleared at 4562-4564 (above) and 4588-4593 (`_resetGeminiBreaker`, which only runs at run entry :20814 and only when the gate is idle). There is no time-based expiry.
The volume asymmetry is built into the fallbacks: whole-doc Vision at 13367 / 21320 (`_base64`) vs. slice Vision at 12740 / 21316 (`sb`). `storming` at 4652 keys off the un-expiring streak: `storming: cooldownRemainingMs > 0 || _geminiAuthStreak >= _GEMINI_STORM_TRIP || _geminiTransientStreak >= _GEMINI_TRANSIENT_TRIP`.
```

**Proposed fix**

Give the failure wave an expiry. In `_rememberGeminiFailure` stamp `next.at = Date.now()`; in `_geminiSuccessRepresentsFailure` return true when `Date.now() - failure.at` exceeds a bound (e.g. 2 × the max escalated cooldown, ~50s) so a stale route profile cannot veto recovery forever. Additionally, count consecutive non-representative successes and clear the wave after `_GEMINI_RECOVER_HITS` of them — a run that has moved on to a different route has no way to produce the old route's evidence. Apply the same staleness bound inside `_geminiThrottleInfo` so `storming` cannot stay true on a streak that has had no failure for a minute.

**Verifier**

Line anchors are exact. doc_pipeline_source.jsx:4549-4557 `_geminiSuccessRepresentsFailure` and :4559-4564 `_geminiNoteSuccess` match the quoted code, including the early `return` at :4561 that skips the three resets AND the `_geminiOkStreak` recovery at :4565-4576. The state is assigned in exactly four places (incremented :4503-4504 / :4530-4531, cleared :4562-4564 and :4588-4593); `_resetGeminiBreaker` is only reachable at :13346 (opening audit) and :20814 (run entry) and BOTH are skipped when the gate is busy (`if (_geminiInFlight > 0 || _geminiWaiters.length > 0)` at :13342 and :20811). There is no time-based expiry. `_rememberGeminiFailure` (:4656-4671) only ESCALATES the profile (`next.kind = (... === 'vision' || next.kind === 'vision') ? 'vision' : 'text'`, `Math.max` on both volumes), so a later text failure cannot downgrade it. `storming` at :4652 keys off the un-expiring streak. HOWEVER the finding's stated SCENARIO is wrong on a load-bearing point: it claims 'Steps 2/3/4 are text-only (`callGemini`)'. Step 2 is NOT text-only — it fires whole-document Vision with the SAME `_base64` at :21762 (style extraction, default `_brandMode==='auto'`), :21920 (`callGeminiVision(jsonPrompt, _base64, _mimeType)` for pageCount<=8), :22006/:22027 (`_base64, _mimeType` per chunk for pageCount>8), plus :21970, :22100, :22128. Any one succeeding gives successVolume ≈ failedVolume (attachment dominates), so the wave clears. The described Step-1-storm → slice-fallback path is therefore refuted. The defect is still real via a different entry: a storm tripping on the LAST of Step 2's parallel whole-doc Vision chunk calls (:22006 fans ceil(pageCount/3) calls each carrying the full `_base64`) leaves a vision-kind profile with no further Vision call in the run — no `callGeminiVision(` appears after :22128 inside fixAndVerifyPdf (20670-25000), so Step 3 (`auditOutputAccessibility`) and Step 4 (`aiFixChunked`) are genuinely text-only. Downstream effects verified: cap pinned at 1; :5020 `if (_geminiThrottleInfo().storming)` marks later transient text errors `geminiStormDeferred` and skips the inline retry; :23689-23690 `const _stormNow = _geminiThrottleInfo().storming; if (audited <= _prevAudited && !_stormNow) break;` can never fire, so a malformed-JSON partial grinds to the `Date.now() + 600000` cap at :23627 under the :23653 onTick status text 'once the rate limit eases'. One mitigation the finding missed: `_probeRouteMismatch` (:4817-4826) makes waitForGeminiCalm return `{calm:true, unprobed:true}` immediately for a vision profile, so the stuck wave adds no probe wall-time — it only pins cap and storming. Severity corrected high→medium: harm is throughput, a stuck early-stop and a misleading status line, not a wrong accessibility score, and the described trigger path does not exist.

---

## M17 — Every hands-off retry attempt downloads another multi-MB "-unfinished" project file and toasts "Remediation stopped" while the wrapper is still retrying

- **Severity:** medium · **Verdict:** CONFIRMED · **Dimension:** failure-recovery · **Effort:** small
- **Anchor:** `AlloFlowANTI.txt:25642`

**What breaks**

The host wrapper runs `_maybeSaveIncompleteProject()` in its catch on EVERY failed attempt, and the hands-off wrapper re-runs the whole fix up to `_HANDSOFF_MAX = 3` more times for the 'retry' and 'wait-retry' dispositions. On a flaky-network 40-page scan that means 4 attempts, and each one (a) auto-downloads `<name>-unfinished.alloflow.json` containing the full base64 of the source PDF (`pdfBase64: _override.base64`, AlloFlowANTI.txt:25441) plus the extracted text — four ~40 MB files in Downloads — and (b) fires the toast "Remediation stopped because the connection to the AI service dropped — but your scanned/extracted text was saved... Use 'Continue a previous session'". The teacher is told the run stopped four times while it is in fact still running, and is left with four near-identical recovery files and no idea which is current.

**Evidence**

```
AlloFlowANTI.txt:25642: `if (!_cancelled) _maybeSaveIncompleteProject();` (inside the per-call catch of the host `fixAndVerifyPdf` wrapper, 25612-25645)
AlloFlowANTI.txt:25604-25608: `addToast(_saved ? ('💾 ' + (... 'Remediation stopped because ' + _why + ' — but your scanned/extracted text was saved to a project file in your Downloads...')) : ..., _saved ? 'warning' : 'error');`
AlloFlowANTI.txt:25460-25461: `const blob = new Blob([JSON.stringify(proj)], ...); safeDownloadBlob(blob, (proj.fileName || 'document').replace(/\.(pdf|docx|pptx)$/i, '') + '-unfinished.alloflow.json');`
view_pdf_audit_source.jsx:6966: `const _HANDSOFF_MAX = 3;`
view_pdf_audit_source.jsx:7011-7027: `while (!_res && _fixTries < _HANDSOFF_MAX && !_stopped() && _oneClickDocumentIsCurrent()) { ... await _runFix(); }`
```

**Proposed fix**

Make the recovery save terminal rather than per-attempt: have `_maybeSaveIncompleteProject` leave `window.__lastIncompleteProject` in place (or re-bank it) and expose an explicit `flushIncompleteProject()` the hands-off wrapper calls once, after its retry loop gives up. Failing that, dedupe on the banked `docKey` so a second save for the same document overwrites rather than downloading again, and downgrade the intermediate toast to "attempt N failed, retrying".

**Verifier**

All anchors are exact. AlloFlowANTI.txt:25642 `if (!_cancelled) _maybeSaveIncompleteProject();` sits inside the host wrapper's per-call catch (25612-25645), and 25615 calls it on the success path too. `_maybeSaveIncompleteProject` (25594-25611) consumes the bank and unconditionally calls `saveProjectToFile(false, _inc)`; the incomplete branch (25423-25464) has NO dedupe — `lastAutoSaveHashRef` guarding at 25472 lives only in the success branch below it — and 25460-25461 builds the blob and calls `safeDownloadBlob(... '-unfinished.alloflow.json')` every time, with `pdfBase64: _override.base64` at 25441 carrying the full source PDF. The pipeline refills the bank on each attempt (cleared at doc_pipeline_source.jsx:21024, refilled at 24935 whenever extractedText.trim().length >= 50 and the run was not cancelled), so the four-download scenario is real for a 1+3 hands-off retry sequence. The toast wording at 25604-25608 and the retry loop at view 7011-7029 / `_HANDSOFF_MAX = 3` (6966) are verbatim. I traced the prop wiring to be sure the view's `fixAndVerifyPdf` is this wrapper: view 2885 receives it as a prop, AlloFlowANTI.txt:40865 passes the wrapper defined at 25612. The ordering claim is accurate — 'Remediation stopped…' fires before the wrapper's 'retrying (1/3)' toast. Medium is honest: the worst case is several dozen MB of duplicate student-document copies auto-landing in Downloads plus a contradictory status message, not a wrong accessibility claim.

---

## M18 — The "Continue a previous session" OCR seed is consumed at Step 1 of the first attempt and never re-armed, so a failed attempt makes every retry re-run full OCR

- **Severity:** medium _(verifier revised from high)_ · **Verdict:** CONFIRMED · **Dimension:** failure-recovery · **Effort:** medium
- **Anchor:** `doc_pipeline_source.jsx:21179`

**What breaks**

A teacher loads a `-unfinished.alloflow.json` for a 40-page scan (the whole point: skip re-scanning). `handleLoadProject`'s resume branch parks the banked text on `window.__resumeExtractedText` exactly once (view_pdf_audit_source.jsx:7693). "Make Accessible" starts; Step 1 reads AND nulls the seed unconditionally, then adopts the text. The run later dies on the same throttle that killed it the first time. Now: (a) the seed is gone — nothing re-sets it except re-loading the project file; and (b) the seeded run banks nothing in the session OCR cache, because the write gate requires `window.__lastOcrMethod`, which is reset to null at 21015 each run and set only by the real scanned dual-OCR path at 21472 — the seed path never sets it. So the hands-off wrapper's up-to-3 automatic retries (view_pdf_audit_source.jsx:7011-7029) each re-run the FULL Tesseract + Vision chunked extraction on the scanned document, burning exactly the quota the resume feature was built to avoid, into a proxy that is already throttling. The teacher is never told the resume shortcut was lost.

**Evidence**

```
21174-21180:
```
// Read AND clear the seed UNCONDITIONALLY — TRUE single-use. ...
const _seed = window.__resumeExtractedText;
window.__resumeExtractedText = null;
if ((!extractedText || extractedText.length <= 100) && !_forceFullOcr && _seed && _seed.fileName === _fileName && ...) {
```
21199: `extractedText = _seed.text;`
21618 (banking gate, not satisfied on the seed path): `if (!_ocrEvidenceCacheHit && _mimeType === 'application/pdf' && _documentKey && window.__lastOcrMethod) {`
21015 (reset each run): `window.__lastOcrMethod = null;`
view_pdf_audit_source.jsx:7693 (only writer): `if (project.extractedText) window.__resumeExtractedText = { fileName: ..., text: project.extractedText, docKey: project.docKey || null };`
Same single-use-token shape at 21038-21041 for `window.__alloForceOcr`: a failed run silently loses the teacher's explicit "Re-OCR pages N" instruction with no re-arm and no notice.
```

**Proposed fix**

Keep the seed in a run-scoped variable rather than deleting it from the global at read time: capture it into `_consumedResumeSeed` and only null `window.__resumeExtractedText` on the SUCCESS path (next to the completion write at ~24741), restoring it in the catch/finally when the run did not complete. Alternatively, after adopting a seed, write it into the session OCR evidence cache via `_writeOcrEvidence` (set `ocrMethod` from the saved project's method) so retries hit the cache instead of re-OCRing. Apply the same restore-on-failure treatment to `window.__alloForceOcr`.

**Verifier**

Anchors verified verbatim. doc_pipeline_source.jsx:21178-21179 reads `window.__resumeExtractedText` into `_seed` and nulls the global BEFORE the match gate on 21180, so the consume is unconditional; 21199 adopts the text. The banking gate at 21618 is `if (!_ocrEvidenceCacheHit && _mimeType === 'application/pdf' && _documentKey && window.__lastOcrMethod)`, and a full-file grep shows `__lastOcrMethod` is assigned in only three places: 21015 (reset to null every run), 21472 (the scanned dual-OCR path), and 11973 (restore from the cache record). The seed path takes neither, so after adopting the seed the run falls into `if (extractedText && extractedText.length > 100)` at 21211 and banks nothing. Writers of `__resumeExtractedText` are only view_pdf_audit_source.jsx:7693 and AlloFlowANTI.txt:36837 (both load-project handlers) — nothing re-arms it after a failure. The `window.__alloForceOcr` sibling at 21038-21041 is likewise read-and-consumed unconditionally. Hands-off retry loop at view 7011-7029 with `_HANDSOFF_MAX = 3` (6966) confirmed. One material overstatement forces the downgrade from high to medium: 'each of up to 3 retries re-runs the FULL extraction' is false. Attempt 2 runs full OCR but then DOES satisfy 21618 (`__lastOcrMethod` set at 21472) and banks the evidence, so attempts 3 and 4 hit `_readOcrEvidence` at 21145-21156 and skip OCR. The real cost is exactly one redundant full Tesseract+Vision pass into an already-throttled proxy, plus the silent loss of the resume shortcut.

---

## M19 — Watchdog-invalidated stall is classified as "cancelled", so the resumable-incomplete-project bank never runs — the OCR work the feature exists to save is discarded

- **Severity:** medium _(verifier revised from high)_ · **Verdict:** CONFIRMED · **Dimension:** failure-recovery · **Effort:** small
- **Anchor:** `doc_pipeline_source.jsx:24916`

**What breaks**

A 60-page scanned IEP finishes dual OCR (Tesseract + dozens of Vision chunk calls) at minute 6, then Step 2/3 stalls behind a Canvas rate-limit storm. At minute 14 the host's 8-min dead-man switch fires: it aborts `window.__alloPdfFixAbortCtrl` and bumps `window.__alloPdfRunGen` (AlloFlowANTI.txt:18753-18755). The pipeline's next checkpoint throws AbortError; in the catch `_runGenStale()` is true, so `_runWasCancelled` is true and the function returns `null` at 24919 — BEFORE the `window.__lastIncompleteProject` capture at 24927. Because it resolves instead of throwing, the host wrapper takes its SUCCESS branch (AlloFlowANTI.txt:25613-25616), so no failure-history row is written either. The teacher gets only "PDF fix appears stuck and was reset": no unfinished project file, no explanation of what stage died, and no record. The OCR evidence cache is explicitly session-local (doc_pipeline_source.jsx:11860-11864 "deliberately NOT persistent"), so a tab close or reload loses the extraction entirely. This is the exact failure mode (a hard AI stall after extraction) the resumable capture was written for.

**Evidence**

```
24889: `const _runWasCancelled = !!((err && (err.name === 'AbortError' || err.isAbort || err.code === 'ALLO_REMEDIATION_CANCELLED')) || _runGenStale());`
24914-24920:
```
// Cancellation is an ownership outcome, not a failed remediation. Branch before
// resumable capture so a stale run cannot overwrite the current run's recovery slot.
if (_runWasCancelled) {
  if (_silentMode) throw err;
  warnLog('[PDF Fix] Stale run failed (gen ' + _myRunGen + ' != current ' + ... + ') — suppressing failure history, recovery capture, UI writes, and toast.');
  return null;
}
```
24927-24928 (never reached on this path): `if (!_silentMode && typeof extractedText === 'string' && extractedText.trim().length >= 50) { ... window.__lastIncompleteProject = {...} }`
AlloFlowANTI.txt:18755: `window.__alloPdfRunGen = (window.__alloPdfRunGen || 0) + 1;` — the watchdog bumps the same counter a *newer run* would, so the pipeline cannot tell "a newer run took over" (where suppressing is correct) from "the watchdog killed me and nobody else is running" (where suppressing loses the work).
```

**Proposed fix**

In fixAndVerifyPdf's catch, split the two cases before the 24916 return. A newer run owns the pipeline only when `window.__alloActivePdfRemediation` exists AND its `runId !== _runId`; the watchdog path leaves this run's own slot in place (it is cleared in the `finally` at 24992-24996). When the slot is null or still this run's, fall through to the resumable capture and rethrow (or at least run the capture) so `_maybeSaveIncompleteProject` fires and a failure row is recorded. Keep the current suppression only for the genuine supersession case.

**Verifier**

Every cited anchor is exact in the canonical source. doc_pipeline_source.jsx:24889 computes `_runWasCancelled` as `(err.name==='AbortError' || err.isAbort || err.code==='ALLO_REMEDIATION_CANCELLED') || _runGenStale()`; 24916-24920 returns null on that branch (after `if (_silentMode) throw err`), and the `window.__lastIncompleteProject` capture is at 24927-24951, strictly after it. `_runGenStale` (20864-20865) is true when `window.__alloPdfRunGen !== _myRunGen` (claimed at 20726) OR the run's abort signal is aborted. AlloFlowANTI.txt:18755 `window.__alloPdfRunGen = (window.__alloPdfRunGen||0)+1` plus 18757-18763 `window.__alloPdfFixAbortCtrl.abort()` — the watchdog trips BOTH inputs, and it uses the identical counter a newer run claims, so the pipeline genuinely cannot distinguish supersession from watchdog death. I searched for an alternate bank: `__lastIncompleteProject` is written in exactly one place (24935) and cleared at 21024 each run start; the only host reader is `_maybeSaveIncompleteProject` (AlloFlowANTI.txt:25594-25611), reached from both the success branch (25615) and the catch (25642). Resolving null therefore takes the success branch, finds a null bank, and no-ops — and the failure-history row at 25624 is in the catch, so it is skipped too. No guard anywhere prevents this. Two corrections that lower the severity from high to medium: (a) the proposed distinguisher is valid — the watchdog's `fire()` (18726-18768) never clears `window.__alloActivePdfRemediation`, so at catch time the slot still holds this run's runId; (b) the OCR work is NOT unconditionally discarded — the session-local OCR evidence cache banked at 21618 (defined 11860-11871) survives, so a same-session re-run of the same bytes/range/language skips Tesseract+Vision entirely. The real loss is the unfinished-project file, the failure-history row (understating the reliability-gate failure rate), the stage explanation, and the OCR only if the tab is closed or reloaded.

---

## M20 — The 12-minute auto-continue dead-man switch can never fire when the loop starts without a preceding in-session pipeline run

- **Severity:** medium · **Verdict:** CONFIRMED · **Dimension:** run-lifecycle · **Effort:** medium
- **Anchor:** `AlloFlowANTI.txt:19737`

**What breaks**

After a page reload or Canvas re-paste, a teacher uses 'Continue a previous session' to load a project and presses 'Fix N Remaining' / the axe auto-fix button, which calls `runAutoFixLoop` directly (view_pdf_audit_source.jsx:11614, 11652). At that moment `window.__alloActivePdfRemediation` and `window.__alloRemediationProgress` are both undefined (only `fixAndVerifyPdf` / `_emitRemediationProgress` ever write them), so `initialProgressOwner` is null and `watchdogRunId` stays null. The only heartbeats are `_pipeLog` events, and because `runAutoFixLoop` passes no `owner` down (`aiFixChunked(cur.accessibleHtml, _instr, label)` at misc_handlers_source.jsx:1348 supplies no `_control`), `_pipeLog` falls back to the factory-initial `_pipelineStats`, which has no `runId` and no `documentEpoch` key — so every event carries `runId: null` and `documentEpoch: null` and `onActivity` bails at `!detail.runId` before it can adopt a runId. `fire()` then always returns on `!watchdogRunId`. The loop's stuck-flag safety net is therefore completely inert in this entry path: `pdfAutoContinueRunning` (and, per the finding above, `pdfFixLoading`) can never be reset, permanently disabling Start New Audit and the results-panel buttons. In the normal Fix&Verify→auto-continue flow the watchdog only works because it adopts its 'live owner' from `window.__alloRemediationProgress`, a snapshot of an already-COMPLETED run that is never cleared — i.e. the ownership proof is a stale global, not a live one.

**Evidence**

```
AlloFlowANTI.txt:19735-19740
```
    const initialProgressOwner = (typeof window !== 'undefined'
      && (window.__alloActivePdfRemediation || window.__alloRemediationProgress)) || null;
    let watchdogRunId = initialProgressOwner
      && initialProgressOwner.documentEpoch === watchdogEpoch
      ? initialProgressOwner.runId
      : null;
```
AlloFlowANTI.txt:19756-19765 `const superseded = ... || !watchdogRunId || !liveOwner || ...; if (superseded) { warnLog('[PdfFix] Ignoring superseded auto-continue watchdog timeout...'); return; }`
AlloFlowANTI.txt:19777-19783 `const onActivity = (event) => { const detail = event && event.detail; if (!detail || detail.documentEpoch !== watchdogEpoch || !detail.runId) return; ... if (!watchdogRunId) watchdogRunId = detail.runId; ... }`
doc_pipeline_source.jsx:4114 `var _pipelineStats = { apiCalls: 0, visionCalls: 0, totalApiMs: 0, retries: 0, startTime: 0, stepTimes: {}, lastOpenStep: null, lastOpenStepLabel: '' };` — no `runId`, no `documentEpoch`
doc_pipeline_source.jsx:4196-4203 `_pipeLog` derives `_logRunId` / `_logDocumentEpoch` from `(owner && owner.stats) || _pipelineStats`
misc_handlers_source.jsx:1348 `let _fixedHtml = await aiFixChunked(cur.accessibleHtml, _instr, 'auto-continue-ai-round-' + (round + 1));` — no `_control`, so no owner reaches `_pipeLog`
```

**Proposed fix**

Give `runAutoFixLoop` a real ownership identity instead of inheriting a dead run's. At loop entry publish a slot (`window.__alloActivePdfRemediation = { runId: 'autocontinue-' + <id>, documentEpoch: <captured epoch>, startedAt: Date.now() }`) and clear it in the finally when `_ownsExit`; thread that as `owner` into the `aiFixChunked` / `autoFixAxeViolations` `_control` objects so `_pipeLog` stamps heartbeats with it. Also clear `window.__alloRemediationProgress` in `fixAndVerifyPdf`'s finally alongside `_activeRemediationProgress` so no watchdog can adopt a completed run as its live owner.

**Verifier**

The titled claim holds. AlloFlowANTI.txt:19735-19740 and 19756-19765 are quoted accurately, including `|| !watchdogRunId` in the supersession test; onActivity at 19777-19783 bails on `!detail.runId`. In a session with no prior fixAndVerifyPdf (page reload / Canvas re-paste, then in-modal Load Project which restores pdfFixResult and exposes the auto-fix button at view_pdf_audit_source.jsx:11614/11652 → runAutoFixLoop), both `window.__alloActivePdfRemediation` and `window.__alloRemediationProgress` are undefined, so watchdogRunId is null and fire() always returns — the safety net is inert. Sub-claim (c) is also verified and is the sharper defect: grep across canonical files shows `window.__alloRemediationProgress` is written ONLY at doc_pipeline_source.jsx:4181 and cleared NOWHERE (24991 retires only the module-side `_activeRemediationProgress`), so in the normal flow the watchdog's 'live owner' proof is a snapshot of an already-completed run. One evidentiary correction the finding gets wrong in general: `_pipelineStats` is NOT permanently the factory-initial object at 4114 — doc_pipeline_source.jsx:20775 reassigns it (`const _runStats = _pipelineStats = { ... runId: _runId, ... documentEpoch: _runDocumentEpoch ... }`) and never restores it, so after any in-session run the ownerless `_pipeLog` fallback at 4197-4203 DOES stamp runId/documentEpoch. The 'runId: null on every event' argument therefore only holds for the fresh-session path the finding describes — which is the path in the title, so the conclusion survives. Impact requires the loop to hang outright (its finally otherwise clears the flags), which I could not independently establish, but the consequence when it happens is the modal trap documented above. Medium is honest.

---

## L1 — Multi-session resume is tested against a hand-written copy of itself; the real `mergeRangesToFullHtml` — the function whose bug handed a teacher a blank multi-day IEP — has zero invocations in the entire suite

- **Severity:** low _(verifier revised from medium)_ · **Verdict:** CONFIRMED · **Dimension:** test-coverage · **Effort:** small
- **Anchor:** `tests/multisession_dataloss.test.js:15`

**What breaks**

`mergeRangesToFullHtml` is exported (doc_pipeline_source.jsx:37879) but `grep -l mergeRangesToFullHtml tests/*.test.js tests/e2e/*.spec.ts` returns nothing — not one call. The test that exists asserts against local copies of `_multiSessionId` and the `_rangeHtml` accessor, so the stitching itself (preamble/postamble lifting, range sorting, gap markers) is unverified. Concretely reachable today: doc_pipeline_source.jsx:8997 `const sorted = ranges.slice().sort((a, b) => (a.pages[0] || 0) - (b.pages[0] || 0));` dereferences `a.pages[0]` with no guard, so a stored range record missing `pages` throws a TypeError and the whole merge dies — after a teacher has spent multiple sessions remediating a 30-page IEP one range at a time. The 2026-06-20 blank-document class can recur through any of this with the suite green.

**Evidence**

```
tests/multisession_dataloss.test.js:15-19 `const multiSessionId = (filename, fileSize, pageCount, documentDigest) => { const digest = String(documentDigest || '').toLowerCase(); if (!/^sha256:[a-f0-9]{64}$/.test(digest)) return null; return 'msdoc_v2_' + digest.slice(7); };` and :21 `const rangeHtml = (rg) => (rg && (rg.html || rg.remediatedHtml)) || '';` — both local copies of doc_pipeline_source.jsx:5440 and :9032. The remaining 12 lines of that file (:62-75) are `toContain` source pins. Same picture for the other resumability exports: `loadResumableBatch` (doc_pipeline_source.jsx:37906) and `sanitizeRemediationProject` (:37820) have zero matches across all 1385 `tests/*.test.js` and 52 `tests/e2e/*.spec.ts` files.
```

**Proposed fix**

Delete the mirrors and call the real exports: `pipeline.mergeRangesToFullHtml([{pages:[1,5],html:'<html><body><main>A</main></body></html>'},{pages:[11,15],html:'...'}], 20)` asserting both bodies survive, the pages 6-10 gap marker is emitted, out-of-order input is sorted, and a `{html:'...'}` record with no `pages` does not throw. Then add the guard at doc_pipeline_source.jsx:8997: `.sort((a, b) => ((a && a.pages && a.pages[0]) || 0) - ((b && b.pages && b.pages[0]) || 0))`.

**Verifier**

The coverage claim is exactly right. tests/multisession_dataloss.test.js is 77 lines: :15-19 is a local copy of `_multiSessionId` (real one at doc_pipeline_source.jsx:5440-5444) and :21 a local copy of the range accessor (real one at :9032); the rest (:62-76) are `toContain`/`toMatch` source pins. `grep -rln "mergeRangesToFullHtml|loadResumableBatch|sanitizeRemediationProject" tests/` returns nothing — zero invocations of any of the three, though all are exported (doc_pipeline_source.jsx:37879, :37906, :37820). So the stitching itself — sorting, preamble/postamble lifting at :9035-9037, the gap markers at :9038-9044 — has no behavioural test. Line :8997 is quoted verbatim: `const sorted = ranges.slice().sort((a, b) => (a.pages[0] || 0) - (b.pages[0] || 0));`, unguarded. But the 'concretely reachable today' TypeError is NOT established, and that is what the medium severity rested on. Every writer of `record.ranges` is `saveMultiSessionRange` (doc_pipeline_source.jsx:5557), whose only caller is fixAndVerifyPdf at :24761-24766 and always supplies `pages: [_pageRange[0], _pageRange[1]]` — so the multi-day IEP workflow described cannot itself produce a pages-less record, and `loadMultiSession` (:5449) additionally rejects on schema/digest/expiry. The one untrusted route, a hand-edited `.alloflow.json` reaching `setPdfMultiSession(project.multiSession)`, is already guarded: view_pdf_audit_source.jsx:13820-13828 (B2, 2026-06-28) sorts with `((a.pages && a.pages[0]) || 0)`, checks `Array.isArray(_lastRange.pages)`, and toasts 'multi-session range data looks corrupted'. And even on that route :8997 would not be the failure point — the panel render at view_pdf_audit_source.jsx:8607/8609/8617 dereferences `r.pages[0]`/`r.pages[1]` unguarded and would throw first. Also worth noting the specific 2026-06-20 regression IS literal-pinned (:63-65 against `_rangeHtml` and `_extractBodyContent(_rangeHtml(r))`, both confirmed present), so that class cannot silently recur. Severity medium→low.

---

## L2 — The only log a teacher can copy carries no runId and no documentEpoch; the buffer that does carry them has no reader anywhere in the app

- **Severity:** low _(verifier revised from medium)_ · **Verdict:** CONFIRMED · **Dimension:** observability · **Effort:** small
- **Anchor:** `doc_pipeline_source.jsx:4210`

**What breaks**

`_pipeLog` builds a structured entry with `runId` and `documentEpoch` and pushes it to `window._alloflowPipelineWarnings` — but grepping the whole canonical tree, nothing reads that array (only the pipeline writes it, plus one test). The panel a teacher actually copies from renders `window.__alloDiagLog`, which receives only the flattened string `'[DocPipe][' + tag + '] ' + elapsed + ' — ' + msg`. So a pasted field log is one interleaved stream in which you cannot tell which run, which document, or which batch file any line belongs to — and the `+12.4s` elapsed prefix restarts at zero on every new run, so it reads as time travel. Diagnosing the very class of bug fixed on 2026-07-26 (two runs disagreeing about ownership) is impossible from that artifact. The `_logHostDiagnostic` comment asserts the opposite, which is why the gap has persisted.

**Evidence**

```
doc_pipeline_source.jsx:4205-4218:
```
var prefix = '[DocPipe][' + tag + '] ' + elapsed + ' — ';
...
if (data) warnLog(prefix + msg, data);
else warnLog(prefix + msg);
...
var entry = {
  ts: Date.now(), elapsed: elapsed, tag: tag, msg: msg, data: data || null,
  runId: _logRunId, documentEpoch: _logDocumentEpoch,
};
```
doc_pipeline_source.jsx:4236-4240 (the false premise):
```
// Host-side diagnostics sink (2026-07-26). The in-app Log panel — the one place a teacher can
// actually copy from — reads window._alloflowPipelineWarnings, and only _pipeLog writes there.
```
view_pdf_audit_source.jsx:2802 — `const all = (typeof window !== 'undefined' && Array.isArray(window.__alloDiagLog)) ? window.__alloDiagLog : [];`
view_pdf_audit_source.jsx:2862 — `<span className="text-slate-600">{_time(e)}</span>{' '}{e.msg}`
```

**Proposed fix**

Put the identity in the string that actually travels: change the prefix at doc_pipeline_source.jsx:4205 to include a short run tag and epoch, e.g. `'[DocPipe][' + tag + '][' + String(_logRunId || '-').slice(-6) + '/e' + (_logDocumentEpoch == null ? '-' : _logDocumentEpoch) + '] ' + elapsed + ' — '`. Then either point PdfDiagnosticsLog at `_alloflowPipelineWarnings` as the comment claims, or delete that buffer and correct the comment so the next reader is not misled about where field evidence lands.

**Verifier**

The factual claims all hold. doc_pipeline_source.jsx:4205 builds `'[DocPipe][' + tag + '] ' + elapsed + ' — '` with no run identity; 4215-4218 puts runId/documentEpoch only on the `entry` object pushed to window._alloflowPipelineWarnings; and a repo-wide grep for _alloflowPipelineWarnings returns only the pipeline's own writes (4193-4222), the two generated module copies, one test (tests/remediation_run_ownership_visibility.test.js:226) and a handoff .md — no application reader. The comment at 4236-4237 does name the wrong buffer: the panel reads window.__alloDiagLog (view_pdf_audit_source.jsx:2802). Downgraded medium→low because the impact is overstated: the panel stamps every line with wall-clock time (`_time(e)` at 2862, and 2813 in the copied text), run boundaries are visible from the '[fixAndVerifyPdf] Starting' line, and the comment's operational advice (log via _pipeLog to reach the copyable panel) is correct in effect since _pipeLog→warnLog→__alloDiagLog. What remains is a dead 500-entry buffer, a misnamed reference in a comment, and a genuine but purely diagnostic absence of correlation IDs — and the proposed prefix change is closer to an enhancement than a defect.

---

## L3 — _reauditAndScore passes the operation's abort signal as a third argument to the two-parameter auditOutputAccessibility, so the signal is silently dropped

- **Severity:** low · **Verdict:** CONFIRMED · **Dimension:** verification-honesty · **Effort:** small
- **Anchor:** `view_pdf_audit_source.jsx:5113`

**What breaks**

`auditOutputAccessibility` is declared `async (htmlContent, options)` (doc_pipeline_source.jsx:14999). The call site passes `(newHtml, undefined, { signal: _reauditSignal })` — `options` is `undefined` and the signal object is discarded. Inside the audit, `_outputAuditSignal` falls back to the global `window.__alloPdfAbortSignal` (doc_pipeline_source.jsx:15000-15001), which during a canonical re-audit / Additional Sweep / Fix Remaining is not this operation's controller. Result: when the teacher starts a new document or a newer remediation operation supersedes this one, `_remediationOperationIsCurrent` correctly discards the result, but the full chunked Gemini audit (the single most expensive call in the flow, up to 3 self-heal rounds per chunk) keeps running to completion against the Canvas quota. Under an active throttle this also keeps feeding the storm the rest of the pipeline is trying to wait out.

**Evidence**

```
view_pdf_audit_source.jsx:5112-5116:
`      const [_wv, _wa, _wea] = await Promise.all([`
`        _safeAudit(() => auditOutputAccessibility(newHtml, undefined, { signal: _reauditSignal })),`
`        _safeAudit(() => runAxeAudit(newHtml, { signal: _reauditSignal })),`

doc_pipeline_source.jsx:14999-15001:
`  const auditOutputAccessibility = async (htmlContent, options) => {`
`    const _outputAuditSignal = (options && options.signal)`
`      || (typeof window !== 'undefined' ? window.__alloPdfAbortSignal : null);`
```

**Proposed fix**

Change view_pdf_audit_source.jsx:5113 to `auditOutputAccessibility(newHtml, { signal: _reauditSignal })`. (`runAxeAudit`/`runEqualAccessAudit` take only `htmlContent` — the extra options object there is inert, but they are genuinely uncancellable and should either accept a signal or be documented as such.)

**Verifier**

Both anchors exact: view_pdf_audit_source.jsx:5113 `_safeAudit(() => auditOutputAccessibility(newHtml, undefined, { signal: _reauditSignal })),` against doc_pipeline_source.jsx:14999 `const auditOutputAccessibility = async (htmlContent, options) => {` with 15000-15001 falling back to `window.__alloPdfAbortSignal`. I checked whether the fallback happens to be the right controller anyway, which would have refuted the impact: it is not. `window.__alloPdfAbortSignal` is written only by runPdfBatchRemediation (14048/14114), fixAndVerifyPdf (20859), and runAutoFixLoop (misc_handlers 1210), each restoring the slot in its finally (24983-24984, 1519-1520). The view's operation owner never writes it — _beginRemediationOperation (view 3156-3164) delegates to _alloCreateRemediationOperationOwner, whose `begin` (view 125-133) mints an AbortController on the ticket and nothing more. So during a canonical re-audit / Additional Sweep / Fix Remaining the slot is null or a dead prior signal, and the chunked Gemini audit runs uncancellable. The ticket's controller is genuinely aborted on supersession (view 117-124 `cancel` → `owned.controller.abort()`, called from `begin`), so the wasted-spend scenario is reachable. The finding's parenthetical about runAxeAudit/runEqualAccessAudit is also accurate — both are declared with a single parameter (15450, 16321), so the options object there is inert. Low is right: quota waste and storm-deepening, no wrong claim shown to a teacher (the result is still discarded by _remediationOperationIsCurrent).

---

## L4 — The partial-audit "honest reframe" (block D) is unreachable dead code — its guard requires !_aiDegraded, which is false for exactly the partial audits it was written to describe

- **Severity:** low _(verifier revised from medium)_ · **Verdict:** CONFIRMED · **Dimension:** verification-honesty · **Effort:** medium
- **Anchor:** `doc_pipeline_source.jsx:23846`

**What breaks**

When the final AI audit comes back partial (e.g. 29 of 30 sections under a Canvas throttle) but axe + Equal Access audited the full document, the run was designed to keep the min() headline and rewrite the coverage sentence to say so. It cannot: `_aiDegraded` is `!_alloUsableCompleteAiAudit(verification) || _finalAuditScoreMissing`, and `_alloAiAuditHasFullCoverage` returns false whenever `audit._partialAudit === true` — so `verification._partialAudit` is provably false inside the `!_aiDegraded` branch. The run always falls to the `_aiDegraded && deterministicScore !== null` branch instead: the headline is replaced by the deterministic score, `_aiVerificationIncomplete` is set, the after-score is rendered as '—' (view 11081), and the teacher is pushed toward a "Complete final audit" re-run — for a document where 29/30 sections were read and both automated engines covered 100%. `verification._aiReCheckThrottled` is a field that can never be written. A 1-section throttle on a 30-section document is treated identically to a total AI outage.

**Evidence**

```
doc_pipeline_source.jsx:23816-23817  `const _aiDegraded = !_alloUsableCompleteAiAudit(verification) || _finalAuditScoreMissing;` / `if (finalAfterScore !== null && !_aiDegraded && deterministicScore !== null) {`
23846  `        if (verification && verification._partialAudit) {`   // inside that !_aiDegraded branch
23847  `          verification._aiReCheckThrottled = _finalAuditThrottled;`
23858-23860  `verification.summary = … + ' (The AI semantic re-check reached ' + _didSec + ' of ' + _reqSec + ' section(s) … The full document was still verified by the automated ' + _engineNoun + ' (' + _engineList + '), and this headline reflects that complete structural coverage.)'`
23862  `      } else if (_aiDegraded && deterministicScore !== null) {`   // the branch that actually runs

doc_pipeline_source.jsx:40-53:
`function _alloAiAuditHasFullCoverage(audit) { … && audit._partialAudit !== true; }`
`function _alloUsableCompleteAiAudit(audit) { return !!(audit && Number.isFinite(audit.score) && … && _alloAiAuditHasFullCoverage(audit)); }`
```

**Proposed fix**

Split the degraded test so a section-level partial with full deterministic coverage is its own case. Compute `const _aiPartialOnly = !!(verification && verification._partialAudit && Number.isFinite(verification.score) && !verification._scoreDegraded && !verification.synthesized && !_finalAuditScoreMissing);` and move the block-D reframe out of the `!_aiDegraded` branch into a branch keyed on `_aiPartialOnly && deterministicScore !== null`, deciding there whether the coverage shortfall is material enough to suppress the headline. Otherwise delete lines 23846-23861 and `_aiReCheckThrottled` so the file stops advertising a disclosure it never emits.

**Verifier**

The unreachability proof holds and I closed the escape hatch. doc_pipeline_source.jsx:23816 `const _aiDegraded = !_alloUsableCompleteAiAudit(verification) || _finalAuditScoreMissing;`, 23817 opens `if (finalAfterScore !== null && !_aiDegraded && deterministicScore !== null) {`, and 23846 `if (verification && verification._partialAudit) {` sits inside it. 40-46 `_alloAiAuditHasFullCoverage` requires `audited === requested && audit._partialAudit !== true`. I checked whether _partialAudit could be truthy-but-not-`true` (which would slip past `!== true`): the only writer that can reach `verification` is auditOutputAccessibility, and 15363-15365 make it a strict boolean `_partialAudit = _failedChunks > 0` with `chunksAudited: _auditedCount` (15389) necessarily < chunksRequested whenever it is true — so the coverage test fails twice over. 13682's `_sliceIncomplete || undefined` is the BEFORE-audit path and never lands on `verification`. Block D is dead and `_aiReCheckThrottled` (23847) has no reader anywhere in the canonical sources; it appears only in generated copies and tests/output_audit_storm_resilience.test.js:54, which exercises the block directly rather than through the guard. I downgraded severity: the finding's teacher-facing harm ('pushed toward a re-run for a 29/30 document') is not a defect but the currently-intended design, stated explicitly at 23615-23625 — 'By design, a run whose AI audit did not finish shows NO headline score — the score is only earned once the AI rubric has actually read EVERY section' — which superseded the 2026-07-03 reframe. What survives is unreachable code and a field that can never be written: a maintenance/honesty-of-the-source defect, not a wrong claim shown to a teacher.

---

## L5 — `integrityCoverage` is a character-count ratio but is reported to the teacher as "% of the source text preserved in reading order"; no reading-order check ever runs against the source

- **Severity:** low _(verifier revised from medium)_ · **Verdict:** CONFIRMED · **Dimension:** html-integrity · **Effort:** small
- **Anchor:** `doc_pipeline_source.jsx:3043`

**What breaks**

`integrityCoverage` is computed at 24059 as normalized final-text chars / normalized source chars — it is completely order-blind, and a document whose sections were re-ordered or whose columns were interleaved scores 100%. `_alloDistributionVerdict` (rendered by view_pdf_audit_source.jsx:10621 as the teacher-facing "can I hand this out?" strip) turns that number into a reading-order claim, and only flags below 90. `checkReadingOrderPreserved` exists and is exported, but Step 2 never runs it against the deterministic source: the only calls compare HTML-to-HTML inside a single fix pass (6875, 5969) — so a Step-2 transform that scrambles the whole document produces a green verdict and a line telling the teacher reading order was verified.

**Evidence**

```
doc_pipeline_source.jsx:3043
  if (cov != null && cov < 90) review.push('only ' + cov + '% of the source text is preserved in reading order — check the Diff for missing content');

What cov actually measures, doc_pipeline_source.jsx:24047-24059:
          groundTruth = _normIntegrity(_srcRaw).length;
          finalText = _normIntegrity(htmlToPlainText(_finalForIntegrity)).length;
          ...
          integrityCoverage = Math.min(100, Math.round((finalText / groundTruth) * 100));

The order check exists but is never pointed at the source, doc_pipeline_source.jsx:1829:
function checkReadingOrderPreserved(beforeHtml, afterHtml) {
```

**Proposed fix**

Two-part: (1) in `_alloDistributionVerdict`, reword the bullet to "only N% of the source characters are present in the output" so the claim matches the measurement; (2) in the integrity block around 24104, add a real order signal by running `readingOrderSequenceRatio(_srcRaw, htmlToPlainText(_finalForIntegrity))` and pushing a `{ kind: 'readingOrder' }` fidelity note when the ratio drops below a calibrated threshold — then let the verdict cite THAT for its reading-order claim.

**Verifier**

Anchors verified verbatim. doc_pipeline_source.jsx:3043 `if (cov != null && cov < 90) review.push('only ' + cov + '% of the source text is preserved in reading order — check the Diff for missing content');` and the measurement at 24047-24059 `groundTruth = _normIntegrity(_srcRaw).length; finalText = _normIntegrity(htmlToPlainText(_finalForIntegrity)).length; ... integrityCoverage = Math.min(100, Math.round((finalText / groundTruth) * 100))` — a length ratio, order-blind. checkReadingOrderPreserved (1829) is never pointed at the source: every call site (2433, 2573, 2582, 5969, 6875, view_pdf_audit_source.jsx:8980) compares HTML-to-HTML inside a single fix/restyle pass. The verdict strip renders at view_pdf_audit_source.jsx:10613-10639 as claimed. Downgraded medium->low on two corrections: there is no affirmative 'reading order was verified' line anywhere in the verdict — the wrong wording appears ONLY inside the sub-90 warning bullet, whose actionable advice ('check the Diff') is still correct; and the pipeline's own integrityWarning text at 24074 words the same number honestly ('preserves N of M source characters'). The defect is a mislabeled metric in one teacher-facing bullet, not a false all-clear.

---

## L6 — Recovery-probe traffic bypasses `callGemini` entirely, so its calls, latency, and failures appear in no run telemetry and no log the teacher can read

- **Severity:** low · **Verdict:** CONFIRMED · **Dimension:** throttle-gate · **Effort:** small
- **Anchor:** `doc_pipeline_source.jsx:4715`

**What breaks**

During a sustained storm, `waitForGeminiCalm` is reachable from ten call sites (6669, 6826, 12767, 14235, 19774, 19803, 23653, view 5298/7021, misc_handlers 1294) and each invocation can fire several probes, every one carrying a 24,000-64,000 character filler payload into a proxy that throttles by payload volume. None of it is accounted: `_geminiProbe` calls `_rawCallGemini` directly rather than the wrapped `callGemini`, so `apiCalls`, `totalApiMs`, and `terminalFailures` never move, and it never calls `_pipeLog`, so nothing reaches `window._alloflowPipelineWarnings` — the only log surface the in-app panel renders. A maintainer diagnosing a slow run from the panel and the run stats sees a gap: minutes of wall-clock and a real slice of the account's quota window with no calls recorded against them, and no way to tell whether the probes were succeeding or failing.

**Evidence**

```
`_geminiProbe` (4710-4716) — the raw transport, not the instrumented wrapper:
```
    if (typeof _rawCallGemini !== 'function') return Promise.resolve(false);
    ...
    var _prompt = _geminiProbePrompt(o.promptChars);
    ...
      var _u = Promise.resolve().then(function () { return _rawCallGemini(_prompt, false, false, null, null, _sig); });
```
Payload size (4696-4697): `var _targetChars = Math.max(24000, Math.min(64000, Number(promptChars) || 0));`
Compare the accounted path, `callGemini` (5044-5045, 5053-5058):
```
    var callNum = ++_callStats.apiCalls;
    _pipeLog('API→', 'callGemini #' + callNum + ' queued (' + Math.round(promptLen / 1000) + 'KB prompt)', null, _callOwner);
    ...
      _callStats.totalApiMs += dur;
```
`_geminiProbe` accepts `o.owner` (4832 passes `owner: o.owner || null`) but never uses it — there is no `_pipeLog` or stats write anywhere in 4708-4744.
```

**Proposed fix**

Add a dedicated, non-breaker accounting path to `_geminiProbe`: increment `stats.probeCalls` / `stats.probeChars` / `stats.probeMs` on the owner stats (surfaced by `_emitRemediationProgress`'s stats block at 4152-4160), and emit one `_pipeLog('Throttle', 'recovery probe N (' + KB + 'KB) → ok/failed', null, o.owner)` per probe so the Log panel shows why the run paused. Keep it strictly out of `_geminiNoteSuccess`/`_geminiNoteTransientFail` so the 2026-07-24 breaker-neutrality guarantee is preserved.

**Verifier**

Verified at the cited lines. `_geminiProbe` (:4708-4743) uses the raw transport: :4710 `if (typeof _rawCallGemini !== 'function') return Promise.resolve(false);` and :4715 `return _rawCallGemini(_prompt, false, false, null, null, _sig);` — never `callGemini`. Reading the whole body: it consumes only `o.signal`, `o.promptChars`, `o.timeoutMs`, `o.onFailure`; `o.owner` is passed at :4832 (`owner: o.owner || null`) and never referenced, and there is no `_pipeLog` call and no `_callStats`/stats write anywhere in :4708-4743. Contrast `callGemini` :5044-5045 (`var callNum = ++_callStats.apiCalls; _pipeLog('API→', ...)`) and :5053-5058 (`_callStats.totalApiMs += dur;` plus `API-empty`/`API←`). Payload floor confirmed at :4696 `var _targetChars = Math.max(24000, Math.min(64000, Number(promptChars) || 0));`. The log-surface claim checks out at the source: only `_pipeLog` writes `window._alloflowPipelineWarnings` (:4219-4222), stated explicitly in the comment at :4237. TWO CORRECTIONS. First, 'no log' is overstated: `warnLog` pushes into the `window.__alloDiagLog` ring read by the in-app diagnostics panel (AlloFlowANTI.txt:3212-3225), and `waitForGeminiCalm` warnLogs each probe SUCCESS at :4884 plus entry/timeout lines. What is truly silent is probe FAILURE — :4874-4879 `if (!_probeOk) { _probeOkStreak = 0; continue; }` emits nothing — and all per-probe volume/latency/count accounting. Second, the call-site inventory is short: there are 11 `waitForGeminiCalm` sites, not 10 (view_pdf_audit_source.jsx:11317 is omitted), and probes never fire when the recorded failure was a Vision route (`_probeRouteMismatch`, :4817-4826), so the un-accounted volume is smaller than described. Low is correct: a diagnosability gap, not a user-visible or FERPA defect (the filler payload is deliberately content-free).

---

## L7 — A merely-reduced cap is treated as "a storm" at the final-audit sites, contradicting `_geminiThrottleInfo`'s own contract and misattributing a non-throttle coverage shortfall to a rate-limit in the teacher-facing summary

- **Severity:** low _(verifier revised from medium)_ · **Verdict:** CONFIRMED · **Dimension:** throttle-gate · **Effort:** small
- **Anchor:** `doc_pipeline_source.jsx:23606`

**What breaks**

A run's final AI audit comes back partial because one section's response was malformed JSON — no throttle involved, but the cap is still 1 because recovery needs four consecutive representative successes (and per finding 1 may never get them). `_throttleCaused` therefore evaluates true purely on `_geminiCap < _geminiEffectiveMax`, which sets `_finalAuditThrottled = true`. Two things follow: the run enters the circle-back loop and can spend up to 10 minutes (`Date.now() + 600000`, :23627) re-auditing while the status line tells the teacher it is waiting for a rate limit to ease; and the published coverage sentence at :23860 reads "The AI semantic re-check reached 2 of 3 sections — the rest were throttled by a temporary Canvas rate-limit", which is the disclosure R3 explicitly wrote this branch to avoid making falsely. A teacher reading that waits and re-runs the document expecting a full-coverage score; the malformed section will fail identically every time.

**Evidence**

```
`_geminiThrottleInfo`'s documented contract (4640-4643, 4651-4652) deliberately separates the two facts:
```
  // host follow-up loops. "storming" = an ACTIVE cooldown or a live tripped failure streak. A reduced
  // cap alone is deliberately NOT storming: the cap recovers as calls SUCCEED ...
      capped: _geminiCap < _geminiEffectiveMax,
      storming: cooldownRemainingMs > 0 || _geminiAuthStreak >= _GEMINI_STORM_TRIP || ...
```
But four sites re-derive "storm" from `capped` instead of calling it — 19935-19936, 23573-23574, 23580-23581, and 23604-23606:
```
        const _throttleCaused = _finalAuditThrottled
          || (typeof _geminiCooldownUntil === 'number' && _geminiCooldownUntil > Date.now())
          || (_geminiCap < _geminiEffectiveMax); // R7: cap forced BELOW the run ceiling = a storm (robust vs pacing-to-1)
```
which flows straight into the user-facing text (23851-23860):
```
          // and attribute the shortfall to a rate-limit ONLY when the partial was throttle-caused.
          ...
          const _reason = _finalAuditThrottled
            ? 'the rest were throttled by a temporary Canvas rate-limit'
            : 'the rest could not be re-checked (the response was empty or malformed)';
```
and into the machine-readable basis at 23875-23876 (`finalAuditReason: ... 'final-audit-throttled'`, `finalAuditThrottled: !!_finalAuditThrottled`).
```

**Proposed fix**

Make `_geminiThrottleInfo` the single source of this fact. Replace the four hand-rolled `(_geminiCooldownUntil > Date.now()) || (_geminiCap < _geminiEffectiveMax)` expressions (19935, 23573, 23580, 23605) with `_geminiThrottleInfo().storming`. If the R7 intent — "a cap forced below the ceiling right after a storm still counts" — is needed, add an explicit time-bounded field to `_geminiThrottleInfo` (e.g. `recentlyThrottled: Date.now() - _lastStormTripAt < 120000`) and use that, so the user-facing attribution at 23855 and the loop decisions agree on one definition instead of three.

**Verifier**

All four re-derivation sites exist at the cited lines — `_geminiCap < _geminiEffectiveMax` appears at exactly :4565, :4651 (inside `_geminiThrottleInfo`), :19936, :23574, :23581 and :23606. The contract comment is verbatim at :4641-4643 ('A reduced cap alone is deliberately NOT storming') and `storming` at :4652 omits the cap term, while :23604-23606 `const _throttleCaused = _finalAuditThrottled || (_geminiCooldownUntil > Date.now()) || (_geminiCap < _geminiEffectiveMax);` includes it. The flow is real: :23608 `_finalAuditThrottled = true;` → :23855-23857 `const _reason = _finalAuditThrottled ? 'the rest were throttled by a temporary Canvas rate-limit' : 'the rest could not be re-checked (the response was empty or malformed)'` → spliced into `verification.summary` at :23858-23860. A malformed-JSON section really does produce `_partialAudit`: `auditOutputAccessibility` counts any chunk that failed to return or parse as failed (:15363-15365 `const _failedChunks = chunks.length - _auditedCount; const _partialAudit = _failedChunks > 0;`), so the branch is reachable with no throttle on the failing section. TWO SOFTENERS. First, `_geminiCap < _geminiEffectiveMax` cannot be true without a storm somewhere: `_applyGeminiPacing` is only ever called with heavy=true (:13346, :20543, :20825) and always clamps `_geminiCap` DOWN to the new ceiling (:4617), and `_resetGeminiBreaker` sets both equal (:4587, :4596) — so the sentence is stale rather than fabricated; the run WAS throttled, just not on the missing section. Second, the 10-minute-grind consequence is not independent: :23689-23690 breaks the circle-back after one non-improving round whenever `_geminiThrottleInfo().storming` is false, so the grind only materializes when finding 1's stuck-wave defect is also present. The coverage numbers ('reached 2 of 3 sections') stay honest either way. Downgrading medium→low: a stale causal attribution in one disclosure sentence, requiring a prior in-run storm plus a non-throttle parse failure, with no effect on the score or the coverage claim.

---

## L8 — window.__alloRemediationProgress is never cleared, so every new document logs a false 'progress events dropped' epoch-mismatch diagnostic

- **Severity:** low _(verifier revised from medium)_ · **Verdict:** CONFIRMED · **Dimension:** run-lifecycle · **Effort:** small
- **Anchor:** `view_pdf_audit_source.jsx:3104`

**What breaks**

`_emitRemediationProgress` writes `window.__alloRemediationProgress = next` on every emission but nothing ever clears it — `fixAndVerifyPdf`'s finally retires only the module-side `_activeRemediationProgress` (L24991). So after a run on document epoch 3 completes, the global keeps `{version:1, status:'complete', runId:'run-…', documentEpoch:3}` indefinitely. When the teacher loads the next document, the epoch bumps to 4, the modal remounts on its epoch key (AlloFlowANTI.txt:40857) and the effect at L2974 replays the stale snapshot through `onProgress`. The snapshot has `version === 1` and a non-matching documentEpoch, so the very first thing the new document's modal does is emit, into the in-app Log panel a teacher is asked to copy from, the alarming and false line: 'Progress events dropped — the run reports documentEpoch 3 but this modal owns 4. The live activity log stays empty for this run; remediation itself is unaffected.' Nothing was dropped and no run exists. This poisons the exact diagnostic added on 2026-07-26 to triage this bug class: a field report from a healthy session will contain an EpochGate warning for every document opened, and a real gate failure becomes indistinguishable from the noise.

**Evidence**

```
doc_pipeline_source.jsx:4180-4183 `if (typeof window !== 'undefined' ...) { window.__alloRemediationProgress = next; window.dispatchEvent(new CustomEvent('alloflow:remediation-progress', { detail: next })); }` — write-only, no clear anywhere in the file
doc_pipeline_source.jsx:24991 `if (_activeRemediationProgress && _activeRemediationProgress.runId === _runId) _activeRemediationProgress = null;` (module slot only)
view_pdf_audit_source.jsx:3101-3106
```
    // Progress starts synchronously, so a newly mounted view can otherwise miss the first event
    try {
      const latest = window.__alloRemediationProgress;
      if (latest) onProgress({ detail: latest });
    } catch (_) {}
```
view_pdf_audit_source.jsx:3027-3029 `const onProgress = (e) => { if (e && e.detail && e.detail.version === 1 && !_eventIsForCurrentDocument(e)) _noteEpochMismatch(e.detail); if (!_eventIsForCurrentDocument(e) || e.detail.version !== 1) return;`
view_pdf_audit_source.jsx:3009-3025 `_noteEpochMismatch` → `_docPipeline.logHostDiagnostic('EpochGate', note, {...})` → `_pipeLog` → `window._alloflowPipelineWarnings.push(entry)` (doc_pipeline_source.jsx:4241-4249, 4219-4223)
```

**Proposed fix**

Two independent guards. In `fixAndVerifyPdf`'s finally (doc_pipeline_source.jsx:24989-24996), clear the window mirror with the same runId ownership test used for `_activeRemediationProgress`: `if (window.__alloRemediationProgress && window.__alloRemediationProgress.runId === _runId) window.__alloRemediationProgress = null;`. And in the view's hydration at L3103-3106, skip the mismatch report for the replay path — call the gate directly (`if (latest && _eventIsForCurrentDocument({ detail: latest })) onProgress({ detail: latest })`) so only genuine live events can raise EpochGate.

**Verifier**

Mechanism verified end to end. doc_pipeline_source.jsx:4180-4183 writes `window.__alloRemediationProgress = next` (with `version: 1` from 4162 and the run's `documentEpoch` carried through from 20792); grep across the canonical files shows no clear anywhere — 24991 retires only the module-side `_activeRemediationProgress`. view_pdf_audit_source.jsx:3103-3106 replays it unconditionally (`const latest = window.__alloRemediationProgress; if (latest) onProgress({ detail: latest });`), and onProgress at 3028 fires `_noteEpochMismatch` BEFORE the gate at 3029. `_noteEpochMismatch` (3009-3026) routes into `_docPipeline.logHostDiagnostic('EpochGate', ...)` → `_pipeLog` → `window._alloflowPipelineWarnings` (doc_pipeline_source.jsx:4241-4249, 4219-4223), the only buffer the in-app Log panel reads. The effect's dep is `[pdfDocumentEpoch]` (3117) and AlloFlowANTI.txt:40856-40857 keys the modal on `'pdf-audit-document-' + pdfDocumentSelectionEpochRef.current`, so the effect re-runs per document and replays the previous document's terminal snapshot — one false 'Progress events dropped' line per document from the second document onward. Downgraded to low: the gate at 3029 still returns before `setRemediationProgress`, so nothing is rendered from the stale snapshot and no run, score, or coverage claim is affected. The harm is confined to false noise in a diagnostic buffer, which degrades triage but does not mislead about accessibility or lose work.

---

## L9 — window.__alloForceOcr is armed before fixAndVerifyPdf and never cleared when the call is rejected, so the next run silently force-re-OCRs the whole document

- **Severity:** low _(verifier revised from medium)_ · **Verdict:** PLAUSIBLE · **Dimension:** run-lifecycle · **Effort:** small
- **Anchor:** `view_pdf_audit_source.jsx:13679`

**What breaks**

`_reRun` sets `window.__alloForceOcr = force` and then fires `fixAndVerifyPdf(...).catch(() => {})`. Two of the three ways that call can bail early clear the flag (no base64 at L13677, stale epoch at L13678); the rejection path does not. The Re-OCR buttons are gated only on bare `pdfFixLoading` (L13687, L13690), not on `_remediationBusy` and not on `pdfAutoContinueRunning` — so during a managed batch (which never touches `pdfFixLoading`, and for which `isRemediationRunning()` deliberately reports false) or during a run whose one-shot `setPdfFixLoading(true)` was lost, the button is armed. The click reaches `_wrapFixAndVerify`, which rejects with `RemediationAlreadyRunningError`; the `.catch(() => {})` swallows it and the teacher sees only 'the duplicate start was ignored'. `window.__alloForceOcr` stays set to 'all'. The NEXT run to reach doc_pipeline_source.jsx:21038 consumes it and re-OCRs the entire PDF, ignoring a perfectly good embedded text layer — many minutes of Tesseract + Vision quota, and per the button's own confirm copy it 'REPLACES your current results' — with no dialog, no warning, and no way for the teacher to connect it to a click they made earlier.

**Evidence**

```
view_pdf_audit_source.jsx:13675-13680
```
                          try { window.__alloForceOcr = force; } catch (_) {}
                          const fb = await ensurePdfBase64();
                          if (!fb) { try { window.__alloForceOcr = null; } catch (_) {} return; }
                          if (typeof isPdfDocumentIntakeCurrent === 'function' && !isPdfDocumentIntakeCurrent(_rescanDocumentEpoch)) { try { window.__alloForceOcr = null; } catch (_) {} return; }
                          if (pdfPageRange && ...) fixAndVerifyPdf({...}).catch(() => {});
                          else fixAndVerifyPdf({ documentEpoch: _rescanDocumentEpoch, base64: fb, fileName: pendingPdfFile?.name }).catch(() => {});
```
view_pdf_audit_source.jsx:13687 `<button onClick={() => _reRun({ pages: _lowPages })} disabled={pdfFixLoading} ...` and 13690 `<button onClick={() => _reRun('all')} disabled={pdfFixLoading} ...` (bare flag, unlike the converted Fix & Verify at 9031 which uses `_remediationBusy`)
doc_pipeline_source.jsx:37731-37738 `if (_activeSingleFixPromise) { var duplicateError = new Error('A remediation run is already in progress.'); ... return Promise.reject(duplicateError); }`
doc_pipeline_source.jsx:21037-21042 `const _fo = window.__alloForceOcr; if (_fo === 'all') _forceFullOcr = true; ... if (_fo != null) window.__alloForceOcr = null;` — consumed by whichever run reaches Step 1 next
```

**Proposed fix**

Wrap the launch so the flag is owned by the attempt, not by the window: `try { window.__alloForceOcr = force; await fixAndVerifyPdf({...}); } catch (_) {} finally { if (window.__alloForceOcr === force) window.__alloForceOcr = null; }` — and have the pipeline clear it only when it actually consumes it (it already does). Separately, change both Re-OCR buttons' `disabled={pdfFixLoading}` to `disabled={_remediationBusy || pdfAutoContinueRunning}`, matching the Fix & Verify button, since `_reRun` starts the same pipeline call.

**Verifier**

The mechanism is real and correctly anchored: view_pdf_audit_source.jsx:13675-13680 sets `window.__alloForceOcr = force` and clears it on the two early returns (13677 no base64, 13678 stale epoch) but the launch at 13679/13680 is `fixAndVerifyPdf({...}).catch(() => {})` with no finally, and 13687/13690 are `disabled={pdfFixLoading}` while Fix & Verify at 9031 uses `disabled={_remediationBusy || ...}`. The rejection at doc_pipeline_source.jsx:37731-37738 and the consume-once at 21037-21042 are exact. I also confirmed the harm is real when it triggers: a flag-forced `_forceFullOcr` leaves `_garbledFallbackText` null (21030/21036 — it is only populated by the garbled-layer detector at 20418-20420 or the seed path at 21194-21195), so the junk-ratio fallback at 21464-21466 cannot restore a good embedded text layer. What I could not establish is reachability. The finding's first trigger (managed batch) appears unreachable: the batch flow runs under `pdfAuditResult._choosing` (AlloFlowANTI.txt:19949) and view_pdf_audit_source.jsx:5966 makes the whole modal body a `_choosing ? ... : ...` ternary, so the single-file Re-OCR block at 13655 is not rendered during a batch. The second trigger ('a run whose one-shot setPdfFixLoading(true) was lost') is the bug that was fixed on 2026-07-26 and is now self-healing via the heartbeat at doc_pipeline_source.jsx:4176-4179. What remains is a genuine but narrow race: `_wrapFixAndVerify` claims the lock synchronously (37743-37744) while `setPdfFixLoading(true)` happens only at 20838, after `await _documentDigest(_base64)` at 20727 — so there is a window in which the pipeline lock is held, `pipelineRunActive` can already be true, and the Re-OCR button (gated on bare pdfFixLoading) is still armed; a click in that window, or a stale-document throw at 20734-20741, leaves the flag set for the next run. Real defect in the flag's ownership, but the trigger needs a race, and the worst case is wasted OCR time/quota plus possibly worse extracted text — no false accessibility claim. Downgraded to low.

---

## L10 — A batch file whose cancellation drain exceeds 30s aborts the entire remaining batch, justified by a pipeline lock the batch never holds

- **Severity:** low _(verifier revised from medium)_ · **Verdict:** PLAUSIBLE · **Dimension:** failure-recovery · **Effort:** small
- **Anchor:** `doc_pipeline_source.jsx:14148`

**What breaks**

When a file exceeds its 8-minute wall, `_processOne` aborts the file controller and then waits up to 30s for `_fixPromise` to settle. A wedged Gemini transport can outlast that easily — `_geminiCall` holds its gate slot up to 45s past a 120-180s timeout (4954), and the underlying fetch only unwinds if the Canvas proxy honors the signal. On drain timeout it throws `BatchRemediationDrainError`, and the batch loop `break`s at 14210, leaving every remaining file unprocessed ("Batch paused safely"). The stated reason — "advancing would make every later file fail spuriously with RemediationAlreadyRunningError" — cannot happen, because the batch calls the unwrapped `fixAndVerifyPdf` (line 14125) and therefore never takes `_activeSingleFixPromise`. So a teacher batching 50 IEPs overnight can lose files 11-50 to one slow scan, for a hazard that does not exist on this code path.

**Evidence**

```
14141-14156:
```
} catch (_fixErr) {
  // The timeout race does not cancel its operand. Abort first, then wait for the
  // managed run to release the shared lock before the next file can enter. A
  // bounded drain failure pauses the batch; advancing would make every later
  // file fail spuriously with RemediationAlreadyRunningError.
  try { _fileCtrl.abort(); } catch (_) {}
  try {
    await _withTimeout(Promise.resolve(_fixPromise).then(() => null, () => null), 30000, 'batch remediation cancellation drain');
  } catch (_drainErr) {
    const handoffError = new Error('The timed-out remediation did not stop within 30 seconds. ...');
    handoffError.code = 'ALLO_BATCH_REMEDIATION_DRAIN_TIMEOUT';
```
14206-14210: `if (err && err.code === 'ALLO_BATCH_REMEDIATION_DRAIN_TIMEOUT') { _batchHandoffStopped = true; ... break; }`
37731-37738 (the lock the comment refers to) is only entered via `_wrapFixAndVerify`, which 14125 does not go through.
```

**Proposed fix**

Either route the batch through the wrapped entry point (see the bypass finding) so the drain guards a real lock, or stop letting a drain timeout end the batch: mark the file `failed` with the drain note and `continue` to the next file, since the aborted run holds nothing the next file needs. Keep the `break` only if the wrapped lock is genuinely still held (`_docPipeline.getActiveRemediationRun()` non-null).

**Verifier**

The literal code claims check out: doc_pipeline_source.jsx:14141-14156 aborts `_fileCtrl` then `_withTimeout(..., 30000, 'batch remediation cancellation drain')`, throwing `ALLO_BATCH_REMEDIATION_DRAIN_TIMEOUT`; 14206-14210 sets `_batchHandoffStopped` and `break`s; the comment's stated hazard ('every later file fail spuriously with RemediationAlreadyRunningError') is indeed impossible because 14125 bypasses `_wrapFixAndVerify`/`_activeSingleFixPromise` (37731-37738), and the 45s post-timeout slot hold at 4947-4954 is real, so exceeding a 30s drain is achievable. Two things gut the impact claim. First, the `break` has an independent and valid justification the finding does not address: the H7 comment at 14099-14108 documents that a wall-orphaned run that has NOT unwound becomes a zombie under the next file, re-stamping `__lastGroundTruth*`/`__lastOcr*` and re-tripping the shared breaker — that hazard survives the lock correction. Second, 'a teacher batching 50 IEPs overnight can lose files 11-50' is false. On this path the loop exits with `pending.length > 0`, so 14355-14360 sets summary status 'interrupted', the else branch at the Tier-4 cleanup calls `_persistBatchStatus()` rather than `_clearActiveBatch`, and the toast reads 'Batch paused safely: a timed-out file is still shutting down… Remaining files stay queued for Resume.' Nothing is lost; an unattended batch pauses and needs a manual resume. Worst case is a workflow interruption plus an inaccurate code comment.

---

## L11 — runAutoFixLoop's re-entry guard resolves undefined, so the hands-off wrapper counts a rejected loop as a completed round and posts a false "retrying the loop" progress toast

- **Severity:** low · **Verdict:** PLAUSIBLE · **Dimension:** failure-recovery · **Effort:** small
- **Anchor:** `misc_handlers_source.jsx:1201`

**What breaks**

If a prior auto-continue loop still owns `pdfAutoContinueAbortCtrlRef.current`, `runAutoFixLoop` toasts and returns `undefined` without running a single round. The hands-off wrapper awaits it, sees a resolved promise, reads `r = pdfFixResultRef.current`, finds the score unchanged-but-above `_prevScore` (-1 on the first iteration), increments `_loopTries`, posts "🔁 Hands-off mode — below target; retrying the loop (1/3, 72/100...)" and sleeps 1.5s — then does it again. The teacher sees the run reporting progress rounds that never executed, and the wrapper's bounded-retry budget is spent on no-ops.

**Evidence**

```
misc_handlers_source.jsx:1201: `if (pdfAutoContinueAbortCtrlRef.current) { addToast(t('toasts.auto_continue_already_running') || 'Auto-continue is already running — use Stop first if you want to restart.', 'info'); return; }`
view_pdf_audit_source.jsx:7043-7056:
```
while (!_aiThrottledClean && r && r.axeAudit && ((r.afterScore || 0) < pdfTargetScore || r.axeAudit.totalViolations > 0) && _loopTries < _HANDSOFF_MAX && ...) {
  try { await runAutoFixLoop(8); }
  ...
  r = pdfFixResultRef.current;
  const _s = r ? (r.afterScore || 0) : 0;
  if (!r || _s >= pdfTargetScore || _s <= _prevScore) break;
  _prevScore = _s; _loopTries++;
  addToast('🔁 ' + (... 'Hands-off mode — below target; retrying the loop') + ' (' + _loopTries + '/' + _HANDSOFF_MAX + ...);
```
```

**Proposed fix**

Have the re-entry guard return a sentinel the caller can test (e.g. `return { started: false, reason: 'already-running' }`, with the normal path returning `{ started: true }`), and in the hands-off wrapper `break` immediately when `started === false` instead of counting the iteration and toasting a retry.

**Verifier**

misc_handlers_source.jsx:1201 is verbatim — the guard toasts and bare-`return`s, so the caller cannot distinguish 'ran and plateaued' from 'never started'. view_pdf_audit_source.jsx:7043-7056 is also verbatim. But the finding's own trace is wrong at the key step: it claims the wrapper 'does it again'. With `_prevScore = -1`, iteration 1 passes the guard (`_s <= _prevScore` false), increments `_loopTries`, and toasts; iteration 2 then hits `_s <= _prevScore` (score unchanged, now equal to the just-assigned `_prevScore`) and breaks at 7053. So the cost is exactly one spurious 'retrying the loop (1/3)' toast and one 1.5s sleep — the retry budget is not 'spent on no-ops', only one no-op occurs. Reachability is also narrow: `pdfAutoContinueAbortCtrlRef.current` is cleared in the loop's finally at 1503-1517 whenever `_ownsExit`, and also nulled by the auto-continue watchdog (AlloFlowANTI.txt:19771) and the reset paths (19106, 19204); the hands-off chain awaits each `runAutoFixLoop` to settlement, so tripping the guard requires a user-started concurrent loop from view 11614 or 11652 landing inside the wrapper's window — and if the user had pressed Stop instead, `_stopped()` would keep the while-loop from ever running. Real but minor; low is right.

---

## L12 — The auto-fix loop's commit-or-revert and progress decisions are tested only through hand-written mirrors, while the one real behavioural test covers the happy path alone — no abort, no revert, no stagnation

- **Severity:** low _(verifier revised from medium)_ · **Verdict:** PLAUSIBLE · **Dimension:** test-coverage · **Effort:** medium
- **Anchor:** `tests/autofix_loop_noise_robust.test.js:21`

**What breaks**

`shouldRevert` and `progressed` in the test are local copies of misc_handlers_source.jsx:1279 and :1428-1432. They pass forever no matter what the shipped loop does; the only tie to reality is adjacent `toContain` pins on neighbouring lines, which today are the same class of assertion that already failed silently in finding #4. If the real `_detRegressed` threshold or the `_progressed` stagnation counter drifts, a teacher's 10-minute auto-continue either reverts genuinely improved rounds (the 2026-06-15 bug this file was written for) or stops two rounds short of target, and both suites stay green. Separately, `pdfAutoContinueAbortRef.current = true` — the Stop button — is never set true in any test, so nothing verifies that pressing Stop actually exits the loop.

**Evidence**

```
tests/autofix_loop_noise_robust.test.js:21-25 `const shouldRevert = (detNew, detPrev, issuesNew, issuesPrev, vio) => { const detRegressed = (detNew !== null) && (typeof detPrev === 'number') && detNew < (detPrev - 1); ... };` and :28-30 `const progressed = (vio, lastVio, det, lastDet, issues, lastIssues) => vio < lastVio || ...`. The real code: misc_handlers_source.jsx:1428 `const _detRegressed = (_det !== null) && (typeof _curDet === 'number') && _det < (_curDet - 1);`, :1432 `if (!result._auditOnly && (_detRegressed || _moreIssues)) {` — note the mirror has no `_auditOnly` term at all — and :1279 `const _progressed = _vio < lastViolations || ...`. tests/remediation_autoloop_dependencies.test.js:74 proves the real loop is fully injectable (`await runAutoFixLoop(1, {...})` with 30 stubbed deps), yet the file contains exactly one `it(...)`, the success path, ending at :136.
```

**Proposed fix**

Extend tests/remediation_autoloop_dependencies.test.js with four more cases driving the real `runAutoFixLoop`: (a) `finalizeRemediationRound` returns a lower `_detScore` → assert the round is reverted and `pdfFixResultRef.current.accessibleHtml` is unchanged; (b) two rounds with no reliable improvement → assert it breaks after `stagnantRounds >= 2`; (c) set `pdfAutoContinueAbortRef.current = true` from inside an `aiFixChunked` stub → assert `setPdfAutoContinueRunning(false)` and no further rounds; (d) `_auditOnly` round with a regression → assert no revert. Then delete the mirrors at :21-30.

**Verifier**

The coverage gaps are real but the harm argument does not survive checking. Verified true: the mirrors at tests/autofix_loop_noise_robust.test.js:21-25 and :28-29 are local arrow functions with no `_auditOnly` term, against real code at misc_handlers_source.jsx:1279 (`const _progressed = ...`), :1428 (`const _detRegressed = ...`), :1431 (`_moreIssues`) and :1432 (`if (!result._auditOnly && (_detRegressed || _moreIssues)) {`); `grep -rn "stagnantRounds" tests/` returns nothing, so the `if (!_progressed) { stagnantRounds++; if (stagnantRounds >= 2) break; }` threshold at misc_handlers_source.jsx:1280 is genuinely unpinned; and no test ever sets `pdfAutoContinueAbortRef.current = true` at runtime (all 15 grep hits are `toContain`/`toMatch` source pins, and the only runtime writes — tests/remediation_intake_hardening.test.js:327/:355 — set it to false). But two load-bearing claims are wrong. (1) 'If the real `_detRegressed` threshold or the `_progressed` stagnation counter drifts... both suites stay green' — false for the two expressions named: tests/autofix_loop_noise_robust.test.js:88, :91 and :93 pin those exact literals character-for-character, and I confirmed all three still match the shipped source, so any drift in them turns the file red immediately. (2) 'the one real behavioural test covers the happy path alone' — tests/remediation_intake_hardening.test.js:320, :394 and :409 all invoke the real `runAutoFixLoop(1, deps)` with a 30-key injected dep bag and assert failure-ownership behaviour (rejected round clears flags and autosaves; a generation bump suppresses the autosave and the flag clears; a deferred run A cannot announce over run B). Worst case of the residual gap is a loop that reverts a good round or stops short — a less-remediated document, honestly scored — not a false claim or lost work, hence medium→low.

---

## Refuted — recorded so it is not re-raised

- **[html-integrity]** AI-derived image descriptions are embedded in inline `on*` handler JS strings after stripping only backslash and quotes — HTML entities and raw newlines break out of the string
  - The code is exactly where the finding says (doc_pipeline_source.jsx:22539 `const _altSafe = desc.replace(/\\/g,'').replace(/"/g,'').replace(/'/g,'');` interpolated at 22554/22555; the twin at doc_builder_renderer_source.jsx:224), but the described failure does not occur. (1) The central mechanism is wrong: an HTML attribute value is delimited by the literal quote character, and character references are decoded AFTER the value is delimited — `"` is six ordinary characters and cannot terminate `ondrop="..."`, so no 'remainder becomes new attributes / injected onmouseover' is possible. Only `'` would decode into the JS single-quoted string, and a raw newline would be a JS SyntaxError — both merely break the handler, they do not escape the attribute. (2) The cited sink is unreachable: 22539-22555 live inside the `bodyContent.replace(/<figure data-img-placeholder="true".../)` callback at 22487, which matches zero figures (finding 1), so this code never executes. (3) The one live twin (renderer:224) is neutralized before shipping: every on* attribute on the model-authored fragment is removed at 2311-2314 via _alloSanitizeRemediationBodyFragment (22470), so the interpolated JS is never parsed or run, and an injected `onmouseover` would be removed by the same pass. No XSS surface and no reachable handler breakage exists today; downgraded to low as a latent hygiene issue only.

## Unmatched — surveyed but the verifier returned no verdict (UNREVIEWED)

- **[observability]** pipelineStats is frozen at the primary pass: auto-continue rounds bump `passes` but never apiCalls/totalApiMs/durationMs, so the history and CSV understate real cost — `doc_pipeline_source.jsx:5843`
  - `_finalizeRemediationRound` is the canonical merge for every accepted auto-continue round, and it increments `autoFixPasses` while carrying the previous `pipelineStats` through unchanged (`Object.assign({}, cur, {...})` never touches that key; `pipelineStats` is written only at doc_pipeline_source.jsx:24671 and 24904). The history row is then upserted from the same stale object. A document that took 40 minutes and ~90 API calls across 8 auto-continue rounds exports as e.g. `passes=9, api_calls=18, duration_s=210` — the numbers Aaron uses to reason about per-document cost and about which stage burns quota. The `duration_s` column in particular is wrong by an order of magnitude on exactly the hard documents.
