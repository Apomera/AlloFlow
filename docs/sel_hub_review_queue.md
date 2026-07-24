# SEL Hub — Review & Deploy Queue

> **Historical review/deploy queue snapshot, not current SEL status (2026-07-09):** This June 20 queue captured local/unpushed SEL work at that moment. Later SEL changes, QA passes, and documentation sweeps may have superseded individual items. Verify against current source, mirrors, `a11y-audit/`, tests, and `AGENT_HANDOFF.md` before using it as an active deploy checklist.

**For:** Aaron · **Prepared:** 2026-06-20 · **Status:** everything below is **LOCAL / UNPUSHED / UNDEPLOYED** on `main`.

This is the action list coming out of the 2026-06-09 SEL Hub review (30 findings) after this round of fixes. The review is essentially worked through: all 5 HIGH findings closed, Batches A & C done, the full a11y batch (A11Y‑1..8) done, integrity-copy lows done, and per-tool triage done. What's left is **your review of the safety/clinical/privacy-sensitive changes** and a handful of **decisions only you should make**.

Mirrors (`desktop/web-app/public/sel_hub/*`) are byte-identical for every change. Each fix has a guard test where applicable. Full vitest suite green (2617); `check_sel_render` 70/70.

How to use this: Section 1 = things I changed that touch safety/privacy/clinical surfaces — **please verify, then they're deploy-ready**. Section 2 = **decisions** that block further work. Section 3 = **deploy/infra actions** that need you (one touches the canonical `AlloFlowANTI.txt`). Section 4 = appendix (commit log + what's already shipped).

---

## 1. VERIFY BEFORE DEPLOY  (safety / privacy / clinical changes already made)

> All additive and tested, but they touch crisis/safety/FERPA surfaces, so they shouldn't deploy without your eyes.

### 1a. Crisis-tool screen-reader wiring — `safety.js` (A11Y‑5) — `fc36534d`
- The "Safety & Boundaries" tool defined SR announcers but never fired them, so safety-critical scenario feedback ("tell a trusted adult, it's not your fault") was **silent to screen readers**. Now announces (polite) on scenario / assertiveness / warning-flag feedback. Also removed 5 mislabeled "Toggle sound" buttons.
- **Verify:** the announcements read sensibly with a screen reader. `announceCrisis` (assertive alert region) remains defined but has **no automatic trigger** in this educational tool (no AI crisis assessment here) — left in place; remove or wire as you prefer.

### 1b. Three AI-input triage gaps closed (CRISIS‑3 / CRISIS‑5 / SELUX‑6) — `e0fba691`
Each path sent student free-text to the AI while skipping the crisis check that sibling paths in the same file already run. All mirror an existing in-file pattern.
- **CRISIS‑3** — `ethicalreasoning.js`: case-study Socratic **Send button** now calls `_runSafetyAssess('casestudy')` like the Enter key did. (Send is the likelier path on touch / for younger students.)
- **CRISIS‑5** — `decisions.js`: the **AI Advisor** (the tool's most disclosure-inviting input) now runs the same `assessSafety` + `onSafetyFlag` as the in-file Decision Tree path (`category: 'ai_advisor_*'`).
- **SELUX‑6** — `coping.js`: the **Match Me!** no-`safeCoach` fallback hardcoded `tier 0 / showCrisis false` (fail-open); it now runs the local `safeRehearseCheck` and escalates so crisis resources surface even without the full safety layer.
- **DECISION embedded:** for the decisions advisor + ethicalreasoning paths, a tier‑3 disclosure currently flags the **adult silently** (no student-facing crisis message). The coping matcher *does* show the student resources (via `_matcherTier>=3`). Do you want the decisions/ethicalreasoning paths to also show the student a crisis-resource message? (Consistency call.)

### 1c. FERPA save-gate now covers SEL text (SEL‑PRIV‑1) — `17583a9c`
- The project-save FERPA confirm (was audio-only) now also fires when `selToolData`/`selProgress` carries non-empty SEL text (journals, reflections, safety plan) → confirm + `_CONFIDENTIAL` filename. Empty/absent SEL data does **not** trigger it.
- **Verify:** the trigger + wording on the **shared project-save path** (this is the one change that lives in the cross-cutting save flow).

### 1d. "Clear my SEL data" right-to-delete (SEL‑PRIV‑7) — `b740b84a`
- New confirm-gated control in the **For-Educators modal → "Data & privacy"** section. Scans + removes all SEL localStorage keys, resets hub state, and clears the `window.__alloflow*` mirror slots (so a save can't re-persist deleted data).
- **DECISION:** placement/gating — it's in the For-Educators modal now (deliberate, two-step). Should **students** have a self-service path too, and/or should it live in the header? (See §2d.)

---

## 2. DECISIONS NEEDED  (your judgment — these block further work)

### 2a. Brain Gym neuromyth cluster (`sel-int-2`) — `coping.js` — NOT edited
While fixing one flagged cross-crawl line I found a **~20-site cluster** presenting Brain Gym (Dennison) hemisphere-integration / corpus-callosum claims as fact. Line **3636 literally cites "Brain Gym (Dennison)" as the evidence base.** Brain Gym is well-documented pseudoscience; "integrates left and right brain" / "activates the corpus callosum" for cognition+emotion are classic neuromyths.
- **Sites:** `coping.js` lines 151‑152, 157, 284/289, 886/913/960/1007 (nostril-breathing "harmonize the two cerebral hemispheres" — a separate myth), 1855, 2200, 3274, 3498, 3608‑3609, 3630‑3631, **3636 (Brain Gym evidence citation)**, 3786‑3787/3808/3814 (juggling — Draganski 2004 neuroplasticity is REAL, only the "bilateral integration" framing is loose), 4980, 22982/23008 (intro "based on Brain Gym work"), 26122/26126 ("The corpus callosum has been activated.").
- **It mixes real + myth**, so the reframe needs your domain judgment: KEEP crossing-the-midline (OT), proprioception, juggling neuroplasticity, breath/anxiety benefits; DROP/hedge the hemisphere-integration + corpus-callosum cognitive/emotional claims + the Brain Gym citation. Real UMaine-credibility risk.
- I already hedged the 3 *isolated* lows (`5f80a114`): goals "meditation rewires your brain", upstander "literally rewires the stress response", compassion fMRI-conflation. This cluster is the larger, framework-level piece I left for you.

### 2b. Consent coverage (SEL‑PRIV‑4) — NOT edited
A consent screen is shown in only **6 of ~18** tools that send student free-text to the AI/safety pipeline. The shared mechanism already exists (`SelHub.renderConsentScreen` + `hasCoachConsent`/`giveCoachConsent` + `renderSafetyDisclosure`; used by friendship, execfunction, growthmindset, compassion, transitions, upstander). The fix is **adoption**, not new infra — but the blocker is a **design decision**:
- Global one-per-session consent (today's `_consentGiven` model) **vs** per-tool consent?
- **When** to surface it — on first AI send vs on tool entry?
- Are the passive `safeRehearseCheck` role-play surfaces (which also transmit student text) in scope?
- Tools needing it: journal, emotions, advocacy, community, decisions, conflict, conflicttheater, civicaction, ethicalreasoning, peersupport, coping.
- Note: reuse the existing mode-honest consent copy verbatim; gating tools behind a consent screen **moves per-tool golden snapshots**.

### 2c. Crisis-flag snippet retention (SEL‑PRIV‑5) — needs your call + `AlloFlowANTI.txt`
Crisis-detection flags persist student crisis text **unbounded** in a shared `alloflow_ai_flags_unknown` localStorage bucket with no cap/prune. **Mitigated today** because the persisted blob is **write-only** (never read/surfaced/exported — only category *counts* are ever consumed).
- The cap/prune/per-codename fix lives **only** in `handleAiSafetyFlag` at `AlloFlowANTI.txt:5880` (+ `App.jsx:5880` mirror) → that's the canonical source I don't edit.
- Alternatively, **redact the snippet at its source** in editable modules: `safety_checker_module.js:50` (`match[0]`) and `sel_safety_layer.js:366`/`:451` (`context: msg.substring(0,100)`). That neutralizes the at-rest exposure without touching the monolith — **but it changes what the crisis pipeline records**, which is your clinical-data decision (do you want the snippet retained for future live-session teacher review?).

### 2d. evidence-badge tiers I assigned — confirm — `3777b48b`
Two tools had no evidence-base badge (the map fails open / hides it). I added conservative entries; **please confirm or adjust the tier/wording**:
- `execfunction`: **'emerging'** — "EF strategy instruction has real but modest, mixed support (Dawson & Guare; Barkley); structured scaffold, not a clinical intervention."
- `crisiscompanion`: **'practice'** — "Structured crisis-coping scaffold aligned with 988 / AFSP / NEDA guidance; not a clinical assessment or treatment."

### 2e. A11Y‑7 badge popup — timing decision — partially done
Badge popups now **announce to screen readers** (`be855cfe`, additive, done). The rest is a UX decision: every badge popup auto-dismisses on a fixed **3000 ms timer** with no keyboard dismiss (WCAG 2.2.1 Timing Adjustable). `digitalwellbeing` already implements the gold-standard pattern (role=`alertdialog`, aria-modal, autoFocus, Escape, **no** auto-dismiss).
- **DECISION:** should students explicitly dismiss the popup (remove the 3s timer), or keep auto-dismiss? Once you decide, the clean implementation is a shared `ctx.renderBadgePopup` helper adopted by all 14 tools.

### 2f. Smaller copy/placement confirmations
- **Crisis Companion grid card** (`ee417fdf`) — placement (Care-of-Self, after Sources of Strength), wording, grade-band (6‑12).
- **SELUX‑7 relabel** (`3777b48b`) — `sociallab` card renamed "Social Skills Lab" → **"Social Skills Roleplay"** (the broad `social` tool kept "Social Skills Lab"). Confirm the names.

---

## 3. DEPLOY / INFRA ACTIONS  (need you — canonical source or environment)

### 3a. Remove the stale `selfAdvocacy` duplicate (bundled change — touches `AlloFlowANTI.txt`)
`selfAdvocacy` ("Self-Advocacy **Studio**", 365 KB, no card) is a confirmed stale duplicate of the carded `advocacy` ("Self-Advocacy **Workshop**", 1.46 MB, same IEP/504/accommodations domain). My Station-Builder hardening already keeps the uncarded tool out of new Stations, so there's no user-facing harm in the interim. Full removal (one coherent change):
1. `AlloFlowANTI.txt:4950` — remove the `sel_hub/sel_tool_selfadvocacy.js` script-load line (**canonical source — I don't edit this**).
2. `build.js:949` — remove the same entry.
3. Delete `sel_hub/sel_tool_selfadvocacy.js` + `desktop/web-app/public/sel_hub/sel_tool_selfadvocacy.js`.
4. `sel_standards_alignment.js` — merge selfAdvocacy's data into `advocacy`: there's a top-level entry at `:448` alongside advocacy's `:430`, plus cross-refs at `:380`, `:485`, `:779`, `:970` (re-point to `advocacy`). This is a small domain-judgment merge.

### 3b. Standard SEL deploy mechanics
Everything in this queue is committed locally on `main`, unpushed, undeployed. To ship: push the relevant `sel_hub/*` commits, confirm the byte-identical public mirrors, and deploy per the usual CDN path. (PD feature has its own separate deploy checklist — see the `project_pd_feature` note in memory; not part of this SEL queue.)

---

## 4. APPENDIX

### What's already SHIPPED / closed (context)
- **5 HIGH findings closed:** CRISIS‑1, CRISIS‑2 (Batch A `5fc8adf6`); SEL‑PRIV‑2 (crisiscompanion `ccKey` namespacing `771c04f5`); SEL‑PRIV‑1 + SEL‑A11Y‑1 (`17583a9c`).
- **Batch A** (`5fc8adf6`): CRISIS‑1/2/4/6, SEL‑PRIV‑3, SELUX‑2 + 16-test safety-layer suite.

### This session's commits (2026-06-20, local/unpushed)
| Commit | What |
|---|---|
| `ee417fdf` | Crisis Companion reachable (grid card) |
| `6c0c350a` | A11Y‑4: coping matcher AI reply → SR |
| `5f80a114` | Integrity: 3 isolated neuro overclaims hedged |
| `1b96059c` | A11Y‑3: mindfulness guided steps keyboard-operable |
| `57e2ae8f` | A11Y‑2: feelings-wheel keyboard + 9 mislabeled buttons |
| `3777b48b` | Batch C: registry cleanups (execfunction card, label dedup, evidence badges, Station Builder hardening) |
| `c1e816ba` | A11Y‑6 + A11Y‑8: render-time CSS injection + reduced-motion-gated weather animation |
| `fc36534d` | A11Y‑5: safety crisis-tool SR wiring + label fixes |
| `be855cfe` | A11Y‑7: badge SR-announce across 12 tools |
| `e0fba691` | CRISIS‑3 / CRISIS‑5 / SELUX‑6: AI-input triage parity |
| `b740b84a` | SEL‑PRIV‑7: "Clear my SEL data" affordance |

### Guard tests added
`sel_crisis_reachable`, `sel_registry_batch_c`, `sel_badge_announce`, `sel_clear_data`, `sel_export_gate` (+ the existing `sel_safety_layer`).

### Not pursued (documented, low value)
- A11Y‑5 mass-deletion of the 69 dead per-tool `allo-live-*` regions: they're **redundant** (the host already provides a shared `#sel-sr-announce` + `ctx.announceToSR`) and inert — deleting all 69 is high-collision churn with no user benefit. Left as-is.
