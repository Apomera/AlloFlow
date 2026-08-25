# SEL Hub — Review & Deploy Queue

> **Historical review/deploy queue snapshot, not current SEL status (2026-07-09):** This June 20 queue captured local/unpushed SEL work at that moment. Later SEL changes, QA passes, and documentation sweeps may have superseded individual items. Verify against current source, mirrors, `a11y-audit/`, tests, and `AGENT_HANDOFF.md` before using it as an active deploy checklist.
>
> **Start at [§5](#5-2026-08-23-pass--themecontrast-fidelity--local-unpushed) (2026-08-23).** It re-verified §1-§4 against current source: **§3a is closed** (the `selfAdvocacy` duplicate was resolved by role-split, not deletion), §2b's denominator has grown from 18 to 30 tools, and §2e is now 10 tools rather than 14. §5 also records two contrast defects fixed on that date, including invisible text in the Crisis Companion.

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

---

## 5. 2026-08-23 PASS — theme/contrast fidelity  (local, unpushed)

A fresh look, prompted by the fact that `a11y-audit/sel_hub_wcag_audit.md` reports
**"71 tools, 0 error(s), 0 warning(s)"**. That report is not wrong so much as
near-sighted, and two real defects were hiding behind it.

### 5a. Why the reports read clean

Three independent blind spots, all measured rather than assumed:

1. **The contrast rule only grades 30% of the text.** `dev-tools/check_sel_a11y.cjs`
   evaluates an element only when `color` **and** `background` are inline on the
   *same* node. Real markup puts text on a child and the surface on the card.
   It grades **3,188 of 10,700** rendered text nodes. An inheritance-aware walk
   (nearest ancestor surface, alpha composited) grades 9,464 and found **287
   AA failures across 44 of 71 tools**.
2. **All three "themes" are the same render.** `sel_hub_module.js` `renderTool()`
   pins every tool to the dark shell (`needsDarkShell`, a deliberate and well
   documented trade-off). The side effect is that light and dark renders are
   **byte-identical for 70 of 71 tools** (only `somaticReset`, the sole
   `lightBackground: true` opt-out, differs). So "audited across light, dark and
   high-contrast" is one theme audited three times, and every light-path branch
   in the `_xxC` migrations is unreachable in production.
3. **The audit's "What Looks Strong" bullets are hardcoded strings**, printed
   unconditionally. They would read identically with 500 errors.
4. **Neither a11y gate has a runner.** `package.json` wires only
   `check_sel_render.cjs` into `verify:gate` (and `verify:sel-render`).
   `check_sel_a11y.cjs` and `check_sel_hub_wcag.cjs` are referenced by **no npm
   script at all**, so `a11y-audit/sel_*.json|md` only refresh when someone
   invokes them by hand — the committed report can be arbitrarily stale as well
   as near-sighted. Wire them in **after** fixing 1 and 3, not before: gating on
   a probe that grades 30% of the text would add false assurance rather than
   remove it.

Nothing here needs a decision from you; items 1 and 3 are straightforward gate
fixes. Item 2 is worth a conversation, because it means the light-mode half of
the theme migration is currently dead code.

### 5b. FIXED — Crisis Companion was rendering invisible text (1.00:1)

`sel_tool_crisiscompanion.js` read `SLATE_TEXT` (`#1e293b`) raw at ~69 call sites
while the card backgrounds around it went through `_ccC('#fff')`, which maps to
`#1e293b`. Because the shell pins `isDark`, `_ccC` is *always* in its dark branch,
so this was slate-800 text on a slate-800 card: **contrast exactly 1.00, i.e.
invisible**, on the content-warning gate of the suicide-prevention module (the
"This module is about what to do if a friend is depressed…" paragraph and its
bullet list). Ten card backgrounds were also unwrapped.

- `SLATE_TEXT` / `SLATE_MID` now flip on the theme flags at render time (they are
  foregrounds with no map entry; adding one would double-map existing `_ccC(CONST)`
  call sites). `SLATE_BG` uses `_ccC('#f8fafc')`, which the maps already covered.
- The 10 raw backgrounds now route through `_ccC`, plus two foregrounds that sat
  on them (`TEAL_DARK`, `#9f1239`). `#115e59` added to both swap maps.

**Why the existing theme gate missed it.** `tests/sel_theme_reactivity.test.js`
does `src.slice(src.indexOf(': hex); };'))` — it only scans *after* the `_xxC`
helper definition. Crisis Companion draws its UI in module-scope helpers **above**
that point (51% of the file), and **all ten leaks sat in that unscanned prefix**.
Its `SURFACE_HEXES` list also omits plain `'#fff'`, which was eight of the ten.
Checked the other ten remapped tools with a whole-file scan: they are clean, so
Crisis Companion was the only tool actually leaking through this hole.

### 5c. FIXED — one function caused 138 of the 287 failures

`sel_standards_alignment.js` `tagStyle()` rendered tag text at full hue on a
`hue + '22'` tint of the *same* hue. On the panel that works out to `#6366f1`
("CASEL") at **2.84:1 in 32 tools** and `#a78bfa` at **4.32:1 in 18**. `render()`
is called from 69 of 71 tool files, so this one function was the single largest
contributor in the hub. Added a `TAG_INK` map (indigo-500→300, emerald-500→300,
violet-400→300) that keeps the tint background, so the colour coding still reads.

**Result: 287 → 133 failing nodes, 44 → 25 tools affected.**

### 5d. Guard test

`tests/sel_contrast_shell_regression.test.js` (20 tests). Deliberately not a
source-text tautology: it scans the **whole** file (not a slice) including plain
white, **computes** the AA ratio for each `TAG_INK` entry against its own
composited tint rather than asserting a hex, and carries two **calibration** tests
that fail if the scan itself ever goes blind. Verified it fails 5 tests against
the pre-fix file before being made to pass.

Full SEL suite green (67 files, 657 tests); `check_sel_render` 71/71;
`check_sel_a11y` 0/0; mirrors byte-identical.

### 5e. What is left, in priority order

1. **The gate fixes above (5a.1, 5a.3), then wiring them up (5a.4).** Until the
   probe can see inherited backgrounds *and* something runs it, none of this is
   protected outside the one new guard test — which does run, since it lives in
   `tests/` and vitest picks it up automatically.
2. **The remaining 133 failures across 25 tools.** These are per-tool hardcoded
   accents on the dark shell, not a shared helper, so there is no second
   one-line win here. By foreground hue (nodes / distinct tools):
   `#3b82f6` 22/6, `#ef4444` 22/6, `#6366f1` 20/6, `#a855f7` 18/8, `#dc2626` 10/3,
   `#ec4899` 8/4, `#7c3aed` 8/3, `#64748b` 7/3, `#8b5cf6` 6/3, then a tail of six
   hues at 2 nodes each. Worst single tool is `zones` (24 nodes). Most of these
   are mid-tone accents that would pass on white and fail on slate-900, so the
   fix is the same shape as `TAG_INK`: pick the lighter shade of the same hue.
3. **The high-contrast surface.** The dark-shell wrapper paints `#0f172a`
   unconditionally with no `isContrast` branch, so HC chrome wraps a non-HC
   surface. One conditional, fixes all 71.
4. **Consent coverage (§2b) has moved against us**: the shared mechanism is used
   by 6 tools, but **30** now send student free text to the AI (the queue records
   6 of 18). Still blocked on your global-vs-per-tool call.
5. **i18n.** 5 of 71 SEL tools alias `var t = ctx.t` (13-18 call sites each);
   STEM is 114 of 145. The lang pack holds 23,696 keys, of which `sel_hub` has 2.
   Largest remaining body of work in the hub, and a real gap for a UDL product.

Unchanged and still yours: §2a Brain Gym cluster, §2e badge auto-dismiss (now 10
tools, was 14). **§3a is CLOSED** — the `selfAdvocacy` duplicate was resolved by
role-split ("Self-Advocacy Studio" for IEP/504 planning vs "Advocacy Practice"
for general scripts) rather than deletion, and the registry is now clean:
71 registered = 71 carded, 0 unreachable. Two small gaps remain: `selfAdvocacy`
has no `_evidenceBase` entry (badge fails open and hides) and `disabilityVoices`
has no `sel_standards_alignment` entry.

---

## 6. 2026-08-23 PASS 2 — gates wired, contrast backlog halved  (local, unpushed)

Working through §5e in order.

### 6a. DONE — the gates can now see, and now run

- **`check_sel_a11y.cjs` contrast is inheritance-aware.** It walks ancestors for
  the nearest declared foreground and the nearest opaque surface, compositing
  translucent layers in between. Coverage went from ~30% of text nodes to
  **14,196 graded**, and the report now prints that coverage next to the counts,
  plus what it had to skip (921 gradient-backed, 933 colour-from-a-CSS-class)
  with the line **"Skipped is not passed."**
- **The hardcoded "What Looks Strong" block is gone.** `check_sel_hub_wcag.cjs`
  now derives that section: real coverage numbers, which entry points were
  actually found this run, and a note that byte-identical renders across themes
  mean a tool is theme-blind rather than that it passed three audits.
- **Both are wired into `verify:gate`** (plus `verify:sel-a11y` /
  `verify:sel-wcag` for running them alone). They were referenced by no npm
  script at all before.
- **A ratchet backs it**: `dev-tools/sel_contrast_baseline.json` holds
  `maxWarnings: 98`. The gate exits 1 if the count goes up, and tells you to
  re-baseline deliberately with `--update-baseline` if it goes down. Verified by
  lowering the baseline by one and confirming a non-zero exit.

### 6b. DONE — 182 → 98 contrast warnings, zero regressions

Once the probe could see, the real cause showed up. `_xxBg` has light, dark and
high-contrast maps, but **`_xxFg`'s dark branch was the identity in 52 of the 54
tools that have one** — so accent TEXT kept its light-mode value on the
always-dark tool shell. `zones` and `decisions` already had a real `_xx_FGD`
map; this generalises their pattern.

Two changes, both foreground-only so no surface moves:
1. Added `_xxx_FGD` dark foreground maps (each hue → a lighter shade of the SAME
   hue, chosen by solver against every background that hue actually lands on).
2. Routed 343 in-render `color:` sites through the tool's own Fg helper, so the
   maps are actually consulted. Sites above the helper definition are left alone
   on purpose (see 6c).

**Result: 182 → 98 warnings, 0 regressions.** `zones` alone went 24 → 0;
`healthyRelationships`, `conflict`, `dearMan`, `identitySupport`,
`sourcesOfStrength`, `tipp` all → 0.

### 6c. Two traps worth writing down

- **Do not re-shade the base literal.** The first attempt rewrote
  `color: '#3b82f6'` → `'#60a5fa'` in source. `_min_BGD` is *keyed* on
  `'#3b82f6'`, so the rename silently disabled the button's dark background
  remap and "🌬️ Begin Breathing" went to 2.54:1. Reverted. Fix the foreground
  map, never the literal the background map is keyed on.
- **A tint is not a fill.** `hue + '22'` composited over the dark shell stays
  dark and is harmless to move; a solid `background: hue` with a white label is
  not. Any tool-wide colour rule has to tell those apart.

### 6d. Also done

- **High contrast now reaches tool interiors.** The dark-shell wrapper painted
  `#0f172a` unconditionally; it now paints `#000000`/`#ffff00` when
  `isContrast`, so HC chrome no longer wraps a non-HC surface.
- **Registry gaps closed.** `selfAdvocacy` has an `_evidenceBase` entry (tier
  `practice`; **please confirm the tier and wording**), and `disabilityVoices`
  has a `sel_standards_alignment` entry (CASEL/HOWL/other + pairsWith +
  crewPrompt; **please check the framework choices** — it names the
  Neurodiversity Paradigm, Disability Justice and "Nothing About Us Without Us",
  which is a positioning call as much as a standards one).
  Registry is now 71 registered = 71 carded = 71 evidence = 71 aligned.

### 6e. The remaining 98, honestly

They are not one more sweep. They sit in three different architectures:

1. **~30 in 5 tools with a single combined `_xxC` map** (friendship,
   voicedetective, peersupport, sociallab, upstander) where one map serves text
   AND surfaces. I added entries, measured no change, and **reverted them** —
   their failing sites bypass the helper too. These need the text sites routed
   first, and routing through a combined map risks recolouring text that is
   deliberately white.
2. **26 in `strengths`** plus `conflicttheater` and `quietQuestions`: the same
   hex is used on a white card AND on the dark shell, so no single shade
   satisfies both. These need a genuine per-surface split.
3. **`emotions` (10) and `somaticReset`** have no remap helper at all.

`safety` and `journal` have an `_FGD` map that is currently inert for the same
reason as (1) — the map and wiring are correct and match the zones/decisions
shape, they just have no reachable call site yet. Left in place deliberately.

### 6f. Not started (unchanged from §5e)

Consent coverage (§2b, still 6 of 30, still blocked on your global-vs-per-tool
call), the 3000 ms badge auto-dismiss (§2e, 10 tools), the Brain Gym cluster
(§2a), and i18n (5 of 71 tools vs STEM's 114 of 145).

Full SEL suite green (67 files, 657 tests); `check_sel_render` 71/71; all 74
sel_hub files byte-identical with their public mirrors.

---

## 7. 2026-08-23 PASS 3 — navigation and findability  (local, unpushed)

The brief was to make all 71 tools intuitive to navigate. I measured before
changing anything: 45 queries a student or teacher would plausibly type, scored
against the tool each one should surface.

**15 of 45 missed every intended tool, and 9 returned nothing at all.** The
cause was that **43 of the 71 tools shipped with no search synonyms**, so the
catalog only matched a tool's own marketing copy — you had to already know the
tool's name to find it. `vaping`, `drugs`, `adhd`, `procrastination`, `lgbtq`,
`nightmares`, `iep`, `504`, `gratitude`, `confidence` and `my friend died` all
returned zero results while the right tool sat in the grid.

Aliases now cover 71 of 71, written in student vocabulary. **45 of 45 queries
now surface an intended tool and none dead-ends.**

### 7a. The one that was not just a dead end

`want to die` returned two unrelated regulation tools and no route to support.

Crisis vocabulary now surfaces a support panel above the results: tell a trusted
adult, 988 and Crisis Text Line for non-elementary bands (elementary is pointed
at a person, following the crisis tool's existing convention), and a direct
route into Crisis Companion. It says plainly that **searching does not tell
anyone** — a person only knows if you tell them — so it cannot repeat the
promise/delivery gap CRISIS‑1 closed. The vocabulary is 16 short unambiguous
phrases at module scope, exposed as `SelHub.matchesCrisisVocabulary`, and
verified against ordinary queries so `hope`, `cut paper` and `grief` do not trip
it.

**AARON — this needs your eyes before deploy:** the panel wording, and the
elementary/non-elementary split on whether hotline numbers appear.

### 7b. A filter chip that filtered to nothing

Adding tool counts to the category chips exposed it: the filter matched a chip
to a section by id substring, and `_cat_DecisionMaking` does not contain
`responsibledecisionmaking`. **Clicking Responsible Decision-Making filtered the
grid to an empty page** — and, being one of nine chips, it is exactly the one
nobody re-tests. Chip and filter now resolve through one helper matching on the
label both sides already share. Its 4 tools are reachable again and the chip
counts now sum to all 71.

### 7c. The catalog could not be skimmed by ear

A card's accessible name carried the description, guidance mode, note, boundary
and teacher cue at once: **17,132 characters to hear the whole grid**, median
145, worst case 3,491 on one card. Every arrow-key press read a paragraph before
reaching the next tool. The name is now the tool plus its grade band; the detail
moved to `aria-describedby`, which is announced after the name and can be
skipped. **Median 145 → 30, worst 3,491 → 49, whole grid 17,132 → 2,243.** The
"use with care" flag stays in the name, because it changes whether you should
open the tool at all.

### 7d. Smaller things

- The search box now has a live result summary tied to it by `aria-describedby`
  ("13 tools of 71 match ..."), naming every active filter. Typing used to give
  screen-reader users no feedback at all.
- Category chips carry their tool count, so the shape of the catalog is visible.
- The empty state was gated on the search string, so a grid emptied by a chip, a
  pathway or a station rendered nothing at all. It now triggers on the count and
  offers a **Show all 71 tools** button that clears everything at once.

Guard: `tests/sel_hub_navigation.test.js` (52 tests) covering the alias data,
the crisis vocabulary and its copy, one-derivation category matching, and the
rendered affordances — including that the chip counts sum to the number of cards
and that no card name exceeds 120 characters.

Full SEL suite green (68 files, 709 tests); all three SEL gates pass; mirror
byte-identical.

---

## 8. 2026-08-23 QA PASS — scanners that had never been aimed at SEL

The repo has 589 dev-tools scanners. **Only 33 mention `sel_hub`.** This pass
pointed the crash and keyboard ones at it for the first time.

### 8a. A green report that scanned nothing

`scan_mouse_only_controls sel_hub` printed a clean result while reporting
**"0 file(s)"** — its filename filter was hardcoded to `stem_tool_*.js`. Same for
`scan_fn_in_tool_state`. Both now take `--pattern` (and `--baseline`), and both
**exit non-zero on an empty match**: a scan that matched nothing is a
configuration error, not a clean bill of health.

### 8b. The keyboard scanner's own blind spot

Aimed properly it reported 73 files and no findings. That zero did not survive
calibration against a synthetic known-bad file: `scan_mouse_only_controls` only
reports an onClick element that **already** carries a widget role or
`tabIndex >= 0`. A bare `<div onClick>` has neither, so it is skipped — and that
is the worse case, because it is not focusable, not announced, and not
activatable.

sel_hub had 35 such elements, **12 of them styled `cursor: pointer`**, i.e.
presented to the student as controls. All 12 read and confirmed interactive:

- **`safety.js` ×4** — topic cards in Safety & Boundaries. Clicking expands the
  topic *and* records that it was viewed, so keyboard users could neither read a
  safety topic nor register progress on one.
- **`emotions.js` ×4** — cards whose own visible text reads "Tap to reveal".
- **`mindfulness.js` ×3** — guided-step cards.
- **`orientations.js` ×1** — the eight plotted tradition nodes, the only route
  into their detail view, with no accessible name either.

Fixed with `role=button` + `tabIndex 0` + a key handler that **delegates to the
existing onClick**, so pointer and keyboard cannot drift into two
implementations of one action. The SVG `<g>` calls its handler directly instead,
because `SVGElement.click()` is not dependable.

### 8c. The inverse problem, which no scanner looks for

Rendering all 71 tools then surfaced it: **`teamwork.js` role cards were a
`role="button"` wrapping the real "That's Me" button.** Nested interactive
elements are invalid and assistive tech may never expose the inner control.
Rebuilt as a proper disclosure (plain container, two sibling controls,
`aria-expanded`/`aria-controls`). That inner button was also labelled **"Your
Team Role Profile"** — the heading of a different section further down the same
panel — which overrode its visible text for screen readers.

### 8d. A ReferenceError of my own

`check_free_vars`, also never aimed at sel_hub, flagged `setActiveStation` as
undeclared: mine, from §7d's "Show all N tools" button. The setter is
`setActiveStationId`. Clicking it while a Station was active would have thrown
and left the student stuck on the very empty grid the button exists to escape.

Worth recording *why the test did not catch it*: my guard asserted the
misspelled name, so it passed against the broken call. A source-text assertion
is only as good as the name it is given.

### 8e. AARON — a dead feature to decide on

`sel_tool_mindfulness.js` ~25512-25610 contains a **Mantras browser that no user
can reach**. Its content variable `mantrasContent` is assigned twice and never
read — it is absent from the 30-entry render list at ~26037 — and no tab id
`mantras` exists. Even if it were wired up, it reads `MANTRAS_PHRASES`, which is
**never declared anywhere in the repo**, so it would show "Mantras library
loading..." forever behind a `typeof` guard.

Its own copy advertises "200+ mantras/phrases … Thich Nhat Hanh, Om Mani Padme
Hum, Shema, Jesus Prayer", so somebody intended to ship a real multi-tradition
library. **Finish it or delete it — that is a content call, so I left it
untouched.** It is invisible to students either way.

### 8f. Clean on the rest

`check_keyless_map` 74 files / 1377 list sites / no keyless children;
`scan_fn_in_tool_state` 74 files / 0 sites; `scan_silent_announcer` 0 silent
tools; `scan_emoji_mojibake` clean over 667 files; `scan_window_key_listeners`
216 files / 0 unguarded. File counts quoted deliberately — they are the evidence
the scan actually looked.

Guard: `tests/sel_keyboard_reachability.test.js` renders all 71 tools and asserts
nothing styled clickable lacks a keyboard path, no interactive element nests
inside another, and every non-native `role=button` carries a tab stop. It also
guards itself against sweeping an empty set. Verified failing 2 tests against
the pre-fix files.

**Unrelated finding, outside SEL:** `scan_write_only_state` reports
`AlloFlowANTI.txt:18469 generationBatchType` as write-only with the setter called
5×. That is the canonical monolith, not mine to edit, and the scanner's own note
cites `mathFluencyActive` — a write-only hook whose caller was recording
fabricated CBM probe results. Worth a look.

---

## 9. 2026-08-23 CONTRAST PASS 2 — 98 → 25  (local, unpushed)

Picked the §6e backlog back up, starting by splitting it **by theme**. That was
the whole finding: **high contrast held 50 of the 98 warnings, and 36 of those
were below 1.5:1.** The mode that exists for people who cannot read low contrast
was the mode most likely to render invisible text.

### 9a. Colour helpers have roles, and the roles were being crossed

`_xxBg` is for surfaces, `_xxFg` for text, `_xxBd` for borders. In high contrast
the surface map sends accents to `#000000` and the text map sends them to
`#ffff00`, so picking the wrong one is not a shade-off — it is black text on a
black card.

- **Seven tools** (`sfbt`, `bigFeelings`, `behavioralActivation`, `bodyStory`,
  `sensoryRegulation`, `sleep`, `valuesCommittedAction`) had a shared card helper
  that takes an accent **hue** and uses it as **text**, while callers pre-mapped
  it through the **background** helper. Helpers now route the hue themselves,
  callers pass the raw hue, and the hues gained `_xx_FGH` entries.
- **`strengths`: one line, 26 failures.** `var bgDark = _strFg('#0f172a')` — the
  tool's root **surface** routed through the **foreground** map, so in high
  contrast the whole tool rendered `#ffff00` on `#ffff00`. The indirection
  through a variable is why a `background: _strFg(` scan never saw it.
- **`upstander`**: a card was half-migrated — the open state routed through
  `_upC`, the closed state kept a raw `#fffaf0` — under text that is
  `color:'inherit'`. So the shell's light text landed on a light card at 1.43:1,
  and high-contrast yellow at **1.03:1**.
- **`crewProtocols`, `orientations`, `sensoryRegulation`**: accents simply
  missing from the high-contrast foreground map, sitting just under AA on black
  (violet 3.69, red 4.35).

### 9b. The 988 footer was a light island in every tool that mounts it

`SelHub.renderResourceFooter` — the crisis-resources footer with the 988 and
Crisis Text Line numbers, mounted from **~14 call sites** — was hardcoded to a
light amber card with **no theme awareness at all**. Inside the dark tool shell
it was a light island, and in high contrast it stayed light while inherited text
went yellow: **1.03:1 on the one surface a student in crisis most needs to
read**.

It now picks its skin from theme flags the hub publishes at render time, so
every existing call site keeps working unchanged. Light surfaces surviving high
contrast across the hub: **11 → 1**.

### 9c. Accents that double as fills need an ink of their own

`voicedetective` and `emotions` use their accents as chip fills and left rules as
well as label text, so the hue cannot be lightened at source — lighten it for the
label and you lighten the chip the label sits on. Both now carry a
**foreground-only ink map** alongside their existing remap, consulted only from a
`color:` position. Each went 10 → 0.

### 9d. Where it stands

**98 → 25, no regressions.** `dev-tools/sel_contrast_baseline.json` re-baselined
from 98 to 25 so the ratchet holds the new floor.

The remaining 25 sit in eight tools at 2 to 4 nodes each — `friendship`,
`peersupport`, `quietQuestions`, `sociallab`, `conflicttheater`, `journal`,
`mindfulness`, `safety`, `strengths` — all accents in the **3.7 to 4.4 band**
against AA's 4.5. None is invisible; each needs the same ink treatment applied
tool by tool.

---

## 10. 2026-08-23 — SEL Hub contrast reaches zero  (local, unpushed)

**25 → 0.** `dev-tools/sel_contrast_baseline.json` re-cut to 0, so the ratchet
now holds the floor rather than a backlog.

### 10a. One more systematic defect in the tail

**115 sites across 16 tools** were written as:

```js
color: _xxFg(isActive) ? ACCENT : _xxFg('#94a3b8')
```

The remap helper is wrapped around the **condition** instead of the colour. It
looks fine and behaves fine — `_xxFg(true)` returns `true`, so the ternary still
picks the right branch — but **the selected-state colour never goes through the
remap at all**. Active tabs, chosen chips and completed steps kept their
light-mode hue on the dark shell and in high contrast.

Unwrapping the condition is behaviour-preserving; wrapping the true branch is
what was intended. **51 colours are now routed that never were.** Worst
offenders: `mindfulness` (31 sites), `zones` (20), `advocacy` (19), `journal` (14).

### 10b. The rest of the tail

- `friendship`, `peersupport`, `sociallab` use one `_xxC` map for surfaces **and**
  text, so an accent cannot be lightened for its label without lightening the
  chip it sits on. Each gained a **foreground-only ink map**, consulted only from
  a `color:` position.
- `conflicttheater`, `quietQuestions`, `strengths` had **no dark foreground map at
  all** — their `_xxFg` dark branch was still the identity. Added and wired.
- `journal` and `safety` needed their accent in the high-contrast map;
  `mindfulness` had six raw literals bypassing its helper.

### 10c. New gate — a crash class I caused twice

A theme helper is declared inside `render(ctx)` because it needs the theme, but
the colour data it remaps usually sits in a **module-scope array above that
point**. Routing one of those literals through the helper parses fine and throws
`ReferenceError` the moment the file loads, dropping the tool silently out of the
registry. `check_sel_render` only notices as **"71 tools" quietly becoming 70**.

`tests/sel_contrast_shell_regression.test.js` now checks every tool for a helper
called above its own definition. It **blanks comments first** — four files
explain the helper in prose that spells out `_coC('#hex')`, which a naive scan
reads as a call site — and carries a calibration case. Verified it catches the
real `strengths` bug at line 70.

### 10d. Where the whole contrast effort landed

| | warnings |
|---|---|
| Start (once the probe could see) | 287 nodes / 182 gate warnings |
| After the shared `tagStyle` + crisiscompanion fixes | 133 |
| After the dark foreground maps | 98 |
| After the high-contrast pass | 25 |
| **Now** | **0** |

Coverage is 14,196 text nodes graded per run, with 921 gradient-backed and 933
class-sourced colours reported as **ungraded rather than passing**.

---

## 11. 2026-08-23 — icon ties and a quiz answered "B" 24 times  (local, unpushed)

Two more input-free defects, both found by aiming an existing scanner somewhere
it had never been pointed.

### 11a. `civicaction` was answerable without reading

`dev-tools/scan_answer_position_bias.cjs` had its directory **and** filename
filter hardcoded to `stem_lab/stem_tool_*.js`, so passing another lab as an
argument was silently ignored — it described STEM while appearing to answer the
question asked. Third scanner with this defect. Now takes a directory and
`--pattern`, and exits non-zero on an empty match.

Aimed at `sel_hub`:

| tool | questions | worst slot |
|---|---|---|
| `civicaction` | 24, **all** authored `answer: 1` | **100%** |
| `community` | 37 | 62% |
| `selfadvocacy` | 12 | 58% |

**A student could score 100% on the civic quiz by choosing the second option 24
times without reading a word.** That silently inflates whatever a teacher reads
off the result.

Each bank now rotates its options by a deterministic per-question shift — the
pattern already used across `stem_lab`. Deterministic, not random: the bank must
be stable across renders, sessions, exports and tests, and two students
comparing notes should see the same paper. `selfadvocacy` marks its answer by
index so the index moves with the rotation; `community` marks it by string, so
only the order moves. True/False items are left alone.

Measured **after** rotation — the distribution a student actually meets:
`CIVIC_QUIZ` 100% → **25%** (a flat 6/6/6/6), `CULTURE_QUIZ` 62% → 30%,
`QUIZ_QUESTIONS` 58% → 42%.

`tests/sel_answer_position_bias.test.js` does not trust the static scanner: it
**executes** each bank with its de-biasing block, measures the real spread,
checks every answer still lies inside its own options (a rotation that drifts
from its index marks the *wrong* option correct — worse than the bias), and
carries a calibration case that fails if the block is not running.

### 11b. Five tools wore the same icon

In a 71-card grid the icon carries most of the scanning load, and nearly all of
it on mobile. **Five** tools wore the compass — also the Self-Direction section
icon — **three** wore the scales (also a section icon), and **three** the
speaking head.

Broken: compass → scroll / chart / sunrise / gem / briefcase; scales → abacus /
bridge / puzzle; speaking head kept by `selfAdvocacy`, with `social` → hugging
and `dearMan` → ladder. Both section icons are now worn only by their section,
and tools sharing a section icon fell 17 → 9.

Written as `\uXXXX` escape pairs like the rest of the file, so nothing depends on
typing an emoji correctly — variation selectors are exactly where that goes
wrong. Every replacement is emoji-presentation by default.

**AARON — ten two-way pairs remain, and which of a pair should move is taste,
not a defect, so I left them:** VIA Strengths / Sources of Strength ·
Sensory Regulation / Identity Support · Thought Record / Journal ·
Understanding Trauma / Body & Breath Reset · Body Story / Crisis Companion ·
Community & Culture / Culture Explorer · Land & Place / Life Transitions ·
Friendship / Peer Support · Growth Mindset / Executive Function ·
Social Skills Roleplay / Conflict Theater.

`tests/sel_hub_icon_uniqueness.test.js` decodes the escapes before comparing —
comparing escaped text would call every card unique and the suite vacuous —
forbids any three-way tie outright, and ratchets the two-way pairs and section
clashes so they can fall but never rise.

---

## 12. 2026-08-23 — six crashes waiting on stale saved state  (local, unpushed)

`check_find_deref` had never been aimed at `sel_hub`: its walk root was
`stem_lab` and nothing else, so a positional directory argument was accepted and
then ignored — the report described STEM whatever you asked for. **Fourth
scanner this session with that shape.** It now takes a directory, exits non-zero
when the walk finds no files, and its summary names the directory it actually
scanned instead of always claiming `stem_lab`.

Aimed at `sel_hub`, six `X.find(fn).prop` chains:

| file | expression |
|---|---|
| `advocacy:18004` | `sim.turns.find(...).partner` |
| `genogram:264` | `GENS.find(...).label` |
| `zones:35872`, `:35878` | `ZONES.find(...).color` |
| `zones:36540`, `:36544` | `ZONES.find(...).label` |

Every one sits behind a truthiness guard on the **id**, which is not the same
thing as a guard on the **lookup succeeding**. These tools persist their state,
so an id that no longer exists in its array — a renamed zone, a removed
generation, an old simulation turn — throws `TypeError` and takes the tool down
**for exactly the students who have used it most and carry the oldest saved
data**. Each now falls back: to the first zone for a colour, to a neutral word
for a label, to an empty object for the rest.

### Two things the guard test taught me

`tests/sel_find_deref_guard.test.js` works on the **AST**, not on text. My first
attempt used a regex and flagged eight files — it cannot tell
`(X.find(fn) || {}).prop` from `X.find(fn).prop`, because the guarded form still
contains the unguarded substring.

The AST version then reported a **seventh** site in `sociallab` that the scanner
had not. That one turned out to be `find(...)?.icon` — optional chaining, already
safe. The walk now skips optional member expressions, and the calibration case
covers all four shapes: unguarded, both `||` fallbacks, and `?.`.

### Also swept, clean

`check_aria_handler` (74 files, 2,167 string-attr sites),
`check_css_template_literals` (462 files, no stray backticks). Both quoted with
their file counts, because a count is the only evidence a scan looked at
anything.

---

## 13. 2026-08-23 — what a tool declares when it registers  (local, unpushed)

`check_tool_contract` scans all 216 tools repo-wide and reported **one
structural failure**. It was a SEL tool.

### 13a. A tool invisible to every static reader

`sel_tool_somaticreset.js` registered as `registerTool(TOOL_ID, {...})` — a
**variable**, not a literal. Every static tool in the repo reads registrations by
parsing that call: the contract check, the registry audit, the icon sweep, the
answer-bias scanner. A variable there makes the tool invisible to all of them.

Fixed to the literal `'somaticReset'`, keeping `TOOL_ID` for the state keys it
also serves. Repo-wide structural failures: **1 → 0.**

### 13b. Three tools shown to students by their raw id

The Station Builder picker resolves a tool's display name as
`name || label || id`. Three configs declared neither — they used `title`, which
nothing reads — so the picker showed **`peersupport`, `sociallab` and
`voicedetective`** rather than "Peer Support Coach", "Social Skills Roleplay"
and "Voice Detective". This is the tail of the old SELUX‑5 finding; the fallback
chain itself was fixed long ago, but these three still fell off the end of it.

Each now carries its hub-card name, so a tool is called the same thing wherever
it appears.

### 13c. A correction worth recording

I first believed **four** tools were affected and "fixed" all four. On checking,
`conflicttheater` already had a `name` and had never fallen through — my label
addition was redundant, and worse, it disagreed with the existing name
("Conflict Theater" vs "Conflict Theater (Beta)"), which would have left the tool
declaring two names for itself with only one of them ever displayed.

Its label is now identical to its `name`, and the guard asserts the general
invariant — **a config may not declare two different names** — rather than
hardcoding the four strings I happened to look at.

**AARON — small inconsistency to rule on:** the registration says "Conflict
Theater (Beta)" while the hub card says "Conflict Theater". Whether the card
should carry the Beta marker is a product call, so I left both as they are.

`tests/sel_registration_contract.test.js` covers the literal-id rule across all
71 tools, the no-raw-id rule at runtime, and the two-names invariant.

---

## 14. 2026-08-23 — two sweeps, mostly negative results  (local, unpushed)

Negative results are worth recording: they say where the hub is *not* broken, so
nobody re-audits it.

### 14a. Half-finished features: exactly one

Swept all 71 tools for the Mantras shape — a variable assigned a rendered element
and then never read, so the content is built and dropped. Ran it first by naming
convention, then with the name filter removed entirely.

**One occurrence: `mantrasContent` in `mindfulness`.** The hub does not have a
systemic half-finished-feature problem; it has this one, still awaiting your call
(§8e).

The check now lives in the find-deref suite rather than its own file, because
that suite already parses every SEL file with acorn — splitting them would parse
all 71 twice for nothing. Its walk carries the parent node, which is what lets it
tell a *read* from an assignment target, an object key or a member property; a
text scan cannot. Calibrated both ways, and it pins the known exception to
exactly one name, so if Mantras is ever finished the test says so rather than
going quietly green.

### 14b. "Clear my SEL data" — checked, and correct

`alloflow_student_artifacts` does not match the clear function's key scan
(`/^(alloflow_sel_|alloSel|crisisCompanion\.)/`), which looked like a leak: SEL
Share Packets living on after the button claims to have removed them.

It is not. That key is a **shared cross-app registry** — AlloHaven, export,
Poet Tree and Story Forge all read it — so wiping it wholesale would delete a
student's work from other tools. The clear instead filters the registry state for
`source === 'sel_hub'`, and the effect that owns the key writes the filtered list
back. Both SEL artifact-creation sites do carry that marker, so the filter
catches them.

Correct as written. **Third time this round that checking before changing
prevented a wrong fix** — the other two were a "dead" icon tie that was really
taste, and a fourth tool I "fixed" that had never been broken (§13c).

### 14c. AARON — shared-device leakage between students

Seven localStorage keys are **not scoped to a student**:

```
alloflow_sel_snapshots          alloflow_sel_streak
alloflow_sel_station_progress   alloflow_sel_tool_usage
alloflow_sel_stations           alloflow_student_artifacts
alloSelVoiceDetective
```

On a shared device — a classroom Chromebook, a kiosk — the next student sees the
previous one's saved SEL work, streak and tool history. `crisiscompanion` is the
exception: SEL‑PRIV‑2 gave it a session+codename namespace via `ccKey()`, and
that is the pattern the rest would follow.

**I have not changed these**, because it is not a mechanical fix:

1. **What identity scopes the key** — session code, codename, profile? `ccKey()`
   chose session+codename; whether that is right for streaks and stations is a
   product question.
2. **Migration.** Re-keying orphans every student's existing saved work unless a
   one-time migration moves it, and a botched migration loses journals.
3. **Which keys *should* stay shared.** `alloflow_sel_stations` is
   teacher-authored configuration, and `alloflow_student_artifacts` is the
   cross-app registry above. Both are arguably device-level on purpose.

This is the remaining half of SEL‑PRIV‑2, and it needs your call on all three
before it is safe to touch.

---

## 15. 2026-08-23 — 47 tab presses to reach the first tool  (local, unpushed)

Measured the keyboard journey through the rendered catalog rather than guessing
at it:

| | |
|---|---|
| total tab stops on the page | **117** |
| stops before the first tool card | **46** |
| tool cards (each its own stop) | 71 |
| skip links | **0** |

So a keyboard or switch user pressed Tab **47 times** before reaching a single
tool, then up to 70 more to cross the grid.

The 46 are not padding. They are the quick actions, four teacher launch plans,
the search box, eleven "I need…" chips, ten category filters, eight pathways and
the station builder — every one a real control someone put there deliberately.
The fix is therefore not fewer stops; it is a documented way past them. That is
WCAG 2.4.1, Bypass Blocks, and it needs no design decision.

### What changed

A **"Skip to the tool list"** control is now the first thing in the catalog body
— tab stop **4**, straight after the three header buttons. Reaching the tools
costs 4 presses instead of 47.

It is a `button`, not an anchor, on purpose: this panel is a modal surface inside
an SPA and a `#hash` target would change the URL under the host app. It moves
focus to `#sel-tool-grid` (`tabIndex: -1`, so the grid can receive focus without
becoming a tab stop of its own), scrolls it into view, and announces where you
landed together with the current result summary — "Jumped to the tool list.
13 tools of 71 match…".

Visually hidden until focused, the conventional treatment, so nothing changes for
pointer users.

### Guard

`tests/sel_hub_bypass_block.test.js` renders the catalog and asserts the skip
control exists, sits among the first few stops, points at a target that can
actually take focus, and — the one that matters — that **the distance it skips is
still large**. A skip link that drifts down next to the grid saves nothing while
still passing a naive "does it exist" check.

---

## 16. 2026-08-23 — the badge you had three seconds to read  (local, unpushed)

Nine tools celebrated a badge with the same popup, and the same
`setTimeout(..., 3000)` took it away again whether or not you had finished.

Three seconds is the whole interaction for a student who reads slowly, listens
to it through a screen reader, or drives the page with a switch. It is WCAG
2.2.1, Timing Adjustable, and it needed no design decision to fix — the popup
already had somewhere to go, it just left on its own schedule.

The nine: `coping`, `emotions`, `journal`, `mindfulness`, `perspective`,
`safety`, `social`, `teamwork`, `zones`.

`voicedetective` also has a 3000ms timer and is **not** in that list — it turns
over a game round, which is a different thing and was left alone.

### What the popup was missing besides the clock

Backdrop click was the only way to close it. There was no `role`, so nothing
announced it as a dialog; no accessible name; no Escape; and nothing focusable
inside, so a keyboard user could not act on it at all — they could only wait for
it to disappear.

Each of the nine now has `role="alertdialog"`, `aria-modal="true"`, a name
("Badge earned: …"), an autofocused **Nice** button, and Escape.

### Declaring modality means honouring it

`aria-modal="true"` tells assistive tech the rest of the page is inert. If Tab
still walks out of the dialog, that promise is false in the worst way: a sighted
keyboard user lands on controls their screen reader has just been told do not
exist. So the overlay's key handler also cycles Tab within itself. These dialogs
hold exactly one focusable control, so this needs no ref and no effect — with one
control, first and last are the same element and Tab simply holds focus there.

### Four tools were already doing it better

Searching for the timer found nine tools. Asserting the *contract* found four
more with badge popups and no timer — `advocacy`, `community`, `conflict`,
`decisions` — which turned out to have the best dialog implementation in the
repo: `role="dialog"`, `aria-labelledby` pointing at the visible title, a close
button, a real focus trap with Tab cycling, and focus restoration on close.

They failed the first draft of the guard, which had demanded `role="alertdialog"`
and a literal `aria-label`. That was the guard being wrong, not the tools. It now
asserts the properties that matter — announced as a dialog, modal, named,
closable from the keyboard — and accepts either spelling.

**That delta is now closed.** Those four restore focus to whatever opened the
dialog; the nine originally did not, so focus fell to the body and a student who
pressed Escape restarted from the top of the page. The nine now use the same
ref/effect pattern: capture `document.activeElement` when the dialog opens,
release it in the effect cleanup, deferred a tick.

Closing it required **removing the `autoFocus`** added earlier in this section.
`autoFocus` fires during React's commit, *before* effect bodies run, so the
effect captured the dialog's own dismiss button as the "opener" and then restored
focus to an element that no longer existed. Measured: focus returned to the
opener in **0 of 9** tools. Initial focus now happens inside the same effect,
after the capture, which is exactly why the four reference tools never used
`autoFocus` either. Measured again after the change: **9 of 9**, with a control
assertion that focus really did enter the dialog first — otherwise "it came back"
proves nothing.

### Guard

`tests/sel_badge_popup_dialog.test.js`, 40 tests. It **mounts** each tool with a
real badge in state and dispatches real keyboard events, rather than grepping
source — a source scan passes happily on a dialog that never appears.

Calibrated both ways before being trusted: disabling the Tab branch in `coping`
turns it red, restoring it turns it green; reintroducing the 3000ms timer in
`zones` turns it red; disabling focus restoration in `coping` turns it red.

Two things that would have made it lie:

- **jsdom does not move focus on Tab.** "Focus was still inside the dialog
  afterwards" is true even with no handler at all, so that assertion alone was
  worthless. The honest signal is whether the handler *claimed* the event
  (`preventDefault`), paired with a control key it must **not** claim.
- **A second JSDOM is not the focused document,** so `element.focus()` silently
  does nothing inside it. The first draft stood one up next to the one vitest
  already provides and read as nine failures that were not real.

---

## 17. 2026-08-25 — pedagogy, visuals, UI/UX pass across the hub  (local, unpushed)

Measured first, then fixed. Five things shipped; four things are yours to decide.

### 17a. FIXED — 54 tab bars said "use the arrow keys" and ignored them

66 tool tab bars declare `role="tablist"` / `role="tab"`. A screen reader
announces that as "use the arrow keys to switch tabs". Only 12 handled a key.
Rather than patch 54 tools, the host shell now listens once, on the wrapper every
tool renders inside (`sel_hub_module.js` `_tablistKeyNav`, wired on the dark-shell
div in `renderTool` and on the standard-shell `section`): Left/Right (Up/Down for
a vertical list) move focus between the tabs of the focused tab's OWN tablist,
wrapping; Home/End jump to the ends. Focus moves; activation stays on Enter/Space
(manual activation), so arrowing past a tab never fires that tab's onClick side
effects (stopping a breathing timer, playing a sound, saving). A tool that already
handles its own keys calls `preventDefault` first and the shell stays out of it.

Guard: `tests/sel_tablist_arrow_keys.test.js` mounts five tools through the REAL
`renderTool` and dispatches real key events, with a calibration case that mounts
the bare tool (no shell) and asserts the arrows do nothing there. Passed first
run; the calibration proves the shell is the mechanism, not the tools.

### 17b. FIXED — the mute button was announced as "3/12"

Ten tools share a tab-bar toolbar with a sound toggle and a badge-panel toggle.
In four (coping, emotions, mindfulness, perspective) BOTH buttons carried the
badge-count label, so the sound toggle read "trophy 3/12". In social both read
"View badges". In advocacy and conflict the sound toggle had no name at all;
decisions said "Toggle sound" / "Toggle panel"; teamwork and zones were close but
inconsistent. Every sound toggle is now "Sound effects" with `aria-pressed`;
every badge toggle is "N/M badges earned" with `aria-expanded`.

Searching the SYMPTOM (a trophy in a label) found 4 tools. Asserting the CONTRACT
in the guard found 10. `tests/sel_toolbar_toggle_names.test.js` asserts the
contract (a name about sound plus exposed state; a badge name carrying the total
plus expanded state) and accepts either legitimate spelling.

### 17c. FIXED — the Culture Quiz taught nothing

`cultureexplorer` ran a 30-question quiz (10 per band) whose only feedback was a
toast: "Correct!" or "The answer was: X". A student who missed "Which city sits on
two continents?" learned the word "Istanbul" and nothing else. Every question now
carries a one-line `why` (the Bosphorus, Fatima al-Fihri, Madjedbebe, the 1988
congressional resolution and the historians' debate, SASL as the 12th language in
2023) rendered in a `role="status"` panel under the options after answering, so a
screen reader hears it without focus leaving the options. Elementary lines are
written at elementary reading level. The answer-position rotation IIFE mutates in
place, so the new field survives it. Facts worth a second pair of eyes are the
Haudenosaunee line (deliberately hedged) and the Afrobeats line (Lagos, with Accra
acknowledged).

### 17d. FIXED — 10px body copy in the Tailwind-styled tools

Sub-12px text is common across the hub (2,717 declarations; 11px is the working
convention for secondary text and was left alone). Four Tailwind-styled tools,
though, used `text-[10px]` for actual body copy: tips, descriptions, origins,
badge descriptions, quiz metadata. Lifted `text-[9|10|11px]` to `text-xs` (12px)
in civicaction (66), ethicalreasoning (63), cultureexplorer (43), restorativecircle
(30) and selfadvocacy (3): 205 sites. The numeric `fontSize: 10` sites in the
inline-styled tools are mostly uppercase eyebrow labels and were not touched.

### 17e. FIXED — 96 buttons whose visible text was not in their accessible name

WCAG 2.5.3, Label in Name: 142 `<button>`s carried an aria-label that did not
contain their visible text ("Print or save as PDF" over "Print / Save as PDF";
"Read aloud" over "I learned something new" in safety; "Save button" over "Save
Check-In"). A voice-control user says what they see. Where the visible text is a
full phrase (three or more words) the aria-label was removed and the button is
named by its content: 96 sites in 45 tools. The 46 that remain have short visible
text ("Favorites", "Decide", "Back") where the label adds real context; those want
a per-site rewrite that STARTS with the visible text, not a bulk edit.

### 17f. AARON — four catalog tools carry ~2 MB of content no student can see

`anxietytoolkit`, `bigfeelings`, `stressbucket` and `griefloss` each hold a
"narrative library": 1,140 / 1,339 / 1,320 / 1,236 scenario objects (id, title,
narrative[], lesson) across 75 / 90 / 89 / 83 arrays named `*_NARRATIVES_N`.
**Not one of the 337 arrays is referenced anywhere after its declaration.** They
are 520 / 460 / 493 / 515 KB of each file, roughly 83 to 89 percent of the tool,
parsed on every load and never rendered. The prose is also not fit to render:
85 to 97 percent of narrative lines are telegraphic fragments of the shape
"I tell water-anxious: adult lessons." and the lessons read like
"Disability isolates; disability community provides advocacy connection."
Options: delete the libraries (fastest load, no student-visible change), or
decide they are a feature and have them rewritten before anything reads them.
This is a content decision, so nothing was edited.

### 17g. AARON — grade-band placement vs reading level

32 of 71 tools never read the grade band. For most that is fine, but nine are
marked elementary-eligible while their student-facing prose measures at a
secondary reading level with no band branching to soften it (median
Flesch-Kincaid grade of strings 60+ chars): sensoryregulation (3-12, FK 9.6),
genogram (5-12, 11.3), stressbucket (5-12, 11.2), bigfeelings (5-12, 11.1),
landplace (5-12, 10.2), careercompass (5-12, 9.6), viastrengths (5-12, 8.8),
windowoftolerance (5-12, 8.6), behavioralactivation (5-12, 8.5). The clinical
vocabulary ("Dunn's framework: seeker, avoider, sensitive, registration") is
appropriate for the tool and wrong for a 3rd grader. Either raise
`recommendedRange` on those cards to 6-12 / 8-12, or add a band branch. Probe:
this session's scratchpad `readability.cjs`.

### 17h. Smaller notes

- `ctx.callGemini` is `null` when the host omits it, and 35 call sites in 18
  tools call it unguarded (every one has a `.catch`, which cannot catch a
  synchronous TypeError). In practice the host always passes a function (the
  ANTI fallback returns an empty string), so this only bites a host that drops
  the prop. Documented, not changed.
- The a11y audit JSON under `a11y-audit/` was OneDrive-locked during this pass;
  `check_sel_a11y.cjs --write <path>` writes elsewhere and still exits on its
  own verdict. Both gates were run that way.
- Line endings: several tool files were CRLF on disk (repo policy is LF). Edit
  scripts normalised the files they touched; the mirror copies match byte for
  byte.

### 17i. Verification

Full SEL suite after the pass: 78 files, 1,096 tests passing, 2 skipped, 0
failing (the first full run showed 6 reds: one OneDrive-locked mirror copy and
five source-text tests that had pinned the OLD label spellings; each of those
now asserts the new contract, not the spelling). `check_sel_render` 71/71;
`check_sel_a11y` 0 errors / 0 warnings, 14,160 text nodes graded. Every changed
`sel_hub` file is byte-identical with its `desktop/web-app/public/sel_hub`
mirror. New guards: `sel_tablist_arrow_keys` (mounted, real keys, bare-mount
calibration), `sel_toolbar_toggle_names` (contract, either spelling),
`sel_cultureexplorer_quiz_explanations` (executes the bank; renders before and
after an answer). Run any suspect test alone before believing a failure from a
contended run; that pattern faked one failure again this pass.
