# Remediation pipeline deep dive #2 — 2026-07-02 (Fable)

Four read-only review agents swept the dimensions no prior audit had covered:
(1) architecture/duplication, (2) fix-loop convergence + API cost + statistics,
(3) DOCX/PPTX ingestion + OCR reconciliation + resume state machine,
(4) performance/memory/main-thread. Complements docs/deep_dive_2026-07-01_findings.md
(AI/prompt, hostile input, batch/scale — most of that queue already fixed @eac0ea12).

**Line-number caveat:** a concurrent session was editing this tree during the sweep
(doc_pipeline_source.jsx grew 29,579 → 30,471 physical lines mid-review;
view_pdf_audit_source.jsx 14,506 → 14,711 with uncommitted mods). Re-grep every
line ref before editing. VERIFIED = re-confirmed by me this session;
REPORTED = agent-cited with file:line, needs the usual reachability check before fixing.

**Verified healthy (no action):** pdf.js destroy() discipline at all 8 getDocument
sites; fix-loop HTML retention bounded (snapshot/best/current only); SD uses n−1,
SEM=SD/√n, adaptive auditors feed the mean correctly; rubric override applied
per-auditor before the mean; password-PDF abort + DOCX tracked-changes detection
honest; chunk resume validates content via per-chunk srcFp; repeat-run audit cache
(_auditCacheKey) in place; main fix loop has correct keep-best + revert since 2026-06-19.

## Cluster H — output honesty / correctness (highest value)

- H1 VERIFIED (HIGH): **Office embedded images + authored alt text dropped from
  remediated output while toast claims "preserved."** mediaImages collected
  (doc ~7697-7737, ~7945) is consumed ONLY by the audit preview (~8453);
  Fix & Verify uses det.fullText only (~14790); Step 1b fires Vision with an
  Office MIME the audit path itself documents as unsupported (~8355, ~15322) and
  the failure is swallowed. PPTX authored alts are deliberately excluded from
  [Image:] markers (~7947-7953); DOCX extractor emits no alt markers at all.
  Toast at ~8500 ("N embedded image(s) preserved") is FALSE for remediation.
  Fix: inject figure markers/data from det.mediaImages into the transform input
  (or splice post-transform by SLIDE marker); stop suppressing authored alts.
- H2 REPORTED (HIGH): **.alloflow.json v2 resume matches re-upload by FILENAME
  only** (no size/pagecount/fingerprint in the v2 shape, ANTI ~16649-16673; seed
  gate `_seed.fileName === _fileName` doc ~14989). Different "scan.pdf" re-uploaded
  → previous document's text ships as this document's remediation (scanned docs
  have empty det text, so the seed always wins). _alloDocFingerprint (~965) exists
  for exactly this class. Fix: persist fileSize + fingerprint in v2; require match.
  Also fixes: resumed projects rebuild pendingPdfFile with no size (view ~4773) →
  msdoc_/chunk-session/score-trend keys computed with size=0 and all resumed docs
  named 'resumed-project.pdf' collide on the same msdoc_ key.
- H3 REPORTED (HIGH): **mixed scanned+digital OCR rescue bypasses every disclosure
  net.** Rescue splices Tesseract text into det.pages (~14865-14884) but leaves
  groundTruthMethod='pdfjs' (~14847), which the OCR-accuracy scan skips
  (~20353-20363); isScanned stays false; per-page confidence discarded (~7492);
  no junk-gate unlike ForceOCR (~14955). Garbled rescue pages ship as ground truth
  with no banner/accuracy chip. Fix: mark rescued pages method+source, run the
  same confidence/junk/accuracy nets, junk-gate adoption.
- H4 VERIFIED (reachable via ANTI ~16861): **runAutonomousRemediation has no
  snapshot/revert/keep-best** (doc ~23258-23371) — plateau only STOPS, never
  restores a higher-scoring earlier pass; a degrading surgical pass ships. Port
  the main loop's bestHtml promotion.
- H5 REPORTED: **target gating vs shipped headline mismatch** — loop stops on raw
  AI mean ≥ target && axe==0 (~17562) but headline is min(AI, axe, EqualAccess)
  (~17905-17930, EA runs only post-loop) → "target 95 reached" can display 88.
  Plus the "Final audit diverged" warning compares against PRE-loop afterScore
  (~17088 vs ~17944) so every successful remediation logs a spurious divergence.
- H6 REPORTED: **tag-tree inspector shows a different walk than the emit.**
  _TAG_TO_PDF_ROLE map is sentinel-tested (good), but _buildTagOutline
  (view ~1683, querySelectorAll + own skip rules) diverges from createTaggedPdf's
  TreeWalker semantics (figure-wrapping-img skipped, footnote li→Note, doc
  ~20000-20020). Inspector can show a Figure the emit skips; never shows Note.
  Fix: export the pipeline's walk; extend sentinel to _deriveDocMeta (view ~1651).
- H7 REPORTED (MED): **DOCX native structure discarded** — mammoth.extractRawText
  (~7797) flattens author-declared headings/lists/tables/hyperlinks to plain text
  and the AI re-guesses structure; born-accessible DOCX can come out worse.
  Fix: mammoth.convertToHtml + style map as transform seed.
- H8 REPORTED (MED): **DOCX comments can leak into student output** — ALLO_SECTION
  KIND semantics never explained to any prompt (markers only created ~7844-7996
  and stripped ~17615+); PPTX notes get a guard label, DOCX COMMENTS don't.
- H9 REPORTED (MED): **Vision "pages" are equal-char slices of 3-page chunks**
  (~15099-15113) — per-page winner-take-all reconciliation can splice misaligned
  content on mixed-quality docs; "word-level reconciliation" claim in
  PIPELINE_ARCHITECTURE.md:348 is wrong (it's page-level winner-take-all).
- H10 REPORTED (MED): **audit/remediation cache keys sample head-4KB+len+tail-4KB**
  (~8043, ~8116) — same-length template PDFs (per-student filled forms) collide;
  _readRemediationCache replays another document's accessibleHtml. Fix: full
  SHA-256 via crypto.subtle. Related: _auditB64ToBytes (~8242) lacks the 200MB cap.
- H11 REPORTED (LOW, quick): case-sensitive endsWith('.docx') at ~14497 vs /i
  elsewhere → uppercase .DOCX falls into the PDF/OCR path; encrypted-Office toasts
  promise a Vision fallback that never runs (~7858, ~8017); 0-page PDFs reach
  Vision with hallucination risk (~6181-6188, ~14774); two-tab races on
  pdf_active_batch_files_v1 + saveMultiSessionRange RMW (~2777-2819);
  z=1.96 CI for n=2-10 should be Student-t (~8756); scoreColor amber ≥50 vs ≥60
  drift (doc ~18742/view ~8639 vs view ~6030/~7261); polish-passes slider is a
  dead knob (host default 2, doc hard-caps 1 at ~16604).

## Cluster $ — API cost (~50-60% recoverable, no methodology change)

Call formula at defaults (K_a = audit chunks ≈ ⌈HTML/15.2k⌉, K_f = fix chunks,
P = passes ≤8): ≈ [5 vision audits + retries] + transform chunks + K_a baseline
+ P·(K_f + 2·K_a) + K_a final + captions + 2 surgical. Typical 25-page doc ≈
30 + 30·P ⇒ ~270 calls; fix loop = ~90% of volume, ⅔ of that is re-audits.

- $1 REPORTED: the "2 parallel audits" per pass are byte-identical prompts at
  temperature=0 (~17439, ~10805) — near-duplicate calls; reSD/reSEM≈0 so the
  1.5×SEM plateau threshold degenerates to its constant floor. Either run one,
  or vary prompt/temp so the variance is real.
- $2 REPORTED: no chunk-level audit caching across passes (~10904) despite temp=0
  and most chunks unchanged per pass — memoize by chunk-content hash.
- $3 REPORTED: no-op passes (all chunks rejected) still pay full 2·K_a re-audit
  + axe on byte-identical HTML (~17400→17439) — hash-compare and reuse.
- $4 REPORTED: every fix chunk carries the full global violation list (~3605)
  though issues have locators (~10815) — route violations to their chunks, skip
  clean chunks (also reduces regression-pass risk).
- $5 REPORTED: 5 initial auditors each re-upload the ENTIRE PDF base64 (~8610);
  start at 3, escalate to 5 via the existing adaptive path (~8722) → ~40% of
  vision tokens on well-behaved docs.
- $6 REPORTED: chunked Vision EXTRACTION uploads full-doc base64 once per 2-page
  chunk (~15074, PAGES_PER_CHUNK=2 ~14968): 60-page 8MB scan ≈ 330MB upload.
  _auditPdfInSlices (~8256) already does real page-slice uploads — reuse it.
- $7 REPORTED: runAxeAudit runs twice back-to-back on identical HTML at baseline
  (~17078+17086); each is a fresh iframe document.write + 800ms settle (~11152).
  Also: no memory of reverted fixes — retry re-sends the identical prompt
  (~17490); tell the model what was reverted. Telemetry hardcodes
  verificationSamples:3 while loops run 2 (~10540); logs claim "3 parallel
  diagnoses", code runs 2 sequential (~9912/9950).

## Cluster P — performance / memory (Canvas-iframe OOM class)

Peak for a 50MB PDF ≈ 8-12× file size (~500-650MB; >1GB with PNG-inflated
inline-image HTML) at the tagging+verification moment.

- P1 REPORTED: round-trip verification re-encodes BOTH original and shipped PDFs
  to base64 (~22479-22492, ≈134MB transient for 50MB doc) at the peak moment —
  give extractPdfTextDeterministic a Uint8Array fast path (comment at ~962 says
  it already accepts flexible input).
- P2 REPORTED: window.__pdfPageCanvases holds a full-page JPEG data URL per
  image-bearing page for the whole session (~15421; cleared only at NEXT run's
  start ~15375) — 100-300MB after a 200-page textbook. Clear at completion / LRU.
- P3 REPORTED: image crops ship as PNG (~15516; page renders use JPEG) and are
  re-stripped per pass with one full-string split/join PER image (~3590-3603) —
  ~10× size + ~500MB transient churn per pass on image-heavy docs. JPEG crops +
  single-regex restore; ideally keep placeholders through the whole loop.
- P4 REPORTED: _b64ToBytes decodes via per-byte callback and is called ~6× per
  run on the same doc (~5999 + call sites); decode once, cache bytes; pdf.js
  re-parses the same PDF 5-7× per run — share a run-scoped doc.
- P5 REPORTED: surgical/direct-mapped application does one full-doc DOMParser
  parse+serialize PER directive, synchronously (~13302-13309; tools each open
  with parseFromString) — 50 directives ≈ 5-15s hard freeze. Parse once, apply
  all, serialize once.
- P6 REPORTED: runDeterministicWcagFixes ≈ 12 sub-fixers each re-parsing/regex-
  sweeping the full doc, per pass (~13070-13096, +17415-17425) — thread one DOM.
- P7 REPORTED: Tesseract worker respawned per PAGE (functional API, ~7379;
  comment ~7356 acknowledges it) — 200-page scan pays ~200 WASM boots ≈ minutes.
  createWorker once per doc.
- P8 REPORTED: runAxeAudit rebuilds a full iframe per call (document.write of
  multi-MB HTML + fixed 800ms + re-eval of axe source ~11152-11199), 10-20×/run.
  Persistent audit iframe + innerHTML swap + rAF readiness.
- P9 REPORTED: zero app-level Web Workers. Movable without DOM: base64 codecs,
  pdf-lib createTaggedPdf save + fontkit subsetting (multi-second UI block),
  token-coverage diff, ZIP packaging. Stuck on main thread: axe, DOMParser fixers.
- P10 REPORTED: bounded-but-additive full-doc snapshots in React state
  (_preBionicHtml, _preLineGuideHtml, _paletteSnapshotRef, _preCmdHtml…) — null
  each when its feature toggles off (perf-pdffix-snapshots precedent exists);
  liveChunkStream keeps every chunk's HTML in state until manual clear — cap it.

## Cluster S — structural debt (architecture)

- S1: _bindState() copies window.__docPipelineState into ~50 SHARED module-level
  mutable variables on every public call (~2611-2664) — any call during another
  run's await rebinds mid-flight; __alloPdfRunGen + re-entry guards patch
  symptoms. Refinement: per-run ctx object threaded as an argument.
- S2: fixAndVerifyPdf ≈ 4,160 lines containing Phases 1-6 inline (~14492→18650)
  with two conflicting internal phase-numbering schemes; no phase independently
  testable. Precondition for S1.
- S3: FOUR live fix-loop orchestrators with divergent stop policies
  (fixAndVerifyPdf ~17336; runAutonomousRemediation ~23228; ANTI runAutoFixLoop
  ~16439; autoFixAxeViolations ~13197) + one dead — every convergence bugfix has
  had to be re-applied per loop. One runFixLoop(policy, ctx).
- S4 VERIFIED: DEAD CODE: processSinglePdfForBatch (~9054-10200, ~1,150 lines,
  zero call sites — live batch is _processOne ~10254; in-file comments at ~10574
  and ~15753 say DEAD) and runTier3StructuralFix (~5780, exported, zero callers).
  NOTE: the dead loop contains real bugs (always-true plateau ~10138-10146,
  AND-only regression guard ~10130) that cost this sweep an agent-verification
  cycle — the fix-loop agent initially reported them as live batch bugs. Deleting
  removes a rubric-prompt copy, a fix loop, and a config read from S3/S6/S7.
- S5: PdfAuditView = 12,860-line component destructuring ~190 untyped props
  (view ~1848-1888) — split by tab, group props into ~5 objects.
- S6: config sprawl: target-score default 95 at 6 sites (doc still says 90);
  ||95 turns explicit low targets into 95. Rubric weights (-15/-10/-5/-2) at
  4 code sites + 2 live prompt copies (+1 dead). "16000" chunk size ×4 with
  contradictory token-budget comments; 25+ inline timeout ms. One
  PIPELINE_DEFAULTS / SEVERITY_WEIGHTS (generates prompt text AND feeds
  _alloBinDed) / LIMITS block.
- S7: duplicated pure helpers that feed teacher-visible numbers:
  _normTokenForDiff ×3 (doc ~22533, view ~3311, ~9859); _withTimeout ×2 with
  semantic drift (doc ~2199 clears timer + "Timeout after Ns" prefix that
  _withRetry string-matches; view ~139 leaks timer, different message);
  ≥6 ad-hoc HTML escapers with different coverage. Export from pipeline
  (computeHeadline precedent).
- S8: generateResourceHTML + generateFullPackHTML ≈ 4,800 lines (16% of file)
  of non-pipeline student-runtime template strings inside createDocPipeline —
  move to own module; they only need sanitizeStyleForWCAG (already exported).
- S9: window.__last* single-slot globals are the inter-phase bus
  (__lastGroundTruthPageMap 7 write sites, read cross-file view ~9859) — batch/
  second doc clobbers the first's ground truth while its diff view is open.
  __lastGroundTruthDocKey exists but isn't used as a key.
- S10 DOC ROT (partner-facing "canonical" doc): PIPELINE_ARCHITECTURE.md wrong on
  target default (90 vs 95), blend ("(AI+axe)/2" vs code min()), "3 parallel
  audits" (code: 2), "word-level reconciliation" (page-level), auditor override
  (">12 diverges" — now unconditional, threshold only gates a log), file-size
  table stale, ":17081 quick mode" comment claims a sample mode that doesn't exist.

## OUTCOMES — implementation pass, same day (2026-07-02, Fable)

Seven batches committed (doc_pipeline side): @525822f8 (H1+H3+H11),
@412d0f69 ($1-$3+$7), @3a5d9280 (S4 −1,146 lines + H4 + H5), @8aa5b5a3
(P1-P4+P7), @d03f461c ($5+$6 + failmode-test repair), @7e2b5189
(H7+H8+H9+H10+t-CI), @c76fe1ab (H2 pipeline side). PIPELINE_ARCHITECTURE.md
S10 claims corrected.

- FIXED: H1 H2 H3 H4 H5 H7 H8 H9 H10 H12; $1 $2 $3 $5 $6 $7; P1 P2 P3 P4 P7;
  S4 (processSinglePdfForBatch deleted; runTier3StructuralFix KEPT —
  gate-required export, annotated not-yet-wired); S10; z→t CI; view
  _withTimeout timer leak (S7 partial).
- UNCOMMITTED (concurrent session shares those files): the ANTI v2-save
  fileSize+docKey stamp and the view loader size/docKey/v3-warning edits
  (H2 companion) + view _withTimeout fix — all applied, tests green, but
  AlloFlowANTI.txt and view_pdf_audit_source.jsx carry another session's
  hunks so they were left out of the pathspec commits.
- RECALIBRATED, no change: H11 scoreColor "drift" is two internally-
  consistent conventions (headline ≥50 amber at 2 sites, chunk-level ≥60
  at 8 sites) — not a defect; H6/F1/F6 (the "batch plateau/regression
  bugs") were in the DELETED dead code.
- LINE-COUNT NOTE: the review-time "file grew 29,579→30,471 mid-sweep"
  scare was a counting artifact (Measure-Object -Line skips blanks vs
  physical lines) — not concurrent-session growth.
- STILL OPEN (deliberate): H6 tag-walk export (inspector shows the role
  MAP truthfully but not the emit WALK; refactor _buildOutlineStructElems
  export), S7 full dedup (_normTokenForDiff ×3, escapers), P10 view
  snapshot nulling, C4 ZIP byte cache + C5 exclusion toast (2026-07-01
  carryover), S6 config consolidation (PIPELINE_DEFAULTS /
  SEVERITY_WEIGHTS / LIMITS blocks), and the long-term architecture
  track: S1 per-run ctx (replace _bindState), S2 phase extraction from
  fixAndVerifyPdf, S3 one fix-loop controller, S5 view split, S8
  export-pack module, P9 web workers (pdf-lib save + codecs first).
- NEW BEHAVIORS to Canvas-smoke before deploy: Office media splice (H1),
  DOCX markdown seed (H7 — method 'docx-mammoth-html'), [[PAGE BREAK]]
  sentinel split (H9), slice-based Vision extraction ($6), shared
  Tesseract worker (P7), resume fingerprint refusal (H2, needs the
  UNCOMMITTED ANTI/view halves to be live end-to-end).

## OUTCOMES — wave 2, same day (deferred-items pass, Aaron-approved)

- @40cba3aa CHECKPOINT: the H2 ANTI/view halves committed (bundles the
  concurrent session's in-flight math-hint/lesson-plan work at Aaron's
  request; full ANTI validated via build.js --mode=dev + esbuild first).
- @34018900 S6+S7: SEVERITY_WEIGHTS / PIPELINE_DEFAULTS.targetScore /
  GEMINI_CHUNK_CHARS single-sourced into prompts, grounding sums, axe
  formulas (_alloAxeWeightedScore) and the report table; the unicode
  token fold canonicalized (_alloNormTokenForDiff + normTokenForDiff
  static, view delegates, drift sentinel tests/norm_token_drift.test.js).
- @6b0db267 + @98c848ef S3 (phase 1): the shipped loop's revert /
  keep-best / plateau decisions extracted into the PURE _alloLoopPolicy
  (loopPolicy static) with golden characterization tests pinning every
  boundary — tests/loop_policy_golden.test.js (NOTE: gitignore's
  fix_*.js pattern silently excluded the first filename — check-ignore
  new test files). ANTI's runAutoFixLoop + autonomous loop can now adopt
  the same contract deliberately.
- @30f08a82 C4+C5: batch ZIP reuses cached tagged-PDF bytes when the
  remediated HTML is unchanged; excluded/failed files are NAMED in a
  dedicated warning toast.
- RECALIBRATED wave 2: P10/P13 largely moot — Bionic/LineGuide restores
  already null their snapshots, chunk previews are already 2.2KB-capped
  (_chunkHtmlPreview); remaining exposure is the entry count of a
  user-facing review history with its own Clear button. No change.
- STILL OPEN after wave 2 (the next-session track, goldens now in
  place): H6 tag-walk export (export the pipeline's emit walk — e.g.
  factor _buildOutlineStructElems' TreeWalker into a pure roles-walk fn
  + static — and have the view's _buildTagOutline consume it; extend the
  tagtree drift sentinel to _deriveDocMeta), S2 phase extraction from
  fixAndVerifyPdf (extract Step 0/1/2/loop into functions taking an
  explicit runState; the loop-policy goldens + 426-test suite are the
  safety net), S1 per-run ctx replacing _bindState, S5 view split,
  S8 export-pack module (needs a new CDN file + build.js + ANTI
  loadModule — deploy-surface change, coordinate with Aaron), P9 web
  workers (pdf-lib save + base64 codecs first), S7 escaper unification.

## OUTCOMES — wave 3: S2 phase 1 (Aaron: "I think you can do it, go ahead")

- @2f20b226 **fix loop extracted from fixAndVerifyPdf** → `_runMainFixLoop`
  (269 lines, byte-identical body, explicit in/out contract; the two
  run-scoped callbacks updateProgress/_applyDetectedLang threaded via ctx).
  VERIFICATION RECIPE (reuse for the remaining phases): (1) assert-guarded
  Node splice (boundary lines pinned; a failed assertion leaves the file
  untouched), (2) free-var scan of the extracted body against
  fixAndVerifyPdf locals (caught updateProgress + _applyDetectedLang —
  the rename-dangler crash class), (3) TDZ check for pre-caller reads of
  returned lets, (4) gate 29/29 + 227 loop/pipeline tests + goldens.
  NOTE: git renders the block move as a ~3,150-line mega-hunk; the real
  delta is 538/508 (-w) and an exhaustive line-presence check confirmed
  zero content loss — don't panic at the stat.
- REVERT: every wave-3 change is a single pathspec commit on
  doc_pipeline_source.jsx (+compiled copies) — `git revert 2f20b226`
  restores the inline loop cleanly.
- S2 PHASES 2+3 DONE same day: @30f3eaaa `_extractPdfImages` (301 lines;
  { base64, mimeType, silentMode, updateProgress } → { extractedImages };
  _imageFailureCount had no post-step consumers) and @67351122
  `_runExtractionPhase` (240 lines; { base64, fileName, pageRange,
  forceOcrPages, forceFullOcr, effectivePageCount, updateProgress } →
  { extractedText, effectivePageCount, forceFullOcr,
  garbledFallbackText, officeMediaImages }; _alloAbortRun rethrow
  propagates unchanged). fixAndVerifyPdf is ~810 lines lighter across
  the three extractions; full suite 522/522.
- FINAL-AUDIT ASSEMBLY deliberately NOT spliced: its in/out surface is
  ~15 variables (finalAfterScore, verification, axeResults, eaResults,
  deterministicScore, _structuralFidelityNotes, ocrAccuracy,
  needsExpertReview, integrityWarning, …) — a contract that wide is
  noise. Do S1 FIRST (one per-run ctx object threaded through the three
  extracted phases + the entry points, retiring _bindState's ~50 shared
  mutables), then the assembly consumes the single ctx naturally.

## OUTCOMES — wave 4: S1 COMPLETE (plan-approved, 10 commits @6345d8b0..@77113a2c)

The mid-run-rebind hazard is retired. Async runs snapshot their VALUES at
entry via `_makeRunCtx` (11 fields); React setters stay on `_bindState`
(identity-stable); `__alloPdfRunGen` remains as the watchdog-invalidation
channel only. Plan: .claude/plans/ok-maybe-just-do-replicated-waffle.md.

- @6345d8b0 step 0: 12 dead bindings deleted (56→44 assignments, pinned).
  check_free_vars note: 10 PRE-EXISTING flags identical on HEAD (env
  globals, typeof-guarded inner-scope reads, window contracts) — plus one
  genuinely suspicious pre-existing pair: `sourceTopic`/`pageTitle` at
  ~25513 are undeclared bare reads in generateResourceHTML's center-label
  branch (would throw if that organizer path runs) — NOT fixed, needs its
  own look.
- @3b99dcbf step 0b: deps.state seam — the headless test's `state:{}`
  is finally honored; snapshot semantics now unit-testable.
- @0453dd58/@740a4f51/@4eb712fa/@ee79c54c steps 1-4: style-gen, transform
  (document-mixing fix), audit (options ?? ctx; batch callers pin config),
  chunk-resume session identity.
- @ddf2275e step 5 (highest risk): fixAndVerifyPdf + _runMainFixLoop lock
  document/settings/file identity at entry (incl. the multi-session save
  key fileSize and telemetry attribution); loop stop-conditions immutable
  mid-run. Verified zero non-comment bound-value reads across 13700-18290.
- @9c72fbcb step 6 (+bug fix): the whole batch runs on ONE entry-time
  configuration; the per-file remediation cache key no longer reads LIVE
  vars mid-batch (drifted-key entries age out via 7-day TTL).
- @511129e5 step 7: Download-All builds CSV/telemetry/report from the
  entry queue — a new batch mid-ZIP can't corrupt the manifest.
- @6500be15 step 8: updatePdfPreview gains previewOpts.sourceHtml; the
  word-restoration flow passes restored HTML EXPLICITLY (the module-var
  patch + 30ms React race that could silently REVERT a restoration in
  preview/export is gone); delayed audit timers capture their setters.
- @77113a2c step 9: anti-drift pins (8 functions × legacy names = 0 reads;
  read-fresh exemptions documented as deliberate). Suite 534/534, gate 29/29.

SEMANTIC CHANGES (user-approved): settings LOCK at run start — a mid-run
slider change applies to the NEXT run (UI copy note still to add, host
side); batch cache keys now derive from the batch's own settings.
Canvas smoke: add "change target-score mid-run → applies to next run"
and the restoration flow (restore → preview → export) to the checklist.

## OUTCOMES — wave 5: post-deploy enhancements (Aaron-picked: alt quality + NVDA)

- @04848873 **Alt-text QUALITY gate**: presence was always checked, quality never —
  "Image of chart"/"IMG_0417.jpg"/caption-echo alts passed every automated gate.
  Pure heuristics (_alloAltQuality: placeholder/boilerplate/filename=HIGH;
  prefix/length/truncation/echo=WARN) + worst-first document scan wired into
  fixAndVerifyPdf; HIGH findings ride the EXISTING fidelity-panel plumbing
  (lowOcrAccuracy pattern → needsExpertReview, points at the image review
  panel); full report on result.altQuality; non-English alts deliberately
  unflagged. 24 golden tests. TWO TRAPS: module-level 2-space `return {`
  corrupts check-pipeline-integrity.js's export parse (computeHeadline trap —
  now documented at the site); aria-hidden captions still appear in textContent
  (nearby-echo must subtract the figure's own text).
- @be379937 **NVDA verification harness** (dev-tools/nvda-harness/): derives the
  expected announcement sequence from remediated HTML, diffs NVDA's real speech
  log in order (OK/ORD/MISS/VIOL incl. decorative-leak detection), PowerShell
  runner + README (NVDA + Speech Logger add-on setup — NVDA NOT installed on
  this machine yet; Aaron installs + runs). Tagged-PDF flow via Acrobat Reader
  against the HTML twin. 11 unit tests + CLI smoke (exit 0/2 verified).
  Semi-automated by design: one human keypress starts say-all.
- NOT deployed (Aaron mid-testing @9c403e13); both ride the next deploy.
  First real NVDA run = new Canvas-smoke-adjacent item.

## Suggested sequence

1. **H1-H3** (Office image/alt injection + honest toast; v2 fingerprint; rescue
   disclosure) — teacher-visible output correctness.
2. **$1+$2+$3+$7** (kill duplicate temp-0 audit, chunk-hash cache, no-op skip,
   single baseline axe) — ~50% API cost, small diffs.
3. **S4 delete dead code** (pathspec commit) + S10 doc regen.
4. **H4+H5** (autonomous keep-best; target-gate vs min() headline + spurious
   divergence warning).
5. **P2+P3+P4+P7** (page-canvas cache clear, JPEG crops + one-pass restore,
   shared decode, Tesseract worker reuse) — biggest OOM/latency wins per line.
6. **$5+$6** (3→5 adaptive initial auditors; slice-based Vision extraction).
7. **S6+S7** (PIPELINE_DEFAULTS/SEVERITY_WEIGHTS/LIMITS; export shared helpers).
8. Long-term: S1→S2→S3 (per-run ctx, phase extraction, one fix-loop controller),
   S5 (view split), S8 (export-pack module), P9 (workers for pdf-lib save/codecs).
