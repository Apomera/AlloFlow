# AlloFlow Dynamic Assessment Studio — Clinician User Guide

## What Dynamic Assessment Is

Dynamic Assessment (DA) measures **how a student responds to teaching**, not just what they already know. Where a traditional test photographs current performance, DA runs a structured cycle — **pretest → mediation → posttest** (with an optional **transfer** probe) — and watches what changes when you scaffold. The central question is not "Did the student get it right?" but "**How much, and how easily, did performance improve when we mediated learning?**"

AlloFlow's DA Studio is a technology-supported implementation of this approach. It draws on the established DA tradition — **Vygotsky's** zone of proximal development (the gap between independent performance and what's possible with support) and **Feuerstein's** mediated learning experience — operationalizing that tradition with graduated prompt hierarchies and a descriptive growth metric. It does **not** reproduce or claim equivalence to any specific published instrument (LPAD, ACFS, ARROW, and the like); its methodology is grounded in the tradition but its scoring was designed for this tool and is not normed against any published population.

The Studio is labeled **"Clinical tool · v1."** It supports both an **examiner-led** path (you control every scaffold) and an **AI-mediated** path (the model decides which pre-authored scaffold comes next). It is not a substitute for training in dynamic-assessment methodology — it assumes you bring the clinical judgment.

---

## When to Use It — and When Not To

### Use DA when you want to:
- **Plan intervention.** Find which supports actually move a student and at what intensity.
- **Drive pre-referral / MTSS problem-solving.** Generate and test hypotheses before (or instead of) a formal referral.
- **Understand *how* a student learns** — where they get stuck, what kind of scaffold unlocks them, whether learning sticks and generalizes.
- **Add a structured observation** to an existing evaluation, alongside standardized data.

### Do NOT use DA:
- **As a normed or standardized test.** It produces descriptive observations, not standard scores or percentiles against any external population.
- **As a basis for eligibility on its own.** Eligibility decisions require standardized batteries with established reliability and validity. DA *supplements*, never replaces, the standardized component of an evaluation.
- **As your primary progress-monitoring tool.** That role belongs to CBM probes. DA is a hypothesis-testing tool used at **intake and review**, not for frequent progress data.
- **To compare one student against another.** The growth metric is a *within-student* observation; comparing two students' indices is not meaningful without normative data the tool does not provide.
- **Without parent/guardian consent** for non-standardized procedures, or **when a student is acutely dysregulated.**

Say this plainly in your reports: DA results are **clinical observations of learning behavior, not test scores.**

---

## The Full Workflow

### 1. Intake (Referral Context)

The start screen opens with an optional, collapsible **"Referral context"** panel — six free-text fields, all stored on the device:

- **Referral reason**
- **Hypothesized bottleneck**
- **Specific question this probe should answer**
- **Prior interventions tried**
- **Existing assessment data** (a button can pull in your most recent CBM-Math fluency probes)
- **Multilingual / language background**

The **language-background field is load-bearing.** Filling it in turns on the access-condition lens described later. Leave it blank for monolingual English students; the lens never appears unless a language background was recorded. Everything you type here surfaces *first* in your reports and exports. Nothing leaves the device until you choose to send to the Report Writer or invoke AI generation.

You also choose an **output language** (defaults to your host's leveled-text language), which drives all AI-generated output. Note: the built-in item banks remain in English — to assess in another language, use the Custom Probe builder.

### 2. Choose a Domain and Build Items

Pick one of four built-in domains, each with banks of 18 items (six easy / six medium / six hard):

- **Math** — word problems, grades 2–3 (one-step) up to 6–7 (percent, ratio, mean).
- **Reading** — short passages with literal and inferential probes.
- **Working memory** — digit span, categorization, set-shifting, inhibition, planning. These are **administered verbally** — the prompt is what you say aloud.
- **Language** — vocabulary-in-sentence, definitions, narration, summarization (open-ended production).

Choose a **difficulty band** (Easy = grades 2–3, Medium = 4–5, Hard = 6–7) and a **mediation mode** (clinician-led is the default).

**Or build a custom probe.** The AI builder lets you specify a domain (including free-form "other"), grade band, a required **target construct**, an optional suspected bottleneck, number of items (3 ≈ 12 min to 6 ≈ 30 min), and clinical context (obvious name patterns are soft-stripped before anything reaches the model — a defense-in-depth measure, not a guarantee). It runs a **three-pass pipeline** — the AI drafts items, critiques its own draft against five quality criteria (catching answer leakage), then refines only the flagged items. You'll see each stage and the critique notes on the review screen. Custom items can be saved to a device-only **probe library** for reuse.

> **AI-generated items are not normed or validated. Use them as clinical probes, not standardized measures — and always review before use.**

### 3. Review and Edit

Every generated item is an editable card. You can rewrite the **prompt**, the **correct answer**, and **acceptable variants**, and you can edit each rung of the **scaffold ladder** individually (regenerating a single rung if needed). The **transfer twin** (a novel item testing the same construct) is shown read-only. Heuristic warnings flag weak items; the violet **AI self-critique block** shows the model's own quality verdict, issues, and any refinements (with explicit fallback notices if a critique or refinement pass failed). You can exclude items, regenerate a whole item, and attach **supports** (see the access section). Then choose **Run**, **Save + Run**, or **Save only**.

### 4. Run the Session

The session moves through phases automatically:

**Pretest (unprompted).** One attempt per item, **no scaffolds**. Record what the student does alone. Scored binary by design — right at level 0 earns full credit, otherwise zero.

**Mediation — the 4-level scaffold ladder.** This is the heart of DA. When a student struggles, you deliver scaffolds in graduated order, recording the **highest level needed**:

- **L0** — no scaffold (the student solves it alone).
- **L1 — Cue:** a declarative hint that *orients attention* without giving the answer.
- **L2 — Leading:** an interrogative nudge toward the right strategy (more directive than a cue).
- **L3 — Model:** you demonstrate the move on a parallel example, then redirect the student to do it.
- **L4 — Direct teach:** you give the answer with the reasoning.

Each rung can be revealed to yourself first and read aloud to the student. In **clinician-led** mode you escalate manually and record the level reached — full clinical control. In **AI-mediated** mode, the model plays examiner: it reads the student's response and decides the *next* scaffold level, but it always serves the **pre-authored ladder text** (its role is the decision, never content — no improvised hints). It escalates by exactly one level, never skips, and falls back to a built-in deterministic rule if a call fails (flagged when it does). Note that the leaky-rung correction below applies to the clinician-led path.

Throughout mediation you capture a **free-text examiner observation** (local-only, never synced), **quick-tap observation tags** (ten of them: self-corrected, needed wait time, used self-talk, off-task, frustration, asked clarifying question, changed strategy, perseverated, appeared to guess, fluent+automatic), and a **leaky-rung flag** when a scaffold accidentally gave the answer away.

**Posttest (unprompted).** Re-test the same items alone. Compare directly to pretest — this is where modifiability shows up.

**Transfer (optional).** If any item has a transfer twin, the student attempts **novel items, same construct**, with no scaffolds. This is the test of whether learning *generalized* rather than was merely memorized.

Answer matching is forgiving for numbers (matches "7" inside "I think 7 apples" but not "17") and uses whole-word containment for text. You can always override with **Mark correct / Mark wrong / Skip** (or **Auto-check + record**).

### 5. Score

Each item scores **5 − (prompt level reached)**: solved alone = 5, after L1 = 4, L2 = 3, L3 = 2, L4 = 1, still wrong after L4 = 0. If you flagged a rung as **leaky**, a correct response is conservatively credited one level *higher* — that rung isn't valid evidence of competence. (L4 leaks carry no extra penalty; direct teach states the answer by design. The leaky-rung correction applies to the clinician-led path.)

### 6. Interpret

The summary screen leads with the **Modifiability Index**, then layers in transfer, score breakdown, per-item detail, scaffold usage, observation patterns, and — when enabled — the access-condition lens. (Detail below.)

### 7. Generate Outputs

From the outputs dashboard you can generate a narrative, teacher handoff, family letter, IEP goals, accommodations, and a monitoring plan, then print or export. (Detail below.)

---

## Supports and the Access-Contrast Framework for Multilingual Learners

### Supports

Items can carry up to five inline **supports** (at most one per kind), each anchored to a specific scaffold rung and minted as a clickable resource:

- **Glossary** — a vocabulary preview card (terms drawn from the item itself).
- **Math manipulative** — an interactive STEM Lab tool (number line, fractions, area model) preset to the right state.
- **Word-sounds probe** — a phonological-awareness activity.
- **Visual organizer** — a concept map, mind map, outline, timeline, or sort.
- **Sentence frames** — fill-in starters; the only support that scaffolds the student's **output** (use when the bottleneck is expression).

Supports are generated in isolation from any active lesson, standards, or topic — so a support cannot smuggle in outside curriculum content that would confound what the probe is measuring. It tests the construct in the item, not familiarity with whatever lesson happens to be loaded.

### Three controlled access contrasts

For multilingual learners (gated on the intake language field), you can run three same-item contrasts. **None of them changes the score** — each is recorded as a checkbox flag carrying the note "(Access-contrast evidence; does not change the score.)" Each holds the item constant and removes exactly one access demand, so a "flip" (success *only* in the altered condition) isolates that demand as the likely barrier rather than the underlying skill:

1. **Read-aloud (modality).** You read the item aloud, then flag **"Succeeded only when read aloud."** This is direct evidence about whether **reading/decoding access** — not the reasoning — gates performance.

2. **Simpler language (linguistic load).** The tool generates a version that reduces *only* vocabulary and sentence complexity — same numbers, names, quantities, and question, no added hints or steps. Verify the problem is genuinely unchanged before using it, then flag **"Succeeded only with simpler language."** This isolates **academic-language load** from the reasoning.

3. **Home language (L1).** The tool produces a faithful translation at the same complexity. Flag **"Succeeded only in home language."** This isolates **the language of testing** from the underlying skill.

> The home-language translation is AI-generated. **Verify equivalence with a proficient speaker before relying on it — the problem must be unchanged.**

Together these triangulate *where the barrier sits* by elimination. A flip on the read-aloud contrast points at decoding; a flip on simpler-language points at academic-language load; a flip on home-language points at the language of testing. All three are **hypothesis-generating** observations, never determinations. (The tool deliberately uses no theoretical jargon to label any of this — it describes observations only.)

---

## Interpreting Results

### Modifiability Index (MI)

The MI is the proportion of *available* growth the student realized under mediation:

**MI = (posttest − pretest) / (maximum possible − pretest)**, bounded from −1 to 1.

Tiers:
- **≥ 0.6** — *Responsive to mediation.*
- **0.3–0.6** — *Moderately responsive — responds to mediation with continued practice.*
- **0–0.3** — *Limited modifiability under these mediation conditions.*
- **< 0** — *Posttest below pretest baseline* (regression — usually reflects fatigue, anxiety, or motivation rather than ability; re-test on a different day).

**The MI is descriptive, not normed.** With fewer than five items per phase (the default is three), it carries substantial measurement error — read it as a **broad direction** (clear gain / little change / regression), not a precise number. It is a *within-student* metric: never report it as a standard score, percentile, or classification, and never compare it across students. If you compare against your own saved sessions, the tool will tell you that is a local reference only — not an external or standardized norm — and unstable below ~10 sessions, exploratory below ~30. Across a single student's own sessions the trajectory is descriptive only (and construct-relative — compare points *within* the same domain), never a growth norm.

### Transfer Tier (generalization vs. memorization)

When the transfer phase runs, the tool compares novel-item performance to the posttest:

- **Strong transfer** — the student learned the underlying construct; the clearest pattern of generalizable learning.
- **Partial transfer** — generalization is incomplete.
- **Weak transfer** — posttest gains may reflect item-specific learning or memory of the mediation.
- **Minimal transfer** — performance on novel items collapsed back to baseline; interpret the posttest gain as **un-generalized** learning, not construct mastery.

Recommended report phrasing: *"Transfer-probe performance suggests [strong/partial/weak/minimal] generalization to novel surface features."*

### Access-Condition Lens (hypothesis only)

When a language background is on file, the summary shows a purple **"Access-condition lens · exploratory"** card. It combines two signal types of different epistemic strength:

- The **controlled contrasts** (read-aloud, simpler-language, home-language) are clinician-confirmed manipulations and can surface even on a single item.
- A **support-coincidence** signal — which language-reducing supports happened to coincide with valid mediation successes — is **correlational only** (the supports weren't a controlled manipulation).

If language-reducing supports dominate, the lens raises the hypothesis that academic-language access — rather than the underlying skill — limited performance. **It is a hypothesis, not a determination.** Interpret it only alongside the student's language-proficiency data and home-language context, weigh it against opportunity to learn, and verify any translation with a proficient speaker. It is never a determination of disability or its absence.

---

## Limitations and Responsible Use

Read this section as the floor for every DA report.

- **Structured clinical observation, not a normed measure.** The MI is descriptive and must not be used for eligibility decisions on its own.
- **Not for eligibility alone.** Eligibility requires standardized batteries with established reliability and validity. DA supplements, never replaces, the standardized component of an evaluation.
- **Not tied to a published instrument.** The methodology is grounded in the DA tradition but does not implement LPAD, ACFS, ARROW, or any specific normed instrument, and is not normed against published populations.
- **Within-student only.** Comparing two students' indices is not meaningful.
- **Small-N throughout.** Fewer than 5 items per phase → broad direction only; fewer than 10 saved sessions → highly unstable, illustrative only; fewer than 30 → exploratory.
- **Convergent evidence required.** Interpret DA alongside standardized data, classroom observation, and intervention-response history — never in isolation. It does not generalize to un-probed constructs and does not predict 6- or 12-month academic trajectories.
- **Not the monitoring tool.** CBM probes monitor progress; DA tests hypotheses at intake and review.
- **AI-generated items are not validated.** Always review before use.
- **Verify translations.** Home-language versions are AI-generated; confirm equivalence with a proficient speaker.
- **Access-condition findings are hypotheses,** to be weighed alongside language-proficiency data, home-language history, and opportunity to learn — *not a determination of disability or its absence.*
- **Privacy.** Free-text examiner observations stay on the device and are never synced. All session history lives in local storage. PII-stripping on custom-probe context is a soft defense, not a guarantee — nothing reaches the AI or the Report Writer until you choose to send it.
- **Consent and regulation.** Use only with parent/guardian consent for non-standardized procedures, and never when a student is acutely dysregulated.
- **Generated outputs are drafts.** Everything the AI produces is "drafted from DA findings; clinician to review and finalize." The Report Writer auto-draft is a starting point, not a final draft.

In reports: present DA as clinical observations of learning behavior; avoid framing the MI as a standard score, percentile, or classification; do not draw eligibility conclusions from DA alone; and do not frame DA as a "better test" than standardized measures.

---

## Outputs You Can Generate

From the summary screen's outputs dashboard:

- **Clinical narrative** — deterministic, template-built (editable), covering referral context, pretest/posttest/MI, scaffold use, transfer, observed patterns, and the access-condition note. Ends with a fixed caveat that the finding is descriptive, not normed, and should be interpreted alongside standardized measures.
- **Teacher / case-manager handoff** — a "Monday morning" page: what worked, what didn't, what to watch for, quick probes, and when to re-refer. Carries the access-condition note as a kept, hypothesis-generating (not diagnostic) note.
- **Family letter** — plain-language, sixth-grade reading level, jargon-banned and validated against overclaiming; it deliberately omits the technical access-condition note.
- **IEP goals** — SMART-format annual goals with short-term objectives, anchored to scaffolds that worked; non-measurable verbs are rejected.
- **UDL accommodations** — grouped by UDL principle (Engagement / Representation / Action & Expression), each tied to DA evidence.
- **Progress-monitoring plan** — CBM-anchored with NCII/RTI decision rules, explicitly noting that DA is *not* the primary monitoring tool.

**Export and backup:** a self-contained black-and-white **print packet** (with the full clinical caveat in its footer), per-session and full-history **JSON** backup/restore (non-destructive — your local sessions always win), **CSV** exports for research/instrument development, and a **Send to Report Writer** hand-off that carries fact chunks, a pre-drafted section, and all generated outputs.

---

## Practical Tips for a Good Session

- **Fill in intake, especially the language field** — it unlocks the access-condition lens and surfaces first in every report.
- **Default to clinician-led mediation** when you have the training; reserve AI-mediated mode for non-specialist settings.
- **Deliver scaffolds one rung at a time** and record the *highest* level the student actually needed — don't jump ahead.
- **Flag leaky rungs honestly.** If a hint gave the answer away, check the box; the conservative re-score protects your interpretation.
- **Use the observation tags liberally** — they aggregate into the pattern summary and feed the narrative.
- **Run a transfer probe whenever possible.** Without it you can't distinguish real learning from memorization.
- **Run access contrasts for multilingual learners,** but treat every flip as a hypothesis and verify translations with a proficient speaker.
- **Read small-N results as direction, not precision** — and re-test on a different day when you see regression.
- **Calibrate.** The built-in calibration mode (hand-authored scenarios with expert verdicts) sharpens your scoring without affecting real sessions.
- **Review every AI draft before it leaves your hands.** These are starting points, not finished documents.
