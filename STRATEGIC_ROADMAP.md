# AlloFlow Strategic Roadmap

**Generated:** 2026-05-17 · For Aaron's planning use
**Companion docs:** [COMPETITOR_RUBRIC.md](COMPETITOR_RUBRIC.md) (functional capability scoring), [COMPETITOR_COMPARISON.md](COMPETITOR_COMPARISON.md) (narrative comparison incl cost), [FEATURE_INVENTORY.md](FEATURE_INVENTORY.md) (§13 most recent additions)

---

## Executive summary

AlloFlow scores **490/500 (98%)** on the [functional capability rubric](COMPETITOR_RUBRIC.md), leading the best non-AlloFlow competitor (Khanmigo at 290/500) by **200 weighted points**. The remaining 10 rubric points are:
- **LMS / SIS integration** (currently 4/5) — missing Clever/ClassLink OAuth roster sync (worth 4 weighted points)
- **Bilingual / multilingual** (currently 4/5) — i18n infrastructure ready but only English language pack shipped (worth 5 weighted points; 4 actual since cap)

**There is no high-leverage feature gap to close in a functional sense.** AlloFlow's strategic risk is not that competitors might catch up on features (they won't, given the 5-year head start in special ed + accessibility + SEL). The strategic risks are:

1. **Distribution and discovery** — most of the lead doesn't matter if teachers don't know AlloFlow exists
2. **Maintainability of solo development** — 880K lines built by one person; the "bus factor" is 1
3. **Polish gap** — VC-funded competitors will out-design any solo project on first impressions
4. **Foundation model dependency** — Gemini Canvas is the distribution moat AND single point of failure

This roadmap addresses both **functional gap closure** (small) and **strategic resilience** (larger).

---

## Roadmap structure

Five horizons, increasing in scope:

1. **🎯 Horizon 1 — Close the 10 rubric points (1-3 days)**
2. **🛡️ Horizon 2 — Strategic resilience: bus factor + polish (2-4 weeks)**
3. **📡 Horizon 3 — Distribution + visibility (1-2 months)**
4. **🚀 Horizon 4 — Defensive moats: features no competitor can easily replicate (2-3 months)**
5. **🌍 Horizon 5 — Aspirational: redefine the category (6-12 months)**

---

## 🎯 Horizon 1 — Close the 10 rubric points (1-3 days)

### H1.1 Ship Spanish + Mandarin + Arabic + French language packs (1 day)

**Current state:** `t()` works correctly + 9,539 translation keys exist + `regenerateLanguage()` mechanism uses Gemini to translate the full key set on demand. But translated packs live only in user-browser localStorage cache. No committed JSON for Spanish/Mandarin/Arabic/French in repo.

**To ship:**
1. Run `regenerateLanguage('Spanish')` in dev console, export the resulting JSON via `exportLanguagePack`
2. Commit as `ui_strings.es.json` to repo
3. Modify `useTranslation` to lazy-load `ui_strings.{lang}.json` on demand
4. Repeat for Mandarin (zh-CN), Arabic, French
5. Add language selector to top nav

**Effort:** 1 day total (mostly AI translation review for Arabic since RTL matters)
**Rubric impact:** +1 dimension point on Bilingual = +5 weighted points → AlloFlow → **495/500 (99%)**
**Strategic impact:** ELL classrooms (10%+ of US students) become first-class users instead of relying on per-resource translation

### H1.2 Add Clever / ClassLink OAuth roster sync (2 days)

**Current state:** Firestore roster code exists; nicknames/anonymous mode handles single-Canvas distribution. Districts that have standardized on Clever provisioning don't have a clean path.

**To ship:**
1. Add Clever OAuth flow (Clever's docs are clear; they have a sandbox env)
2. Endpoint that maps Clever students.id → AlloFlow roster entries with sectionId
3. Same for ClassLink (simpler — they use OAuth 2.0 standard)
4. Opt-in: only fires when teacher clicks "Import from Clever" — otherwise the existing anonymous nickname flow works untouched

**Effort:** 2-3 days
**Rubric impact:** +1 dimension point on LMS Integration = +4 weighted points → AlloFlow → **499/500 (99.8%)**
**Strategic impact:** Removes a real district-procurement blocker; ~30% of US districts use Clever

### H1.3 Cleanup remaining 391 long-tail contrast issues (1 day, optional)

Not a rubric impact (Accessibility is already 5/5), but a polish gain. The May 17 bulk contrast fix closed 70% of WCAG text-contrast issues; the remaining 391 are per-instance reviews where the pattern was unusual or the context was edge-case. Manual sweep across the top 5-10 files with most findings would close the long tail.

**Effort:** 1 day
**Rubric impact:** 0 (already maxed)
**Strategic impact:** Audit closure means AlloFlow can claim "0 WCAG AA text-contrast issues across the entire codebase" — useful for VPAT and ADA Title II compliance documentation

**Horizon 1 total: 4-5 days for 99.8% rubric score.**

---

## 🛡️ Horizon 2 — Strategic resilience (2-4 weeks)

### H2.1 Bus factor mitigation — onboarding documentation for a 2nd contributor (1 week)

The biggest existential risk is "Aaron gets hit by a bus" or "Aaron burns out and pauses." 880K lines built by one person is a single-point-of-failure. The codebase already has substantial documentation (architecture.md, FEATURE_INVENTORY.md, REFLECTIVE_JOURNAL.md, ONBOARDING.md if it exists), but a 2nd contributor needs:

1. **Setup-to-PR runbook** — single doc that walks a new contributor from `git clone` to merged PR in their first afternoon. Covers: env vars, Firebase setup, the `_build_*_module.js` pattern, `_check_tool_catalog.cjs` validation, deploy.sh workflow, the AlloFlowANTI.txt source-of-truth rule
2. **Per-subsystem entry points** — each major subsystem (STEM Lab, SEL Hub, Doc Pipeline, Behavior Lens, Teacher Dashboard) gets a 1-page "if you're modifying X, start here" guide
3. **5 example PRs** — small, real, merged PRs that demonstrate the workflow for the most common edit types (new STEM tool, new SEL tool, new help_strings entry, new help anchor, fix a contrast issue)

**Effort:** 1 week
**Strategic impact:** Reduces bus factor from 1 to 2+ if a contributor ever shows up. Even without an actual contributor, the act of writing this clarifies architecture decisions and surfaces drift.

### H2.2 Test infrastructure — at minimum, smoke tests on the audit scripts (3 days)

The 6 audit scripts (`_check_tool_catalog.cjs`, `_audit_help_keys.cjs`, `_audit_help_anchors.cjs`, `_audit_text_contrast.cjs`, etc.) are the safety net for future development. If they break silently, AlloFlow's accuracy guarantees disappear. Need:

1. A `tests/audits.test.js` that runs each audit script against the current repo state and snapshots the output. Any regression in dead-key counts, contrast findings, or catalog drift flags as a CI failure.
2. Wire to GitHub Actions on every PR (free tier handles this fine)

**Effort:** 3 days
**Strategic impact:** Catches regressions before deploy. Future contributors get immediate feedback if they introduce a help-coverage gap or contrast failure.

### H2.3 First-impression polish — landing page redesign (1 week)

The website (`for-districts.html`, `index.html`) is functional but the visual design lags VC-funded competitors. A district CTO landing on the AlloFlow site needs to feel "this is a serious product." Specifically:

1. Hero video (30 seconds, screen capture of: teacher generates a lesson → student takes adventure → teacher reviews work in dashboard)
2. "Used by" logos (even just the 1-2 pilot schools — King Middle if Aaron has permission)
3. Comparison table front-and-center (the COMPETITOR_RUBRIC.md numbers, presented as a graphic)
4. Specific district pain-points addressed (FERPA compliance, $0 cost, ADA Title II coverage) on first scroll

**Effort:** 1 week (with help from a design contractor if available; 2 weeks solo)
**Strategic impact:** First-impression delta vs MagicSchool/Curipod marketing sites is currently the biggest "feels less polished" perception gap. Fixing this changes conversion at the district-evaluation step.

**Horizon 2 total: 2-3 weeks. Massively de-risks the project's long-term viability.**

---

## 📡 Horizon 3 — Distribution + visibility (1-2 months)

This horizon is about getting AlloFlow into the hands of actual teachers, which is the only thing that ultimately validates the rubric score.

### H3.1 EL Education conference workshop pitch acceptance (in progress, per memory)

Aaron's pitch to Amy at King Middle for a "Students as Lesson-Makers" workshop + spring 2026 pilot is the cleanest distribution play in the queue. **Acceptance + first cohort of 22 students using AlloFlow daily = the highest-leverage thing this project can do for distribution.**

**Effort:** Already in flight; needs Amy's response
**Strategic impact:** Real classroom data + testimonials + word-of-mouth in the EL Education community (one of the most engaged K-12 networks)

### H3.2 Showcase the 8 "20K MILESTONE" curriculum tools individually (2 weeks)

Each of the 8 20K+ tools (Cell Sim, ChemBalance, Plate Tectonics, Raptor Hunt, Cephalopod Lab, AppLab, NutritionLab, Learning Lab) deserves its own:
- 90-second demo video
- Landing page micro-site with screenshots + curriculum alignment
- Submitted to subject-specific teacher communities (AP Bio Facebook group, K-5 STEM lists, NSTA forums)

**Effort:** 2 weeks (mostly video + page work)
**Strategic impact:** Each tool individually rivals or exceeds dedicated paid products in its subject area (e.g., ChemBalance is more comprehensive than $200/teacher Pearson chem textbooks). Showcasing them individually rather than under the AlloFlow umbrella lowers cognitive load for subject-area teachers who want a specific solution.

### H3.3 ATIA (Assistive Tech) or CEC (special education) conference submission (4 weeks)

The Behavior Lens + Symbol Studio + Report Writer + accessibility infrastructure are unmatched in the AI ed-tech space. ATIA and CEC are the major special-education conferences. A conference submission with the headline "AI tools that meet ADA Title II for free" would land hard with:
- District AT coordinators (Symbol Studio)
- School psychologists (Behavior Lens + Report Writer)
- IEP teams (data + reporting infra)

**Effort:** Submission writing 1 week + travel + 4 weeks of conference prep
**Strategic impact:** Special ed is AlloFlow's most-differentiated segment. ATIA/CEC are where the right buyers gather.

### H3.4 GitHub README + OSS community visibility (3 days)

AlloFlow is MIT-licensed and openly developed but the README is utilitarian. The repo gets 0 stars/forks currently. Polish the README to attract:
- Edu-tech researchers (citation-worthy)
- Accessibility advocates (the WCAG/VPAT work is publication-worthy)
- AI-in-education researchers (the prompting patterns are publication-worthy)

**Effort:** 3 days
**Strategic impact:** OSS visibility → academic citation → conference invites → trust signal for district CTOs

**Horizon 3 total: 1-2 months. Drives first 100 real users.**

---

## 🚀 Horizon 4 — Defensive moats (2-3 months)

These are features no VC-funded competitor will build because they require domain expertise that doesn't exist on most product teams.

### H4.1 IEP-aligned data export bundle (3 weeks)

The teacher dashboard already captures probe data, fluency assessments, work samples, observation notes. The "last mile" gap is producing a single IEP-team-ready PDF that combines:
- 12-week probe trendline with Hasbrouck & Tindal benchmark comparison
- Sampled student work products (one per resource type)
- AI-generated narrative summary in psych-report register
- Goal-progress chart with criterion-of-mastery threshold lines
- Editable teacher narrative section

This would replace the manual "stitch together 5 different reports for the IEP meeting" workflow with a 1-click bundle. **Aaron's school psych background uniquely qualifies him to build this correctly** — most competitors would build a generic export.

**Effort:** 3 weeks
**Strategic impact:** Becomes the "you can't replace AlloFlow because of this single feature" for special ed teams. ~6.5M US students have IEPs; every one of them is documented by a team that does this work manually now.

### H4.2 Behavior Lens → state-level FBA/BIP template integration (4 weeks)

Every state has its own FBA + BIP forms (Maine, Massachusetts, California, Texas each have different fields). Behavior Lens currently generates generic BIPs. Wiring it to output state-specific templates (starting with Maine since that's Aaron's state) would make AlloFlow the only AI tool that produces compliance-ready behavior plans.

**Effort:** 4 weeks (mostly state form research + template wiring)
**Strategic impact:** Becomes "literally cannot use anything else for this workflow" in target states

### H4.3 Cross-district anonymized benchmark mode (4 weeks)

For probe-based progress monitoring (ORF/MAZE/etc.), national norms (Hasbrouck & Tindal) are 8 years old. Districts increasingly want "compared to similar districts" benchmarks. If AlloFlow opts-in districts can contribute anonymized aggregate probe scores, AlloFlow could publish:
- Real-time district-similar benchmarks
- 50th/75th/90th percentile bands by grade + season + probe type
- Cohort-comparison reports

This is a network-effect feature: each new contributing district makes it more useful for every other district. Hard for any VC-funded competitor to match without years of data accumulation.

**Effort:** 4 weeks initial + ongoing data infra
**Strategic impact:** Network effect = lock-in. Hardest-to-replicate feature in the entire roadmap.

### H4.4 Curriculum-aligned standards mapping for the 8 mega-tools (3 weeks)

Each of the 8 "20K MILESTONE" tools has rich content but no machine-readable standards alignment (NGSS, CCSS-Math, AP CED, state standards). A standards map that says "Plate Tectonics section X aligns to NGSS HS-ESS2-1" would:
- Enable lesson-plan generators to auto-suggest the right section of the right tool for a given standard
- Generate state-compliance documentation for purchasing decisions
- Enable Khan-style "next concept" mastery progression

**Effort:** 3 weeks (mostly standards mapping)
**Strategic impact:** Makes the curriculum platforms first-class lesson-plan elements rather than supplemental enrichment

**Horizon 4 total: 2-3 months. Each feature is a long-term moat in a specific buyer segment.**

---

## 🌍 Horizon 5 — Aspirational (6-12 months)

These would redefine the category if they ship.

### H5.1 Native AAC + speech-generating device output (3 months)

Symbol Studio currently generates symbols. Adding speech-generating-device-format export (LAMP Words for Life, TouchChat, Tobii Dynavox) would make AlloFlow the first AI tool that produces SGD-ready boards. Combined with the AI-generated symbol pipeline, this would mean: SLP describes the student's communication needs → AlloFlow generates a custom 256-button SGD board + symbol set + practice activities + parent training materials.

**Effort:** 3 months (each SGD format is its own integration; need device access for testing)
**Strategic impact:** $1.2B AAC market currently dominated by 3 companies (PRC-Saltillo, Tobii Dynavox, Saltillo). None have AI-generated content. AlloFlow could become the AI layer for the entire AAC industry.

### H5.2 Adaptive curriculum sequencing across the 8 mega-tools (4 months)

Currently each curriculum tool is independent. The "next level up" is a meta-layer that:
- Tracks student mastery across all 8 tools' content
- Suggests next-concept based on prerequisite graph + observed weak areas
- Generates spaced-review sessions across tool boundaries (e.g., "you learned about plate tectonics last week; here are 3 questions that connect it to the marine biology you're learning this week in Cephalopod Lab")

This is what Khan Academy does for math, but across STEM + SEL + literacy.

**Effort:** 4 months
**Strategic impact:** Goes from "AI lesson generator" to "personalized learning system" — completely different market category

### H5.3 District-as-tenant deployment model (2 months)

Currently AlloFlow is per-teacher (Canvas artifact). District-tenant model would mean:
- Single sign-on at district level
- District-wide standards alignment + reporting
- District-wide AI usage analytics (which tools, which classrooms, which outcomes)
- District-administered tier-1 / tier-2 / tier-3 RTI/MTSS dashboards

**Effort:** 2 months
**Strategic impact:** Sells to district CTOs not individual teachers; 100× revenue potential per sale

### H5.4 Research partnership program (6 months)

The data AlloFlow generates (anonymized probe scores, intervention logs, student work samples, AI-feedback patterns) is researchable. Partnering with 2-3 ed research groups (UVA, Vanderbilt, BU) to run formal efficacy studies would produce:
- Peer-reviewed publications validating the platform
- Curriculum-grant eligibility (Federal IES money requires evidence base)
- Clinical-grade evidence for SLP/School Psych professional recommendation

**Effort:** 6 months (mostly partnership + IRB work)
**Strategic impact:** Moves AlloFlow from "neat AI tool" to "evidence-based intervention" in district procurement language

---

## Roadmap timeline summary

| Horizon | Effort | Rubric Δ | Strategic impact |
|---|---|---|---|
| **H1: Close 10 rubric points** | 4-5 days | +9 (490→499/500) | Pure functional completeness |
| **H2: Strategic resilience** | 2-3 weeks | 0 | Bus factor + polish for first impressions |
| **H3: Distribution + visibility** | 1-2 months | 0 | First 100 real users |
| **H4: Defensive moats** | 2-3 months | 0 | Unreplicable features in special ed + curriculum |
| **H5: Aspirational** | 6-12 months | 0 | Category redefinition (AAC industry / district tenant / research partnership) |

**Total timeline:** ~12 months if all horizons sequential. ~6 months if H2/H3 parallel-tracked with a part-time contributor.

---

## Recommended sequencing

**If Aaron has 10 hours/week:** H1 first (1 month). Then alternate H2 + H3 work (1 hour H3 distribution per week, 8 hours H2 polish). Defer H4/H5 until distribution validates the project economics.

**If Aaron has a sabbatical / 30 hours/week:** H1 in week 1. H2 in weeks 2-4. H3.1 (EL conference pitch) as parallel-tracked since it's already in flight. H4.1 (IEP export bundle) in months 2-4. H3.2 (mega-tool showcases) in months 3-4. Aim to enter year 2 with first 200 real users + at least one H4 moat shipped.

**If Aaron has a co-founder / second contributor:** Aaron focuses on H2.1 onboarding + H4 moats. Co-founder takes H2.3 polish + H3 distribution. H1 done in week 1 by either.

---

## What I'm NOT recommending

A few directions that look tempting but I'd avoid:

- **More mega-tools.** The 8 existing 20K+ tools are already more content than any teacher can use in a year. Building a 9th is fun but doesn't move metrics. Better to polish + showcase the existing 8.
- **A mobile app.** The Canvas-artifact + responsive web work I just shipped is the right answer for ~95% of use cases. Native iOS/Android adds a maintenance burden Aaron-as-solo can't sustain.
- **Anti-cheating / AI-detection features.** Wrong product direction — AlloFlow's value is AI-as-augmentation, not AI-as-cop.
- **VC fundraising.** AlloFlow's $0 cost model is its strategic moat. Taking VC introduces revenue pressure that breaks the moat.
- **Commercial license tier.** Same reason — keeping the project entirely free is the differentiator. If revenue is needed later, services / training / district consulting are higher-margin than license sales.

---

## How to use this document

- **Reread quarterly** with COMPETITOR_RUBRIC.md to verify scores haven't slipped.
- **Use Horizon 1 as a punch list** for the next 1-2 sprints.
- **Use Horizon 4 features as differentiation talking points** in conversations with prospective district partners, even before they're built — they're roadmap signals.
- **Re-prioritize freely.** The biggest variable is Aaron's available hours per week. Halve everything if hours are halved; double everything if a contributor shows up.

---

**End of roadmap.** The functional rubric gap (10 points) is small and closeable in days. The strategic risks (bus factor, polish, distribution) are larger and longer-tail but well-scoped. The defensive moats in Horizon 4 are what make AlloFlow uncatchable in special ed + curriculum-platform-depth segments — these are where the long game lives.
