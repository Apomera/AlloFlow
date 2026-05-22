# Dynamic Assessment Module — Audit

**Generated:** 2026-05-19 (Claude Opus 4.7)
**File:** [dynamic_assessment_module.js](dynamic_assessment_module.js) — 10,400 lines
**Loaded via:** `window.__alloLazyDynamicAssessment()` from [AlloFlowANTI.txt](AlloFlowANTI.txt#L4054), CDN at `alloflow-cdn.pages.dev/dynamic_assessment_module.js`
**Reported version (stale):** `1.0.0-phaseE` — actual implementation spans Phases A through BB

## TL;DR

The module is **substantially complete clinically and generatively** — 21 named phases shipped, end-to-end pretest → mediation → posttest → transfer flow working, six AI-generative output pipelines (custom probes, IEP goals, accommodations, family letter, teacher handoff, progress monitoring), self-critique loop on generated items, population statistics, longitudinal trends, and a structured Report Writer export channel.

The real gaps are **integration** (the module is a silo apart from its one-way Report Writer export), **multimodality** (text-only items; zero audio/AAC infrastructure), and **stale metadata** (the module reports `phaseE` while shipping phases F through BB).

## Phase inventory

Phases identified from code section headers and function comments. Letters skipped from the alphabet are noted; presumed reserved or absorbed.

| Phase | Function | Status |
|---|---|---|
| **A** | Examiner-led core: pretest/mediation/posttest, 4-level prompt ladder, item scoring | ✅ Shipped |
| **A-bis** | AI custom probe generation from clinician spec | ✅ Shipped |
| **B** | AI-mediated path (Gemini verdict + scaffold escalation, deterministic fallback) | ✅ Shipped (header comment "Phase B (later)" is stale) |
| **C** | Multi-domain item banks (math, reading, working memory, language) × 3 difficulty tiers | ✅ Shipped |
| **D** | Report Writer export (fact chunks + pre-drafted narrative section) | ✅ Shipped (outbound only) |
| **E** | Transfer probe phase + print packet | ✅ Shipped |
| **F** | Sessions browser with nickname filter + read-only session detail | ✅ Shipped |
| **G** | Onboarding tour | ✅ Shipped |
| H | — | (skipped) |
| **I** | Structured observation taxonomy (clinical tags) | ✅ Shipped |
| **J** | Longitudinal helpers (group by student, trend lines) | ✅ Shipped |
| **K** | AI IEP goal generation with validators | ✅ Shipped |
| L–P | — | (skipped) |
| **Q** | AI UDL accommodations generation | ✅ Shipped |
| R | — | (skipped) |
| **S** | AI family-facing plain-language summary + dedicated print mode | ✅ Shipped |
| **T** | AI teacher/case-manager handoff + dedicated print mode | ✅ Shipped |
| **U** | Pause/resume + session timing (with GAP_CAP_MS clamp) | ✅ Shipped |
| **V** | Pre-session intake (referral question + existing data) | ✅ Shipped |
| W | — | (skipped) |
| **X** | AI progress-monitoring plan with decision rules | ✅ Shipped |
| **Y** | Self-critique loop: critique + refinement + 4 deep validators | ✅ Shipped |
| **Z** | Calibration scenarios for inter-rater training | ✅ Shipped |
| **AA** | Cross-session item analytics + CSV export | ✅ Shipped |
| **BB** | Population statistics, effect sizes (Cohen's d), z-scores, percentiles | ✅ Shipped |

**21 phases shipped.** Six AI-generative pipelines. ~93 items in built-in banks across 4 domains × 3 difficulty tiers, each with a transfer twin.

## Engineering quality observed

- **Accessibility**: WCAG 2.3.3 reduced-motion CSS, WCAG 4.1.3 ARIA live region for state announcements, focus-visible outline at 3px.
- **Privacy**: Examiner free-text observations explicitly never synced to Firestore (storage is localStorage-only, scoped to a versioned key).
- **AI robustness**: Phase B mediation has deterministic fallback when Gemini missing/fails, plus a guard against Gemini suggesting already-delivered scaffold levels.
- **Validation depth**: Phase Y runs 4 deep validators on every AI-generated item (scaffold gradient, L3-not-answer-in-disguise, L4-contains-answer, transfer-twin-distinct), plus a refinement loop based on critic feedback.
- **Print fidelity**: Three separate print modes (default packet, family letter, teacher handoff) via `body[data-da-print-mode]` attribute toggling, each with dedicated typography (Georgia serif for the family letter at 12pt).
- **Item-bank rigor**: Each item has a construct tag, transfer twin, and full 4-step prompt ladder.

## Real gaps — prioritized

### Tier 1 — High value, moderate cost

**1. Sibling-tool inbound integration (currently zero).** DA exports to Report Writer (via `window.__alloDAExport` + `alloDAExportReady` event) but takes nothing from siblings. Concrete missing flows:

- **Math Fluency Probes → DA pretest.** AlloFlow already runs CBM-Math probes with DCPM scoring. A student's recent probe could pre-populate the DA pretest baseline, saving examiner time and grounding the DA in real curriculum data rather than synthetic items.
- **DA modifiability tier → Student Analytics RTI.** The student-analytics module classifies students into RTI tiers 1/2/3 from probe trends. DA's modifiability tier is a complementary data point that should feed in.
- **Report Writer → DA trigger.** Currently the flow is one-way. A clinician working in Report Writer who realizes they need DA data has to open DA separately. A "request DA probe" button on the Report Writer side would close the loop.

**Effort:** Per integration, ~150-300 lines. Could be done in a single focused session.
**Impact:** Real workflow reduction for clinicians. Also turns the DA module from "standalone studio" into the assessment hub it could be.

**2. Stale metadata + comments.** Trivial but worth fixing:
- `window.AlloModules.DynamicAssessment._meta.version` says `"1.0.0-phaseE"` — should reflect actual phase coverage (e.g., `"1.0.0-phaseBB"` or move to semantic versioning).
- Console log at the bottom of the file: `console.log("[CDN] DynamicAssessment loaded (Phases A–E...")` — undercounts by ~16 phases.
- Header comment at line 14: `"Examiner-led by default; AI-mediated path ships in Phase B (later)"` — Phase B has shipped.

**Effort:** 10 minutes.
**Impact:** Low individually, but accumulated stale documentation makes future audits unreliable — exactly the failure mode that produced *this* audit.

### Tier 2 — High value, higher cost

**3. Multilingual item banks.** Current item content is English-only. There's a banned-words list (line 3311 in [`buildFamilySummaryPrompt`]) for translation-time term substitution, suggesting translation infrastructure was scoped but not completed. To make DA usable for the ELL populations Lidz et al. specifically argue benefit most from it:
- Translate the 4 item banks (~93 items × 4 prompt-ladder steps + transfer twin = ~600 strings per language).
- Apply the existing translation glossary conventions from [LANGUAGE_PACK_GUIDE.md](lang/LANGUAGE_PACK_GUIDE.md).
- Localize the modifiability-tier descriptions and the family/teacher output prompts.

**Effort:** Per language, similar to a small language pack push (1-2 focused sessions).
**Impact:** High for the populations DA most benefits. Connects to the language-pack work in progress (Vietnamese, Hebrew, etc.).

**4. AAC / symbol-based response mode.** Current response input is a text input box. Students using Symbol Studio (nonverbal, AAC users) cannot respond in their own modality. The integration would be:
- A response mode toggle in the DA session UI: "text" / "AAC".
- AAC mode embeds the Symbol Studio response panel.
- The matched-symbol semantic value becomes the `responseText`.
- Scoring/matching logic stays unchanged.

**Effort:** Larger — touches both modules, requires careful semantic-mapping design. ~1-2 sessions.
**Impact:** Genuine reach extension. Almost no other DA tool supports AAC users; this would be a meaningful market position.

**5. Audio/multimodal items.** `grep -c "audio|speech|microphone|MediaRecorder"` returns 1 match (a stray reference). DA currently has zero audio infrastructure. For phonemic awareness, oral reading fluency, articulation, narrative retell — audio is the modality. AlloFlow has audio elsewhere (Phoneme library, Math Fluency Probes use TTS). Reusing that infrastructure for DA items would unlock several construct domains DA cannot currently assess.

**Effort:** Medium — depends on whether we add audio-prompt items (lower) or audio-response items with transcription (higher, needs ASR pipeline).
**Impact:** Construct coverage expansion. Lower priority than #1-4 unless a specific clinical use case demands it.

### Tier 3 — Refinement, not gap-closing

**6. Cross-device session persistence.** Pause/resume works via localStorage. Cross-device or cross-browser resume requires Firestore sync (which exists elsewhere in AlloFlow). Privacy note: the module is explicit that examiner free-text never syncs to Firestore — that constraint must be preserved.

**7. Inter-rater reliability study mode.** Phase Z provides calibration scenarios for training. A natural extension is a real two-rater session-comparison mode: two clinicians independently score the same session, the system computes Cohen's kappa or IRR percent agreement. Useful for research studies and supervised training contexts.

**8. Norm-referenced output bootstrapping.** Phase BB computes population statistics from accumulated sessions, but with N=0 there are no reference norms. Bootstrap data from a pilot cohort (the Portland pilot is a natural fit) would let new clinicians see "this student's modifiability index is at the 67th percentile of similar referrals." Currently the percentile output is only meaningful once the local cohort grows.

**9. Item-bank expansion.** ~25 items per domain × 4 domains is a serviceable starting set but limited for repeated administrations or for tracking growth over multiple probes per student. Phase A-bis (AI custom probes) partially mitigates this, but pre-authored items have higher quality.

## What "fully functional and generative" actually means here

Reading the question literally:

- **Fully functional**: The module already supports the entire Vygotsky/Feuerstein/Lidz workflow end-to-end. A clinician can open it, run intake, select a domain, conduct pretest/mediation/posttest/transfer, score with the prompt ladder, get a modifiability index + tier + observation patterns, draft IEP goals + accommodations + family letter + teacher handoff + monitoring plan, export everything to Report Writer, and print a clinical packet. *This already works.*

- **Fully generative**: Six independent AI-generative pipelines exist (custom items, IEP goals, accommodations, family summary, teacher handoff, monitoring plan), plus real-time AI mediation, plus a self-critique loop on items. *This also already works.*

So the question "what's left to make it fully functional and generative" is best read as **what would extend its reach, not what would make the core complete**. Reach extensions, in priority order:

1. **Sibling-tool inbound integration** — turns the silo into a hub.
2. **Multilingual item banks** — serves the population DA most benefits.
3. **AAC response mode** — meaningful market position.
4. **Stale metadata cleanup** — trivial cost, prevents future audit confusion.

Anything in Tier 3 is genuine refinement, not blocking.

## Recommended order of work

If we did one focused session per item:

1. **Session 1**: Sibling-tool inbound integration. Pick the highest-leverage flow (probably Math Fluency Probes → DA pretest) and build it. Stale-metadata fixes ride along.
2. **Session 2**: Multilingual item banks. Start with whichever language pack is closest to 100% (currently Vietnamese at 78%; or start fresh with a language that has 0%).
3. **Session 3**: AAC response mode. This is the highest-novelty item; would warrant a journal entry.
4. **Session 4+**: Audio item infrastructure, IRR mode, cross-device sync — these depend on which clinical use case is most pressing.

## What I had wrong in the previous turn

I claimed dynamic assessment was missing from AlloFlow based on a shallow grep. It is in fact one of the most comprehensively implemented modules in the codebase. The actual question is reach-extension, not absence. Recording this audit pattern in [SELF_NOTES.md](SELF_NOTES.md) so future instances don't repeat the failure mode: **prior probability that AlloFlow already has the clinically-grounded thing the field is missing is high, not low.**
