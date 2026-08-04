# Scoping: Law Navigator improvements + the DSM-5-TR question

**Date:** 2026-08-04
**Status:** SCOPE ONLY — no code written. For Aaron's decision.
**Verification:** every source claim below was probed live today, not assumed.

---

# Part 1 — Three Law Navigator improvements

Ranked by value per unit of risk. All three preserve the cardinal rule (no
regulation text authored or generated) because all three are retrieval or UI.

## 1A. Cross-references as links — **recommended first**

**The problem.** Regulation text is a web of pointers: "in accordance with
§§ 300.304 through 300.311", "as defined in § 300.34". Today those are dead
strings, so following one means backing out to search and typing it in. That
friction is exactly what makes lay readers give up on primary sources.

**The build.** At render time, scan the verbatim paragraph for citation
patterns and wrap matches in buttons that jump to that section. Pure
presentation over unmodified text — the same discipline as the reading
controls already shipped.

- Patterns: `§ 300.530`, `§§ 300.304 through 300.311` (ranges), `§ 104.33`,
  and MUSER's internal `IV.1.C` style.
- A reference resolves only if the target EXISTS in the loaded corpus;
  unresolvable citations stay plain text rather than becoming dead buttons.
- Ranges link to the first section and note the span.
- Back-navigation needs a small stack so "follow three links, get back" works.

**Effort:** small-to-moderate. **Risk:** low — worst case a citation renders as
plain text, which is today's behavior.
**Watch:** cross-document references (MUSER quotes federal §§ constantly). Link
those to the federal corpus, clearly labeled as leaving the state document, or
leave them plain in v1. I would leave them plain in v1 and add it once the
in-document case is proven.

## 1B. "What changed, and when" — **recommended second**

**The problem.** A parent or teacher cannot tell whether the rule they are
reading is stable or was rewritten last spring. Our own staleness badge only
describes OUR copy, not the law's history.

**The build.** eCFR exposes amendment metadata; the titles endpoint already
gives `latest_amended_on` (34 CFR showed 2026-07-24 today) and there is a
versioner API for per-section history. Show, on a federal section: "this part
was last amended YYYY-MM-DD", and where the API supports it, whether THIS
section changed on that date.

**Effort:** small if we settle for part-level ("this part last amended X"),
moderate for true per-section diffing.
**Risk:** low, with one honesty trap worth naming: **do not imply a section is
unchanged just because we cannot see a change.** Absence of evidence must
render as "no amendment recorded in the data we fetched", never "unchanged
since 2006".
**My recommendation:** ship part-level first. Per-section diffing is a bigger
project (it means fetching two dated versions and comparing) and belongs on its
own once someone actually asks for it.

## 1C. Save a citation to the meeting-prep checklist — **recommended third**

**The problem.** The Parenting Lab checklist helps you prepare; the Law
Navigator shows you the rule. Nothing connects them, so the parent who finds
the exact provision has to write it on paper.

**The build.** A "Save to meeting prep" action on a section that appends
`{ citation, heading, docShort }` into the Parenting Lab's `prepDone`-adjacent
state, rendering in M9 as "Rules I want to ask about".

**Effort:** small. **Risk:** low, but two design decisions are Aaron's:
- **Cross-tool state.** Parenting Lab state lives under `parentingLab` in
  toolData; the Navigator would write into a sibling key. That is a new
  coupling between two tools. Cleaner alternative: a neutral `_alloCitations`
  slice both tools read, so neither owns the other.
- **Snapshot weight.** These persist into workspace snapshots. Cap the list
  (say 12) so a long session cannot bloat a saved workspace.

## What I would NOT build

**A "does my situation violate the rule?" checker.** It is the most requested
shape and the most dangerous: it converts retrieval into legal conclusion. The
Dispro Analyzer precedent (never declares a finding) applies with more force
here, and it is why the tool refuses legal advice today.

---

# Part 2 — The DSM-5-TR question

## The blocking fact, verified

**DSM-5-TR cannot be ingested. It is copyrighted by the American Psychiatric
Association and sold commercially** (print, and licensed digital access via
PsychiatryOnline). There is no public API and no lawful way to reproduce the
diagnostic criteria in AlloFlow. This is not a technical obstacle to route
around; it is the whole architecture's precondition failing.

The Law Navigator works because CFR and state regulations are public domain
government edicts. Everything about the corpus design — fetch verbatim, store,
render, quote — depends on that. Applying it to DSM would mean building a
copyright-infringement machine with excellent provenance metadata.

**What I probed today:**

| Source | Result |
|---|---|
| WHO ICD-11 API (`id.who.int`) | **401** — OAuth bearer token required (free registration, but credentialed) |
| NLM Clinical Tables ICD-10-CM | **200, CORS `*`, no key** — public, browser-fetchable |
| PsychiatryOnline (DSM-5-TR) | commercial/licensed — not ingestible |

## What IS legitimately buildable

### Option A — ICD-10-CM code navigator *(honest, immediately possible)*

The NLM Clinical Tables API is a free NIH service, no key, CORS-open, and it
returns codes with official descriptions. DSM-5-TR itself uses ICD-10-CM codes
for recording and billing, so **the codes are the public layer of the same
system**. A navigator could search codes, show official descriptions, and note
which are commonly used in school-adjacent contexts — same corpus discipline,
same provenance badges, same no-fabrication rule.

**Honest limit:** a code list is not diagnostic criteria. It tells you
F90.2 is "ADHD, combined type"; it does not tell you what qualifies. Anyone
expecting a DSM substitute will be disappointed, and the UI must say so
plainly rather than let the resemblance mislead.

### Option B — "Diagnosis vs. eligibility" *(highest value for Aaron's actual work)*

This is the one I would build, and it needs no copyrighted text at all.

The most consequential confusion in school psychology is that **a DSM
diagnosis is not IDEA eligibility**. A child with an ADHD diagnosis is not
automatically eligible; a child can qualify under IDEA with no diagnosis at
all. Parents arrive at meetings assuming the doctor's letter settles it, and
teachers often believe the same.

Both halves of that comparison are already in hand:
- IDEA's 13 eligibility categories and their criteria are **in our corpus**
  (34 CFR § 300.8), public and quotable.
- DSM's role can be described in our own words — what a diagnostic manual is
  for, who uses it, why clinical and educational systems ask different
  questions — without reproducing a single criterion set.

Content shape: what each system is FOR (treatment/communication vs. specially
designed instruction), the 13 IDEA categories quoted verbatim from § 300.8,
worked cases (diagnosis without eligibility; eligibility without diagnosis;
both), what a private evaluation can and cannot compel, and the adverse-effect
plus need-for-specialized-instruction two-prong that parents rarely hear.

**Effort:** moderate. **Risk:** low legally, but it is clinical-adjacent
content under Aaron's name — SME gate applies exactly as it did for Parenting
Lab.

### Option C — DSM *structure and literacy*, no criteria

How the manual is organized, what specifiers and severity ratings mean, why
"NOS" became "other specified/unspecified", the multiaxial system's retirement,
dimensional vs. categorical debates, and honest critique (reliability of field
trials, cultural formulation, medicalization arguments). Original prose about a
book, not reproduction of it.

**Overlap warning — real:** `assessmentLiteracy` already carries 47 DSM
references, including "DSM differential diagnosis", "medical/clinical diagnosis
vs. educational eligibility", and DSM-aligned instruments (UCLA PTSD-RI,
PHQ-9). **Option C substantially duplicates a tool that already exists**, so I
would fold anything worth keeping into Assessment Literacy rather than build a
second home for it.

## Recommendation

1. **Build Option B** ("Diagnosis vs. Eligibility") as a Parenting Lab module or
   a small companion tool — highest real value, zero licensing risk, directly
   serves the IEP-meeting audience the rights card already speaks to, and
   quotes § 300.8 from the corpus we already have.
2. **Consider Option A** only if code lookup is genuinely wanted; it is easy but
   thin, and easy to mistake for something it is not.
3. **Skip Option C** as a separate tool; extend Assessment Literacy instead.
4. **Do not attempt DSM criteria ingestion in any form** — including
   "summarized", "paraphrased", or AI-generated criteria, which is the failure
   mode this whole architecture exists to prevent, plus a licensing problem.

## Open questions for Aaron

- Option B: standalone tool, or Module 10 of Parenting Lab? (It fits the
  parent audience, but teachers and admin would want it too, which argues
  standalone.)
- Is ICD-10-CM code lookup useful in your actual practice, or is it noise?
- For 1C, is the neutral shared-citations slice acceptable, or would you rather
  the two tools stay fully independent?
