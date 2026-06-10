# AlloFlow Remediation Pipeline & Document Builder — Strategic Audit (June 2026)

*Prepared for the maintainer ahead of the UMaine System stewardship conversation. Synthesizes four investigations: feature inventory (verified against source/tests/git, 2026-06-10), verification-evidence ledger (repo HEAD `05e45180`), UMS utility analysis, and a 2025–2026 higher-ed market refresh. Investigator-marked inferences are flagged as such; investigator disagreements are called out where they exist.*

---

## 1. Executive summary

- **The pipeline is real and unusually deep for a browser-only tool**: client-side tag-tree injection into original PDF bytes (per-leaf MCID linkage for tables/lists/figures/links/forms, font repair with hand-rolled subsetting), an evidence-gated PDF/UA-1 declaration that is *withheld* when the assembled tree has orphaned leaves, and a multi-layer integrity-guard architecture around AI rewriting. All verified against source and an eight-golden Playwright suite.
- **The verification architecture is the strongest credibility asset, but it has two load-bearing gaps**: the veraPDF ISO ground-truth harness has *never produced a recorded successful run* (Java absent locally, gate informational, not in CI), and the score-calibration corpus is **empty** — so the two claims most likely to be probed by faculty ("output is ISO-conformant-or-better" and "scores approximate expert judgment") are currently PLAUSIBLE-UNPROVEN.
- **Nothing has ever been validated on the primary runtime (Gemini Canvas), on a real teacher's messy PDF corpus, or by a human with PAC 2024/NVDA.** These are honest, acknowledged gaps — the Garry demo docs explicitly ask Cochrane's team to run the independent checks — but they gate the stewardship conversation and nothing else matters until they close.
- **The competitive map shifted in 2025–2026**: "they score, it fixes" no longer distinguishes AlloFlow from YuJa Panorama Max, Continual Engine PREP, CampusMind, or the ASU/OSU AWS pipeline, all of which now auto-remediate. The defensible niche is the *combination*: free at point of use, individually adoptable without procurement, browser-side processing (with the Gemini-egress caveat below), and an evidence-gated conformance claim rather than a marketing badge — a stance DOJ implicitly validated by citing "the limits of generative AI to automate accessibility remediation at scale" when extending Title II deadlines.
- **The biggest near-term credibility risks are self-inflicted document inconsistencies**: live outreach copy still says "Zero Cost" uncaveated and "fully accessible HTML"; the stewardship draft claims "no data leaving the browser" (false for the pipeline — content goes to Gemini); AdminBrief still says "ICC/Cronbach's-α"; and two documents contradict each other on user counts. A skeptical gatekeeper reading the set will find these in an afternoon.

---

## 2. What exists today

Maturity grades from the inventory: **[T]** verified-by-tests · **[S]** shipped, logic-tested but Canvas-unverified · **[P]** partial · **[D]** deliberately dark.

| Group | Capabilities (condensed) | Grade |
|---|---|---|
| **Input/audit** | pdf.js extraction + scanned-detection; dual-engine OCR (Tesseract + Gemini Vision, reconciled); DOCX/PPTX/HTML intake; batch with mid-batch resume; up-to-10-auditor stakeholder-perspective scoring with deterministic-rubric override; 50/50 AI+axe blend; SHA-keyed caching | [T] scoring/retry/axe; [S] intake paths; [D] AcroForm value extraction |
| **Remediation** | deterministic WCAG fixes rerun after every AI pass; 3-tier surgical fixes with param validation (post-hallucination-incident); AI rewrite with text-floor, compound-shrink gate, whole-doc coverage check; fabrication detector (WARN-only); word restoration with visible Content Recovery appendix; teacher accept/reject gate on AI-reconstructed structure; autonomous loop with regression revert | [T] core guards; [S] restoration helpers (no dedicated unit test) |
| **Tagged-PDF output** | structure tree over original bytes per ISO 32000-1; per-leaf MCID content linkage incl. tables/lists/figures/links/AcroForm widgets (signature-preserving skip); artifact marking; font repair + WinAnsi TrueType subsetting with triple safety net; **evidence-gated PDF/UA-1 XMP**; round-trip byte verification; in-app self-check with explicit "run PAC 2024 for certification" disclaimer | [T] across eight goldens; [S] artifact marking |
| **Exports** | accessible DOCX [T], themed PPTX [T], HTML [S], Markdown/NotebookLM [S], ePub (single-document, minimal) [P], **uncontracted Grade-1 BRF only** [P], signed audit-trail report with "not a legal-grade signature" disclaimer [S], run-history CSV [S] |
| **Document Builder** | live designMode editing on the *real* remediated document (write-back, not a copy); 22 insert templates; theme/font registry incl. OpenDyslexic actually shipping; axe audit in preview; Harper WASM grammar check [T] | mostly [S] |
| **UX/guidance** | guided tours, 65-key help system (gate-checked), honest wait copy with estimated model-call counts, 401-vs-429 quota banners, Canvas platform probe, project-file persistence because Canvas wipes local storage | [S] |

**Genuinely differentiated (3–4 things no incumbent has):**

1. **Evidence-gated conformance declaration.** `pdfuaid:part 1` is written only when a walk of the actual assembled StructTreeRoot shows zero orphaned semantic leaves; otherwise the marker is withheld with an explanatory comment. Every competitor ships a marketing-grade badge or no claim at all.
2. **Client-side tag-tree injection with content linkage.** Per-leaf BDC/EMC wrapping via inflate/edit/deflate, cross-page MCRs, signature-preserving form-widget tagging, font subsetting with full-embed fallback — entirely in-browser. The cloud entrants (Adobe Auto-Tag, PREP, CampusMind) do comparable structural work server-side; nobody does it in the user's browser tab.
3. **Integrity-guard architecture around AI.** Text-floor retries, fabrication detection surfaced-not-blocking, deterministic ground-truth coverage checks policing the model, never-silently-dropped content (Recovery appendix), revert-if-worse. This is the engineering embodiment of the honesty-first positioning.
4. **Honest failure modes as product.** Quota circuit-breaker with named cause and resume, `axeCoreFailed` flag + toast, "fonts left untouched (honest scope)" by name in the report, withheld declarations explained in-XMP.

**Table stakes** (necessary, not differentiating): extraction, OCR, axe scoring, alt-format exports, themes, batch mode. Every incumbent has equivalents, usually more polished.

---

## 3. Evidence & reliability

*This section is the Garry briefing. The verification architecture leads; the gaps are not buried.*

### What is PROVEN, by which layer

- **Vitest** — 75 test files, ~1,265 static `it()` sites (the CI comment "286 tests" is stale). Proves: scoring/retry contracts, WCAG fix logic, shrink gates, marker hygiene, DOCX/slides spec transformers, clinical pure logic. Caveat the suite documents itself: older clinical tests run against an *extracted copy* of the logic; newer tests runtime-extract the real shipped function and avoid the drift trap.
- **Eight PDF goldens (Playwright, local module)** — the heart of the claim set. Tag-tree invariants and orphan counts on synthetic fixtures; validator non-vacuousness; validator/gate parity (a real prior contradiction, now pinned); ink-coverage render parity (no blank-page catastrophe after font surgery); AI-loop contracts against a *scripted* Gemini; cross-page MCR linkage; PPTX alt/descr landing in real OOXML; Harper WASM loading. Each golden's "cannot prove" column is honest: no AT reading experience, no real-model output quality, no messy real documents, page 1 only for render parity.
- **verify_all gate battery** — 44 checks, 34 blocking, including pair-drift, render-crash families, FERPA persistence, secrets/XSS. CI runs a smaller blocking subset; **only 2 of the 8 PDF goldens run in CI, and that job is `continue-on-error: true`**. The other six are local-only. This is a cheap, code-actionable fix.

### The unverified frontier (the four things Garry should know are not yet demonstrated)

1. **Gemini Canvas runtime.** The Platform Check probe exists *because* this is unverified. Known: localStorage/IndexedDB do not persist across Canvas sessions; clipboard is policy-blocked (probe-verified 2026-06-10). Unknown on Canvas: pop-ups (compare view, print flow), WASM (Writing Check, OCR), end-to-end downloads, CDN reach. The Lumen-style manual smoke checklist exists with unchecked boxes [investigator-inferred: never executed].
2. **veraPDF ISO ground truth.** The clause-diff harness is exemplary in design (fixedByUs/introducedByUs/inheritedRemaining, with the withheld-declaration carve-out correctly classified as the honesty feature working). But **the ledger investigator ran it: Java is not installed; all three artifact pairs errored; no recorded successful run exists anywhere in the repo.** The harness is PROVEN; the ground-truth *result* is UNPROVEN. **Investigator disagreement flagged:** the feature inventory describes `pdf_score_calibration.test.js` as validating the blend "against a PAC/veraPDF-scored corpus" [T]; the evidence ledger checked the corpus manifest — `"entries": []`. The ledger is correct: the harness self-tests its math and skips green until ≥3 expert-scored PDFs exist. **The 50/50 blend weight is unvalidated against any ground truth.**
3. **Real documents.** No messy-teacher-PDF corpus. One real artifact was tagged once (June 5) [inferred], with no recorded validation outcome.
4. **Human AT review.** No PAC 2024 or NVDA pass by a human, ever — openly admitted; the Garry email asks Cochrane's team for exactly this as "the independent check I can't do."

### Credibility debts — status

| Debt | Status |
|---|---|
| Score-blend disclosure | **PAID** — UI labels the blend, per-engine breakdown, divergence override. Residual [inferred]: an internal 70/30 AI+local chunk blend remains undisclosed. |
| Axe-proxy labeling | **PAID** (commit `a8bcdeb6`) — UI states axe runs on a text reconstruction, not original PDF bytes. |
| Zero-cost claim | **PARTIALLY PAID** — honest cost table in deploy docs, but `outreach_emails.md` (current as of June 9) still carries uncaveated "Zero Cost" at three sites. |
| Evidence-gated declaration | **REAL** — but the orphan walk is wrapped in `catch (_) {}`; a crashed walk falls to a regex fallback and could declare without evidence. Fail-open in a corner [inferred]. Small, code-actionable. |

**Verdict summary for the conversation:** tag-tree invariants, declaration gating, validator parity, render safety, AI-loop contracts — PROVEN on synthetic fixtures. ISO conformance claim and score-blend validity — PLAUSIBLE-UNPROVEN. Canvas behavior, real-document survival, human AT experience — HONEST-GAP, staged but unexecuted. The codebase is more honest than its outreach copy; the two places the honesty story outruns evidence are the veraPDF layer (cited as ground truth, currently proving nothing) and the older marketing files.

---

---

> **Post-audit correction (2026-06-10, maintainer session):** the evidence ledger concluded the veraPDF harness had "never produced a recorded successful run" because its investigator found no Java on PATH. That was a FALSE NEGATIVE with a true kernel: Java was installed locally (~/.alloflow-tools JRE, off PATH) and the harness had run to clean results repeatedly — but only as ephemeral terminal output, never recorded in the repo. Both halves are now fixed in the same session: the harness auto-discovers the local JDK (dev-tools/demo/verapdf_check.cjs findJavaHome) and every successful run persists a timestamped result to a11y-audit/verapdf_diff_result.json. The first recorded run is committed alongside this report: perleaf-borndigital fixture, source 7 failed ISO 14289-1 rules → tagged 0, zero introduced, verdict no-regressions. The "Install Java; run veraPDF" roadmap item is therefore COMPLETE; the still-true gaps from that finding: the gate remains informational (not CI-blocking) and the calibration corpus remains empty.

## 4. Competitive position

### The 2025–2026 correction

The prior framing — incumbents score, AlloFlow fixes — survives against **Anthology Ally** (its new quick fixes stop at title/language/OCR; no structural tagging, no PDF/UA claim; and Ally's vendor went through Chapter 11 restructuring of ~$1.6B debt in 2025, making vendor stability a live procurement question). It does **not** survive against **YuJa Panorama Max** (genuine AI structural tag work inside Canvas, reading-order editor, AutoPilot auto-fix mode), **Continual Engine PREP** (90–95% auto-tagging claims, adopted at Stanford), **CampusMind** (agentic, thousands of PDFs from a Canvas course, pay-per-page), or the **ASU/OSU open-source AWS pipeline** (free, auto-tags, "cents per page" — the closest philosophical neighbor, but wholly cloud-side with no audit/evidence-gate loop). The market has decisively moved to AI auto-remediation.

### What remains defensible

The combination no competitor occupies: **(a)** browser-side processing, **(b)** free at point of use, **(c)** individually adoptable by one instructor or one DSO staffer with zero procurement, **(d)** evidence-gated conformance claims. On (a), **the investigators disagree and the disagreement matters**: the market-refresh investigator wrote "the PDF never leaves the machine (clean FERPA/PII story)"; the UMS investigator and the maintainer's own AdminBrief contradict this — *AI features send document content to the Gemini API*. The defensible versions are "no AlloFlow servers, no AlloFlow retention" and "in Canvas, Gemini processing runs under the institution's existing Google Workspace agreement" [inferred: contingent on UMS being a Workspace shop — unverified]. Use those formulations, never the absolute.

### Honest weaknesses per incumbent

- **vs. Ally/Panorama:** no LMS-wide crawl, no institutional dashboard, no compliance-program reporting. Title II is a program-level obligation; AlloFlow fixes documents but cannot give a CIO an inventory or audit trail.
- **vs. Panorama Max/PREP/CampusMind:** no bulk pipeline at university-backlog scale (tens of thousands of PDFs), and "doesn't work every time" reliability — Garry's stated condition — is disqualifying in procurement contexts where vendors offer SLAs and HECVAT documentation.
- **vs. SensusAccess:** no contracted braille, DAISY, or large-print — the alternate-media obligations DSOs actually license it for. AlloFlow's BRF is Grade-1 uncontracted only.
- **vs. Acrobat Pro/CommonLook:** no expert manual repair bench for the hard 20% (complex tables, forms, math).

### K-12 lens

The incumbents above are higher-ed/procurement creatures. In K-12 — AlloFlow's actual pilot context (King Middle, Fall 2026) — the individually-adoptable, free, teacher-facing shape is far better matched: a single special-educator or school psychologist can remediate IEP-adjacent documents today with no district contract. Nothing in the market refresh identifies a K-12-native competitor in this shape.

### ADA Title II timing — investigators conflict; the market refresh wins

The UMS analysis treats April 24, 2026 as passed and UMS in "maximum institutional pain." The market refresh, with a Federal Register citation, documents that **DOJ extended the deadlines on April 20, 2026 to April 2027/2028**, explicitly citing the limits of generative-AI remediation. Consequences: (1) the panic-buying urgency argument is weaker — soften it in any UMS pitch; (2) the extension *lengthens the credibility-building window* before institutions lock into five-figure contracts; (3) DOJ's stated rationale is a federal endorsement of exactly AlloFlow's evidence-gated, no-overclaiming stance — quote it.

---

## 5. Utility to UMS

### Use cases, ranked by fit

1. **School-psychology training program (Garry's department) — best fit, zero incumbent competition.** Accessible psychoed-report production (Report Writer, 17 presets, client-side PII scrubbing, 117 clinical-logic tests), and the multi-perspective audit as a *teaching artifact* — students watch why a document fails from a screen-reader user's or Title II officer's lens. Grad-student validation labor is already scoped in the Cochrane email and stewardship draft (2–4 students/year). Caveat: real student data through Gemini needs the same DPA analysis as everything else; PII scrubbing is preprocessing, not a substitute [inferred].
2. **Legacy-PDF backlog, first-pass remediation.** The honest boundary already written in the Cochrane email: handle the straightforward 70–80% (syllabi, handouts, catalogs) at ~$0.13–0.32/document self-hosted vs. $5–25/page vendors; reallocate vendor budget to the hard 20–30%. That framing should survive verbatim into any UMS document.
3. **DSO alt-format triage** — strong as a first-pass tool producing clean tagged source that Duxbury/BrailleBlaster and other downstream toolchains ingest well; *not* a SensusAccess replacement.
4. **Research/grant instrument.** Batch telemetry JSON, run-history CSV, test-retest mode, veraPDF harness, ~70%-ready pilot scaffolding. **Flag the overclaim risk:** this is feasibility/fidelity data about documents, partially scored by the same AI that remediated them — not IES "efficacy" (learner outcomes). Honest fits: OSEP 84.327-family, IES Goal 1–2 [inferred: program fit is background knowledge]. The validation study (AlloFlow vs. PAC 2024 vs. expert remediators) is the publishable credibility unlock.

### What adoption requires that's missing (by blocking severity)

1. Independent validation — the actual Garry condition; demo unexecuted, no third-party PAC results.
2. Production-validated LTI: code is real (Brightspace-first), never registered against a live instance [inferred]; a UMS:IT sandbox registration is a small concrete ask.
3. VPAT upgrade: current is WCAG 2.1 AA self-assessed; 2.1 satisfies Title II, but procurement increasingly wants 2.2 and manual-AT-based ACRs.
4. Bus factor 1 — the stewardship proposal *is* the remedy; present it as the partnership's purpose, not a confession.
5. DPA/legal: Gemini-processing determination (Workspace status unverified), AGPL review, security review.
6. A higher-ed one-pager — AdminBrief's K-12 subscription math is irrelevant to a university.
7. **Document-set consistency before any gatekeeper reads it**: AdminBrief ICC/α phrasing; stewardship draft "no data leaving the browser"; Cochrane email "fully accessible"; the COMPETITOR_COMPARISON ("no real users yet") vs. stewardship draft ("active users; growing") contradiction.

### What NOT to pretend to be

Live LMS/web-content remediation; math-heavy STEM documents (no MathML — explicitly declined in code; the single likeliest gotcha a skeptical reviewer will upload); native PPTX visual remediation (export-to-PDF workaround only); video captioning; production braille/DAISY; high-volume DSO throughput on free-tier quotas; an institutional compliance *program*.

---

## 6. Strategic roadmap

### Now (≤1 month) — everything here gates or de-risks the Garry conversation

| Item | Type | Why / cost-risk |
|---|---|---|
| **Install Java; run veraPDF clause-diff to a recorded successful result on the 3 artifact pairs** | Code-actionable | The ISO ground-truth story currently proves nothing on this machine while being cited as the evidence spine. Hours of work; risk is only that the run surfaces real failures — which is exactly what you need to know before the demo. |
| **Outreach-document consistency sweep** (Zero-Cost caveats, "fully accessible," ICC/α, user-count contradiction, "no data leaves the browser") | Code-actionable (doc edits) | Cheapest credibility insurance available; an honesty-first pitch undone by its own stale copy is the worst failure mode. <1 day. |
| **Execute the three-document demo + screencast** | Human-gated (Aaron) | The explicit Garry gate; the email template's own rule: if the pipeline fails on any demo PDF, do not send. Depends on the veraPDF run landing first. |
| **Run the Canvas smoke checklist** (pop-ups, WASM, downloads) | Human-gated (in-Canvas) | The primary runtime is the largest unverified surface; a demo that breaks in Canvas is worse than no demo. |
| Fix the fail-open orphan-walk `catch (_) {}`; flip the stale "subsetting deferred" comment; resolve the orphaned-leaf golden (gate it or stop implying it's gated) | Code-actionable | Three small overclaim-shaped landmines, each <1 day. |
| Promote the six local-only goldens into CI; drop `continue-on-error`; fix the stale "286 tests" comment | Code-actionable | "Eight goldens, two in CI and ignorable" is a gap a faculty reviewer will find. |

### Next (one semester) — the de-risking core

| Item | Type | Why / cost-risk |
|---|---|---|
| **Seed the calibration corpus (≥3, ideally 10–20 expert-scored real PDFs)** | Human-gated (expert scoring — natural Cochrane-team task) | The 50/50 blend is unvalidated; the harness already skips-green waiting for data. Without this, every score shown to a teacher is an uncalibrated number. |
| **PAC 2024 + NVDA human pass by a third party** | Human-gated (Cochrane's team) | The independent check the maintainer cannot self-administer; converts "self-checked" to "externally examined." Risk: it may find real failures — budget a remediation cycle. |
| Build a messy real-teacher-PDF corpus from pilot intake | Human-gated + code-actionable harness | All goldens are synthetic; reliability "doesn't work every time" can only be quantified against real documents. |
| Brightspace sandbox LTI registration with UMS:IT | Human-gated (institutional) | Small concrete ask that converts "code exists" to "demonstrated." |
| Higher-ed one-pager (legal driver + cost numbers + study design, with the *extended* Title II dates) | Code-actionable | The current AdminBrief mis-targets the audience. |
| Disclose the internal 70/30 chunk blend; have the UI read the `synthesized` flag directly | Code-actionable | Two residual disclosure debts from the ledger; small. |
| King Middle pilot (Fall 2026) with telemetry capture | Human-gated | Feasibility/fidelity evidence tier for grants. |

### Later (one year)

| Item | Type | Why / cost-risk |
|---|---|---|
| Published validation study (AlloFlow vs. PAC vs. expert remediators; test-retest reliability) | Human-gated (IRB, grad students) | The credibility unlock for grants, procurement, and every future stewardship conversation. |
| OSEP/IES Goal 1–2 grant application on pilot + telemetry | Human-gated | Honest evidence tier; do not frame telemetry as efficacy data. |
| WCAG 2.2 ACR with manual AT testing (convert Knowbility conversation to a dated engagement) | Human-gated, costs money | Procurement-facing. |
| Decide the declared-out-of-scope set's future: Grade-2 braille, MathML, native PPTX rendering — keep declining loudly, or roadmap one | Strategic | Each is a large lift; the current honest "we don't do this" posture is itself valuable and should not be quietly eroded. |
| Stewardship agreement execution (governance, DCO, grad contributors) | Human-gated | The bus-factor remedy and the whole point of the UMS relationship. |

---

## 7. Honest bottom line

AlloFlow's remediation pipeline is a genuinely novel artifact: the only known tool that performs structural PDF accessibility remediation — real tag trees, content linkage, font surgery — entirely in the user's browser, free, adoptable by a single educator, and disciplined enough to *withhold* its own conformance claim when the evidence doesn't support it. It is not, and should not pretend to be, an institutional compliance platform; it is a first-pass remediation instrument for the straightforward majority of documents, a teaching and research artifact for a school-psychology program, and a triage feeder for professional DSO toolchains. The biggest risk to its credibility is not a competitor and not the technology — it is the gap between the code's honesty and its evidence: an ISO ground-truth harness that has never recorded a successful run, an empty calibration corpus, an unverified primary runtime, and outreach copy that still overclaims in four places. Every one of those is fixable within a semester, most within a month, and closing them — before Garry's team is asked to look — is worth more than any feature that could be built in the same time.