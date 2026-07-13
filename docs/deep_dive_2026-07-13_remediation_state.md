# Remediation Pipeline Deep Dive — 2026-07-13 (state + opportunities; findings only, nothing fixed)

Requested: "deep dive analyzing the state of the document remediation pipeline and if there are
additional enhancement or refinement opportunities."
Method: state mapping by the coordinating session + 3 parallel read-only agents (7/12-ledger
status audit; adversarial review of the brand-new hardening code; capability-level enhancement
survey). Tree was being actively edited by a concurrent session throughout; nothing was modified,
built, or staged. Line numbers are approximate against the 7/13 ~18:20 tree.

---

## 1. Where the pipeline stands

- The 2026-07-12 verification-evidence wave landed AS A UNIT in @eaa6f20fb (7/12 22:35 deploy)
  — the split-brain hazard from docs/review_2026-07-12_verification_wave.md is resolved.
- MOST of the 7/12 ledger fixes (A1, A2, B2, B5, B7-consolidation, plus a new canonical
  `verification_policy_source.jsx` module) were swept into @7ea2c5cdc "i18n(angles): Lao pack"
  (7/13 13:49) — a MISLABELED sweep commit. Git archaeology should treat that commit as the
  verification-policy landing, not an i18n change.
- @c987567ba "Harden remediation companions and batch checkpoints" (7/13 16:18) fixed a
  plain-language ReferenceError that @7ea2c5cdc introduced (free `r` after a deleted
  `simplifyAccessibleHtml` call). The broken window (13:49–16:18) was never deployed.
- Deployed through @4c0ef3aae (7/13 17:31); pushed. Only 4 non-pipeline commits ahead of origin.
- IN FLIGHT (uncommitted, active session): batch-checkpoint v4 rework (per-batch scoped status
  keys, Web Locks cross-tab serialization, idbKeyval orphan sweep, stricter resume validation)
  + CSS/HTML sanitizer tightening + unrelated karaoke/AlloBot ANTI hunks. Built modules are
  STALE vs this source — a deploy before rebuild ships none of it (normal; deploy.sh rebuilds).
- STILL THE GATE: docs/smoke_individual_remediation_2026-07-10.md — all checkboxes empty.
  Everything below is proven by goldens/e2e, not by real documents through the real Canvas UI.
- veraPDF CI job still `continue-on-error: true` (verify.yml ~165). Promotion criterion was one
  green run on a real runner; check the Actions tab and delete the line if green.

## 2. 7/12 ledger scoreboard (verified against current tree)

FIXED: A1 core (single `_alloRemediationOutcome`, doc_pipeline ~2600; both consumers delegate),
A2 (severity-gated referral at all 4 sites), B1 (verdict reads verificationState ~2640),
B2 (four-state section + per-engine rows + "Re-run verification only" button, view ~8420-8463),
B5 (report renders Status reasons ~21337), B7 core (canonical verification_policy module; pipeline
+ view + ANTI all delegate).

PARTIAL: B3 (precedence fixed in the policy module, but `_STATIC_WEB_REVIEW_REASON` still forces
every web audit to review-required — the ==='complete' toast branches at view ~4345/4438 stay
dead; extraReasons still count as review findings; ANTI FALLBACK copy retains the old precedence
+ bare-aggregate EA count at ANTI ~21876/21903), B8 (stale checkpoints now cleaned on version
mismatch, doc_pipeline ~10724, but NO disclosure toast — the promised Resume just silently never
appears).

OPEN: A3 (audit-only refresh burns one full Gemini audit per auto-continue on a clean doc, no
EA-unavailable skip, ANTI ~22276-22313); B4 (batch HTML popup still "N succeeded" with no
processed/verified/review split, view ~4745); B6 (WCAG 2.2 claims exceed layer reality on ALL
surfaces: rubric has zero 2.2 SCs while reports claim "Checked against WCAG 2.2 Level AA"
~21508/21739/22154; help_strings.js 6× "WCAG 2.1"; all 63 lang packs still say 2.1; view
WCAG_LABELS lacks the six 2.2 names); C1 (~9× full-HTML TextEncoder per file at batch end, no
WeakMap memo, doc_pipeline ~123-139); C2 (`_currentTaggedValidation` re-encodes full HTML every
render after any tagged validation, view ~280/2425); C3 (silent no-op tagged/typeset downloads,
view ~2486/10477 — companions got toasts in @c987567ba, these didn't); C4 ("null issue(s)
remaining" toast, view ~3641/3770); C5 (web audit-unavailable branch hijacks the results screen:
"Audit & Remediate" success unreachable when pdfAuditResult.score==null, view ~5923 vs ~4435);
C6 (audit-only refresh axe-failure nulls axe and can RAISE the headline to AI-only, ANTI
~22289-22335); C7 mostly open ("+null", eager-updater reliance, dead `summary.verificationStates`,
inconsistent `standard` strings, brittle 'WCAG 2.2 AA' sniff, stale+fresh reasons union,
hardcoded-English batch tiles + new B2 section strings, orphaned `pdf_audit.web.subheading` key
in 63 packs, view BOM, `r.finalScore` never displays).

Residuals on FIXED items: history CSV still has no verification column (A1); verdict bullet still
renders the raw reason token (A2, doc_pipeline ~2641); `_finalAuditRetryAvailable` still
write-only (B2).

## 3. New findings in TODAY'S code (hand to the owning/active session)

On @c987567ba (all superseded by the in-flight rework, relevant only if it ships alone):
- CS1-A MED: interrupted/raced batches leak up to ~128MB of result blobs in IDB (no sweeper).
- CS1-B/C LOW: single-slot status key; prefix-based result acceptance.

On the UNCOMMITTED working-tree diff:
- CS2-A MED (plausible): `_withBatchCheckpointRootLock` only catches a SYNC throw; per spec an
  unavailable lock manager (opaque-origin sandboxed iframe = Canvas without allow-same-origin)
  REJECTS. Rejection propagates: checkpointing silently dead in `_saveBatchFiles`, and worse,
  `_clearActiveBatch` has already deleted result blobs + scoped status BEFORE the lock (~10796)
  so a rejected lock leaves the FILES root alive → permanent zombie resume banner advertising
  results that were destroyed. Fix shape: `.catch()` into the unlocked fallback.
- CS2-B MED (confirmed): `storageDB.set/get` NEVER throw (utils_pure_module ~203-213: internal
  catch, resolve null) → every new failure/rollback/disclosure path keyed on a storage throw is
  dead code. Quota failure on the heavy root write returns `true`, then all subsequent status
  saves fail the ownership gate silently; the per-result `_checkpointResultOmitted` disclosure
  can never fire. Load-side self-heal keeps it safe (done→pending), but the disclosure machinery
  built in this same diff won't trigger. Needs storageDB to surface failure (return false /
  sentinel) or the callers to verify-after-write.
- CS2-C MED: ownership takeover by another tab is never disclosed; the quota-stop toast still
  promises a Resume that can no longer exist.
- CS2-D LOW: `_batchResultKeyFor(_batchId, item)` moved OUTSIDE the null guard (~11815);
  null queue slot → TypeError after setPdfBatchProcessing(true) → wedged batch UI (defensive).
- CS2-E LOW (runtime-probed): CSS sanitizer security posture HOLDS (all escape/comment/nesting
  bypasses neutralized or fail-closed; Word/Docs legit escapes survive) but canonicalization can
  corrupt legit strings: `content:"\22"` breaks nesting; string-blind comment strip can merge
  across strings and delete a rule; NEW `image|src(` strip rewrites prose like
  `content:"see image (figure 2)"` → `"see none"`. Fail-safe direction, style-only.
- CS2-F LOW: v1-status delete happens before first v4 write (crash window loses done-statuses,
  files re-run; safe direction).
- Karaoke store + AlloBot plan-resume hunks: sound (disclosure-reads satisfied; races traced
  clean). One nit: resume after a failed original snapshot takes a mid-plan snapshot the Undo
  chip mislabels.

## 4. Capability-level enhancement opportunities (ranked, verified current)

1. TABLE CELL-POSITION FIDELITY GATE — HIGH value / M. The code schedules it itself
   (doc_pipeline ~723: transposition of equal values is a "known blind spot (phase-2: table
   cells)"). `_numericFidelityLosses` is bag-of-numbers; two swapped WISC subtest scores pass
   clean. `_tableContentPreserved` (~3369) exists but is wired only to the table-refine popup,
   not the main AI-fix acceptance path. Build: (row,col)→cell map before/after each AI pass →
   gate or persistent fidelity note. The exact worst-case document is a psych-report score table.
2. SAMPLED VISION ALT-VS-IMAGE SPOT-CHECK — HIGH / M. Alt quality is heuristic + HTML-only
   (~784-837, English-pattern boilerplate only); plausible-but-wrong AI alt passes. Image data
   URLs + wrapped callGeminiVision + the equation-triangulation pattern (~13737) all exist;
   sample 3-5 imgs, ask "does this alt match?", surface disagreement in the image panel.
3. COLUMN-AWARE READING ORDER FOR THE OCR PATH — HIGH-MED / M. `_alloOrderTextItems` (RTL-aware
   column repair) applies ONLY to pdf.js text-layer extraction (~8003 sole call site). Scanned
   multi-column docs rely on Tesseract layout + a prompt directive. Tesseract word boxes are
   already in the exact {t,x0,y0,x1,y1} shape the orderer wants (~9085).
4. CALIBRATE + ENFORCE THE READING-ORDER ROUND-TRIP GATE — MED-HIGH / S-M. The code's own
   declared debt (~25488 "enforcement waits on threshold calibration"; ~25564 "raise to 'fail'
   and withhold pdfuaid at stamp time (follow-up)"). Today a scrambled tag tree still gets the
   PDF/UA-1 stamp with only a warn line. Needs a small real multi-column corpus.
5. WCAG 2.2 TRUTH-IN-LABELING (B6) — MED / S. Either add the applicable 2.2 SCs (2.5.8 target
   size is the one with real document surface, deterministic) or scope the claim per layer; fix
   help_strings + 63 packs + WCAG_LABELS. Cheap and it is an active overclaim in generated
   reports today.
6. veraPDF FIRST-RUN BOOT (~15s on Chromebooks) — MED / M. Code flags it itself (view ~2297).
   Warm the CheerpJ iframe when a PDF project opens.
7. BUNDLE temml LOCALLY — LOW-MED / S. MathML enrichment loads temml from jsdelivr/unpkg
   (~13567); school firewalls silently degrade to spoken-alt-only. Serve from alloflow-cdn.
8. RTL TYPESET TAGGED PDF — MED / L (defer). Typeset path deliberately refuses Arabic/Hebrew
   (~13298, honest WARN; overlay path fine via ActualText). Needs harfbuzz-wasm shaping. Only
   matters if family-communication translation must round-trip to PDF.

Verified BUILT (do not rebuild): text-layer multi-column repair; chunk-seam table/list splits
(splitHtmlOnTagBoundary); batch resume/retry/quota-pause UX; AcroForm extraction + recreated
widgets + Stage-3 form tagging; math core (Vision equation → spoken alt + LaTeX + /Formula +
MathML); per-leaf MCIDs (PAC-verified); skip-link/focus CSS in exports; prior perf hot loops.

## 5. Suggested batches (Aaron picks)

- BATCH Q (quick honesty wins, ~S): C3 toasts, C4 null-toast, C5 branch order, C6 keep-prior-axe,
  B8 disclosure toast, B4 popup split, A1-residual CSV column, A2-residual reason token,
  C7 quick items (+null, i18n key swap, hardcoded strings).
- BATCH W (WCAG 2.2 labeling): item 5 above.
- BATCH P (perf, ~S): C1 WeakMap memo + C2 render memo (Chromebook jank).
- BATCH L (locks/checkpoint follow-through, coordinate with the active session): CS2-A/B/C/D.
- CAPABILITY (each its own pass with goldens): items 1-4; then 6-7.
- STANDING: Canvas smoke checklist (THE gate); veraPDF CI promotion if green; B7 ANTI-fallback
  parity pins; structural refactors #3-full/#6-full; M11/M20/L-tier; A3 futile-audit skip.
