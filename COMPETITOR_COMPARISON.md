# AlloFlow vs. The Ed-Tech AI Field

**Generated:** May 2026 · For sharing with reviewers, evaluators, and partners
**Scope:** How AlloFlow compares to the most-cited AI ed-tech products on feature surface, distribution model, and accessibility posture
**Honest framing:** AlloFlow has more documented surface area than every competitor in this list, and is genuinely free for districts. It is also pre-distribution (no real users yet) and built by one person — so polish, support, and brand recognition lag.

---

## Elevator pitch

AlloFlow is a single-creator AI lesson-design + student-experience platform with **~520 documented features** across **~656,000 lines of source**, distributed as a Gemini Canvas artifact so districts pay $0 (Google Education Gemini quotas cover all inference). It includes 95 STEM Lab tools, 33 SEL Hub tools mapped to CASEL, a full WCAG 2.1 AA / VPAT 2.5 accessibility infrastructure, LTI 1.3 LMS integration, multi-provider TTS with offline fallback, gamepad/adaptive-controller support, a clinical Behavior Lens (FBA + BIP), Symbol Studio (a Boardmaker alternative), and a 7,000+ line PDF accessibility audit + remediation pipeline with an autonomous-agent Expert Workbench.

The creator is a school psychologist (PsyD), so SEL, FBA/BIP, accessibility, and special-education depth are unusually strong relative to teacher-built or VC-funded competitors that lead with classroom-content generation.

---

## Distribution & cost model — where AlloFlow stands out

| Product | District cost | Per-teacher cost | Distribution | Self-host? |
|---|---|---|---|---|
| **AlloFlow** | **$0** | **$0** | Gemini Canvas artifact (rides Google Education quotas) | Yes (Docker air-gap in progress) |
| MagicSchool AI | Site licenses ~$10K+ | $99–149/yr | SaaS | No |
| Brisk Teaching | Free (basic) / Premium TBD | Free–$$ | Chrome extension | No |
| Diffit | Free (basic) / Pro $99/yr | $99/yr | SaaS | No |
| Curipod | Free (limited) / Premium $$ | Variable | SaaS | No |
| EduAide | Free (limited) / Pro $4.99/mo | $60/yr | SaaS | No |
| SchoolAI | Tiered, district pricing | Variable | SaaS | No |
| Khanmigo | Free for teachers, $4/mo students | $4/mo or free | SaaS | No |

**Why this matters for distribution:** AlloFlow uniquely doesn't need a district procurement cycle, contract, BAA renegotiation, or budget line item. A teacher with a Google account and Gemini Canvas access opens a single artifact and has the entire toolkit. This is the strongest argument for low-friction adoption with cash-strapped districts.

**The trade-off:** AlloFlow is dependent on Google's Gemini Canvas product staying available + free-for-edu. If Google changes the Canvas model, distribution would need to pivot (the Docker air-gap path is being built specifically to mitigate this).

---

## Feature surface comparison

Numbers below are documented user-facing features, not internal helpers. AlloFlow's are auditable in [FEATURE_INVENTORY.md](FEATURE_INVENTORY.md).

| Capability area | AlloFlow | MagicSchool | Brisk | Diffit | Curipod | EduAide | SchoolAI | Khanmigo |
|---|---|---|---|---|---|---|---|---|
| **AI lesson generation** | ✅ Lesson Plan + Full Pack with UDL framework + 4 quiz modes | ✅ ~70 tools | ✅ Lesson generators | ✅ Worksheet focused | ✅ Slide focused | ✅ Generic AI assistant | Limited | Limited |
| **Text differentiation (Lexile/grade)** | ✅ + bilingual + simplified + immersive reader | ✅ | ✅ | ✅ (the core feature) | Limited | Partial | No | Partial |
| **Image generation** | ✅ Imagen + img2img refinement | ✅ | Limited | No | Limited | No | No | No |
| **Quiz generation** | ✅ 4 strategy modes (exit ticket / pre-check / formative / spaced review) + AI grading + live aggregation | ✅ | ✅ | ✅ | ✅ | ✅ | Limited | Limited |
| **STEM-specific tools** | **95 tools** (math, bio, chem, physics, earth/space, eng, CS, arts, life skills) | ~10 STEM tools | Generic | Generic | Generic | Generic | Generic | Math + general tutoring |
| **SEL/CASEL tools** | **33 tools** mapped to CASEL competencies | ~5 SEL prompts | No | No | Limited | No | No | No |
| **PDF accessibility audit + remediation** | ✅ **7,000+ line modal**: axe-core audit, 3-tier surgical fix system, Expert Workbench autonomous agent, PDF/UA tagging | No | No | No | No | No | No | No |
| **WCAG 2.1 AA across all features** | ✅ Per-tool conformance ledger + VPAT 2.5 | Partial | Partial | Partial | Partial | Partial | Partial | Partial |
| **Adaptive controller / gamepad support** | ✅ Full gamepad-as-mouse layer | No | No | No | No | No | No | No |
| **Multi-provider TTS** (Gemini + Kokoro offline + speechSynthesis) | ✅ | Single provider | Single provider | Single provider | Single provider | Single provider | Single provider | Single provider |
| **Speech recognition + dictation** | ✅ Unified Voice layer | Limited | No | No | No | No | Limited | No |
| **AAC / Symbol Studio (Boardmaker alternative)** | ✅ AI-generated PCS-style symbols, 7,742 lines | No | No | No | No | No | No | No |
| **Behavior Lens (FBA + BIP + ABC + IEP report)** | ✅ 27,643-line module, 15+ internal tools | No | No | No | No | No | No | No |
| **Clinical Report Writer (psych/SLP/OT)** | ✅ AI-graded, fact-chunk audit, dev norms | No | No | No | No | No | No | No |
| **AlloHaven cozy-game meta layer** (anti-toxic-gamification by design) | ✅ | No | No | No | No | No | No | No |
| **AlloBot Sage** (cross-tool roguelite) | ✅ Spells unlock from mastery in other STEM tools | No | No | No | No | No | No | No |
| **LTI 1.3 LMS integration** (Canvas/Schoology/Brightspace/Moodle/D2L) | ✅ | Limited | Chrome ext only | No | Limited | No | Some | Yes |
| **Live multi-student session** (teacher dashboard, real-time push) | ✅ Firestore-backed | Limited | No | No | ✅ (their main feature) | No | ✅ | Limited |
| **Adventure / persona / role-play** | ✅ 7 components + quest system + harmony tracking | Limited | No | No | No | No | ✅ (chat-based) | ✅ (tutor-based) |
| **Web search grounding** (SearxNG + Firebase proxy) | ✅ | Limited | No | No | No | No | No | Yes |
| **Sample lesson library** | 3 sample lessons + briefs | Templates | No | No | Templates | No | No | No |
| **Air-gap / Docker self-host** | In progress (Tyler Despain) | No | No | No | No | No | No | No |

---

## Where competitors are stronger

Honest take — what AlloFlow is *not* yet competitive on:

| Area | Stronger competitor | Why |
|---|---|---|
| **Brand recognition** | MagicSchool, Khanmigo | Years of marketing + funded sales orgs |
| **District procurement story** | MagicSchool | They have the BAAs, SOC2, FERPA paperwork in production-grade form |
| **Customer support** | All paid SaaS | AlloFlow is solo-built; help is GitHub Issues + AlloBot |
| **Live-session polish** | Curipod | Curipod's whole product is one beautiful thing; AlloFlow's live session is one of 520 things |
| **Onboarding-to-first-success speed** | Diffit | Diffit asks one question and gives you a worksheet in 15 seconds |
| **Per-tool depth in a single niche** | Khanmigo (math), Brisk (grading) | Specialists outperform generalists in their lane |
| **Production stability across all features** | All paid SaaS | AlloFlow has Ready / Beta / Experimental tiers; some tools need more polish |

---

## Where AlloFlow's depth is unmatched

These features either don't exist anywhere else or exist only as inferior implementations:

1. **PDF accessibility remediation as an autonomous agent** — the Expert Workbench's 3-tier surgical fix system (Tier 2 element-level → Tier 2.5 section-scoped → Tier 3 structural) running in an autonomous loop with axe-core verification. No competitor has anything close.

2. **Behavior Lens for school psychs** — full FBA + BIP + ABC observation + IEP-ready report generation. This is normally a $$$$ specialty product (e.g., GoalView, IEP Writer, TouchChat for AAC). AlloFlow has it built-in.

3. **Symbol Studio** — AI-generated PCS-style symbols with image-to-image refinement. Boardmaker (the incumbent) costs $$$$ and uses static libraries. AlloFlow generates symbols on demand and adapts to student preferences.

4. **WCAG 2.1 AA across 200+ tools** — most competitors stop at "we tested the main pages." AlloFlow has a per-tool conformance ledger plus a published VPAT 2.5.

5. **Adaptive controller support** — gamepad-as-mouse layer with vibration feedback and aria-label-aware target detection. Critical for students with motor impairments. Almost no ed-tech ships this.

6. **95 STEM Lab tools as one bundled toolkit** — no competitor approaches this breadth. WeldLab, RoadReady, FirstResponseLab, NutritionLab, BirdLab, etc. — most aren't even categories competitors recognize as ed-tech.

7. **Built-in offline TTS fallback (Kokoro)** — works when the network is down or quota is exhausted. Critical for low-connectivity schools.

8. **Anti-gamification meta-experience (AlloHaven)** — explicitly *no* leaderboards, streak punishment, or peer comparison. Token-earning via reflection journaling and Pomodoro focus sessions. This is unusual editorial discipline in a field obsessed with engagement metrics.

---

## Suggested positioning for outreach

When introducing AlloFlow to evaluators or partners, the strongest 30-second pitch is:

> **"It's the entire ed-tech AI category — lesson generation, differentiation, quizzing, SEL, STEM tools, AAC, behavior support, PDF accessibility — built by a school psychologist as one Gemini Canvas artifact, free for districts. No procurement cycle, no per-teacher fees, full WCAG AA, runs on Google Education's existing AI quotas."**

The credibility hook: **"It's all in one auditable inventory; the codebase is open. The accessibility audit is public (VPAT 2.5). I'm not pitching a roadmap; I'm pitching what's already shipped."**

The honest-disclosure hook: **"It's pre-distribution — no real users yet — and tools are shipped as Ready / Beta / Experimental. I'd rather have you try it and tell me what's broken than oversell it."**

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Gemini Canvas changes terms or pricing | Docker air-gap deployment in progress with Tyler Despain; LTI 1.3 already supports LMS-hosted variant |
| Solo maintainer can't scale support | Prioritize partner channels (Matt Miller, Holly Clark, EL Education conference) over direct teacher acquisition |
| Variable tool quality undermines first impression | 3-tier Ready/Beta/Experimental classification + default to Ready+Beta visibility |
| WCAG drift as features ship faster than audits | Per-tool conformance ledger + axe-core CI integration |
| District IT blocks Gemini Canvas | Air-gap path; LTI 1.3 hosted variant; evidence of Knowbility partnership for accessibility credibility |

---

## What I'd want a reviewer to do next

1. Open the Gemini Canvas artifact and click around for 10 minutes. Form an unprompted impression.
2. Read [FEATURE_INVENTORY.md](FEATURE_INVENTORY.md) — section 4 (STEM Lab) and section 5 (SEL Hub) — to gauge breadth.
3. Pull up the [VPAT 2.5](VPAT-2.5-WCAG-AlloFlow.md) and compare to whatever current vendor's accessibility documentation looks like.
4. Try the Behavior Lens or Symbol Studio if you work with sped/AAC populations.
5. Try the PDF Audit modal with a real district PDF that's failed previous remediation attempts.

The goal of a first review isn't to gauge polish — it's to figure out whether this category-spanning approach can actually work, and whether there's appetite among districts to adopt something that doesn't fit normal procurement molds.
