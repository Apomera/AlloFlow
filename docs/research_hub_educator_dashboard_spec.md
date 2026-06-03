# Research Hub educator-dashboard spec (v1)

**Audience:** Whoever builds the educator-facing assessment UI for the Investigation & Research Hub (or a future Claude session asked to build it). Companion to the Tier 1/2/3/4 design docs in this folder.

**Premise:** The Hub does not need its own dashboard component. Every load-bearing assessment artifact already lives in `journal` as a structurally-typed field. The host (or a thin dashboard plugin) reads `localStorage['alloflow_research_hub_v1']`, parses, and renders. What this spec defines is **which fields encode trajectories** and **how to render them so teachers don't misread**.

## I. The grading principle (anchor everything else here)

A clean walk from stage 1 → stage 6 with no loop-backs is **worse inquiry** than three failure-loops with measured revisions. Polish is not rigor. Grade these four trajectories; ignore the surface artifact's grammar.

1. **Did the model / position / design get *narrower* under pressure?** (versioned artifacts + revision logs)
2. **Did the student loop back when evidence demanded it?** (`loopBacks[]` count + `whyChipId` distribution)
3. **Did sources fail SIFT or get tier-downgraded?** (`sources[].sift.tierHistory[]`) — downgrades are good data
4. **Did AI usage stay scaffolding-shaped?** (`aiHistory[]` gate_reasons + per-touchpoint distribution)

## II. The four load-bearing trajectories — what to read, what it means

### 1. Scientific lane — model trajectory
- **Source:** `journal.modelSnapshots[]` ordered v:1 → v:N
- **Render:** Horizontal timeline. For each snapshot show `v`, `confidence` (low/med/high), first 80c of `text`, and a 🔁 badge when `loopBackOrigin.fromStage` is set
- **What to look for:** Confidence movement (high→medium IS revision; medium→high IS NOT necessarily growth); `knownUnknowns` appearing or being claimed-resolved; `loopBackOrigin` badges on later versions
- **Anti-pattern:** Treating the latest snapshot as the only one that matters. v:1 vs v:N delta is the artifact, not v:N alone.

### 2. Engineering lane — build × failure trajectory
- **Source:** `journal.buildLog[]` + `journal.testRun[]` + `journal.failureLog[]` joined by `buildLogV` and `fromTestRunId`/`retestRunId`
- **Render:** Build versions horizontally; under each build, test-run measurements per criterion (green/red); failure-loop cards bridging consecutive builds showing `changedVariable` + `predictedEffectText` + measured retest delta + `predictionVsRealityRadio`
- **What to look for:** Failure loops with `predictionVsRealityRadio = 'refuted'` or `'partially'` (honest reconciliation); retest delta crossed the >5% threshold or sign-flipped (real change, not cosmetic); `criteriaWeightLog[]` with `afterMatrixFilled=true` entries (weight-gaming flag — surface as a yellow badge)
- **Anti-pattern:** Treating "all criteria green on v:1" as the strongest work. That's usually the under-iterated submission.

### 3. Humanities lane — warrant trajectory (THE assessment artifact)
- **Source:** Three append-only logs joined by `claimEvidenceLinks[].id`:
  - `claimEvidenceLinks[].qualifierRevisionLog[]` — qualifier scope contractions triggered by `framingProbe` verdicts
  - `claimEvidenceLinks[].warrantRevisionLog[]` — warrant changes triggered by `warrant_questioner`'s analog-domain SHAPE-translation
  - `sources[].sift.tierHistory[]` — source tier movement
- **Render: WarrantTrajectoryRibbon.** Mock:

```
Link #1  qualifier: ────●─────●──○      tier: secondary_corroborated ──● primary_corroborated
              v1     v2    v3            (sources: 2 corroborated, 1 downgraded to failed_SIFT)

Link #2  qualifier: ──●  STOPPED         AI shape-help → warrantRevisionLog v:2 (analog: courtroom_admissibility)
              v1
```

- **What to look for:**
  - **`qualifierRevisionLog` has entries** — qualifier *contracted* under framing pressure. Good.
  - **`warrantRevisionLog` has entries** — `stuckSignal=true` was honestly acknowledged and the analog-domain shape genuinely shaped the warrant. Good.
  - **`tierHistory` shows downgrades** (e.g. `secondary_corroborated → opinion_disclosed → failed_SIFT`) — student found out their source was weaker than they thought. **Excellent.**
  - `framingProbes[]` distribution: if every verdict is `warrant_survives`, surface a yellow badge — was the all-survives justification ≥120c?
- **Anti-pattern:** Marking down sources that got downgraded. A downgrade IS the lateral reading working.

### 4. Cross-lane — loop-back density + AI usage shape
- **Source:** `journal.loopBacks[]` + `journal.aiHistory[]`
- **Render:**
  - Loop-back density: `loopBacks.length / minutesActive`, with `whyChipId` distribution as a stacked bar (e.g. for humanities: `source_failed_SIFT`, `framing_destabilized_argument`, `positionality_shift` are the high-value chips)
  - AI usage shape: `aiHistory.filter(h => h.blocked).length` vs total. **Blocked calls are not a problem** — they mean the student-first gates fired. Surface `gate_reason` distribution.
- **What to look for:**
  - **`returnedToOrigin` set on most loopBacks** — student didn't get lost in the loop; they came back with revised work. Confirms loop completion.
  - **`bypass_signals` patterns** — repeated `exemplar_not_viewed` means the student tried to skip the rubric pair; repeated `positionality_boilerplate` means denylist kept firing. Coaching data.
  - **`qFormatRejected` count from `aiHistory[].qFormatRejected`** — non-zero means the substrate-level question-format validator caught AI output drift. Healthy.
- **Anti-pattern:** Reading `aiCallCount` as a usage score. The cap is 8 per session — students who use all 8 aren't worse than students who use 0.

## III. Composite "Inquiry Health" view (one panel per session)

```
┌─────────────────────────────────────────────────────────────────┐
│  Inquiry Health — {studentCodename} · {questionTitle}           │
├─────────────────────────────────────────────────────────────────┤
│  Lane: Humanities · Active: 47 min · Loop-backs: 4              │
│                                                                  │
│  ▮▮▮▮▮▮▮  Warrant trajectory (3 contractions, 1 stuckSignal)    │
│  ▮▮▮▮     Source tier movement (1 promotion, 2 downgrades)      │
│  ▮▮▮▮▮    Positionality snapshots (v:1 → v:4)                   │
│  ▮▮       Foreclosure Coda completeness (3/3 streams linked)    │
│  ▮▮▮▮▮▮▮  Loop-back chips: source_failed_SIFT × 2,              │
│           framing_destabilized × 1, positionality_shift × 1     │
│                                                                  │
│  AI usage: 6/8 calls; 2 blocked (positionality_boilerplate ×2)  │
│  authorshipLog: 0 paste events                                  │
│                                                                  │
│  ⚠ FLAGS                                                         │
│  • criteriaWeightLog has 1 afterMatrixFilled=true entry         │
│    (Engineering — surfaced if cross-lane carry)                  │
│                                                                  │
│  Grade FROM: trajectory artifacts above                          │
│  Grade NOT from: bodyText polish, total stage count              │
└─────────────────────────────────────────────────────────────────┘
```

## IV. Anti-patterns (label these explicitly in the dashboard UI so teachers don't drift)

| Don't | Why |
|---|---|
| Score on "how polished is the op-ed / model / design" | All three lanes are designed so polish doesn't require thinking |
| Mark down loop-backs | Loop-backs are *the* signal of real revision |
| Count source tier downgrades as failure | Downgrades = lateral reading working as intended |
| Treat blocked AI calls as student failure | Means the student-first gate enforced thinking-first |
| Read `bodyText` as the artifact for humanities | The artifact is bodyText + ForeclosureCoda + warrant trajectory + standpoint snapshots **together** |
| Compare students by `aiCallCount` | The cap is per-session; usage is not a quality signal |

## V. Implementation hints

- **Read substrate directly.** `journal = JSON.parse(localStorage['alloflow_research_hub_v1'])`. No database, no separate API.
- **No PHI / FERPA concerns at the journal level** — content is the student's own work. If you expose this to other teachers (peer review), add a consent gate at the export layer, not the read layer.
- **Substrate version check.** Reject `journal.v < 4` for humanities-specific fields (or migrate via the same ladder the lane uses).
- **No grading scores in the substrate.** All scoring is the teacher's; the dashboard surfaces *evidence* for their judgment, not a number.
- **Stale data is real data.** When `staleLabel: true` appears on `criteria` / `humanitiesPosition` / `designClaims` / `stakeholderProfile`, render the staleLabel; don't filter it out. The teacher needs to see what was superseded and what was acknowledged-as-superseded.

## VI. What this spec deliberately does NOT include

- **Auto-grade scores or rubric levels** — teachers grade; the dashboard exposes evidence
- **Cross-student comparisons** — no leaderboards, no class averages on loop-back density (that would re-impose the linearity the lane explicitly fights)
- **AI-generated grade suggestions** — the dashboard shows what the student did; the educator judges
- **Long-term progression tracking** — out of scope for V1; if Aaron + Lisa want this for the 2026-27 pilot, it lives in a separate analytics layer reading multiple sessions
