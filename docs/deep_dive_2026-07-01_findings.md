# Remediation pipeline deep dive — 2026-07-01 (Fable)

Three read-only review agents swept the areas no prior audit had covered
(AI/prompt layer, hostile-input passthrough, batch/scale), plus regulatory
research. Findings below are annotated: **VERIFIED** = I confirmed in code
this session; **REPORTED** = agent-cited with file:line, needs a
verification pass before fixing (per the verify-reachability rule —
severity as calibrated by me, not the agent's raw score).

## Fixed same-day

- **Quota-stopped batch destroyed its own resume** (VERIFIED, fixed
  @75f13cf2 + C32 @29771ac9): the quota circuit-breaker promised
  "remaining files stay queued; resume after reset," then the post-loop
  cleanup — which only spared persisted state on USER abort — deleted the
  Tier-4 batch, and a "✅ Batch complete" toast fired for a paused run.
  Now quota routes to the persist-and-keep branch + honest ⏸ paused toast.

## Cluster A — hostile-input passthrough (institutional-grade concern)

The tagging path *by design* preserves original PDF bytes (that is its
fidelity guarantee), which means it also preserves whatever the source
carried. Not an emergency for the current teacher-owned-document use, but
it matters the moment a district bulk-ingests third-party PDFs and
redistributes outputs with implicit "district-approved accessible" status:

- A1 REPORTED (highest): no scan/strip/warn for PDF active content —
  /OpenAction, /AA, /Names→/JavaScript, /Launch, /EmbeddedFiles, URI
  actions (agent: ~19378-19383; no grep hits for any of these names in a
  filtering role). Realistic vectors today: phishing URIs, embedded file
  payloads. Enhancement path: a "Document Safety" pre-scan panel
  (detect+disclose, optional strip) + offer the typeset rebuild as a
  sanitized-output mode (it inherently drops active content).
- A2 REPORTED: source Info-dict metadata (Author/Keywords/revision) and
  possibly original XMP ride through (updateMetadata:false at ~19666; XMP
  replacement may not remove the original stream ~21989-22022). PII leak
  class; verify pdf-lib behavior then decide scrub-vs-disclose.
- A3 REPORTED: signed PDFs — form/link tagging is skipped "to preserve
  signatures" (~21198, 21289) but structure-tree additions still modify
  the file, which breaks /SigByteRange anyway → internal inconsistency;
  either disclose signature invalidation or skip-and-say-so.
- A4 REPORTED: no URI hostname screening on link annotations (~21280-341).

## Cluster B — AI/prompt layer

- B1 REPORTED (acknowledged in code ~1834-1837): transform prompts do NOT
  fence-neutralize document text (judge prompts do). Deliberate
  fidelity-over-hardening trade-off; the fidelity gates (0.95 text, growth
  guard, reading-order, refusal nets) bound but don't eliminate hijack.
  Cheap wins: neutralize fences in caption/description hints fed back
  into Vision prompts (~4038-4096), and in full violation text (~5206).
- B2 REPORTED: DOMPurify CDN race + weak regex fallback for rawhtml blocks
  (~11245-11296): fallback strips <script> but not <svg onload>/<iframe>/
  <object> — extend the fallback regex to the FORBID_TAGS list; cheap.
- B3 REPORTED: surgical-tool param escaping is inconsistent across tools
  (~4474-4604): some escape (figcaption, table_caption), others don't.
  Unify with one escapeTextField at dispatch.
- B4 FERPA framing (known class, quantified): full PDF base64 goes to
  Gemini in audit slices (multiple times: auditor variants + retries),
  full audio in transcription. This is inherent to AI remediation in
  Canvas (Gemini = the surface's own model, NOT a third party the way the
  agent framed it), but institutional adoption needs: an explicit
  data-flow disclosure in-product, minimization where possible (only
  needed page slices), and the district-DPA story. Related:
  project_pilot_readiness_audit (9 FERPA findings still open).
- B5 KNOWN/DISCLOSED: numeric transposition blind spot (equal-value swap
  passes _numericFidelityLosses, comment ~248); chunk-split compound
  fidelity (halves each pass 0.95 → ~0.90 compound, B13 comment ~3687).

## Cluster C — batch/scale

- C1 REPORTED HIGH: pdf.js document leak in image-extraction loop
  (~15309-15546) — destroy() missed on early-throw paths; known "pdf.js
  leaks" survey item, now with a concrete site to verify.
- C2 REPORTED HIGH: no per-file timeout in the batch loop — one hung
  getDocument stalls the whole batch (only Gemini calls are
  _withTimeout-wrapped).
- C3 REPORTED MED: retry pass doesn't add extra backoff beyond the 5s+3s
  cooldowns; a 429 burst can re-trip.
- C4 REPORTED MED: batch ZIP regenerates every tagged PDF on every
  download click (no byte cache) (~view_pdf_audit 10440-10498).
- C5 REPORTED MED: verification-failed files are EXCLUDED from the ZIP
  with only a notes entry — matches the long-standing "batch-excluded
  toast" open item; surface counts + names in the summary toast.
- C6 REPORTED MED: IDB persist failures are silently swallowed (resume
  divergence); 200MB cap not shown in the batch cost dialog; audit slices
  on 500+ page docs never see cross-slice context (cap disclosure).

## Regulatory/market context (verified via web, 2026-07)

- ADA Title II WCAG 2.1 AA deadlines EXTENDED one year by DOJ interim
  final rule (eff. 2026-04-20): ≥50k population → 2027-04-26; <50k +
  special districts → 2028-04-26. Districts are budgeting NOW.
- Vendor pricing: manual remediation $5–25/page; automated tools
  $0.30–2/page, typically per-page/per-doc licensing.

## Verification queue (next session order)

1. C1/C2 (leak + timeout) — highest user-visible value, straightforward.
2. B2 fallback regex + B1 caption-hint neutralization — cheap hardening.
3. A2 metadata scrub-or-disclose + A3 signature disclosure — honesty class.
4. A1 Document Safety scan panel — design first (detect+disclose+opt-strip).
5. C4 ZIP byte cache + C5 exclusion toast.
