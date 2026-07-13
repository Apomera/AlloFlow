# Remediation pipeline deep dive — 2026-07-09

Six-lens read-only review (OCR/restore fidelity, audit/scoring/throttle, fix-loop/host integration,
export/tagged-PDF, view UI/UX, regression pass over the 7/5–7/7 commits). Top findings byte-verified
against source by the coordinating session. No code was changed. Line anchors are against HEAD at the
time of review (post-@443c8e7e5 deploy); AlloFlowANTI.txt anchors drift with concurrent-session edits.

Legend: [V] = independently re-verified against source bytes by the coordinating session.
Files: DP = doc_pipeline_source.jsx, VIEW = view_pdf_audit_source.jsx, ANTI = AlloFlowANTI.txt,
GEM = gemini_api_source.jsx. Root copies canonical.

---

## TIER 1 — HIGH (correctness / honesty / data exposure)

### H1 [V] Per-leaf tagged-PDF export can emit duplicate MCIDs (and unbalanced BDC) in failure corners
DP:22233–22280. The positioned loop pushes one BDC/EMC pair per run BEFORE knowing whether any word
will draw (`_posDrew` only set on a successful glyph draw at 22248). If every word folds empty —
non-Latin scan + Unicode-font fetch failure → `_toWinAnsi` folds all text to '' → `continue` at 22247 —
the loop emits N empty pairs, `_posDrew` stays false, and the block fallback (22256–22277) re-emits
BDC/EMC with the SAME mcids → two marked-content sequences per MCID (ISO 32000 §14.7.4; the exact
PAC/Acrobat flag the per-leaf flip was shipped to retire). Also: `_toWinAnsi(_c.text)` at 22246 runs
between BDC and EMC outside the per-word try — a throw there leaves an UNBALANCED BDC, then the
fallback duplicates on top. Fix: pre-fold each group's calls and decide drawability before pushing BDC
(or stage operators per page and push atomically); move the fold inside the per-word try.
Two verified sub-items ride along:
- H1b Dangling MCRs: leaf /K → MCR is wired at plan time (DP:21841–21848); a blank mid-doc page ends
  artifact-only (22418–22421) yet its leaves keep MCRs pointing at marked content that doesn't exist;
  the 22352 bare-text safety net creates untagged real content (§7.1 class).
- H1c Non-Latin drop accounting silently disabled on the DEFAULT scanned path: neither per-leaf fold
  branch (22246–22249, 22268–22271) tallies `_ocrDroppedChars`, so the coverage guard (22496–22503)
  and the VIEW "searchable layer covers N%" warning never fire. One-line honesty restore per branch.

### H2 [V] Quota-classed throttles (429 / Canvas 403-quota) bypass the ENTIRE resilience machinery
GEM:312–331 rewrites every quota-class error to message `API_QUOTA_EXHAUSTED` (raw text only in
`err.originalMessage`); DP:3519–3521 `_isThrottleErr` matches `RESOURCE_EXHAUSTED|\b429\b|rate-limit` —
strings that can never reach it (dead patterns prove intent). Consequences under a per-minute 429
burst: treated permanent (no retry, DP:3537–3542); breaker never trips; `geminiThrottleInfo().storming`
stays false; chunk never enters `_deferredIdx` (DP:4793–4796); `_throttleCaused` false → circle-back
re-audit skipped and the D-reframe mislabels the shortfall. Fix: also test `e.isQuota` +
`e.originalMessage`; use the classifier's existing per-minute vs per-day hints (per-day stays
permanent); feed per-minute quota storms into the breaker.

### H3 [V] Stop/watchdog during the auto-continue storm wait doesn't stop the next round
ANTI ~18116 (abort/gen check at loop top only) → up-to-240s `waitForGeminiCalm` (~18157) → round fires
(~18166–18181) → next abort check at ~18182, AFTER the round; and that break discards the round's work
(runs before re-verify). Pre-wait the check-to-fire gap was ms; the wait made it minutes. A watchdog
fire mid-wait also nulls `__alloPdfAbortSignal`, so the round's fetches aren't signal-cancellable.
Fix: re-check `pdfAutoContinueAbortRef.current || _genStale()` immediately after the wait; optionally
pass an abort predicate into `waitForGeminiCalm`.

### H4 [V] `_stripPageEdgeArtifacts` deletes repeated digit-bearing CONTENT headings (≥2-page threshold)
DP:835–891, applied in reconcileOcrPages (8954–8971) before extractedText is built. Keying is by
DIGITLESS text (:840) with `set.size >= 2` (:865): "Chapter 3" (one page-top) + "Chapter 7" (another)
both key `chapter` → both deleted from OCR ground truth; digits pushed into detectedFolios so the
folio-leak net can then tell the user to delete a legitimate "3" from the body. Deletion of the TEXT is
undisclosed (only digits ride out). Fix: require ≥3 pages or ≥30–50% of pages + same edge; disclose
stripped line text in the fidelity panel.

### H5 [V] Assessment mode leaks the concept-sort answer key
DP:32021–32031 blanks only ` data-correct="\d+"` and hides `.quiz-controls`, while every concept-sort
strip carries its correct category in `data-category-id` (DP:28115) and the embedded check script
grades against it (DP:31815; controls class `.alloflow-cs-controls` not hidden). The comment's promise
("the file no longer contains the key in any form") is false for concept sorts. Fix: blank
`data-category-id` on `.alloflow-cs-strip` (keep dropzones') + hide `.alloflow-cs-controls`.

### H6 [V] Placement/reading-order warning (`integrityWarning`) has NO persistent render — and the fidelity panel can contradict it
Producer DP:19316–19323/19697; VIEW has zero render sites (only two project-restore passthroughs at
4870/10310) — the teacher gets a 3-second toast during an unattended 20-minute run. Because preserved
text still counts toward coverage, the panel can read "preserves 100% of the source text" while
reading order is broken. Fix: render `integrityWarning` as bullets in the fidelity panel (dedupe like
`_honestReportBlocks`, DP:20008–20010) or emit a `{kind:'placement'}` fidelity note.

### H7 Batch per-file timeout leaves a zombie run mutating shared globals under the next file
DP:10690–10700 `_withTimeout` = Promise.race, no cancellation; the timed-out fixAndVerifyPdf keeps
running, re-stamps `window.__lastGroundTruth*`/OCR globals with file i's identity after file i+1
stamped its own (DP:16198–16222), re-trips the shared breaker, interleaves `_pipelineStats`. Nothing
consults `perFileDeadlineTs` except the deferred re-audit. Fix: consult the deadline at extraction and
pass boundaries; or per-file AbortController aborted by the timeout handler.

---

## TIER 2 — MED (bugs worth fixing soon)

### Scoring / throttle
- M1 [V] Circle-back covers only PARTIAL final audits: a fully-failed (null) audit under the same storm
  ships degraded immediately with zero wait (DP:18858–18868 vs gate at 18882; audit returns null when
  zero chunks return, 11454). Extend the gate to null+`_finalAuditThrottled`.
- M2 Circle-back duration unclamped vs the 8-min batch wall: a probe/re-audit admitted just inside
  `_deferHardStop` can run ~5 min (probe = full callGemini, 180s+retry; self-heal rounds) and blow the
  30s headroom → a FINISHED remediation discarded by the wall (re-opens R5). Admit work only when
  `hardStop − now > worst-case-single-call`, or thread the deadline into the audit/probe timeouts.
- M3 Breaker is a session singleton reset per run: overlapping zombie run or next batch file wipes live
  storm state mid-storm (DP:16045; `_stormNow` readers). Skip/soften reset when the gate is busy;
  batch: seed next file's cap from previous end state.
- M4 Heavy-doc pacing raises local-backend concurrency 1→2 (DP:3407–3414 pins serial; 16051–16057
  `maxConcurrent:2` then time-decay/success restore to ceiling 2). Clamp to 1 when
  `_usesLocalTextBackend()`.
- M5 Partial-audit-inflated AI score can become `bestAiScore` → published "estimated minimum" with
  wrong provenance (DP:15272–15332, 18846–18849, 19100–19112). Track `bestFullCoverageAiScore`.
- M6 [V] Circle-back has no onTick and no abort/gen check (DP:18904–18934; 18914 called WITHOUT
  onTick though the mechanism exists at 3461–3471 with zero callers passing it) → status frozen up to
  10 min + spend continues after gen bump. Pass onTick → updateProgress; break loop on gen change.
  Same for VIEW:8046 manual re-audit ("Waiting for the AI checker to settle..." with no countdown).

### Fix-loop / host
- M7 12-min frozen-step dead-man is not heartbeat-aware (ANTI ~12304–12318 vs the 8-min watchdog which
  IS, ~11610–11643): an axe-clean AI round serializing 20+ chunks at cap 1 exceeds 12 min with
  `pdfFixStep` frozen → loop killed + "appeared stuck and was reset" toast while heartbeats flowed.
  Re-arm on `alloflow:pipeline-warn` or emit per-chunk step updates.
- M8 `_runMainFixLoop` has no stop lever: gen checked only at the completion write (DP:19799), so an
  invalidated single-file run grinds to maxFixPasses (~an hour under storm) competing for the shared
  gate. Check gen/stop flag at pass and phase boundaries; publish a per-run AbortSignal.
- M9 Stale-run UI stomps: runAutoFixLoop's `finally` and fixAndVerifyPdf's `catch` write UI without gen
  guards (spinner/status of run B wiped by zombie A; scary stale "remediation failed" toast; B loses
  its watchdog since it's gated on pdfFixLoading). Guard the finally/catch UI writes.
- M10 Settings-lock UI copy still unshipped (the 2026-07-02 decision, DP:3683–3685): no "changes apply
  to the next run" hint anywhere near the sliders; also VIEW:4355 says "90 (default)" but default is 95.
- M11 Shared `window.__alloPdfAbortSignal` slot cross-couples batch and auto-continue on overlap
  (DP:10631–10642 comment even claims separation, then writes the shared slot; ANTI overwrites it).
  Per-origin registry or block auto-continue while batch runs.

### Export / veraPDF
- M12 `lastTaggedValidation`/`veraPdfResult` never cleared on document swap → doc A's PDF/UA badge
  renders for doc B until B exports (VIEW:1925; per-doc reset at 4891–4899 nulls bytes ref only).
  Signed trail is hash-protected; live UI is not. Null both in the per-doc reset blocks.
- M13 Popup veraPDF transports accept `verapdf-result` from ANY window and post student-document bytes
  with targetOrigin '*' (VIEW:2107–2168; iframe path checks source/origin, popups don't) — verdict
  forgery + FERPA-adjacent byte egress if the popup navigates. Filter `ev.source === win` + pin origin.
- M14 Signed trail `shippedFingerprint` can hash bytes that were never delivered (gates return before
  download but after `_lastTaggedBytesRef` is set; VIEW:9442 vs 9453–9484; same in _runTypesetExport).
  Point the ref only at bytes actually handed over, or record `withheldByGate: true`.
- M15 `_distributeCallsToRuns` word/tag misassignment is systematic on divergence (counts from
  Vision-derived leaf text vs raw Tesseract boxes; proportional leaf→page assignment 21815–21819);
  "last run soaks remainder" dumps surplus under the page's last semantic leaf (worst: TH/TD, H1).
  Cap the soak into a synthetic /P or /Artifact run; skip count-distribution on >~20% mismatch.

### OCR / restore
- M16 [V] Unconditional `\n`/`\"`/`\t` un-escape rewrites corrupt literal backslash text (LaTeX
  `\theta`→TAB+heta, Windows paths) on EVERY Vision chunk, stripped-or-not (DP:16532–16533; also
  16689–16690). Have `_safeStripJsonWrapper` return `{text, stripped}` and gate the rewrites.
- M17 [V] Fresh-spawn Tesseract fallback passes `{blocks:true}` as a 4th arg tesseract.js v5's static
  recognize doesn't accept (DP:8660) → word boxes silently lost whenever the shared worker fails →
  positioned searchable layer degrades exactly when resilience matters; the b:false retry rung is a
  dead duplicate. Use createWorker + worker.recognize(canvas, undefined, {blocks:true,text:true}).
- M18 `findUniqueAnchorDocWide` matches needles without word boundaries → can splice a restored word
  mid-token ("chased the cat" matching inside "chased the category") (DP:25280–25296; adjacency guard
  blind to it). Require boundary chars around the indexOf hit.
- M19 Normalizer mismatch `_arNorm` (U+2010–2015, U+2212, primes) vs restorer's `srcWordsLc`/`_normTok`
  (curly quotes only) → restorable words degrade to context-less appendix entries (DP:19161 vs
  25269/25362). Hoist ONE shared token normalizer.

### View honesty / a11y
- M20 `result.altQuality` payload has zero view readers; warn-level alt flags invisible; the HIGH-alt
  note points at an image panel that doesn't badge flagged images (DP:19452–19462/19690; VIEW grep=0).
- M21 Fidelity panel frames every note kind as text loss ("some source text may not have carried
  over") even when the only notes are alt-quality/active-content at 100% coverage (VIEW:8524–8526).
  Gate the coverage sentence; per-kind lead sentences.
- M22 "Fix Remaining" commit recomputes `fidelityLimited` from re-fix notes only, dropping the
  coverage<90 half (VIEW:5901 vs DP:19701) → header chip/asterisk vanish while the expert panel still
  says 85% preserved. Include the coverage term.
- M23 Nested dialogs (Preview & Edit + 4 compare/form panels) have aria-modal but no focus move/trap,
  and Escape falls through to close-audit confirm (VIEW:11574–11583, 14490+; outer Esc at 3489).
- M24 Load-bearing qualifiers are title-tooltips on non-focusable spans (headline caveat 7532,
  fidelity-limited 7540, foundations-vs-advisory 7554/7564, OCR basis 7766, self-check-vs-independent
  7882) — keyboard/touch/SR users get numbers without qualifiers. Focusable disclosure buttons.
- M25 Auto-veraPDF silently skips when popup blocked + iframe not ready: default-ON validation
  produces NO badge and NO explanation (VIEW:4187/4290–4292). One amber line where the badge would be.

---

## TIER 3 — LOW / polish (verified, smaller blast radius)

- L1 Stale `window.__alloDetectedFolios` not in the per-run reset → cross-doc folio warning
  (DP:16611/19348; reset block 16196–16222 misses it; dupe-collapse gate at 19384 shows the pattern).
- L2 `_detectOcrLanguage` uploads the ENTIRE PDF for a 2-letter answer; big multilingual scans are the
  ones that lose detection (DP:8586–8596, 16575). Use a 1-page slice.
- L3 Mixed-page rescue / forced re-OCR never language-detect (DP:15860, 15963): Spanish doc's scanned
  pages OCR'd with eng. Share one sliced detection when no override.
- L4 Hyphen rejoin fires on mid-line "word- word" (DP:776–786); require a newline in the gap.
- L5 `_collapseAdjacentDupes` misses case/punct-variant echoes; triples collapse to doubles (DP:903–923).
  No-ref mode can collapse legit emphatic repetition "No! No!" (disclosed, but ground truth altered).
- L6 AutoRestore banner arithmetic omits the re-appendix pass's inline restores (DP:19206–19225) —
  reviewable word list incomplete.
- L7 `_alloCellRichText`: inline formatting tags in cells still ship as escaped literals (`<b>85</b>`);
  plain-bullet split misses `‣` and leading `*`/`-` (DP:1246–1258).
- L8 [V] `_alloCellRichText` gate `/<\s*(?:ul|ol|li|br|p)\b/i` matches prose like "0.05 < p" /
  "< p-value" → markup path deletes "<...>" spans from stats cells (DP:1249, 1260–1264). Drop the
  `\s*` (require `<p`-shaped token).
- L9 navWarranted: `role=["']doc-toc["']\b` can never match (misplaced \b); "table of contents" is
  English-only → genuine missing-nav suppressible on i18n docs (DP:2601–2629).
- L10 Markdown-strip alters "verbatim" source-context snippets: spaced `*` operator and `|x|` pipes
  stripped inside quoted context (DP:813–814 applied at 25172–25174).
- L11 `_rewrapOrphanedMainContent` ignores orphaned bare TEXT nodes — the most common premature-</main>
  shape doesn't count toward the 40-char threshold (DP:2336–2350).
- L12 Governing-layer tie contradiction: caption uses `<=`, EA-explainer branch uses `<` (VIEW:7901 vs
  7914–7915; mirrored at DP:20077). On content==EA tie the two elements disagree.
- L13 SR score announcement bypasses the '?' guard: aria-label can say "Score: undefined out of 100"
  (VIEW:5108 vs 5117).
- L14 Governing qualifier text-slate-400 @9px ≈ 3.0:1 — fails the AA rule the pipeline enforces on
  documents (VIEW:7533; pattern repeats ~182×).
- L15 Whole-results tree is one aria-live=polite region → churn re-announces large regions (VIEW:5108).
  Scope to score/status lines.
- L16 All toasts 3s regardless of severity (ANTI ~8980–8986); error-severity multi-sentence
  disclosures unreadable + gone after unattended runs.
- L17 Batch per-file failure reason is hover-only (VIEW:3847 title attr); expert-review files unnamed
  outside the CSV.
- L18 0-page PDFs: good pipeline message wrapped in generic "Something went wrong" (VIEW:2886; add a
  classifyPdfError case).
- L19 `waitForGeminiCalm` returns `{calm:true, unprobed:true}` when probe unavailable while storming
  (DP:3490) → round fires into the storm; also permanent quota probe failure degenerates to ~5s probe
  spam for the full budget (return `{calm:false, permanent:true}` on isQuota/isConfig).
- L20 `_auditChunkMemo` FIFO cap 240 self-evicts on >240-chunk docs → circle-back re-pays full N calls
  on the largest docs (DP:11262–11270). Per-run cap or LRU.
- L21 View auto-continue treats scoreless run as 0 (`(r.afterScore || 0) < target`, VIEW:4260) →
  relaunches into whatever broke both engines. Bail when null + axe failed.
- L22 runAutoFixLoop try/finally without catch: mid-round throw → unhandled rejection, no completion
  toast/autosave, warm veraPDF popup leaks (ANTI; VIEW:4261 unguarded await).
- L23 Watchdog fire() doesn't null `pdfAutoContinueAbortCtrlRef` or clear `pdfAutoContinueRunning` →
  "Fix again" blocked + results buttons disabled up to ~12 more min on a truly-hung loop.
- L24 Batch/ZIP divergences: batch never auto-continues (systematically lower scores, undisclosed);
  rerunPipelineFix 3 rounds vs Make-Accessible 8; auto-continue aiFixChunked lacks the $4 routing arg
  (broadcast prompts); downloadBatchResults has no re-entrancy guard/timeout/dead-man.
- L25 Rotated-page Helvetica fallback loses rotation in per-leaf positioned draw (DP:22249 vs the
  non-per-leaf path which passes degrees).
- L26 `_alloOcrBlockLayout` silently truncates very long pages (~115 lines; DP:306–326) with no drop
  count.
- L27 pdf.js residual corners: `pdfjsDocForTagging.destroy()` (DP:23281) not in a finally; timed-out
  `getDocument` loading tasks never `loadingTask.destroy()`. (The two big historical leak sites —
  extractPdfStructTree, image-extract — are confirmed FIXED.)
- L28 Post-remediate closed-loop repair leaves roundTrip/self-check describing pre-repair bytes in the
  same `lastTaggedValidation` (VIEW:9831–9847); display-only.
- L29 Teacher-facing Formatted/HTML/JSON report exports carry NO PDF/UA state at all (only the signed
  trail does) — compliance report omits the exported file's conformance verdict (VIEW:9989–10027).
- L30 Custom-CSS sanitizer promises "users get feedback" but only warnLogs (DP:7870/7904).
- L31 `_scoreSource` produced+restored, never read (dead flag; render or delete).
- L32 Residual "blend" word in VIEW:5377 pre-fix explainer (+ `afterScoreProvenance:'blended'` landmine).
- L33 Gate waiters aren't gen-aware; zombie's queued waiters delay the fresh run (DP:3264+).
- L34 Elapsed timer/"safe to keep waiting" reassurance exists for audit phase only, not the 10–30 min
  fix phase (VIEW:2813–2817/4973–4981 vs 5930–5934).

## UX refinements (highest value first)
- R1 One-line "Can I hand this out?" verdict strip above the score — all inputs already exist as
  booleans on pdfFixResult; the download gate (VIEW:9453–9463) already computes the severe combos.
- R2 Wire the wait/onTick + elapsed timer (M6 + L34) — the 10–30 min wait is where trust is won/lost.
- R3 Fidelity notes as jump-links (altQuality → flagged image; placement → Preserved box; numeric →
  pre-filtered Diff). Jump plumbing exists (`_jumpToIssue` VIEW:2921).
- R4 Batch rows: surface per-file expert/fidelity flags (score-only today).
- R5 Toast severity model (errors persist until dismissed).
- R6 Cross-column cell-bleed detector (KNOWN OPEN, confirmed): per-word Tesseract x/y boxes are already
  carried (DP:8901–8909) — cluster into column x-bands and flag Vision grid cells whose tail tokens sit
  in the next column's band (`data-allo-cell-suspect`); flag-only converts silent corruption into
  disclosure.
- R7 Preserved-box outline fragments as real lists (KNOWN OPEN, confirmed): splitter (DP:25602) glues
  outline items; also text after the last terminal punctuation can never sentence-restore. Break on
  blank lines/leading bullets; reuse the `_alloCellRichText` plain-bullet shape; append the
  unpunctuated tail segment.

## Verified-clean (checked, no action)
min-governing at ALL live blend/render sites via shared `_alloComputeHeadline` (no residual means);
circle-back loop bounds/adoption; audit memo keying (no stale serving); honesty chain (coverage floor,
partial gates, D-reframe, floored-unanimous copy, per-section throttle labels, `_eaGovernsHeadline`);
CB-1/CB-2; object-URL revokes pairwise; canvas cache caps; shared-worker release; historical pdf.js
leaks fixed; `_ocrWordsToDrawCalls` y-flip/rotation math; MCID↔ParentTree ordering; `/Artifact BMC` for
blank pages; per-run reset of the `__lastOcr*` family; every tagged-bytes regeneration re-points
`_lastTaggedBytesRef` + drops stale veraPdf verdicts; #G banner-lift idempotence + XSS posture;
caa4a2dc9 render branches; `_distributeCallsToRuns` pure-function edge cases.
