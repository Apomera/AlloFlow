# Remediation Pipeline Review — 2026-07-12 (findings only, nothing fixed)

Requested: "review the remediation pipeline for potential areas for refinement or improvement."
Method: 4 parallel read-only review agents (pipeline diff, view diff, ANTI host, cross-cutting integration) over the WORKING TREE, top findings byte-verified by the coordinating session. Gates (free-vars, disclosure-reads) green; all 270 tests across the 16 pin/new suites pass on the tree.

## What the review actually found in the tree (read this first)

A large **verification-evidence wave** is in flight (not in any session memory — authored 2026-07-11/12 by another session):
canonical verification states (complete / review-required / partial / unavailable) derived from AI rubric + axe-core + IBM Equal Access; SHA-256 evidence-to-HTML binding with non-serializable witnesses; real WCAG 2.2 engine upgrade (axe 4.10.3→4.12.1 + `wcag22a/aa` tags, EA `WCAG_2_2` policy); batch CSV/telemetry/ZIP verification columns; cache version bump `20260710-2`→`20260711-1`.

**Split-brain commit state (deploy hazard):** the ANTI/host half is COMMITTED — swept into `d37a23b17` "Save privacy-safe roster session history" (mislabeled concurrent-session sweep; `git log -S deriveVerificationState` attributes it). The doc_pipeline_source.jsx (+704), view_pdf_audit_source.jsx (+1373), built modules, and PIPELINE_ARCHITECTURE.md halves are UNCOMMITTED. HEAD's pipeline has no `_alloDeriveVerificationState`; committed ANTI runs on its internal fallback copy (which has drifted — see B7). A revert of the roster commit would strip the loop half while the (untracked) test suites still expect it. The wave must land or be reverted as a unit.

Also in flight, unrelated: the uncommitted **AlloFlowANTI.txt diff (~630 lines) is a QR-homework-expiry + Document-Builder-refine wave** (another session; ANTI last touched 18:34 today). Its findings are in section D — hand to the owning session.

---

## A. Decision-level (Aaron's call — calibration, not plain bugs)

**A1. "Success" is now near-unreachable in real conditions, and TWO competing success numerators are emitted.**
- Host run-history: AlloFlowANTI.txt:15731 `_outcome = afterScore>=target && _resid===0 && !_aiVerificationIncomplete` (no canonical-state requirement). Pipeline telemetry: doc_pipeline_source.jsx:20938 `outcome = verificationState==='complete' ? 'success' : 'incomplete'` (no score/target requirement). Same run can be success in one artifact and incomplete in the other, both directions. History CSV has no verification column to disambiguate (view_pdf_audit_source.jsx:5726-5749).
- Reaching `complete` requires AI+axe+EA all complete with ZERO review findings AND a live crypto binding. EA now deducts and gates on RECOMMENDATION-policy POTENTIAL/MANUAL findings (doc_pipeline_source.jsx:13452-13470 — deliberate, commented) and axe `totalIncomplete>0` blocks too; both are near-universal on real documents, and in Canvas the EA CDN may not load at all → `complete` unreachable there.
- Consequence: the UMaine-defended reliability rate drops discontinuously on deploy; run history labels runs "below target" that beat the target; batch tiles show "0 fully verified" on good runs.
- Position: the honesty direction is right, but pick ONE success definition (suggest: score/target/zero-fails = "remediation success" + verificationState as a separate reported column everywhere) and decide deliberately whether EA recommendations should deduct from the score vs. only count as review evidence.

**A2. Expert-review referral fires on essentially every run.** doc_pipeline_source.jsx:20616-20620, :20825-20828; view:3596-3600. Any axe-incomplete, any EA potential/manual, OR any missing engine (network-blocked ace.js, absent crypto.subtle) → `needsExpertReview=true`, reason forced to 'accessibility' (overwriting 'content-fidelity'), full "Needs Expert Accessibility Remediation → Knowbility" panel (view:9391) on a 98-score doc. Collapses the banner's triage value; the verdict bullet renders the raw token "accessibility" (doc_pipeline:2601). Suggest: reserve the referral for confirmed-fail tiers; route review-only evidence to a calmer "human review checklist" surface.

**A3. EA in the auto-continue loop cost note (was queued as Aaron's cost call — another session shipped it).** EA itself is local/zero-API (single pinned load site accessibility-checker-engine@3.1.83, sandboxed via `_neutralizeForAuditFrame`, doc_pipeline:13386-13419 — clean). But the audit-only refresh path spends one full fresh Gemini audit per auto-continue invocation on an already-clean doc (ANTI:22135), and in Canvas (EA blocked) that call is guaranteed-futile — it can never yield `complete`. Bounded (single-shot, `break` at ANTI:22314) but pure waste; consider skipping the refresh when EA is known-unavailable.

## B. Verification wave — wiring gaps to close before deploy (VERIFIED)

**B1. `distributionVerdict` never reads the canonical state → "✅ Ready to hand out" over unverified results.** doc_pipeline_source.jsx:2588-2631 reads only needsExpertReview/fidelityNotes/coverage/afterScore/axe/EA/_aiVerificationIncomplete. Central binding-enforce (doc_pipeline:251-274, view:199-220) downgrades to partial/requiresManualReview WITHOUT setting needsExpertReview → post-edit or legacy-loaded results render the top-of-card verdict "Ready to hand out" while the exports/audit-trail from the same object say unverified. Byte-verified. (Both project loaders preserve saved `needsExpertReview:false`: view:5650, :11316.)

**B2. The four states are never rendered on the PDF results screen; no non-mutating re-verify.** Only render sites are web-audit branch (view:5925/5936). PDF panel still speaks via old proxies; partial vs review-required vs unavailable indistinguishable; a demoted legacy project shows NOTHING about its demotion. `_finalAuditRetryAvailable` written (view:3585/5636/11302) but never read — the known dead-disclosure class. Recovery paths all mutate the doc (Fix Remaining). Needs: state chip + reasons on the results card + a "re-run verification audit" (audit-only refresh exists in ANTI:22098 — surface it).

**B3. Derive precedence bug: review evidence beats all-unavailable.** view:456-457 (and same structure in pipeline copy :92 region): `hasReviewEvidence ? 'review-required' : … allUnavailable ? 'unavailable' …`. Web path always injects `_STATIC_WEB_REVIEW_REASON` (view:2335/4289/4386) → web audits are ALWAYS 'review-required' (the `==='complete'` toast branches at view:4324/4414 are dead; chip is a constant; even zero-engines-ran claims 'review-required'). Byte-verified. Fix: test allUnavailable first, and don't count context notes as review findings (also doc_pipeline:104-113 `extraReasons`/`languageReviewRequired` inflate reviewCount — both currently unwired inputs).

**B4. Batch HTML dashboard popup not updated.** view:4716-4724 "${done.length} succeeded", "Need Expert Review", no processed/verified/review split — while `summary.succeeded` was redefined to fully-verified and ZIP/CSV split honestly. Administrator citing the popup overclaims. Byte-verified.

**B5. Report block never renders `verificationReasons`.** doc_pipeline:21191-21227/:21428-21444 — binding-caused downgrade shows "partial" with three engine rows all "complete" and zero explanation. Audit-only reports (no binding pre-remediation) can hit the same contradiction.

**B6. WCAG 2.2 claims exceed layer reality.**
- AI rubric layer is label-only: prompts say "WCAG 2.2 AA" but the deduction table/11-item checklist (doc_pipeline:12128-12157) has no 2.2 SCs (2.4.11, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8). Reports claim "Checked against WCAG 2.2 Level AA" (:21386/:21613). Either add the applicable 2.2 items (target size + focus-not-obscured matter for interactive HTML exports) or scope the claim per layer.
- help_strings.js:934/974/996 still say "WCAG 2.1 AA"; all 63 lang packs render "WCAG 2.1 AA" in registered keys (`pdf_audit.knowbility.italic_callout`, `pdf_audit.ada.*`, `pdf_audit.score.axe_desc`, batch subtitle — e.g. lang/yoruba.js:4415+). Localized UI will contradict generated reports.
- view WCAG_LABELS map (view:9142-9165) lacks the six 2.2 names → number-only rows. (Normalizer `_alloWcagScFromTags` handles wcag2411-style tags fine — verified.)

**B7. Three copies of the derive policy; two have already drifted.** Pipeline (doc_pipeline:92) and view (:439) use `max(aggregate, potential+manual)`; ANTI fallback (:21694) uses bare aggregate; ANTI fallback ENFORCE sets needsExpertReview on downgrade (:21873) while the shared helper doesn't (stricter fallback than live path). The exact `_alloComputeHeadline` duplication class that bit twice before. Consolidate to the pipeline export + parity pins.

**B8. Version bump silently strands pre-wave resumable batches.** `_PIPELINE_PROMPT_VERSION` mismatch → resume guard returns null (doc_pipeline:10408) → resume banner never renders, though the quota-pause toast promised "Remaining files stay queued — use Resume" (:11713). Multi-MB IDB payload lingers to 7-day TTL. Needs: disclosure toast + cleanup on mismatch.

## C. Perf / robustness (wave)

**C1. Batch-end verification derivation re-encodes full document HTML ~9× per file.** `_alloIsLiveVerificationHtmlBound` does `TextEncoder.encode(fullHtml)` per call (doc_pipeline:211-227), called from summary/ZIP/CSV/telemetry/report sites (:11650-:11902). 50-file × 2MB batch ≈ ~900MB of UTF-8 encoding on the main thread at ZIP time. Memoize per result object (WeakMap) or hoist one verification per item.

**C2. `_currentTaggedValidation` re-encodes full HTML on EVERY render** of the 15k-line component once a tagged validation exists (view:2410-2412 top-level call → byteLength + full string ===). Chromebook jank for the rest of the session after any tagged export. The byteLength invariant was proven at attach; memoize on (result, html) identity.

**C3. Silent no-op downloads.** New stale-HTML guards on tagged-PDF/typeset handlers `return` with NO toast (view:10394-10395, :2472-2474, ~:10937). Auto-continue commits new HTML between rounds while the panel stays interactive → mid-run clicks produce nothing, silently. Withholding correct; add the toast.

**C4. "null issue(s) remaining" success toast.** view:3625 `ok:Number.isFinite(_wscore)` with `issues:null` on deterministic-only re-audit → caller :3754 renders "Re-checked: 72/100 · null issue(s) remaining" exactly when AI is throttled.

**C5. Web audit-unavailable branch hijacks results.** view:5886 `_isWebAudit && score==null` renders the no-score screen BEFORE the pdfFixResult branch; "Audit & Remediate" sets only pdfFixResult (:4408-4411) → successful remediation unreachable behind the failed-audit screen.

**C6. Audit-only refresh can wipe a good axe audit and raise the headline.** ANTI:22111-22113 (axe refresh throw → axe=null) + :22153-22157 (null det → newScore=reVerify.score): axe-governed 88 jumps to AI 97 on a round that fixed nothing. Disclosed via _scoreSource, but the number rises. Keep prior axe on refresh-failure instead of nulling.

**C7. LOWs (compressed):** batch card renders "+null" when avgImprovement null (view:4601) and shows two near-synonymous review counts (:4597 vs :4603); `_verification`/`_applied` read right after setPdfFixResult relies on eager-updater evaluation (view:3563-3625); project-load token doesn't invalidate vs a fresh upload during the rehydrate await (view:2262); demotion leaves `verificationReviewCount` stale 0 (view:201-215); dead fields `verificationStates` map / axe+EA `manualReviewRequired`/`verificationStatus` / `coverage.pdfUaSelfCheck` unread in reports; engine `standard` strings inconsistent ('WCAG 2.2 A/AA' vs 'WCAG 2.2' vs 'WCAG 2.2 AA'); canonical-shape sniffing keys on exact string 'WCAG 2.2 AA' (view:400/:473 — brittle at the next bump); reasons union can double-count stale+fresh axe-incomplete counts (doc_pipeline:289-318); new hardcoded-English strings incl. batch labels that REPLACED t()-keyed ones and a subheading key swap orphaning 63 pack translations (`pdf_audit.web.subheading` → `pdf_audit.web.static_scope_subheading`, view:4174); UTF-8 BOM added at view:1; multi-session per-range score never displays (`r.finalScore` vs stored `afterScore`, view:6470 — pre-existing); EA `WCAG_2_2` policy id on pinned 3.1.83 only string-tested — one live smoke recommended.

## D. Unrelated in-flight QR/homework + builder wave (uncommitted ANTI diff — owning session's queue)

- **D1 HIGH: v9 gate blocks hosting for every reloaded session.** ANTI:14795-14799 `Number(mbConfig.v||0)<9` but `v` is never persisted (localStorage restore keeps only {url,admin}, :13993-13995; `v` set only by connect self-test :14185) → up-to-date teachers told "Update your Class Mailbox script to v9" after every reload; branch also skips `mbPendingHostRef` so hosting doesn't auto-resume. Byte-verified gate + restore.
- **D2:** "Test as student" always toasts "Allow pop-ups": `window.open(...,'noopener,noreferrer')` returns null BY SPEC on success (:14998-15000); `preview.opener=null` dead.
- **D3:** Revoke uses unguarded `window.confirm` (:15005) — dead/throwing in Gemini Canvas, the primary surface; file's own `_canAsk` pattern (:23553) exists for exactly this.
- **D4:** File-Save while builder is open on a remediated doc persists PRE-edit HTML under a "saved" toast (async setPdfFixResult vs render-captured pdfFixResult; :24218→:23529-23536→:23474; phase_k_helpers_source.jsx:102).
- **D5:** builder write-back emptiness guard relaxed to "any text or any element" (:23464-23467) — a broken partial render can clobber accessibleHtml (binding will downgrade honestly, but content lost).
- **D6 LOWs:** expiry enforced only by not-yet-deployed shell code (students on current CDN ignore expiresAt; late submissions get raw `e:'expired'`); QR svg title no longer names assignment + stale dep (:14761-14766); iframe forward-Tab handoff skips controls after iframe (:23701-23708); builderDraft can add ≤32MB near-duplicate HTML to project files (:23504).

## Verified sound (don't re-litigate)

Witness/binding design is fail-closed and tamper-evident (JSON/structuredClone/spread all demote, never overclaim; re-attach after Object.assign correct); cache identity properly bumped + `_auditFinalized` guard intact; batch resume version-gated; EA single pinned sandboxed load site; veraPDF verdict lifecycle fully generation-guarded across all five paths; auto-continue termination is defense-in-depth (EA-unavailable degrades to disclosed partial, never spins — prior `_eaFails===0` semantics preserved); HTML+evidence travel atomically per accepted round (no mismatched-pair path in ANTI); fidelity recompute intact; source/module/prismflow mirrors in parity; multi-session merged download makes no verification claims (binding can't brick it).

## Standing queue (unchanged, from prior sessions)

#3-full run-context rewrite; #6-full finalization reducer; M11 abort-slot per-origin registry; M20 altQuality badge in image panel; L-tier; **docs/smoke_individual_remediation_2026-07-10.md Canvas smoke — still THE gating step** before any "works extremely well" claim, now doubly so with this wave in the tree.
