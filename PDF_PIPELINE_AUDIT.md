# PDF Accessibility Pipeline — Deep-Dive Audit

**Generated**: 2026-05-19 (Claude Opus 4.7)
**Scope**: `doc_pipeline_module.js` (17,283 lines), `view_pdf_audit_module.js` (6,210 lines), `audit_remediator_module.js` (628 lines, separate concern — curriculum audit remediation, not PDF).
**Companion docs**: [STEM_LAB_THEME_AUDIT.md](STEM_LAB_THEME_AUDIT.md), [MAIN_APP_THEME_AUDIT.md](MAIN_APP_THEME_AUDIT.md)

## TL;DR

The PDF pipeline is **substantially more sophisticated than its README description.** It's not the "5-auditor" pipeline FEATURE_INVENTORY says — it's actually **up to 10 auditors with stakeholder-perspective variety**, adaptive divergence handling, score-validation against deterministic rubric, AI+axe-core blended scoring, regression-detecting self-healing loop, plateau detection, and deterministic fixes for form labels / complex tables / contrast / lists / ARIA roles / lang attributes.

Real improvement opportunities are mostly at the margins: documentation drift, hardcoded English fallback, no incremental persistence for long batch runs, and a few internationalization gaps. The core architecture is sound.

## Architecture at a glance

The pipeline runs through these phases for each file:

| Phase | What happens | Implementation |
|---|---|---|
| **0 — Extraction** | Deterministic text extraction; OCR fallback for scanned/encrypted PDFs | [`doc_pipeline_source.jsx:2482`](doc_pipeline_source.jsx#L2482); Tesseract.js + Vision OCR fallback |
| **1 — Multi-auditor scoring** | Up to 10 parallel Gemini Vision audits, each from a different stakeholder lens | [`:3128`](doc_pipeline_source.jsx#L3128) |
| **2 — Text extraction** | Pull structured content for HTML generation | [`:3569`](doc_pipeline_source.jsx#L3569) |
| **3 — HTML generation** | Produce accessible HTML structure | [`:3614`](doc_pipeline_source.jsx#L3614) |
| **3b — Deterministic fixes** | Contrast, list structure, form labels, complex tables, ARIA, lang — all algorithmic, zero AI calls | [`:3876`](doc_pipeline_source.jsx#L3876) |
| **3c — Surgical AI fixes** | One Gemini call diagnoses specific gaps → deterministic execution | [`:4280`](doc_pipeline_source.jsx#L4280) |
| **4 — Verification** | axe-core 4.10 in-browser + 2-3 Gemini audits in parallel | [`:4376`](doc_pipeline_source.jsx#L4376) |
| **5 — Self-healing fix loop** | Up to N AI rewrite passes with regression detection + plateau stopping | [`:4398`](doc_pipeline_source.jsx#L4398) |

For batch runs, each file goes through the entire pipeline; a unified `fixAndVerifyPdf` function is shared between single-file and batch flows.

## Strengths worth preserving

### 1. Ten stakeholder-perspective auditor prompts

The audit isn't just "ask Gemini 5 times." Each variant frames the audit through a different lens:

- Original "Analyze this PDF"
- Independent accessibility analyst
- Fresh-eyes auditor with no prior context
- Strict WCAG compliance reviewer
- **Screen reader user perspective**
- Document remediation specialist
- **Disability rights advocate**
- **Section 508 federal standards**
- **Assistive technology expert (JAWS/NVDA)**
- **University compliance officer (Title II ADA)**

This is meaningfully different from N-sampling the same prompt — different stakeholder framings surface different issue classes. The screen reader user catches reading-order issues a "WCAG reviewer" might score-pass. The disability rights advocate flags issues a remediation specialist might normalize. **Don't replace this with a single-prompt-N-sampling system; the perspectival diversity is the value.**

### 2. Score validation against deterministic rubric

[`:3232`](doc_pipeline_source.jsx#L3232): each auditor's reported score is recomputed from their own issue counts using a deterministic rubric (`critical×15 + serious×10 + moderate×5 + minor×2`, adjusted by pass-ratio). If the auditor's reported score diverges from this recomputation by >12 points, the system overrides it. This catches "the AI said 80 but actually flagged 5 critical and 8 serious issues" without throwing the audit away.

### 3. Adaptive auditing on disagreement

[`:3252`](doc_pipeline_source.jsx#L3252): if scores spread > 20 points OR any auditor flagged low-confidence, automatically adds 2 more auditors. This is the right behavior — when consensus is shaky, recruit more eyes rather than averaging through the noise.

### 4. Statistical methods honestly named

[`:3296-3329`](doc_pipeline_source.jsx#L3296): the code comments explicitly say *"NOT textbook ICC"* and *"NOT textbook Cronbach's α"* and explain what the pragmatic hybrid actually computes (CV-based + weighted pairwise). This level of intellectual honesty in code comments is rare; it should stay.

### 5. AI + axe-core blended scoring

[`:3430`](doc_pipeline_source.jsx#L3430): final scores are 50/50 blends of AI consensus and axe-core deterministic result. Each catches different failure modes — AI catches semantic issues (alt-text quality, reading order), axe catches structural issues (missing labels, contrast ratios). Blending makes both visible.

### 6. Self-healing fix loop with anti-regression

[`:4398-4509`](doc_pipeline_source.jsx#L4398): the AI fix loop:
- Snapshots HTML before each pass
- Runs 3 parallel audits per pass + axe-core (cheap, parallel)
- Adds tiebreaker audit on divergence > 15 points
- **Reverts the pass if AI score drops >5 points AND axe violations increase** (line 4491-4495)
- Stops on plateau detected via SEM (line 4506-4507)
- Stops when target score reached with 0 violations

The regression-revert is the load-bearing piece. Without it, the AI can "fix" itself into worse HTML.

### 7. Deterministic + AI fix interleaving

[`:4431-4458`](doc_pipeline_source.jsx#L4431): after every AI rewrite pass, deterministic fixes run again:
- `fixListViolations` (axe-core list-rule)
- `fixContrastViolations` (axe-core color-contrast rule)
- `runDeterministicWcagFixes` (form labels, decorative images, complex tables, lang spans)
- **Invalid ARIA role correction** (line 4439-4447): maps common AI mistakes (`'header'` → `'banner'`, `'footer'` → `'contentinfo'`, etc.) to valid roles, strips invalid ones
- **lang attribute validation** against BCP-47 pattern

The AI generates HTML; deterministic fixes police its output. This catches consistent AI mistakes that the model itself would re-introduce on next pass.

### 8. Tesseract.js + Vision OCR for scanned/encrypted PDFs

[`:2508`](doc_pipeline_source.jsx#L2508) detects `isScanned` (< 50 chars/page average), [`:2547`](doc_pipeline_source.jsx#L2547) handles password-protected PDFs by falling through to Vision OCR. [`:2894-2920`](doc_pipeline_source.jsx#L2894) lazy-loads Tesseract.js from CDN for client-side OCR. Both paths feed the same downstream pipeline.

### 9. Form labels + complex tables

[`:5646`](doc_pipeline_source.jsx#L5646) `fixFormLabels` associates every form field with a label deterministically (WCAG 1.3.1, 3.3.2). [`:5788`](doc_pipeline_source.jsx#L5788) ensures `scope` attributes exist on complex-table `<th>` cells.

### 10. RECITATION error recovery + AbortController

Batch mode handles Gemini RECITATION refusals (when the model declines to verbatim-quote source text) with a recovery path. `AbortController` is wired into `window.__alloPdfAbortSignal` so mid-flight requests honor user cancellation.

## Real improvement opportunities

### Tier 1 — Documentation drift (5 minutes)

- **FEATURE_INVENTORY.md says "5-auditor triangulated AI audit."** Actual implementation is up to 10 user-configurable.
- **The About-modal diagram I just added uses "5-auditor"** — same drift. Should be updated to reflect actual range.
- **README.md** under PDF Accessibility Pipeline mentions "5-auditor" too.

Fix: search-and-replace `5-auditor` → `up to 10-auditor` across documentation. Documentation should reflect what the code does.

### Tier 2 — Hardcoded English language fallback (~20 lines)

[`:4451-4458`](doc_pipeline_source.jsx#L4451): when the source PDF has an invalid or missing `lang` attribute, the system forces `<html lang="en">`. This is wrong for:
- Spanish-language worksheets
- Bilingual immersion materials
- Any non-English source document

The Vision audit prompt already returns metadata about content language implicitly (it can read non-English text). The fix is to ask one of the audit passes "what is the primary language of this document?" and use that ISO code instead of forcing `en`.

For Aaron's use case (educators serving multilingual classrooms), this is a real bug.

### Tier 3 — No incremental persistence for batch jobs

If a user kicks off a 50-file batch and closes the tab at file 23, all 23 files' work is lost (the resulting accessible HTML isn't persisted until the batch completes). Same architectural issue we solved for language pack regeneration.

**Fix**: persist each completed file's HTML to IndexedDB as it finishes. On next load, the batch UI offers "Resume previous batch (23 files complete, 27 remaining)." Smaller scope than the language pack resume because the unit of work is already file-by-file; just need the per-file save hook.

### Tier 4 — Token cost optimization

A heavy doc through the full pipeline can use:
- 10 initial Gemini Vision audits
- 1 HTML generation call
- 1 surgical-fix diagnosis
- Up to 5 fix-loop passes × (1 fix call + 3 verification audits) = 20 calls
- 1 final authoritative audit

Worst case: **~32 Gemini Vision calls per file.** Batch of 50 files = 1,600 calls.

Possible optimizations:
- **Cascade model selection**: first 2 audits with cheap model (Flash); only escalate to expensive model on disagreement or low-confidence
- **Cache audit results by content hash**: same PDF audited twice shouldn't pay twice (e.g., user re-runs after deploy)
- **Surface estimated cost upfront**: show "this batch will cost ~$X / use ~N tokens" before starting

This is a "scale to district" optimization, not a single-user concern.

### Tier 5 — No surface for auditor disagreement

When 10 auditors spread from 60-95, the system adapts internally (adds auditors, recomputes blend) but doesn't surface the spread or the dissenting issues to the user. A clinician/admin reviewing the audit might want to see "9 auditors flagged this as compliant; 1 flagged it as missing critical alt text on Image 3" — that signal is computed but hidden.

**Possible add**: a collapsible "Auditor consensus details" panel showing per-auditor scores, the highest-divergence issue, and which auditors flagged what.

### Tier 6 — Internationalization of audit text

Audit prompts are English. Audit result text (`issue` strings) come back in English. The remediated HTML can be any language, but the audit summary that the user reads is always English. For non-English-speaking educators using a translated UI, the audit findings show up untranslated.

**Fix**: thread `outputLanguage` through the audit prompts the same way we did for Dynamic Assessment — direct each auditor to write `issue` text in target language. Cost: trivial (one line per prompt). Adds parity with DA's recent localization work.

### Tier 7 — Theme responsiveness of the audit UI itself

Per the [STEM_LAB_THEME_AUDIT](STEM_LAB_THEME_AUDIT.md) findings, `view_pdf_audit_module.js` has 173 inline hardcoded backgrounds. The audit UI itself doesn't fully flip with theme. Already documented; would benefit from the same `var(--allo-stem-*)` migration when that batch happens.

### Tier 8 — Tagged-PDF metadata not consumed

Modern PDFs may include a tag structure (heading levels, paragraphs, table semantics). The pipeline re-derives structure from raw text rather than reading the existing tags. Most PDFs in classroom use are untagged, so this is a lower-priority gap, but for already-tagged PDFs (some textbook exports, government docs) it means re-doing work the source already encoded.

## Architecturally interesting things I want to flag (not bugs)

- **Score blending could mask AI-only issues**. AI catches alt-text quality, axe doesn't. If a doc has 0 axe violations but the AI averages 60 (poor alt-text everywhere), the blend yields ~80 — looks decent. Consider weighted blending or showing both scores separately so educators can see "structurally compliant but semantically weak."

- **The remediation footer is good** (line 4537-4541): includes final score, axe violation count, fix-pass count, and date. Provides audit transparency. Could optionally include reliability metrics (SD across auditors, IC C-like value) so a downstream reviewer knows whether the score was based on tight consensus or scattered estimates.

- **The architectural separation between `doc_pipeline_module.js` and `audit_remediator_module.js`** is correct but their names are confusable. `audit_remediator_module.js` is for **curriculum audit remediation**, not PDF audit remediation. Worth a rename pass at some point.

## Recommendation order

If you want to act on this audit:

1. **Documentation drift fix** (5 min) — update README, FEATURE_INVENTORY, About-modal diagram to say "up to 10 auditors" not "5-auditor".
2. **Hardcoded English lang fallback** (20 min) — real bug affecting non-English documents. Source-language detection via audit pass + use that ISO code instead of forcing `en`.
3. **Audit output internationalization** (30 min) — thread `leveledTextLanguage` into audit prompts so non-English UIs see findings in their language.
4. **Batch resume capability** (1 session) — incremental per-file persistence; same pattern as the language pack resume we built earlier today.
5. **Token cost optimization** (1-2 sessions) — model cascade + content-hash caching + upfront cost estimate.
6. **Theme migration of view_pdf_audit_module** (rides along with the broader STEM/main-app theme migration).
7. **Score split surface** (medium scope, design call) — show AI vs axe scores separately for transparency on what kind of compliance you have.

The core pipeline is genuinely impressive engineering. The opportunities above are refinements, not foundational fixes.
