# Science of Parenting Lab — Spec for Review

**Status:** DRAFT for Aaron's content review. No code exists. Nothing below ships until the
claims are verified by Aaron (SME sign-off is a hard gate for this tool, per the
BehaviorLab/Lovaas precedent).
**Date:** 2026-08-03
**Pattern siblings:** `behaviorLab` (the operant science), `schoolBehaviorToolkit` (what
schools do with it), `learningLab` (how learning works), `assessmentLiteracy` (junk-science
critique). This tool completes the set: what the parenting literature actually says.
**Pathway fit:** pairs with Parent Mode and the `?allo_family` deep link; a teacher or school
psych can hand a family one link and one tool.

---

## Design principles

1. **Strength-of-evidence labels on every claim.** This domain is where pop-science
   overstatement lives. The tool's differentiator is not covering parenting — it is teaching
   readers to tell the RCT-backed core from the correlational findings from the lifestyle
   brands. Four badge tiers, shown on every card:
   - **RCT-supported** — randomized trials, replicated (e.g., PCIT outcomes)
   - **Meta-analytic association** — robust correlations, causation contested
   - **Culturally moderated** — direction/size of effect varies by context
   - **Popular, not supported** — widely believed, literature says otherwise
2. **Strengths-based, never diagnostic.** A student may open this tool, and every parent
   reading it is mid-story. No content should read as "your parents harmed you" or score the
   reader's own family. Frame: skills anyone can add, not verdicts on what anyone did.
3. **Skills practice over lecture.** Every module ends in an interactive, not a wall of text.
4. **Non-clinical.** Psychoeducation only; every module footer links to "When to Seek Help."
   No screening instruments, no advice on specific children.

---

## Modules (9)

### M1 — Warmth & Structure: the two dials
Dimensional model FIRST (responsiveness × demandingness), then Baumrind's typology and the
Maccoby & Martin 2×2 as one way of cutting those dimensions.
**Evidence honesty (core of the module):** styles research is correlational; effect sizes are
modest; causation is genuinely contested (child-effects and behavior-genetic critiques —
parenting is partly a response to the child, and twin designs shrink the causal share).
Cultural moderation gets its own beat: Chao (1994) on why "authoritarian" mismeasures
Chinese-American *guan* parenting; cross-cultural work showing outcome patterns differ by
context [AARON — VERIFY the specific cross-cultural citations you want; I'd suggest Lansford's
multi-country work and the Spanish-sample studies where indulgent styles rival authoritative].
**Interactive:** "Two Dials" scenario sorter — the learner rates vignettes on warmth and
structure separately and sees why the same behavior reads differently in context.
**Badge mix:** Meta-analytic association + Culturally moderated.

### M2 — Attachment: the theory vs. the brand
Bowlby/Ainsworth, secure base, the Strange Situation as a lab method (not a home test).
Serve-and-return as the practical takeaway (Harvard Center on the Developing Child framing).
**Evidence honesty:** classifications are moderately stable, not destiny; van IJzendoorn
meta-analytic tradition for transmission and stability [AARON — VERIFY how hard you want to
lean on specific stability numbers]. Hard separation between attachment THEORY and
"attachment parenting" (Sears): co-sleeping, babywearing, and extended nursing are lifestyle
choices, not requirements for secure attachment — the brand borrowed the theory's name.
**Interactive:** "Serve & Return" transcript game — spot the serves in a toddler interaction
transcript and choose returns; myth-vs-theory sort for the brand claims.
**Badge mix:** Meta-analytic association; the brand-claims strand is Popular, not supported.

### M3 — The RCT core: programs that actually work
PCIT, Incredible Years, Triple P, Kazdin's parent management training, Family Check-Up
[AARON — VERIFY this program list matches what you'd cite; Triple P has had
publication-bias critiques worth an honest footnote]. The teachable content is what they
SHARE: attending, specific praise, planned ignoring, clear one-step instructions,
consistency over severity, time-out done correctly (brief, boring, followed by
reconnection) — with the honest note that time-out is AAP-supported AND contested in
pop-parenting culture, and what the evidence actually says.
**Interactive:** "What do the programs share?" matching board; program-finder table
(age range, format, evidence tier).
**Badge:** RCT-supported (the headline module for the strongest tier).

### M4 — PRIDE Skills Studio
PCIT's PRIDE skills (Praise, Reflect, Imitate, Describe, Enjoy) as a practice surface, not a
list. Transcript of a 5-minute play session; learner labels each parent utterance
(question/command/criticism vs. PRIDE skill) and rewrites the misses. Includes a "special
time" planner (5 minutes, child leads, no questions/commands/criticism).
**Interactive:** the whole module is the simulator; optional AI feedback on rewritten
utterances via `ctx.callGemini` (see Technical: AI is optional and teacher/parent gated).
**Badge:** RCT-supported (as components of the M3 programs).

### M5 — ABC at Home (reuses BehaviorLab's frame)
Antecedent–Behavior–Consequence with home scenarios: checkout-line tantrum, homework
refusal, bedtime stalling. Functions (attention/escape/tangible/sensory) in parent language.
The extinction burst ("it gets worse before it gets better — and why most people quit at
exactly the wrong moment"). Patterson's coercive family process as the escalation story both
sides are trapped in.
**Interactive:** ABC builder — drag scenario beats into A/B/C slots, predict what each
consequence teaches; cross-links INTO behaviorLab (the science) and schoolBehaviorToolkit
(the school side), completing the home–lab–school triangle.
**Badge mix:** RCT-supported components + Meta-analytic association (coercion model).

### M6 — Discipline: what the evidence says
The spanking literature honestly: Gershoff & Grogan-Kaylor (2016) meta-analysis —
associations with worse outcomes across domains, no evidence of benefits; causal-inference
limits acknowledged; AAP 2018 policy statement as the professional consensus. Punishment vs.
reinforcement asymmetry (what punishment teaches vs. suppresses). Natural/logical
consequences: popular framework, thinner direct evidence than its reputation
[AARON — VERIFY this characterization]. Consistency beats severity.
**Interactive:** evidence-tier sorting game — place discipline claims on the four-badge scale
before the reveal.
**Badge mix:** all four tiers on purpose — this module IS the badge system in action.

### M7 — Myths vs. Literature
The junk-science strand (Assessment Literacy DNA). Candidate items, each a card with the
claim, what people believe, what the literature shows, and the badge:
- "Praise creates praise junkies" → process vs. person praise nuance, WITH the mindset
  replication qualifiers stated honestly
- "Strict parents make rebellious kids" → the monitoring literature's twist: Stattin & Kerr
  (2000) — parental "monitoring" effects are largely child DISCLOSURE effects; relationship
  quality drives information flow
- Screen time as moral panic vs. the small-association literature (Orben & Przybylski 2019)
  [AARON — VERIFY you're comfortable with this one; it moves fast]
- Birth order shapes personality → Rohrer et al. (2015) large-sample null on personality
- The self-esteem movement: history of a plausible idea that outran its evidence
**Interactive:** the cards are a quiz strand; per-card mastery feeds the tracker.
**Badge:** Popular, not supported (mostly), with honest exceptions.

### M8 — Adolescents: autonomy, monitoring, and staying in the room
Autonomy-supportive parenting (SDT framing); scaffolding independence; monitoring vs.
surveillance (Stattin & Kerr again — knowledge flows from a relationship the teen talks
inside, not from snooping); why warmth still predicts outcomes in adolescence.
**Interactive:** "Autonomy or abdication?" scenario slider — respond to teen scenarios and
see the difference between autonomy support, control, and disengagement.
**Badge mix:** Meta-analytic association.

### M9 — When to Seek Help + Partnering with School
Red-flag guidance (non-diagnostic, "talk to your pediatrician/school" framing), what
evidence-based child therapy names actually mean (PCIT, CBT, PMT), and the family-school
piece Aaron is uniquely placed to write: what an IEP/504 meeting is, what parents can ask
for, what the acronyms mean — extending the Family Tutor persona's plain-English-IEP job
into teachable content. Crisis resources footer (988, Childhelp) [AARON — VERIFY resource
list and framing].
**Interactive:** meeting-prep checklist builder (exportable).

---

## Evidence map (the claims register)

The build will carry a `EVIDENCE` table in-code: every card cites claim → source → badge.
Draft anchor sources for your markup — strike or replace freely:

| Claim area | Anchor source(s) | Proposed badge |
|---|---|---|
| Styles↔outcomes associations | Baumrind; Maccoby & Martin; modern meta-analyses [AARON — pick] | Meta-analytic |
| Cultural moderation of styles | Chao 1994; Lansford multi-country | Culturally moderated |
| Child-effects / behavior-genetic critique | Bell; Plomin; twin designs | Meta-analytic (as critique) |
| Attachment theory core | Bowlby; Ainsworth; van IJzendoorn metas | Meta-analytic |
| Attachment parenting ≠ theory | (definitional; Sears brand vs. literature) | Popular, not supported |
| Program efficacy | PCIT / IY / Triple P / PMT trial literature | RCT-supported |
| Time-out efficacy + safety | AAP; component analyses | RCT-supported |
| Spanking associations | Gershoff & Grogan-Kaylor 2016; AAP 2018 | Meta-analytic |
| Coercive family process | Patterson | Meta-analytic |
| Monitoring = disclosure | Stattin & Kerr 2000 | Meta-analytic |
| Process praise nuance | Dweck + replication qualifiers | Meta-analytic (hedged) |
| Screen-time small associations | Orben & Przybylski 2019 | Meta-analytic |
| Birth order null | Rohrer et al. 2015 | Popular, not supported |

---

## Technical contract (build checklist — all from this repo's own gates)

- `stem_lab/stem_tool_parentinglab.js`, id `parentingLab`, sized like
  `schoolBehaviorToolkit` (~190KB). THREE wiring points or the tool is unreachable
  (`tests/stem_tool_reachability.test.js`): `registerTool` + tile in `_allStemTools` +
  ANTI `stemToolModules` loader entry (both ANTI copies).
- Tile: **Learning & Behavioral Science** section (chip `applied`, currently 4 tools), icon
  must be unique in the catalog (🤱 or 👨‍👩‍👧 — check `icon_dupes` first), desc mentions the
  differentiator (evidence badges), and a `_searchAliasMap` entry at BIRTH — keywords from
  actual content: attachment, baumrind, authoritative, positive parenting, discipline,
  time out, tantrum, PCIT, praise, spanking, teen monitoring. (F5 of the STEM audit: search
  cannot see inside tools.)
- Mirror to `desktop/web-app/public/stem_lab/`; `_pluginOnlyTools` entry; mastery-tracker
  slot (`__alloflowParentingLab`, statsLab pattern).
- i18n: `__alloT = ctx.t` alias (never bare `t`), ASCII-safe insertions, keys planned for the
  hand-translation lanes — not machine-delegated.
- A11y (this repo's known failure classes): every interactive gets onKeyDown with
  role+tabIndex; `announceToSR` calls verified to actually announce; reduced-motion honored
  in JS for any RAF animation, not just CSS.
- AI surface: ONLY the optional M4 utterance feedback; goes through `ctx.callGemini` with the
  untrusted-content wrapper pattern; zero AI calls unless invoked; no student/family data
  persisted.
- Tests at birth: render smoke per module, evidence-table integrity (every card has a badge
  and a source), quiz-answer distribution check (the Semiconductor Lab lesson: no
  position/length tells), reachability green.

## Review protocol

1. Aaron marks up this spec: strike modules, fix claims, resolve every [AARON — VERIFY].
2. I build M1 + the badge system + shell first (one module proves the pattern), then batches.
3. Every content claim lands in the in-code EVIDENCE table so the audit trail survives.
4. Nothing deploys before a full content pass by Aaron in the running tool.
