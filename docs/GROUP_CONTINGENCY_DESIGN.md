# Group Contingencies in AlloFlow — Design Note

**Date:** 2026-07-21 · **Status:** DRAFT for Aaron's review — nothing built.
**Prompted by:** seating-chart follow-up ("does the current system support
independent / interdependent / dependent group contingencies?"). Short answer
today: **no** — reinforcement is individual everywhere. This note maps what
exists, what the evidence supports, and the smallest honest architecture for
adding group contingencies.

---

## 1. Taxonomy (Litow & Pumroy, 1975)

| Type | Criterion applies to | Reward goes to | Classic example |
|---|---|---|---|
| **Independent** | each student individually | each student who meets it | "Everyone who finishes gets a token" |
| **Interdependent** | the group collectively | everyone, together | Good Behavior Game (team criterion) |
| **Dependent** | one student / subset | the whole group | "Hero procedure" |

## 2. What the platform has today (verified 2026-07-21)

- **BehaviorLens TokenBoard** — real *individual* schedules: FR, VR, FI, VI,
  DRO (recurs per interval since the 2026-07-12 fix). DRA/DRI exist as
  glossary/BIP language, not as programmed schedules. Per-student, clinical
  context, device-local.
- **AlloHaven classroom recognition** (`havenRewards`) — teacher-dispensed
  *individual* recognition events: fixed schema (generated id, enum reason,
  1–2 tokens, timestamp), per-student session cap 2/4/6/8
  (`havenRecognitionConfig`), no free text crosses the backend, student device
  folds events into AlloHaven's local ledger with de-dup by id. Structurally
  independent-shaped but **discretionary recognition, not a criterion-based
  contingency**.
- **Boss Encounter** (AlloHaven arcade) — cooperative class-vs-AI mode.
  Interdependent *in spirit*; a game mode, not a reinforcement framework.
- **Seating Chart** (new, Ring 0+1) — pods on the classroom map are natural
  contingency teams; Ring 2 planned overlay makes seats/pods tappable during
  live sessions.

**Gap:** no criterion object anywhere (no "class earns X when Y"), no group
award path (every reward event names exactly one student), no team concept
outside roster groups + seating pods.

## 3. Evidence posture (integrity notes)

- **Interdependent — strongest case.** The Good Behavior Game is one of the
  most replicated class-wide behavior interventions (Barrish et al., 1969;
  Bowman-Perrott et al., 2016 meta-analysis: large single-case effects;
  Kellam et al.'s longitudinal claims are promising but should be presented
  as *one research line*, not settled long-term fact). Comparative reviews
  generally find interdependent ≥ independent for class-wide targets, with
  heterogeneity — say "well-supported," not "proven best."
- **Independent — solid, unexciting.** Standard token-economy evidence;
  already approximated by AlloHaven's own earn structures.
- **Dependent — ethically fraught.** Documented risk of peer pressure and
  scapegoating when the group's outcome hangs on one identifiable student.
  Some positive uses exist (hero procedures with willing students), but the
  failure mode lands on exactly the students we serve. **Recommendation:
  excluded from v1**; revisit only with an explicit consent/assent design.

## 4. Proposed architecture (v1 = interdependent + independent, earn-only)

Reuse the recognition channel; add a thin criterion layer on top. No new
backend surface.

1. **Contingency object** (teacher-side, in `rosterKey`, device-local):
   `{ id, type: 'interdependent'|'independent', label, criterion: enum-coded
   goal, team: 'class'|groupId|podRef, tokens: 1-2, allowance: int,
   active: bool }`. Free-text label stays teacher-side; **never** crosses the
   session backend (same boundary as seating constraints).
2. **Award = fan-out.** When the teacher marks a criterion met, the client
   emits ordinary `havenRewards` events — one per member, new enum reason
   `group_goal` — through the existing validator/cap/de-dup machinery.
   Group contingency becomes teacher-side grouping + fan-out; students'
   devices need zero new protocol (one enum addition).
3. **Teams from what exists:** whole class, roster groups, or seating-chart
   pods (Ring 2 overlay: tap a pod → award the pod).
4. **Safeguards (non-negotiable):**
   - **Earn-only.** No response cost, no token loss, ever (matches AlloHaven's
     no-guilt economy).
   - **Can't-do allowance.** Interdependent criteria carry an allowance
     (GBG-style: "criterion met with up to N exceptions") so one student who
     *can't* meet it cannot sink the team — and no UI ever names which
     student the exception was.
   - **No losing display.** Celebrate criteria met; never render a team
     leaderboard of failures.
   - **Caps respected.** `group_goal` events count against the existing
     per-student session cap (recommend keeping this; it bounds total flow).
5. **Explicitly out of scope v1:** dependent/hero contingencies; automatic
   criterion detection (teacher judges, always); any AI involvement.

## 5. Open decisions for Aaron

1. Do `group_goal` awards share the per-student cap or get their own (§4.4)?
2. Interdependent v1 team default: whole class only, or pods/groups too?
3. Is the criterion enum list right? Proposed: transition_smooth,
   voice_level, on_task_interval, materials_ready, kindness_observed,
   custom(teacher-side-label-only).
4. Does the TokenBoard (BehaviorLens, clinical) stay fully separate from
   classroom contingencies (recommended: yes — different consent contexts)?
5. Naming in the teacher UI: "Class Goals"? ("Group contingency" is jargon;
   "team points" invites competition framing we're avoiding.)

## 6. Rough build shape (post-decision)

- **Ring A:** contingency CRUD + class-wide interdependent + fan-out award
  (1 session; mostly teacher-side UI + one enum).
- **Ring B:** pods/groups as teams + seating-chart Ring 2 tap-a-pod.
- **Ring C:** independent criterion mode (per-student checklist view).

*Related: docs/allohaven_cozy_world_design.md (economy + no-guilt framing),
project_seating_chart memory (pods, Ring 2), ANTI ~L5940 (havenRewards
schema + validator).*
