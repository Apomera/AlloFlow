# Arc City

> **Current implementation status (2026-07-22):** Arc City now ships 13 campaign
> levels across seven function families, transformation matching, slope gates, an
> adaptive Gauntlet, teacher summaries, versioned save migration, and **Circuit
> Clash** (solo vs CPU or two-player hot-seat). Circuit Clash has a complete SVG
> tactical view plus an optional lifecycle-managed Three.js peer projection. This

> **Design snapshot note (2026-07-09):** This is a planning/design artifact for a proposed or staged STEM Lab tool. Verify the current `stem_lab/stem_tool_arccity.js`, pilot scope, and accessibility/gameplay implementation before treating v1 target language or section references as shipped behavior.

> STEM Lab tool · `id: arccity` · file `stem_lab/stem_tool_arccity.js` · single hand-maintained module, no build step · v1 target: King Middle 2026–2027 pilot (8th grade)

## Executive Summary

**Arc City** is a cooperative, turn-based math game where **the function is the weapon**. A neon synthwave city has gone dark; the glowing floor grid *is* the Cartesian plane. Players re-light blacked-out "nodes" (buildings) by firing a light-beam that travels **along a function curve they author** — a line to aim, a parabola to arc over a wall, a sine wave to weave staggered gates. Straight shots are usually blocked, so you cannot win without producing — and reasoning about — the right function.

**The core insight — and the design's single hard gate — is that the math is the mechanic, not a skin.** Every win condition is constructed so that success requires a *model of the function*, not slider-fishing or visual eyeballing. The learning-science section names "any feature solvable by tweaking sliders without a function model" as *a bug, not content*; §3 and §10 below specify the exact mechanics (hidden-preview prediction, no-ghost independent solves, predict-then-fire) that make that gate enforceable instead of aspirational.

**Audience:** roughly middle school, calibrated to the 8th-grade pilot band, with scaffolding up and down. **UDL-first**: keyboard-only and screen-reader play are *peer ways to play the same game*, not labeled fallbacks. **Cooperative, never competitive.** **Turn-based, never timed** (think-time is both a UDL accommodation and the anti-slot-machine scoring goal).

**v1 pilot scope (decisive):** Tutorial → Line District → Arc Heights, plus a **value-match-only Relay** (continuity), all in 2D SVG, no Three.js, 2 co-op seats max, Relay role mode only. Sine / Exp-Log / Polynomial / Transformations / Parametric and the C¹ (slope-match) relay are **post-pilot phases**, built behind the same data shapes but not shipped or tested in v1. See §10.

---

## 1. Concept & Pitch

- **Fiction (one screen, skippable, ≤40 words):** *"Arc City went dark. The grid still hums — its power runs along curves, not straight wires. You're a Lightwright. Author the right function and your beam threads the streets to wake each block. Re-light the city together."* No cutscenes, no villain. Dark nodes are "asleep," not hostile.
- **Core loop:** Rotate the firing plane (azimuth) to face a target → author a 2D function inside that plane → **Fire** → the beam threads gates/clears walls and lights nodes, or dies at an obstacle and *shows you why*. The board (incoming "space-invader" formations of dark nodes) only advances on a completed turn.
- **Cooperative & turn-based by design.** The city re-lights *together*; there is no per-player score, no PvP, no timer, no lives. A failed shot is **non-consuming**: it pauses, shows the gap, invites a tweak.
- **The headline social mechanic — the piecewise Relay:** a long beam path is split across players; the pieces must meet at a junction with **matching height (continuity)** and, on later tiers, **matching angle (no visible kink)** or the beam dies at the seam. The failure *is* the lesson.

---

## 2. Core Mechanics & The Turn Loop

### 2.1 The 2.5D firing model — graph in true 2D, target in pseudo-3D

- You **rotate the firing plane** in 3D (azimuth) to choose which slice of the city you fire into, then **graph a normal 2D function** inside that plane. This keeps the function math approachable (always 2D `y = f(x)`) while targeting feels spatial. Parametric `(x(t), y(t), z(t))` is the Expert tier only.
- **Hard invariant (resolves the projection contradiction — pedagogical-integrity + technical critics):** the panel in which the learner reads coordinates and the authored curve is **always drawn orthographically, with zero shear**, true readable axes, and pixel-identical to the funcgrapher/coordgrid rendering of the same curve. *All* perspective/depth shear is confined to a **separate, non-interactive city backdrop and incoming-formation sprite layer that carries no graph the student must read.* If azimuth rotation visually skews the active plane during the rotate animation, it **snaps back to orthographic before authoring resumes.** This is a §6 visual non-negotiable and a §10 motion-budget rule; it cannot be skinned away. (Concreteness-fading research requires the concrete representation be *veridical*; a sheared parabola would teach a distorted graph schema.)

### 2.2 Aiming is parameter-space, not pointer-space

Targeting is **always achieved by changing numbers** (the parameters and the azimuth), never by a mandatory "click-and-drag-a-handle." This is the load-bearing decision that makes keyboard-only and screen-reader play a *true equal* (see §8) and directly reinforces the north star.

### 2.3 The turn loop (think-time guaranteed)

1. On your turn, set azimuth + author the curve (drag, type, or slider — §4).
2. Press **Fire**. The board computes the deterministic outcome synchronously, then animates the beam.
3. Nodes light, or the beam dies at an obstacle (marked, with the math reason). The formation advances **only** on a resolved turn.
4. Hand off (co-op) or continue (solo). Nothing is timed; the world is frozen between turns.

### 2.4 The anti-slider-fishing gate (resolves the #1 critical pedagogical finding)

The north-star claim is only true if the game can *detect* the difference between "has a model" and "eyeballed it." We make at least one win condition unreachable by eyeballing:

1. **Hidden-preview prediction on guided/independent tiers.** On the two higher tiers, the **live curve preview is hidden until after Fire** — you commit the equation/params, *then* see where the beam went. This forces the prediction that is the operative cognitive act. The drag-with-live-preview mode is fine for the novice **completion** tier but is **not** a path to an "independent" clean solve.
2. **No ghost-target overlay on counted solves.** The ghost-target curve is a teacher-enableable scaffold, but **any solve that counts as "independent" or toward unlocking is computed with the ghost disabled.** The teacher panel states plainly: *"ghost-assisted solves are not counted as independent."*
3. **Predict-then-fire micro-prompt.** Occasionally, before the beam animates, a one-tap prompt ("Will this clear the wall? yes / no") is logged *separately* as a cheap, honest signal the player had a model. Never punitive, never part of score.

These three together are the **operational definition of "understanding the function"** the design rests on (closes the completeness critic's "MISSING: undetectable claim" gap).

---

## 3. The Function → Mechanic Map

Read the table as a contract: *left is the math object; "you cannot beat the obstacle without it" is the mechanic; the BUILDS/EXPOSES split is the integrity spine.* Feedback copy may only ever claim items in the **BUILDS** column.

| Function family | In-game mechanic | Player manipulates | Math made *felt* | Genuinely **BUILDS** | Only **EXPOSES** (pre-formal) |
|---|---|---|---|---|---|
| **Line** `y = mx + b` | **Aim beam** — straight ray to a node with clear sight. | Drag endpoint or set `m`, `b`. | Slope = aim/steepness; intercept = where you stand. | Slope as rate; intercept meaning; reading `m,b` off a line; point-on-line test. | — |
| **Parabola** `y = a(x−h)² + k` | **Arc over a wall** — lob the beam over a blocker onto the node behind. | Drag vertex (`h,k`); set `a` (width/direction). | Vertex = apex; `a` sign = opens up/down; `|a|` = arc tightness. | Vertex-form parameters → transformation; where the max/min is and why; symmetry about `x=h`. | Roots as "landing points"; apex is an extremum (word *maximum* shown, *optimization* not claimed). |
| **Sine** `y = a·sin(bx + c) + k` | **Weave the gates** — staggered slots only a wave threads. | `a` amplitude; `b` frequency/period; `c` phase; **`k` midline**. | Period `= 2π/b` felt as "how often the beam returns"; phase slides the pattern; midline raises the whole wave. | Amplitude/period/phase as independent controls; `period = 2π/b`; **midline as vertical center**; periodicity. | Trig identities; radian-vs-degree rigor (degree/radian toggle rendered but **not** assessed); modeling real periodic data. |
| **Exp / Log** `y = a·bˣ + k` / `y = a·log(\|x−h\|+ε) + k` | **Late break / asymptote sniper** — node behind a barrier the beam approaches but never crosses. | `b` growth/decay; `k` asymptote line; `a` scale. | Asymptote = a force-field the beam can't touch; "slow then explosive." | Growth vs. decay (`b>1` vs `0<b<1`); horizontal asymptote as `y=k`; exp ≠ steep line. | Logs as inverses (log is **explore-only**, ungated until Expert); `e` / natural log (preset, not required). |
| **Polynomial** (cubic+) | **Thread the dense field** — needs a curve that bends more than once. | **Drag turning points directly** (see fix below); leading-coefficient for end-behavior. | "One bend isn't enough" — degree = how many wiggles. | End behavior from leading term; turning-points ↔ degree intuition. | Factoring; roots/multiplicity; formal degree theorem (never stated as a tested fact). |
| **Transformations** `a·g(b(x−h)) + k` on a fixed parent `g` | **Re-target a known curve** — shift/stretch/flip a handed curve onto a new node. | Four sliders `h, k, a, b`. | "Same shape, new place." | Effect of `+k`, `(x−h)`, `−` sign, stretch factors on *any* graph; that they compose. | Function-composition formalism; inverse functions. |
| **Piecewise (Co-op Relay)** | **Relay the beam** — pieces must meet at a junction. | Each player owns one sub-domain segment. | Continuity = "the beam doesn't teleport"; *no-kink* = "the beam doesn't shatter." | Piecewise definition over intervals; **continuity as value-matching at a boundary**. | Formal limits/ε-δ; the *word* "differentiable." Angle-matching is **exposed** as "no kink," never taught as a theorem. |

### 3.1 Family-authoring fixes folded in

- **Polynomial gets a felt handle (fun critic).** Instead of opaque coefficient roulette, the player **drags where they want each bend (turning point)** and the module back-solves a polynomial through them; the degree *emerges* from how many bends were placed. (If back-solving a particular config is intractable, Polynomial Maze degrades to an **optional explore-only side area** like the log world, since it is above-grade for the pilot anyway.)
- **Sine gets tractable phase/period (fun critic).** `b` snaps to values yielding whole-number periods ("every 2 / 4 / 6 units"); a **crest-grabber drag handle** lets the player drag a peak onto a gate and back-solves `c` (phase is spatial, not a number hunt); the gate's required `(x,y)` target shows as a ghost dot on scaffold tiers; `ε` is generous on Sine Boulevard; and raw 3-parameter sine sits behind the explicit "high-school reach" label — **the 8th-grade core path does not hit it.**

### 3.2 The derivative, smuggled in honestly (resolves the "felt-derivative" major finding)

Angled **slope-gates** require a specific slope at the pass-through point ("this gate is tilted — your beam came in flat; re-aim so it's climbing as it passes through"). **The slope checked, the tangent-tick drawn, and the slope announced to the screen reader are all the *same* exact analytic derivative `f'(g)`**, computed via central difference on the typed family function (funcgrapher's `evalDeriv` idiom: `(f(g+h) − f(g−h)) / 2h`, h≈1e-3). We do **not** use the crude adjacent-sample secant for slope checks (that average rate-of-change can reward a beam whose true instantaneous slope is wrong near curvy regions — teaching a felt-*wrong* intuition). The sample-walk is reserved only for value-crossing/collision, where average-vs-instantaneous doesn't matter. Copy is "slope at the point where the beam passes," never "felt derivative"; the embodied-cognition rationale is flagged as promising-not-settled (§7).

---

## 4. Authoring the Curve: One Model, Three Editors, Three Views

**Decision (resolves the canonical-model contradiction across all sections):** Arc City represents every curve as a **typed parameter object**, *not* free-typed text. This is **net-new code**, not "funcgrapher reuse" — verified: funcgrapher stores `{type, a, b, c}` with quadratic in **standard form** `a·x² + b·x + c` (no `h`, no `k`). Arc City borrows the *idiom* (a `switch` + numerical central-difference derivative), not the struct.

### 4.1 The single canonical params object (source of truth all sections cite by exact field name)

```js
// ctx.toolData._arccity.beam
{ family: 'line'|'parabola'|'sine'|'exp'|'log'|'poly'|'parametric'|'custom',
  params: {
    line:      { m, b },
    parabola:  { a, h, k },
    sine:      { a, b, c, k },          // k = midline (makes the HSF-IF.C.7e midline claim honest)
    exp:       { a, b, k },
    log:       { a, h, k },
    poly:      { coeffs:[...] },         // authored via turning-point drag (§3.1)
    parametric:{ fx, fy, fz }            // Expert only
  }[family],
  tier: 'completion'|'guided'|'independent'
}
```

Each family is a pure numeric lambda (`(x)=>a*(x-h)**2+k`, `(x)=>a*Math.sin(b*x+c)+k`, etc.). **The dominant code path never compiles a string at all.**

### 4.2 Three editors, three views (UDL multiple representations, live-linked)

One source of truth (`beam.params`); **three editors write, three views read**:

- **Drag** a handle → mutates params → equation + word-readback update (novice/completion tier).
- **Type** the equation → parses *into* the same params when it matches a known family; else falls into opaque compiled-fn mode (curve renders read-only, dragging disabled — we can't invert arbitrary text, an honest scope boundary).
- **Slider-nudge** a parameter → all three update (keyboard/SR).

**Co-highlighting is mandatory** (representational-fluency research warns against *unlinked* representations): dragging the vertex pulses `h` and `k` in the equation; editing `b` in `sin(bx)` compresses the period with a synchronized highlight. Drag mode is **not** "easy mode" — it is the concrete end of one continuum, drivable in both directions, never conflated with skill level. This is **representational fluency offered to everyone, explicitly NOT "visual vs. symbolic learning styles"** (VAK is rejected, §7).

### 4.3 Equation-typing safety (corrects the eval-gate framing)

The typed-equation path uses an **extended allowlist sanitizer**: lowercase; `^`→`**`; substitute allowed tokens `sin cos tan abs sqrt exp log pi e`→`Math.*`; strip to a whitelist that now includes `Math.` and the variable; reject any alpha residue; then `new Function('x','return '+sanitized)` and probe at several points (including non-integers, since trig has integer zeros), rejecting NaN/Infinity. Note coordgrid's stripper (`/[^0-9.+\-*/()xX^ ]/g`) **deletes the letters of `sin/exp/log`** and is therefore unusable for Arc City's families — this is why the typed path needs the extended sanitizer, and why the **dominant path is typed-param lambdas with no string compilation**.

**Honest gate framing (corrects the critic):** `check_eval.cjs` flags *every* `new Function` site unconditionally and is **informational-only** in `verify_all.cjs` (it only blocks under `--strict`, which `verify_all` does not pass). We do **not** claim the gate "permits" our form. Instead we **minimize `new Function` to a single site** (the typed-equation fallback) with an inline comment justifying its safety, so the finding count stays at 1 and is trivially triageable if `--strict` is ever promoted to a required status check.

---

## 5. Level / World Progression & Standards

### 5.1 Gating rewards *completion*, not cleanliness (resolves the progression-wall major finding)

**Worlds unlock on COMPLETION** (re-lit the nodes, any number of shots/tweaks/failed shots). "Clean solve" (fewest tweaks, no failed shots) is reserved **purely for badges and optional bonus stars — it never gates content.** This preserves productive failure (a kid who explores messily still advances and still lights the city) and stops the struggling/exploring kid from grinding the same world while the slick kid races ahead. If a modeling demonstration is wanted at a boundary, it is "complete 3 puzzles," not "cleanly." A visible, non-punishing progress bar always shows forward motion.

### 5.2 The faded-guidance ramp wired into every family (resolves the worked-example gap)

Each function family runs the four-stage evidence-based ramp (the §7 learning-science spine, now actually implemented), with a **one-knob-at-a-time on-ramp** (fun critic's #1 fix) before any multi-parameter puzzle:

| Stage | What the player does | Role |
|---|---|---|
| **Worked** | A solved shot **replays**: beam animates along a known-good curve, each parameter's effect narrated/announced (doubles as a screen-reader demo). | Worked example (lowest load) |
| **Completion** | Curve mostly placed; **one** parameter blank; player supplies it (live preview allowed). | Completion problem |
| **Guided** | Player authors with constraints visible; **preview hidden until Fire** (§2.4). | Faded guidance |
| **Independent** | Author from spec, no scaffold, no ghost, no preview-until-fire. | Transfer |

The **isolation on-ramp:** Tutorial = drag-only line where only slope moves (`b` locked), then only intercept (`m` locked). Line District L1 = completion problem where `h,k` are pre-placed and the kid supplies only `a`. Every parameter except the one being taught is **locked** until 2–3 single-variable puzzles per family are cleared. This is the single highest-leverage fun fix.

### 5.3 Worlds, prerequisites, scaling (full vision; v1 cut in §10)

| # | World | Teaches | Prereq | Scaling within world |
|---|---|---|---|---|
| 0 | **Tutorial Grid** ("First Light") | Firing plane; drag↔equation binding; one straight shot. | None | 1 node, no obstacles, snap to integers. |
| 1 | **Line District** | `y=mx+b`; aim, slope, intercept. | Tutorial | off-integer targets → narrow gates → first slope-gate → moving rail. |
| 2 | **Arc Heights** | Parabola vertex form; lob over walls. | Complete Line | rising walls → wall + descent slope-gate → graze-the-wall bonus. |
| 3 | **Sine Boulevard** | Amplitude/period/phase/midline; weave. | Complete Arc Heights | 2 gates → 4 alternating → phase-locked first gate → amplitude/midline corridor. |
| 4 | **The Relay (Co-op Hub)** | Piecewise; continuity (+ later, no-kink). | Complete Sine **and** Arc Heights (need ≥2 families to splice) | value-match → value+angle → mixed-family splice (line→parabola). Solo-playable. |
| 5 | **Exponent Reach** | Exp/log; asymptotes. | Complete Sine | decay barrier → asymptote-skim → growth past a late gate → log = ungated explore-only. |
| 6 | **Polynomial Maze** | Multi-turn threading; end behavior. | Complete Exponent Reach | one bend → two bends → dense field. *(Optional/explore-only per §3.1.)* |
| 7 | **Re-Target Yards** (Transformations) | Apply `h,k,a,b` to a given parent. | Complete **any three** prior families | translate → +flip → +stretch → "match the ghost curve." |
| 8 | **Parametric Spire** (Expert) | 3D parametric; rotate plane *and* author depth. | Complete World 7 (optional enrichment) | plane-rotation aiming → 3D line → helix/Lissajous. **Enrichment, not a standard.** |

**Interleaving (learning-science):** formations are **hand-authored to interleave** function families across a session (a parabola wall, then a sine weave, then a line under new constraints), not blocked ten-of-a-kind. Interleaving is an **explicit authoring constraint on the level sequence**, owned by the Level-Content workflow (§9.6), not a side-effect of a difficulty scalar.

### 5.4 Standards — surfaced *only* in a teacher-facing panel, trimmed to honesty

Shown verbatim, non-removable:
> *Arc City gives students repeated, scaffolded practice with the ideas below. It does not assess or certify mastery of any standard. Use in-game progress as one piece of formative evidence alongside your own observation and other measures.*

Every entry uses **"practices / connects to,"** never *meets / measures / masters*. The table is **trimmed so no citation includes an EXPOSES-only skill** (resolves the standards-overclaim major finding):

| World | Practices / connects to (CCSS) | Trimmed claim |
|---|---|---|
| Line | **8.F.B.4**, **8.EE.B.5–6** | slope & intercept only. *(8.F.A.3 linear-vs-nonlinear moved to a cross-world claim — it can only be practiced once a nonlinear world also exists.)* |
| Parabola | **HSF-IF.C.7a**, **HSF-BF.B.3** | vertex-form parameter manipulation. |
| Sine | **HSF-IF.C.7e**, **HSF-BF.B.3** | period, **midline** (now honest — `k` exists), amplitude. |
| Exp/Log | **HSF-IF.C.7e**, **HSF-LE.A**, 8.EE.A.1 (supporting) | growth/decay, asymptote-as-barrier. |
| Polynomial | **HSF-IF.C.7c — end behavior & turning points only** | *zeros clause dropped* (the mechanic never makes roots load-bearing). |
| Transformations | **HSF-BF.B.3** (most-reinforced; recurs every world) | capstone review of one standard. |
| Piecewise / Co-op | **HSF-IF.B.4–5**, **HSF-IF.C.7b** | piecewise over intervals; continuity at junctions. |

**Calibration:** Line + early Parabola are genuinely on-grade for 8th (8.F/8.EE); Sine/Exp/Polynomial/Parametric are labeled **"reach / high-school preview"** and gated behind scaffolds. **Standards-review gate (resolves MISSING owner):** *no standard string ships unreviewed.* A named teacher/standards reviewer (Aaron or Lisa Hatch) signs off on the net-new CCSS copy, and confirms whether the pilot maps to CCSS or a Maine/state framework (open question for Aaron, §A). One-line panel-spec rule: *every cited standard names only the sub-skill the puzzle forces*, diffed against the BUILDS/EXPOSES ledger.

---

## 6. Cooperative Play

### 6.1 Same-device hot-seat only (no networking)

Co-op is **N seats sharing one board and one `toolData` blob** — local labels, not identities. Justified by: single-file no-build module, the Gemini Canvas surface, zero networking precedent in `stem_lab/`, and total FERPA/PII avoidance. No accounts, rooms, peers, `WebSocket`, or `BroadcastChannel`. Save/resume/undo/replay come for free from the one serializable object.

**v1 scope cut (resolves the co-op scope-creep major finding):** ship **2 seats max, Relay mode only** (the headline that delivers the C⁰ lesson), solo equivalent, **value-match only**. **Defer** to later phases: Split/Navigator-Grapher roles, 3–4 seats, the AI relay buddy, blended-color lighting, and C¹ slope-match. The `seats[]` shape stays forward-compatible but the extra modes are not built or tested in v1 (keeps the file reviewable).

```js
// ctx.toolData._arccity.coop  (v1: seats.length === 2, roleMode 'relay')
{ mode:'solo'|'coop', seats:[{id,label,color,glyph}], activeSeat, roleMode:'relay',
  junctionX, whoseTurn,
  segments:[ { seat, family, params, domain:[lo,hi] } ] }   // {family,params}, NOT expr-strings
```

**Resolves the safe-compiler contradiction (completeness critic):** relay segments are `{family, params}` consuming the **same typed `evalF`/`evalDeriv`** as the rest of Arc City — **not** the coordgrid string stripper (which cannot evaluate sine/exp at all). The earlier "compile each segment with coordgrid's exact compileFunc" plan is rejected.

### 6.2 The junction match — numeric, multi-channel, both-hands

A junction at `x=j` between left piece L and right piece R is evaluated on two gates:
1. **Value (C⁰):** `|L(j) − R(j)| ≤ εV` — the v1 gate.
2. **Angle (later tiers):** `|L'(j⁻) − R'(j⁺)| ≤ εS`, where each one-sided slope is the **analytic `f'(j)`** of that piece's typed function (§3.2), not a rendered secant.

**Language locked to what is true everywhere (UI, SR, teacher panel, badges):** *"the pieces meet at the same height (continuity)"* and *"meet at the same angle (no visible kink)"* — **never "differentiable."** The previously-named "gold weld = smooth" visual is **relabeled "angles match."**

**εS is tied to render scale, not a flat 0.15 (resolves the misconception-induction finding).** A joint that reads as "angles match / no kink" must have a residual angle small enough to be **sub-pixel-imperceptible at the projection scale** — an 8.5° "smooth" weld would teach that a visible corner is differentiable, a felt-*wrong* intuition. `εS` is computed from render scale and **displayed**, never hidden.

**Communication is redundant across channels:** diegetic weld-glow / visible kink-spark / gap-drop; a numeric readout naming **both** seats' contributions (`◆ left value 2.00 / ▲ right value 1.40 → gap 0.60 (need ≤ 0.25) ✗`); an **actionable** `announceToSR` hint computed from the actual gap ("off by 0.6 units — lower the right piece's constant by about 0.6"); optional muted audio. Every state carries color **+** shape glyph (◆▲●■) **+** text label — never color alone.

### 6.3 Socially positive by construction; the watcher always has a job (resolves co-op dead-time)

- The city re-lights **together**; no per-player board score, no per-seat leaderboard, no PvP.
- **Both relay halves live-preview simultaneously** as each player edits, with the junction gap updating in real time, so the keyboard hand-off is "I can see my partner's piece, I aim mine to meet it," not "author blind, then discover failure."
- The **non-active partner is the spotter every turn** (place/confirm the ghost-target dot or read the live junction readout aloud) — promoted from the deferred Split mode so *someone is always doing something*.
- Smooth-junction relays **structurally require both seats to commit** (can't be silently soloed); solo mode is the explicit escape hatch.
- **Solo equivalent is mechanically identical** (same `segments`, same evaluator, same `seat` id on every piece) plus a deferred opt-in deterministic **local** relay buddy (curated safe-expression bank, **not** `callGemini`).

---

## 7. Theme, Narrative & Visual / Audio

### 7.1 Palette derived from the existing theme system

The neon palette is **read at render time from `window.AlloStemTheme.palette()`**, not hardcoded — so high-contrast and light themes are first-class. The **contrast theme is the *strongest* version of the fiction** (pure black void; grid and beam are the only light); **light theme is a "daylight blueprint."** **Theme is detected by NAME**, not object identity (corrects the `p === contrast` bug — `palette()` returns an object): branch on the theme class (`theme-contrast`) only to swap the **decorative** accent ramp; all **functional ink comes from `var(--allo-stem-*)` tokens**.

**The authored curve is always drawn in theme `text` color (max contrast vs. canvas)**; accents (cyan beam, fuchsia nodes, violet gates) are reserved for *world objects*, so the equation's own line is always the most legible element. The dark synthwave grid is **content, not chrome**: high-contrast theme keeps the metaphor but forces all functional elements onto contrast tokens — explicitly avoiding the `df347335` gold-on-dark regression.

### 7.2 The signature animation: beam-travels-the-curve

One shared sample array `{t,x,y,z}` (the throwlab `samplePts` idiom) is consumed by **render + collision + SR narration** so they can never drift. The curve is an SVG polyline in `curve` color; the beam is a second path with animated `stroke-dashoffset` + a `drop-shadow` beam-head, fixed ~900ms regardless of complexity (legibility, not reflex). A fading trail shows the path actually taken.

**Beam glow uses an SVG `drop-shadow` filter — no second canvas surface in v1** (corrects the canvas-overlay overhead finding; an extra always-present HiDPI canvas + RAF is pure cost for a glow that Calm/reduced-motion users won't see). Revisit a canvas only if SVG filter perf is measured-bad on a real pilot Chromebook.

**Reduced-motion = full information, zero motion (litmus test for every animation):** the beam renders its complete path instantly and announces the identical readout. Every animation has a defined static end-state with the same facts.

### 7.3 Feedback events — multimodal, near-miss-rich, front-loaded (resolves thin-reward-loop finding)

Failure is **information, never punishment**: a clipped beam marks the clip point with ✕, draws the would-have-gone ghost remainder faint/dashed, states the math reason, and is non-consuming. **Crucially, the beam-travel animation ships in Phase 0 — it IS the hook and cannot wait.** Every shot gives **graded near-miss feedback** ("your arc grazed the gate — 0.3 short!") so progress feels continuous, not binary. A **dense, action-framed early badge set** ("First arc over a wall," "Threaded a gate on shot 1," "Lit a whole street") is earnable in the first 10 minutes. A cooperative, non-timed **city-wide "power surge" meter** builds as the team lights consecutive clean nodes (collective momentum, never individual ranking, no timer).

Every gameplay state carries glyph + shape/fill + label + `announceToSR`. Audio is `try/catch`, `ac.resume()` on first gesture, max gain ~0.1, mutable, never autoplay, always redundant to text. Okabe-Ito-adjacent hues make "on-brand" and "colorblind-safe" the same default; a `cbPalette` toggle swaps to strict Okabe-Ito.

### 7.4 Narrative & skins

Sectors diegetically motivate each family — Harbor (lines), Overpass (parabolas), Strip (sine), Spires (exp/log), Tangle (polynomials), Twin Bridges (the relay — "the cables must meet flush or the current arcs out"). All copy uses **re-lit / explored / attempted / practiced**, never *mastered / proficient / measured*.

**Skins are a pure presentation layer** (`arccity.skin`: Arc City / Crystal Spires / Neon Castle) over identical mechanics, geometry, and equations; skin code is **forbidden from touching the sample array or game-object registry**, and the equation/curve legibility layer is identical across all skins. **At least one skin (or a palette/glyph swap) ships earlier as a near-free unlock reward** after the first sector — prioritized over the Three.js spectator (which most kids watch once). The math layer is never altered.

### 7.5 Three.js — one binding decision (resolves the cross-section conflict)

**Three.js is cosmetic-only, OFF by default, Expert-tier opt-in, behind a feature flag** — an optional "orbit the city" spectator flythrough, never on the solve path. The game is 100% playable and winnable with it disabled. The Theme section's "3D establishing view ON by default" framing and UDL's "the Three.js RAF loop in normal play" are **struck** — normal play has no Three.js loop. **Before building any Three.js path, a 30-minute spike** confirms whether an injected CDN script populates `window.THREE` inside the real Gemini Canvas surface and whether `onerror` fires deterministically on block; if not, **Three.js is cut from v1 entirely.** A blocked CDN must `onerror`→hide-button + `announceToSR`, never a silent dead control.

---

## 8. UDL & Accessibility (peer-projection, not retrofit)

The board is a **serializable symbolic model**; SVG, the optional Three.js backdrop, the keyboard layer, and the screen-reader layer are all **peer projections** of it. Acceptance test: *two screen-reader users complete a relay together on one machine.*

### 8.1 Full keyboard play (author + rotate + fire)

Three focusable stations with `role="slider"` arrow grammar (the numberline/coordgrid pattern): **A. Author** (one slider per parameter; ↑↓/←→ nudge, Shift ×5, Home/End min/max, with live equation read-back), **B. Rotate firing plane** (azimuth slider; ←→ 15°, Shift 5° fine, Home/End snap 0/45/90), **C. Fire** (Enter/Space). Global hotkeys guarded against `INPUT`/`TEXTAREA` focus: `T` tier · `G` next unlit node · `H` hint · `F` fire · `?` help/equation panel · `R` reset · `1/2/3` author tier. Per-station handling lives in component-local `onKeyDown` (avoids the coordgrid global-listener leak class); any unavoidable global hotkey listener registers in `useEffect` with a cleanup return.

**Azimuth is a finite, SR-enumerable snap set** (e.g., 0/45/90 + fine 5° steps) so SR players reason about a countable set of firing planes (resolves the MISSING azimuth-enumeration item).

### 8.2 Screen-reader play that is genuinely *solvable*

Four narrated layers through `announceToSR` into `id="allo-live-arccity"` (`role=status`, `aria-live=polite`): **Board readout** (level + node/gate/wall coords on load and on `B`), **Equation read-back** (words per family — "a U-shape opening upward, vertex at (3,1)"), **Relative-position guidance** ("your arc passes 1.5 units **above** node 1 and **left** of the gate; raise k to lower the peak" — direction **and** magnitude of the gap, the part that makes it solvable), **Outcome narration** on Fire. A navigable `<ul>` list view of all targets/gates/walls (each item focusable, status as text) lets SR/keyboard users "look around" item by item.

### 8.3 Scaffolding tiers & adjustable cognitive load

Tiers (**drag-only → guided → free-type**, mapped onto the §5.2 ramp) gate **how** you author, never **what** counts as winning, and are **orthogonal to access need** (keyboard/SR players use any tier). Tier 1 is the pilot default with a teacher-visible switch. Global UDL knobs: **Reduced clutter**, **proactive hint ladder** (see below), one-thing-at-a-time mode, **no timers ever**, snap-to-grid toggle, RAF teardown + reduced-motion static city, monospace numerals, vocabulary glosses ("vertex (the turning point)").

**Proactive, opt-out help (resolves the stuck-kid finding):** after N failed shots **or** N tweaks-without-progress on a puzzle, the next hint-ladder rung is auto-offered as a gentle, dismissable nudge ("Want a tip on which knob to turn?") — never forced, never a deficit score. Paired with the **per-miss parameter-specific consolidation beat** ("try raising k to lift the whole arc"), since productive failure without consolidation is just failure.

### 8.4 First-five-minutes & one-tap play (resolves time-to-first-fun)

A single **Play** button drops straight into Tutorial Grid with sane defaults (solo, scaffold tier, level 1) and **zero setup**. Co-op seat/role/skin config is an **optional panel reached *after* the first beam fires.** The ≤40-word premise's **Skip is the default-focused button.** Concrete beat: *tap Play → see one dark node and a draggable line → drag the line so the beam hits it → it lights with a chime — all within ~60 seconds.*

### 8.5 i18n scope (decisive)

All user-facing strings (including dynamic narration and the teacher summary) use `ctx.t(key)` with interpolated numbers, registered up front so `check_translation_keys.cjs` and `check_lang_json.cjs` pass. **v1 is English-first**; the current 63 mirrored language-pack files should receive the new keys for checker coverage, with post-pilot human translation/review still required. **Spatial/quantity narration ("1.5 units above") needs per-language template review, not mechanical key substitution**, and is explicitly flagged as *not* covered by the existing pack sweep.

---

## 9. Learning Science, Assessment Integrity & Data Posture

### 9.1 The defensible spine (with honest epistemic flags)

- **Math-as-mechanic = transfer-appropriate processing** (Morris/Bransford/Franks 1977): the winning operation *is* the target competence. Treated as a hard design gate (§2.4).
- **Worked-example + faded guidance** (Sweller/Cooper 1985; Renkl) — robust; now actually implemented as the 4-stage ramp (§5.2).
- **Retrieval + interleaving** (Roediger/Karpicke 2006; Rohrer/Taylor 2007) — formations interleave families. **Epistemic flag:** interleaving's benefit for *novice* learners is real but smaller/more context-dependent than for experts; surfaced to teachers as "mixed practice," not oversold.
- **Productive failure** (Kapur 2008) — kept via clean-solve-for-bonus-not-gating. **Epistemic flag (resolves MISSING):** PF's replication is more **contested and consolidation/prior-knowledge-dependent** than a flat "replicated in math classrooms" implies; we therefore pair *every* miss with consolidation and do not claim PF as settled law.
- **Representational fluency + concreteness fading** (Ainsworth DeFT; Goldstone/Son; Fyfe et al.) — the live-linked drag↔equation↔words binding; concrete representation kept **veridical** (orthographic, §2.1).
- **Felt-derivative = concept-before-vocabulary** — a *design* claim; the embodied-cognition rationale is flagged **promising-not-settled**.
- **Positive interdependence** (Johnson & Johnson — the replicated structural condition) + **self-explanation effect** (Chi et al. 1989) for the relay.
- **Explicitly rejected:** learning styles/VAK, speed-as-understanding, neuro-flourish, brain-training far-transfer.

### 9.2 What Arc City may honestly capture vs. never claim

**Capture (observed behavior, not inference about the person):** which families used **independently** vs. with-scaffold vs. explored; clean-solve ratio (approach, not ability); within-player scaffold trajectory (direction only); co-op participation (a completion event).

**"Used independently" is defined precisely (resolves the major finding):** counts only when (a) authoring tier was guided-or-higher, (b) no hint above level 1 was used on that solve, **and** (c) no ghost/preview-until-fire assist counted (§2.4). The teacher panel surfaces the qualifier. (Otherwise it's labeled the honest-but-weaker "completed on the independent tier.")

**Never claim:** mastery/proficiency/ability; grade/percentile/score-of-a-person; cross-player comparison or skill leaderboards; prediction; diagnosis; generalization to un-practiced functions or paper tests.

### 9.3 Error patterns: a gated, behavior-named, telemetry-conditional feature (resolves the major finding)

Recurring-error reporting is **only built if the engine logs which parameter changed and in which direction per attempt** — this is a **hard prerequisite, not an open question.** If only final equations are logged, **the feature is cut, not inferred** (inferring it would be overclaim). When built, it obeys:
1. **Reporting floor:** never surface a "recurring pattern" below **N≥5 independent occurrences across distinct puzzles**, never on a single session.
2. **Exploration ≠ error:** a tweak that **shrinks the gap** is exploration (not counted); only tweaks that move **away** on the wrong parameter *after the relevant feedback was shown* count toward a pattern.
3. **Behavior-named, not misconception-named:** "frequently changed amplitude on period-gated puzzles," **not** "parameter-role confusion" — the teacher supplies the diagnosis.

### 9.4 Honest UI language

City progress: "Nodes re-lit: 14 / 20," "70% restored" — collective, countable, never "Skill 70%." Per-solve: "Clean solve — 2 adjustments" / "Solved after exploring 6 adjustments" (the messy one is **not** red/negative). Badges are action-only ("Arc Architect — re-lit 10 nodes using vertex form"; "Continuity Keeper — completed 5 relays where the junction matched"), never "Quadratics Master." Function tracker uses **"explored · used with scaffold · used independently."** Color is never the only signal.

### 9.5 Teacher summary, dashboard surface & FERPA gate (resolves contradictions + MISSING)

The summary is **deterministic, template-built from logged events** (no AI verdict) and prints with a **non-removable fixed caveat**: *"These are observations of what this player did inside Arc City… They are **not** a test score, grade, measure of ability, or prediction… Error-pattern notes are hypotheses to probe, not determinations."*

- **Surface:** a `tab:'teacher'` panel inside the tool.
- **Naming reconciliation:** seats are **anonymous by default** ("Seat ◆ / Cyan"); the teacher maps seats to students **offline**. Real names are an **explicit opt-in** the teacher panel requires, are local-only, never sent to `callGemini`, never exported without the gate below.
- **FERPA export gate is a requirement, not a question (resolves MISSING, mirroring the open StoryForge gate):** logging/export of per-student behavior is **OFF by default**; a teacher must explicitly enable it. Any export escapes all interpolated strings (no unescaped HTML — `check_xss_surface.cjs`, the Symbol Studio/StoryForge print-sink lesson).
- **Per-seat tweak data**, if stored for clean-solve pooling, **never surfaces per-seat in any UI or export** (no blame/competition reintroduction).

### 9.6 Level content & data posture

- **Level-Content workflow (resolves the missing section/owner):** v1 levels are **hand-authored static `ARC_LEVELS` JS data** in the module (no fetch, offline-safe). An **offline brute-force solvability validator** (not shipped) proves each level has ≥1 solving curve in `allowedFamilies` **and** asserts no sub-sample gate-slip at the shipped `dx`; it is run by the author before commit, gating handmade levels. Interleaving order (§5.3) is enforced by **hand-authored sequencing**, not a generator. Owner: the maintainer / Level-Content author (Aaron, §A).
- **Privacy:** per-profile state in `ctx.toolData._arccity`; AI calls (if any) soft-strip name patterns; no PII required to play.

---

## 10. Technical Architecture & Build Roadmap

### 10.1 Binding architectural decisions

- **Tool id `arccity` is a deliberate, self-consistent NEW id** (not auto-derived from filename — verified: coordgrid registers `'coordinate'`, funcgrapher `'funcGrapher'`; filename→id is *not* a repo invariant). The namespace `_arccity`, live-region `allo-live-arccity`, and CSS id `allo-arccity-css` all match it. Registration: `registerTool('arccity', { icon:'🌆', label:'Arc City', desc:…, color:'fuchsia', category:'math', render })`. **Must also add a catalog tile in `_allStemTools` and mirror to `prismflow-deploy/public/`** (BirdLab bug class — `check_stem_tile_catalog.cjs` + `check_deploy_mirror.cjs`). Do **not** set `lightBackground`.
- **SVG core, no Three.js on the solve path** (the single best technical call): the firing-plane math is 2D, SVG keeps full a11y/theme/gate parity, removes the CDN availability risk for offline school networks, and stays inside the static-analysis gates' competence. Three.js is cosmetic-only and fail-safe (§7.5).
- **Typed-param family evaluators** (§4) are net-new code (7 evaluators + inverse drag-binders for line/parabola/sine; sliders for exp/log; turning-point drag for poly; read-only for typed-custom). The funcgrapher reference is "same idiom," not "same code."
- **Hit-testing** reuses the throwlab `classifyBowlResult` prev/cur segment-crossing idiom as a **pure function** `classifyShot(curveSamples, levelGeometry) → {litNodes, killedAt, gatesPassed, reason}` (the unit-test seam and SR-narration source). **Robustness requirements (resolves the major finding):** adaptively increase sample density near each gate-x; cap `|y|` and mark asymptote-broken segments so they can never satisfy a gate; use **analytic central-difference `f'(g)`** for slope-gates (family-independent, not the rendered secant); for **parametric, switch to arc-length `t` and point-to-polyline distance only, dropping value+slope-in-x gates** (explicit scope boundary).
- **State split for performance (resolves the persistence-bloat finding):** persist **only** compact facts in `ctx.toolData._arccity` (progression, `cleanSolveBest`, badges, options, bounded rolling error-pattern counters with a cap + min-N floor). **Never persist** `samplePts`, the live beam, drag deltas, or raw per-adjustment event logs — those live in ephemeral `useState`/refs. Add a **`schemaVersion` field + forward-migration note** (the param shape changes between phases — resolves MISSING).
- **Render-crash safety (resolves the hook-legality finding):** flat handler structure — every handler/derived value defined at component scope **before** the hooks that depend on it; dep arrays reference only declared identifiers; run `node dev-tools/check_render_refs.cjs stem_lab/stem_tool_arccity.js` after **every** edit (never trust fabricated success — verify against real bytes). An internal `try/catch` in `render()` returns a **visible/announced fallback element, not `null`** (the host `renderTool` returns null on throw — the WordSoundsModal blank-tool bug class).
- **Animation:** RAF triggered **only on Fire**; `animId` stored on the DOM node and `cancelAnimationFrame`'d on the ref-callback null branch (galaxy pattern); `visibilitychange` pause; reduced-motion instant-result path.
- **Performance target (resolves MISSING):** the minimum target device is the **pilot Chromebook**; v1 commits to a frame budget of one O(n) curve sample-pass (~one sample per horizontal pixel) + the `.map` lists, **no second canvas, no Three.js** — well within the SVG 10,000-segment ceiling. Perf is verified on a real pilot Chromebook before deploy.

### 10.2 Error-state handling (resolves MISSING)

- **Unparseable equation:** curve freezes at last valid params, coaching toast + `announceToSR`, dragging disabled until valid.
- **Three.js CDN failure:** silent degrade, button hidden, `announceToSR` (never a dead control).
- **Audio init failure:** silent, stays muted.
- **NaN/asymptote on saved-state load:** broken-segment handling; never satisfies a gate.
- **`callGemini` failure/timeout:** fall back to the deterministic `hintKeys` ladder (the assumed floor); AI hints are optional, always labeled "AI-generated — verify yourself," never assign a level, never receive PII.

### 10.3 Gates the module must pass (`verify_all.cjs --quiet`, then `--runtime` pre-deploy)

`check_render_refs` · `check_keyless_map` (stable keys on every node/gate/wall/badge/SR-list `.map`) · `check_css_template_literals` (escape backticks in the 3 injected `<style>` blocks) · `check_eval` (single `new Function` site, informational) · `check_tool_registry` · `check_translation_keys` / `check_lang_json` · `check_xss_surface` (escaped summary export) · `check_stem_tile_catalog` · `check_deploy_mirror` · standard hygiene gates. **Beyond gates:** `audit_aria.js` post-build, and a **golden-master/characterization test over the SR narration text** treated as gameplay — written in **Phase 0**, not deferred (Word Sounds precedent; the SR text is the second way to play).

### 10.4 Phased build roadmap

- **Phase 0 — MVP "Clear the Wall" (v1 candidate floor).** File skeleton + registration + catalog tile + deploy mirror + all CSS/live-region injectors green. SVG orthographic grid/axes + one wall + one gate + one node. **Parabola only**, `a,h,k` via vertex-drag + `a` slider, equation read-only. Pure `classifyShot`. **Beam-travel animation included** (the hook) + reduced-motion instant path + SR announcement. Persist compact `params`+`shots`. **SR-narration golden-master written.** Prove: you cannot light the node without `a,h,k` that arc over the wall through the gate. `verify_all` green.
- **Phase 1 (ships for pilot) — Onboarding ramp + Line + Parabola + binding.** Isolation on-ramp (§5.2); line/parabola families; drag↔type↔slider binding with co-highlighting + hidden-preview-until-fire on guided/independent; near-miss feedback; early badge set; muted-by-default audio; completion-based world unlock; proactive hint ladder + consolidation beats; teacher panel (anonymous seats, deterministic summary, FERPA export OFF by default). **3–5 hand-authored levels per family, solvability-validated.**
- **Phase 2 — Slope-gates + sine/exp/log/poly + 2.5D backdrop + formations.** Analytic `f'(g)` slope-gates with displayed tolerance; sine (snapped periods + crest-grabber + midline), exp/log (asymptote), poly (turning-point drag or explore-only); oblique **backdrop-only** projection + azimuth snap rotation (graph stays orthographic); interleaved formations; badges/XP; offline solvability validator extended to gate-slip.
- **Phase 3 — Co-op Relay.** 2-seat hot-seat, Relay mode, value-match (C⁰) then later value+angle (C¹) with render-scale-tied `εS`; both-halves live preview; spotter role; SR junction narration; relay levels.
- **Phase 4 — Expert + optional cosmetics.** Parametric `(x(t),y(t),z(t))` (arc-length hit-testing); deferred Split/Navigator-Grapher roles, 3–4 seats, AI relay buddy, blended lighting; **CDN-spike-gated** fail-safe Three.js spectator; alternate skins as reward unlocks; optional `callGemini` hints with labeling.

Each phase ends green on `verify_all.cjs`.

---

## 11. Risks & Open Questions

1. **Closing the slider-fishing hole in practice.** §2.4's hidden-preview/no-ghost/predict-then-fire mechanics are the enforcement; needs playtest to confirm they *feel* like a challenge, not a punishment, for the pilot band.
2. **Gate value & slope tolerances; co-op εV/εS; clean-solve par.** All level-data knobs; need pilot playtest defaults (εS tied to render scale, §6.2). No flat 8.5°.
3. **Sample-based hit-testing near asymptotes/steep regions.** Mitigated by local density + `|y|` caps + asymptote-break + analytic slope; needs QA tuning per family and the gate-slip validator assertion.
4. **Per-adjustment telemetry** is a hard prerequisite for error-pattern reporting; if absent, the feature is cut (§9.3).
5. **Three.js in Gemini Canvas** — resolved by the 30-min spike gate; if it doesn't load reliably, cut from v1 (game is fully playable without it).
6. **i18n volume for dynamic spatial narration** — English-first v1; per-language template review (not mechanical substitution) staged post-pilot.

---

## Appendix A — Open Questions for Aaron (maintainer decisions)

1. **Standards framework & reviewer.** Do we cite CCSS (as drafted) or map to a **Maine/state** framework for the King pilot? Who signs off on the net-new standards copy — you, Lisa Hatch, or both? *(No standard ships unreviewed — §5.4.)*
2. **v1 world cut.** Confirm the pilot ships Tutorial → Line → Parabola + **value-match Relay** only, with Sine onward post-pilot. Is even the C⁰ Relay in-scope for the *first* classroom session, or solo-first?
3. **Clean-solve par & hint-trigger N.** Proposed: clean = ≤3 tweaks / 0 failed shots (badge-only); proactive hint after N≈3 no-progress tweaks. Your call on the numbers for the 8th-grade band.
4. **Teacher names & FERPA.** Confirm anonymous seats by default with opt-in local-only names, and that behavior **logging/export stays OFF by default** until you explicitly enable it. Acceptable for the King setting?
5. **AI hints (`callGemini`).** In scope for v1, or fully static `hintKeys` until offline reliability is proven on pilot Chromebooks?
6. **Polynomial Maze.** Required core world (with turning-point drag) or **optional explore-only** side area for the pilot (it's above-grade)?
7. **Degree/radian toggle in Sine.** Worth the UI surface for 8th graders given we explicitly do not assess radian rigor?

## Appendix B — How critic findings were addressed

| Finding (lens · severity) | Resolved in |
|---|---|
| North-star not enforced; clean-solve gate eyeball-able (pedagogy · critical) | §2.4 (hidden-preview, no-ghost-on-counted, predict-then-fire); §9.2 "used independently" definition |
| Oblique projection distorts the canonical curve (pedagogy/technical · critical/minor) | §2.1 orthographic invariant (graph always zero-shear; shear only in non-interactive backdrop); §7.1, §10.1, §10.4 Phase 2 |
| "Reuse funcgrapher `{type,a,b,c,h,k}` vertex form" is false (technical/completeness · critical) | §4 (funcgrapher is standard-form `{a,b,c}`; Arc City is net-new typed evaluators, "same idiom not same code") |
| `check_eval` "permits new Function" framing wrong (technical · critical) | §4.3 (flags every site, informational-only; single minimized site + inline justification) |
| coordgrid stripper can't do sin/exp; relay used it on `expr` strings (completeness · critical) | §4.3 + §6.1 (relay segments are `{family,params}` on the shared typed `evalF`) |
| Felt-derivative used crude adjacent-sample secant (pedagogy/technical · major) | §3.2, §6.2, §10.1 (analytic central-difference `f'(g)` for all slope checks/visuals/SR; secant only for collision) |
| Error patterns = inference dressed as observation, telemetry not guaranteed (pedagogy/technical · major) | §9.3 (N≥5 floor, gap-shrink=exploration rule, behavior-named labels, telemetry a hard prereq or feature cut) |
| Standards overclaim — polynomial zeros, sine midline, 8.F.A.3 (pedagogy · major) | §5.4 (zeros clause dropped; `k` midline added to sine; 8.F.A.3 → cross-world; review gate + ledger diff) |
| Slope-match mislabeled "differentiability"; 8.5° "smooth" weld (pedagogy/co-op · major) | §6.2 (language locked to "same angle / no kink"; `εS` tied to render scale, displayed) |
| Worked-example stage absent from tiers (pedagogy · minor) | §5.2 (4-stage ramp incl. Worked replay, mapped onto tiers) |
| "Used independently" includes scaffolded/hinted solves (assessment · minor) | §9.2 precise definition (guided+ tier, no >L1 hint, no ghost/preview assist) |
| Three.js conflict + CDN reachability in Canvas (technical/completeness · major) | §7.5, §10.1 (cosmetic-only, OFF by default, spike-gated, fail-safe; conflicting framings struck) |
| Hit-test robustness near asymptotes/steep/parametric (technical · major) | §10.1 (local density, `|y|` cap, asymptote-break, analytic slope, parametric→arc-length) |
| toolData persistence bloat / unbounded telemetry (technical/completeness · major) | §10.1 (state split; only compact facts persist; bounded counters; `schemaVersion`) |
| Single-component hook legality / blank-tool risk (technical · major) | §10.1 (flat handlers, per-edit `check_render_refs`, visible try/catch fallback ≠ null) |
| Co-op scope creep (technical · major) | §6.1 (v1 = 2 seats, Relay-only, value-match; rest deferred, shape forward-compatible) |
| Onboarding cliff / no one-knob ramp (fun · critical) | §5.2 isolation on-ramp; §8.4 first-five-minutes |
| Sine slider-fishing trap (fun · critical) | §3.1 (snapped periods, crest-grabber, ghost dot, gated behind reach label) |
| Co-op dead-time / hand-off stalls (fun · major) | §6.3 (both-halves live preview, spotter role, 2-player default) |
| Progression wall vs. productive failure (fun · major) | §5.1 (unlock on completion; clean-solve = badge-only) |
| Thin/late reward loop (fun · major) | §7.2–7.3 (beam animation in Phase 0; near-miss feedback; dense early badges; cooperative power-surge) |
| On-demand-only hints leave stuck kids (fun/UDL · major) | §8.3 (proactive opt-out hint trigger + consolidation beats) |
| Polynomial coefficient roulette (fun · minor) | §3.1 (turning-point drag, or explore-only) |
| Skins buried in Phase 4 (fun · minor) | §7.4 (≥1 skin as early reward unlock, prioritized over spectator) |
| `p === contrast` palette bug (technical · minor) | §7.1 (detect theme by name; functional ink from tokens) |
| Canvas-overlay overhead (technical · minor) | §7.2 (SVG drop-shadow glow; no second canvas in v1) |
| tool-id≠filename convention claim (completeness · minor) | §10.1 (`arccity` a deliberate new id; filename→id not a repo invariant) |
| Grade-band scope creep / no v1 cut (completeness · minor) | Executive Summary + §10.4 (explicit pilot cut) |
| i18n narration volume underscoped (completeness · minor) | §8.5 (English-first, staged packs, per-language template review flagged) |
| MISSING: onboarding owner | §5.2 + §8.4 |
| MISSING: Level-Content section/owner | §9.6 (hand-authored `ARC_LEVELS`, solvability validator, named owner) |
| MISSING: schema versioning/migration | §10.1 (`schemaVersion` + migration note) |
| MISSING: teacher dashboard surface + FERPA gate | §9.5 (`tab:'teacher'`, anonymous seats, export OFF by default) |
| MISSING: error states | §10.2 |
| MISSING: per-player vs anonymous-seat reconciliation | §9.5 (anonymous default, offline mapping, opt-in names) |
| MISSING: perf target / device | §10.1 (pilot Chromebook, stated frame budget) |
| MISSING: azimuth SR-enumerability | §8.1 (finite snap set) |
| MISSING: epistemic flags on PF/interleaving | §9.1 |
| MISSING: misconception-induction audit | §2.1 (veridical curve) + §6.2 (sub-pixel `εS`) |

---

## 12. Accessibility Hardening (gap-fill adversarial pass)

> Scope: this section amends specific subsections of §6, §7, §8, and §10 with concrete changes a dedicated accessibility-UDL pass would have folded in. It does **not** restate §8's peer-projection thesis, the §2.2 parameter-space decision, or the §7.1/§7.3 multi-channel encoding — those are confirmed-strong and load-bearing (see the strengths note at the end of §12). It fixes the places where an affordance is *labeled but not operable*, with the host's single shared assertive live region as the binding constraint.

**Host reality this section is written against (verified, not assumed):** `stem_lab_module.js:1064–1069` exposes exactly **one** shared live region (`id="stem-a11y-live"`, `aria-live="assertive"`, `aria-atomic="true"`), written via `setA11yAnnouncement(msg)` + `textContent` and blanket-cleared by a single `setTimeout` after 3000ms. There is **no queue, no per-seat region, no busy-gating**. On a single shared machine there is one screen reader and **one speech channel**. Every change below assumes that floor and routes Arc City's own announcements through the **tool-local `allo-live-arccity`** region (the funcgrapher `allo-live-funcgrapher` polite pattern, `stem_tool_funcgrapher.js:50–53`) so Arc City controls its own politeness and clear timing rather than inheriting the host's clobber-and-clear.

### 12.1 Two-SR-user relay walkthrough — Amends §6.3 / §8 acceptance test

**Finding (critical):** the §8 acceptance test — *"two screen-reader users complete a relay together on one machine"* — is **asserted with no enabling mechanism**, and the §6.3 claim that *"both relay halves live-preview simultaneously … so the hand-off is 'I can see my partner's piece'"* is a **sighted-only affordance**. A blind seat-A player cannot perceive seat-B's live-updating piece: the partner's continuous edits would either be silent or flood the one shared region, and because that region is `assertive` + `aria-atomic`, **every write barges the prior utterance**. "Seat A's announcement colliding with seat B's" is not a risk to mitigate — with one region it is the default behavior. The turn hand-off, focus management on seat switch, and "perceive the partner's live piece" are **all unspecified**.

**Decision: demote "simultaneous live preview for two blind users" from an asserted capability to an explicit, honest limitation, and specify the alternating-turn machinery that actually makes the test passable.** §6.3's "both halves live-preview simultaneously" is retained as a **sighted/low-vision** affordance and explicitly flagged as **not** the SR mode. The SR mode is **alternating turns with on-demand partner-state read** — the honest v1 framing, stated in the doc.

The relay turn protocol (new, normative — fills the MISSING "concrete turn hand-off protocol"):

1. **During a single SR player's turn, the partner's piece never auto-announces.** Seat B's continuous edits are silent to seat A. Seat A retrieves the partner's committed state **on demand** via a discrete key — **`P` = "read partner's piece"** — which speaks one composed sentence: *family, params, and value-at-junction* (e.g. *"Partner's piece: line, m=2, b=1; at the junction x=4 it reaches y=9"*). This is the non-visual replacement for "I can see my partner's piece."
2. **Continuous junction-gap narration is suppressed during authoring.** The §6.2 real-time junction readout is **not** spoken on every slider nudge (that is the §12.2 throttle rule). The composed both-seats gap sentence (the §6.2 `◆ left 2.00 / ▲ right 1.40 → gap 0.60` readout) is emitted **once, assertively, on Fire / junction-eval only** — never as two competing streams.
3. **Seat hand-off is a discrete, announced focus event.** On seat switch the module: (a) re-baselines the live region (clears any pending throttled utterance), (b) **moves DOM focus to the new seat's first Author slider**, and (c) speaks one assertive composed sentence: *"Seat B's turn. Focus on Author station, parameter m. Your piece so far: line, m=2, b=1. The junction needs y=3 at x=4."* Focus movement and the announcement are a single atomic step; the live region is re-baselined **per seat** so a stale seat-A utterance never reads into seat-B's turn.
4. **On-demand review, never a feed.** Seat A may press `P` (partner's piece) and `J` (current junction gap) at any time in their turn; neither auto-fires. This is what makes one speech channel sufficient for two blind users.

**Honest framing locked into the doc (replaces the §6.3 sighted-only sentence for SR play):** *"Two screen-reader users complete a relay by **alternating turns** — each seat is silent during the other's turn, reviews the partner's committed piece on demand (`P`), and the junction gap is announced as one composed sentence on Fire. There is no simultaneous live preview for screen-reader users, because a single machine has one speech channel."* The acceptance test passes against **this** mechanism; the simultaneous-preview version remains true only for sighted/low-vision co-op.

### 12.2 Announcement-management layer: throttle + politeness routing — Amends §8.2 / §6.2 / §10.1

**Finding (critical):** §8.2 routes **four narrated layers** (Board readout, Equation read-back, Relative-position guidance, Outcome) all through `announceToSR`, and §8.1 fires "live equation read-back" on **every** ↑↓/←→ nudge while the §6.2 junction readout updates "in real time." Against the verified host region (`assertive` + `aria-atomic`, overwrite-on-every-call), holding an arrow key or watching a live gap emits **dozens of barge-in interruptions per second**: the screen reader stutters, never finishes a sentence, and the player gets garbage. The design listed "aria-live spam" as a thing to solve and never solved it. This is a **labeled-but-not-operable** failure.

**Decision: Arc City ships its own announcement-management layer; it does not rely on the host's clobber-and-clear.** Add to §10.1 as a binding architectural decision and expose its intervals as tunables in §10 (see §13 cross-ref for the parameter table; the debounce interval `ANNOUNCE_IDLE_MS` is a tunable alongside the §13 shot-economy knobs).

1. **Two channels, explicit routing:**
   - **Polite/throttled channel** = the tool-local `allo-live-arccity` region (`role="status"`, `aria-live="polite"`). Carries all **continuous** read-back: slider-nudge equation read-back and the live junction gap.
   - **Assertive channel** = reserved for **discrete events only**: Fire outcome, gate pass/fail, junction-eval result, seat hand-off (§12.1). Routed through the host region or a dedicated `aria-live="assertive"` tool region, sparingly.
2. **Debounce + coalesce on the polite channel.** Continuous read-back speaks only after **~400–600ms of input idle** (`ANNOUNCE_IDLE_MS`, default 500, tunable per §10), coalescing all intermediate values to the **final settled** value. Twelve nudges in a held arrow-key burst produce **one** utterance of the end value, not twelve.
3. **Suppress read-back entirely while a key is held/repeating.** Equation read-back fires on **`keyup` (settle)**, never on `keydown`-repeat. Holding ↑ to ramp `k` is silent until release, then announces the settled value once.
4. **No competing streams.** The junction gap (§6.2) moves from "updates in real time" to "debounced polite during authoring; one assertive composed sentence on Fire" — consistent with §12.1 step 2.

This is verified in the SR golden-master (§10.3): a simulated held-arrow burst must produce exactly one coalesced announcement, and Fire must produce exactly one composed outcome sentence.

### 12.3 Azimuth as a first-class non-visual readout — Amends §2.1 / §8.1 / §8.2 / §9.6

**Finding (critical):** §8.1 makes azimuth an SR-enumerable snap set (0/45/90 + 5° steps) — that enumerates the **control** but not the **consequence**. Nowhere does the design specify how a blind player learns *"node 3 is reachable only at azimuth 45° because at 0° a wall is in front of it."* The §8.2 navigable `<ul>` is described as a flat 2D list and **does not encode the azimuth/depth dimension at all** — so the very dimension that makes the game "2.5D" is the one missing from the non-visual projection. The player rotates a dial with no feedback about what each setting exposes: operable knob, incomprehensible model.

**Decision: the azimuth dimension becomes a narrated readout, not just an enumerable input.** (The §2.1 orthographic invariant is preserved — this adds *information about* the firing plane, never re-introduces shear into the read panel.)

1. **The board readout and the `<ul>` list view are azimuth-aware.** Each target/gate/wall states which firing plane(s) it is reachable in and what blocks it elsewhere: *"Node 3: blocked by a wall at azimuth 0°; clear sight at azimuth 45°."*
2. **On each azimuth change, announce (debounced, §12.2 polite channel) what the new plane exposes:** *"Azimuth 45°: 2 nodes in view, 1 gate, no wall."*
3. **New command `W` = "where can I hit each node?"** — a summary listing each target's reachable azimuth(s). Fills the MISSING "per-azimuth target/obstacle readout."
4. **Validator obligation (§9.6):** the offline solvability validator asserts that **every required target's reachable-azimuth is announced** in the board/list readout, and adds a v1-SR authoring preference: *prefer levels whose solution azimuth is discoverable from the readout.* "Unsolvable-without-vision" becomes a checked property, not a hope.

### 12.4 Non-pointer authoring for every drag mechanic — Amends §2.2 / §3 / §3.1 / §4.2

**Finding (major):** §2.2 promises targeting is *"always achieved by changing numbers, never by a mandatory click-and-drag-a-handle,"* and §8 rests motor/switch parity on it — but §3 and §3.1 specify **drag as the primary (sometimes sole-described) path** for two families: **Polynomial** ("drag turning points directly," degree "emerges from how many bends were placed") and **Sine** ("crest-grabber drag handle … back-solves `c`"). Placing a turning point at a chosen coordinate is a **2-DOF point-placement task, not a 1-DOF slider**; the §4.2 "slider-nudge a parameter" path assumes named scalar params, but turning-point authoring back-solves coeffs *from dragged points* — there are no natural scalars to nudge. **A switch user or SR user has no specified way to author poly or place a sine crest.** The "no mandatory drag" claim is **false for two of seven families**.

**Decision: specify the non-pointer authoring path for every drag mechanic before claiming parameter-space parity. Add a "keyboard/SR authoring" column to the §3 table proving each family has a non-drag path.**

1. **Poly turning-points (keyboard/SR/switch path):** per turning point, **numeric `(x,y)` coordinate fields + add/remove buttons**, plus **arrow-key nudge of the selected point** against a spoken coordinate readout. The module back-solves the polynomial from these points — **identical to drag, no pointer required.**
2. **Sine crest-grabber (keyboard/SR/switch path):** exposed as a **"target crest x" numeric/slider** that back-solves `c` (phase), not only a draggable peak. Dragging a peak and entering a crest-x are two editors over one param, per §4.2's "three editors write."
3. **§3 table amendment:** add a **"Keyboard/SR authoring"** column; every family must name its non-drag path (line/parabola/sine/exp/log/transformations already have scalar sliders; poly = coordinate fields + nudge; sine crest = target-crest-x).
4. **Hard fallback rule (closes the gate-by-motor-ability gap):** if poly turning-point authoring **cannot** be made keyboard-operable for a given configuration, the §3.1 "Polynomial → explore-only" fallback is the **DEFAULT for SR/switch users**, not merely a back-solving-intractability fallback. The world is **never** gated by motor ability.

### 12.5 What "hidden preview until Fire" suppresses for non-visual players — Amends §2.4 / §5.2 / §10.3

**Finding (major):** the §2.4 anti-fishing gate hides the live curve preview until after Fire on guided/independent tiers. For a sighted player this removes a visual crutch (intended). But for a blind player **the live read-back IS the preview** — the §8.2 *"your arc passes 1.5 units above node 1; raise k"* guidance is the non-visual equivalent of the on-screen curve. The doc **never says** whether hidden-preview also suppresses the relative-position read-back. Either reading is an inequity: if it suppresses it, the SR player gets **nothing** until Fire (blind guess-and-check, feedback only post-commit) while sighted novice-tier players keep their curve; if it leaves read-back on, the SR player has **more** pre-Fire information than the sighted player, breaking the gate's symmetry.

**Decision: state the symmetric rule explicitly and verify it.**

- **"Hidden preview" hides only the RENDERED curve position relative to targets** — the eyeballing affordance (where the curve sits vs. the wall/node/gate).
- **Symmetric non-visual rule:** on guided/independent tiers the SR player **likewise loses the relative-position-to-target read-back** (the *"passes 1.5 units above node 1"* guidance) — but **keeps pure equation read-back of their own params** (the symbolic equivalent of seeing your own typed equation on screen). The prediction act stays intact; parity is honest in both directions.
- **Add as an explicit row in §2.4** ("hidden-preview, by channel: visual = curve-vs-target hidden, params visible; non-visual = relative-position guidance hidden, equation read-back kept") and **verify in the §10.3 SR golden-master** (assert relative-position guidance is absent pre-Fire on guided/independent and present post-Fire).

### 12.6 Focus contract for Fire / Reset / result-toast — Amends §8.1 / §8.4 / §10.1 / §10.2

**Finding (major):** Fire triggers a ~900ms RAF beam animation (§7.2) then an outcome; the doc **never specifies where keyboard focus goes** during/after Fire. Known risk in this codebase: if Fire is a button and the result re-renders controls, focus can drop silently to `<body>`, stranding a keyboard/SR user. A §10.2 coaching toast may steal/trap focus or be an unreviewable aria-live blip. The §8.1 global hotkeys are guarded against `INPUT`/`TEXTAREA` — but Author sliders use `role="slider"` (**not** `INPUT`), so a player on a slider pressing arrow keys is exactly where `F`/`G`/`R` could mis-fire. Reset (`R`) with no focus restoration is a particular trap.

**Decision: a focus contract, added to §8 and §10.1, with assertions in the §10.3 golden-master.**

1. **Focus-after-Fire:** store `activeElement` before the animation; after the outcome resolves, **return focus to the Fire control** (or to the Author station if the turn continues). **Never let focus fall to `<body>`.** Re-render must not strand focus — restore explicitly.
2. **Result/coaching toast:** is **either** a focusable, reviewable region dismissable with **Escape (returning focus to origin)**, **or** routed through the live region only (not a focus-stealing element). Never an unfocusable aria-live blip the SR user cannot re-read.
3. **Hotkey guarding (corrects §8.1):** guard global hotkeys not just against `INPUT`/`TEXTAREA` but against **any active `role="slider"` / `role="spinbutton"`** during arrow/letter input — **or require a modifier** — so nudging a slider never accidentally Fires (`F`) or Resets (`R`). `F`/`G`/`H`/`R`/`P`/`J`/`W` are inert while a slider/spinbutton owns the keystroke.
4. **Focus-after-Reset:** `R` resets and **returns focus to the Author station's first slider**, announced (§12.2 assertive channel) — never a silent focus loss.

### 12.7 Low-vision (non-SR) population + magnification / reflow — Amends §7.2 / §7.3 / §10.1 (new UDL population)

**Finding (minor→structural):** reduced-motion is well-handled for the **beam** (§7.2 — instant path + identical readout, confirmed-correct), but two adjacent obligations are unaddressed. (1) The §10.1/§7.3 **reward layer** — XP popups, badge animations, the power-surge meter build, card entrances — is **not** stated to honor reduced-motion, though the host gates such motion behind `_reduceMotion` elsewhere (`stem_lab_module.js:2228`). (2) **Magnification / reflow (WCAG 1.4.10) is never mentioned.** An SVG firing field + three slider stations + equation panel + junction readout on a pilot Chromebook at 200–400% zoom is a real layout risk, and SVG coordinate readability under magnification is load-bearing. The doc treats vision as **binary** (sighted-drag vs. blind-SR) and never names the **low-vision non-SR** population.

**Decision:**

1. **Extend the reduced-motion litmus to ALL animation** — XP/badge/power-surge/card entrances reuse the host `_reduceMotion` flag (`stem_lab_module.js:2228`), not just the beam. Every reward animation has a defined static end-state with identical facts (the §7.2 rule, generalized).
2. **Add a low-vision / magnification clause to §10.1:** verify **reflow to ~320px-equivalent / 400% zoom without 2D scrolling traps**; ensure the orthographic graph and numeric readouts stay legible and the curve stays max-contrast (§7.1) at zoom; confirm **focus indicators survive magnification**.
3. **Name low-vision-non-SR as a distinct UDL population** with its own path: curve-in-text-color (§7.1) + monospace numerals (§8.3) + zoom/reflow support. This population is neither "sighted-drag" nor "blind-SR" and was previously invisible to the design.

### 12.8 Narration cognitive-load budget — Amends §8.3 / §8.5 / §9

**Finding (major):** the non-visual/scaffold experience is **numerically dense** — coordinate readouts for every node/gate/wall, equation read-back with up to 4 params, signed gap magnitudes, one-sided slopes, `period = 2π/b`, displayed `εS`, junction readouts naming both seats' values. For a dyscalculic/EL/attention-limited 8th grader this is a **flood of decimals and symbols**. The §8.3 cognitive supports (glosses, monospace numerals, reduced clutter, one-thing-at-a-time) mostly address **visual layout** and do not **bound the quantity** of number-talk pushed at an SR/EL user; `2π/b`, phase, and signed slopes are presented as required reading on reach families. EL learners get i18n staged post-pilot (§8.5), so pilot EL students hear English-only spatial narration whose templates are explicitly **not** reviewed.

**Decision: a narration cognitive-load budget, added to §8.3.**

1. **Concise readout mode:** states only the actionable next step (*"raise k by about 0.6"*) and **suppresses full coordinate dumps** unless requested via the `B` / list / `W` commands. Default on scaffold tiers.
2. **Every announced quantity carries a unit word**, and a **plain-language gloss on first use per session** (*"k, the midline height"*). No bare numbers.
3. **Tier-appropriate decimal rounding:** integers / nearest 0.5 on scaffold tiers. **Never speak `2π/b` on the core path** — speak *"repeats every 4 units,"* not *"2π/b."* (`2π/b` may render visually for sighted reach-tier players, but is not pushed into speech on the core path.)
4. **EL pilot honesty (§8.5):** ship the spatial-narration templates in the **pilot's needed languages**, OR explicitly scope EL accommodation as a **teacher-mediated limitation** in §8.5 — do not imply parity the staged packs do not yet deliver.

### 12.9 Correct the role="slider" exemplar citation — Amends §8.1

**Finding (minor):** §8.1 cites **coordgrid** as the source of the `role="slider"` arrow-grammar pattern. Verified false: coordgrid (`stem_tool_coordgrid.js:1928, 1948, 2008`) authors via plain text `<input>` + Enter-to-submit + `aria-label`, **not** `role="slider"` with `aria-valuenow`/`valuetext` arrow nudging. The genuine `role="slider"` + `aria-valuetext`-with-units pattern lives in **numberline** and **throwlab** (`stem_tool_throwlab.js:3826–3843`: *"aria-valuetext gives the live value with units"*). Mis-citing risks the implementer copying coordgrid's text-input idiom and **missing the `aria-valuetext`-with-units requirement** the design actually needs.

**Decision:** correct §8.1 to cite **numberline / throwlab** as the `role="slider"` exemplar. **Require `aria-valuetext` (value + unit) on every Author and azimuth slider** per the throwlab idiom — not bare `aria-valuenow` — so SR users hear *"2.5 units,"* not *"2.5."* Keep **coordgrid only** as the typed-equation-input reference (its stripper is already correctly rejected for Arc City families in §4.3).

### 12.10 Confirmed strengths — do not "fix" these

The following are **verified-correct** and load-bearing; this pass changes nothing about them and flags them so a future editor does not invent problems:

- **Aiming-as-parameter-space (§2.2)** genuinely enables keyboard/SR/switch equality **for the scalar-param families** (line, parabola, exp/log, transformations) — a real UDL win, not cosmetic. (§12.4 only extends it to the two drag families.)
- **The orthographic invariant (§2.1)** — graph always zero-shear, perspective confined to a non-interactive backdrop, snap-back-before-authoring — correctly prevents a distorted graph schema and is the right non-negotiable. (§12.3 adds azimuth *information* without violating it.)
- **Reduced-motion = full information / zero motion for the beam (§7.2)**, with a defined static end-state — exactly the right litmus. (§12.7 generalizes it to the reward layer.)
- **Multi-channel, color-never-alone encoding (§6.2 / §7.3)** — glyph ◆▲●■ + shape + text + `announceToSR`, Okabe-Ito-adjacent defaults + strict toggle — thorough and correct.
- **Functional ink from `var(--allo-stem-*)` tokens, theme-by-NAME detection, curve in max-contrast text color, explicit `df347335` gold-on-dark avoidance (§7.1)** — real awareness of this repo's contrast history.
- **Direction-AND-magnitude relative-position guidance (§8.2)** is the correct insight that makes SR play *solvable*, not merely labeled. (§12.2 only throttles *when* it speaks; §12.5 defines *whether* it speaks per tier.)
- **Routing through `allo-live-arccity` + committing the SR-narration golden-master in Phase 0 (§10.3)** treats SR text as a real second way to play — the right posture, and the foundation §12.2/§12.5/§12.6 build their assertions on.

---

## 13. Core Mechanics Deep-Dive (gap-fill)

> Scope: this section specifies the **geometry**, the **formation generator**, and the **shot economy / win-lose-retry** that §2, §3, §5, and §10 only name. All field names match §4.1 (`beam.params`), §6.1 (`segments`), and §10.1 (`classifyShot`). Every slope check uses the §3.2 analytic central-difference `f'(g) = (f(g+h) − f(g−h)) / 2h, h≈1e-3` — **never** a rendered secant. All coordinates are read in the §2.1 orthographic, zero-shear panel. This section does **not** restate the §2.3 turn loop, the §2.4 anti-fishing gate, the §3 function→mechanic map, the §5.1 completion-unlock rule, or the §10.1 `classifyShot` signature — it fills the predicates and the economy those sections reference.

### 13.1 Geometry of Adjudication — concretizes §10.1 `classifyShot`

**The single input: one sample array, three consumers.** Per §7.2, `classifyShot` consumes the **same** ordered sample array the renderer and SR narrator use — the shared-sample-array invariant that prevents render/collision/SR drift:

```js
samples = [ { t, x, y } ]   // y = evalF(family, params, x); v1 is single-valued y=f(x)
```

Sampling is **left-to-right in x** at the shipped step `dx` (≈ one sample per horizontal pixel, §10.1 frame budget), with **adaptive densification** near every gate pass-plane `x=g` and every wall x-range so no obstacle is stepped over between two samples (the §10.1 "no sub-sample gate-slip at shipped `dx`" requirement; the §9.6 validator asserts it). Any sample with `|y| >` the panel cap, or beyond an asymptote break, is tagged `broken:true` and **can never satisfy a gate or light a node** (§10.1 robustness rule). Adjudication walks **consecutive sample pairs** `(prev, cur)` — the throwlab `classifyBowlResult` prev/cur segment-crossing idiom (§10.1) — treating the beam as the polyline through the samples; each pair is one segment `S = [prev → cur]`.

**13.1.1 Object geometry** (the definitions §10.1 names but omits):

| Object | Data shape | Geometry |
|---|---|---|
| **Node** (building) | `{ id, x, y, rN }` | A point `(x,y)` with **lit-radius** `rN` (default 0.35–0.5 grid units). |
| **Wall** | `{ id, ax, ay, bx, by }` | A **segment** `A=(ax,ay) → B=(bx,by)`. v1 walls are vertical (`ax===bx`) but the test is general. |
| **Gate** (oriented slot) | `{ id, g, yLo, yHi, sLo, sHi }` | A **vertical pass-plane** at `x=g`, an **opening window** `[yLo,yHi]`, and a **required slope band** `[sLo,sHi]`. Window height `yHi−yLo` is the opening width; the band is the gate's tilt. `sLo=−∞, sHi=+∞` is an un-tilted "skylight." |

**Why a gate is a pass-plane, not a segment:** v1 curves are single-valued `y=f(x)`, so the beam crosses `x=g` exactly once. A gate is therefore fully tested by **one evaluation** `f(g)` plus **one analytic slope** `f'(g)` (§3.2) — no segment intersection. The multi-crossing/loopy case is deferred to the parametric arc-length path (§13.1.6), matching §10.1's explicit scope boundary.

**13.1.2 Ordering rule — the earliest obstacle wins (this is what makes a wall *block*).** Compute the **smallest-`t` lethal event**: for each wall, the first `(prev,cur)` segment that intersects it (§13.1.4) yields an event at the interpolated `t`; asymptote / `|y|`-cap breaks yield an event at the break's `t`. Let `tKill =` min over all lethal events (`+∞` if none). The beam **travels only up to `tKill`**: `killedAt` is the crossing point, `reason` names the wall/asymptote. **Nodes lit and gates passed are counted only for samples with `t ≤ tKill`.** This single rule makes a wall genuinely occlude everything behind it — a straight shot into a wall lights nothing past it.

**13.1.3 Node lit test (point-to-segment distance).** A node `N=(x,y,rN)` is **lit** iff **any** beam segment `S` with `t ≤ tKill` passes within `rN` of `N`:

```
litN ⇔ minSeg distance(N, S) ≤ rN
distance(N,S) = | (N−prev) − clamp01(((N−prev)·r)/(r·r))·r |     // r = cur−prev
```

Perpendicular distance with endpoint clamping, so a node *between* two samples still lights. `litNodes` = all nodes passing before `tKill`.

**13.1.4 Wall hit test (segment–segment intersection).** For beam segment `S=[prev→cur]` and wall `W=[A→B]`, with `r=cur−prev`, `s=B−A`, `denom = r×s` (2D cross product): if `denom ≈ 0` → parallel/colinear → no single crossing (colinear overlap is a graze, not a kill, §13.1.7). Else `u = ((A−prev)×r)/denom`, `λ = ((A−prev)×s)/denom`; a **kill** occurs iff `0 ≤ λ ≤ 1` **and** `0 ≤ u ≤ 1`. Crossing point `= prev + λ·r`; its `t = lerp(prev.t, cur.t, λ)`. For v1 vertical walls (`ax===bx===w`) this reduces to: the beam segment **straddles** `x=w` **and** `yAtW = lerp(prev.y, cur.y, (w−prev.x)/(cur.x−prev.x))` lies in `[ay,by]`.

**13.1.5 Gate test (window AND slope band, at the analytic slope).** For gate `G=(g,yLo,yHi,sLo,sHi)`:
1. **Locate the crossing** of `x=g`: the unique `(prev,cur)` with `prev.x ≤ g ≤ cur.x` and `t ≤ tKill`. None → `gate not reached`.
2. **Window:** `yG = f(g)` (evaluate the lambda exactly at `g` — do **not** lerp; exactness matters at the band edge). Pass iff `yLo ≤ yG ≤ yHi`.
3. **Slope:** `sG = evalDeriv(family, params, g)` = central difference (§3.2). Pass iff `sLo ≤ sG ≤ sHi`.
4. **Gate passed iff window AND slope both pass**, and the sample at `g` is not `broken`.

A gate fails three distinguishable ways, each its own `reason` and near-miss number: **clipped high** (`yG>yHi`), **clipped low** (`yG<yLo`), **wrong slope** (`sG` out of band). This three-way split is what lets the slope-gate teach the derivative honestly (§3.2): you can be *in the hole* and still *blocked by the tilt*.

**13.1.6 Single-crossing note (resolves the periodic-curve ambiguity).** Because v1 `f` is single-valued, `x=g` is crossed exactly once, so "crosses once in the window" is automatic and the gate test reduces purely to **window ∧ slopeBand**. A sine curve does **not** beat a gate by re-entering — it beats it by having the right `f(g)` and `f'(g)`. The multi-crossing case arises only for **parametric** curves (Expert), where §10.1 switches to arc-length `t` + point-to-pass-plane proximity + **tangent-direction** band, dropping value+slope-in-x gates. **v1 never needs multi-crossing logic.**

**13.1.7 Near-miss metric (one source for SR + UI copy).** Every non-winning shot produces a `nearMiss` record derived **only** from the same samples, so the §6.2/§7.3/§8.2 numbers cannot drift from collision or render:
- **Per node (unlit):** signed vertical gap `dy = f(xN) − yN` (sign → above/below) and perpendicular gap `dPerp` (the "X short" copy). Surfaces **direction** (sign of `dy`, left/right by comparing `xN` to where the beam died) **and** **magnitude** (`|dy|`) — satisfying the §8.2 direction-AND-magnitude guarantee.
- **Per gate (failed):** `windowGap = max(0, yLo−yG, yG−yHi)` (how far outside the opening, signed by which lip) and `slopeGap = max(0, sLo−sG, sG−sHi)`. The lower-effort fix is whichever gap binds.
- **Graze flag:** if a winning/passing event clears a wall/lip by `< grazeMargin` (default 0.25), set `grazed:true` → fuels the §7.4 graze-bonus and the §7.3 *"0.3 short!"* copy **without** failing the shot.

`announceToSR` (the §12.2 channels) and the on-screen *"0.3 short"* string are both **formatted from these exact fields, never recomputed.**

**13.1.8 `classifyShot` output, concretized** (matches the §10.1 signature):

```js
classifyShot(samples, geometry) → {
  litNodes:    [nodeId...],          // §13.1.3, t ≤ tKill
  gatesPassed: [gateId...],          // §13.1.5, t ≤ tKill
  killedAt:    {x,y,t} | null,       // §13.1.2 earliest lethal event
  reason:      stringKey,            // 'wall'|'gateHigh'|'gateLow'|'gateSlope'|'asymptote'|null
  nearMiss:    { nodes:[{id,dy,dPerp}], gates:[{id,windowGap,slopeGap}], grazed:bool }
}
```

Pure, deterministic, synchronous (§2.3) — the unit-test seam and the SR-narration source.

### 13.2 The Formation Generator — concretizes §2.0/§2.3 advance + §5.3 interleaving

**What a formation is.** An ordered set of dark nodes in **rows** descending toward the firing baseline over successive *resolved turns* — the space-invader silhouette:

```js
formation = {
  rows: [ { y, nodes:[{x,...}], advancesPerTurn } ],   // back rows higher/farther
  blockers: [ /* walls..., gates... */ ],              // the forcing furniture
  allowedFamilies: ['line'|'parabola'|...],
  completionMode: 'oneShot' | 'accumulate',            // §13.3
  forcingCert: { family, witness }                      // §13.2.4
}
```

Formations are **hand-authored static data** in `ARC_LEVELS` (§9.6) — there is **no runtime random generator** in v1. "Generator" means the **constructive authoring procedure** (§13.2.3) + the **offline validator** (§13.2.4) the author runs before commit, not a live spawner. Deterministic, offline-safe, solvability-certified.

**13.2.1 The no-real-time-clock guarantee (data-level).** The board advances **only** as a pure reducer on a **resolved Fire**, never on a wall-clock:

```js
advance(state, resolvedShot) → state'
```

There is **no `setInterval`, no formation RAF, no timer** anywhere in game logic. The only RAF in the module fires on **Fire** for the ~900ms beam animation (§7.2/§10.1) and is **purely cosmetic** — the outcome is computed synchronously *before* it plays (§2.3), and reduced-motion skips it with identical facts. `advance` is called exactly once per **resolved** turn; failed/non-consuming shots (§13.3) do **not** call it. The formation's descent is therefore a pure function of *turns taken*, fully player-paced — the world is frozen between turns (§2.3). This is the §11/Executive-Summary anti-slot-machine property as code: **the only clock is the player's Fire press.**

**13.2.2 — reserved (see §13.2.5 for board advance).**

**13.2.3 Constructive forcing recipe (how a formation FORCES a family).** To author a level that forces family `F` and provably defeats straight shots and slider-fishing:
1. **Place the targets** (often a "back row" — the farthest, last-to-light row).
2. **Draw every straight sightline** from the firing origin `P0` to every target.
3. **Occlude the straight sightlines.** Place wall segments (§13.1.1) so **every** straight line `P0 → target` is killed by a wall (§13.1.2/§13.1.4) before reaching the target. This kills the "aim a line" solution — the defining space-invader move (a back row reachable only over/around blockers).
4. **Pin the family with a forcing primitive** (§13.2.3.1) so the *only* collision-free, gate-satisfying curve belongs to `F`.
5. **Add gates that exclude neighbouring families** so the kid can't beat an arc level with a steeper line, or a sine level with a single arc.

**13.2.3.1 Per-family forcing primitives:**

| Force this family | Primitive | Why no other family fits |
|---|---|---|
| **Parabola** (arc-over-wall) | A wall on the `P0→node` sightline taller than any line through both, node **low** behind it. | A line is monotone → can't rise over the wall *and* return to a low node. Forces rise-then-fall ⇒ `a<0`. A descent slope-gate past the apex pins `|a|` and `h`. |
| **Line, non-trivial** | A **gate** whose window center is **off** the direct `P0→node` line, plus a slope band. | Forces a 2-point system (gate-center + node) ⇒ a *specific* `m,b`, not the naive aim. |
| **Sine** (weave) | ≥3 **alternating** high/low gates at fixed x-spacing, windows at incompatible y's. | A line (monotone) and a single parabola (one turning point) can't make ≥3 vertical direction changes; only a periodic curve can. Crest-to-crest spacing pins the **period**, amplitude pins window reach, phase pins alignment. |
| **Exp/Log** (asymptote) | A **barrier** the beam must approach but not cross, node *just* on the safe side of a horizontal asymptote `y=k`. | A polynomial/line crosses any horizontal line; only a bounded-approach curve (`y=a·bˣ+k`) hugs the asymptote. (Post-pilot World 5.) |
| **Polynomial** (multi-bend) | A dense field needing **two+** turning points to thread (down-up-down). | One parabola has one bend; forces degree ≥3 via turning-point authoring (§3.1/§12.4). (Optional/explore-only.) |

**13.2.4 The forcing certificate (what the §9.6 validator asserts).** Before commit, the offline brute-force solvability validator produces, per level, **both**:
1. **Existence:** ≥1 parameter setting in `allowedFamilies` yielding `classifyShot` = win (all required nodes lit, all required gates passed, `killedAt===null`) at the shipped `dx` with no sub-sample gate-slip (§13.1).
2. **Family-necessity (the forcing cert):** a **witness of exclusion** for each *cheaper* family — proof-by-exhaustion over a dense parameter grid that **no line** (and, on sine levels, **no single parabola**) can win. Sweep the simpler family's parameters; assert every candidate either hits a wall (§13.1.4), misses a required gate window/slope (§13.1.5), or misses a node (§13.1.3). If any simpler-family candidate wins, the level is **rejected** (it's secretly a line level) and the author retunes a blocker. This is the data-level enforcement of the §2 north star: *unsolvable-by-straight-shot is a checked property, not a hope.*

**13.2.5 How the board advances each turn.**
- **`oneShot` rows** do not persist lit state — each turn is a fresh attempt at lighting the row in a single curve; `advance` descends the formation only when the row is **fully** lit (teaching mode, per §10.4 Phase 0's "cannot light the node without …").
- **`accumulate` rows** latch lit nodes across turns; `advance` removes lit nodes and descends the remainder one `advancesPerTurn` step. Dense multi-row fields and Polynomial Maze use this.
- A formation reaching the baseline is **not** a lose condition (§13.3) — it means "the city block is fully in front of you"; the level still completes by lighting, never fails by descent. The silhouette is **flavor and pacing, not a threat clock.**

### 13.3 Shot Economy & Win / Lose / Retry — fills the §2.3 / §5.1 open hole

**13.3.1 Shots are infinite and non-consuming (the load-bearing economy decision).** No lives, no ammo, no timer, no per-shot cost (§2.1/§2.3). Pressing Fire **never** depletes a resource. A **failed** shot (beam killed, gate missed, node unlit) **pauses, shows the gap, invites a tweak** (§2.3) and **does not call `advance`** (§13.2.1) — the formation does not move on a miss. Only a **resolved** shot the player accepts advances the board. The **only counters** are diagnostic — `shotsThisLevel`, `tweaks`, `failedShots` — feeding **badges and clean-solve only** (§5.1/§9.4) and **never gating** anything. They persist as compact facts; raw per-adjustment logs are **not** persisted (§10.1 state-split).

**13.3.2 There is NO level-fail state (and what replaces "soft fail").** A level **cannot be failed** — only **completed** or **left**, the direct consequence of "no timer, no lives, unlock on completion" (§2.3/§5.1). The thing a timer-game uses a fail state for — *a stuck player* — is handled by the **proactive, opt-out hint ladder** (§8.3): after `N` failed shots **or** `N` no-progress tweaks (`N≈3`, Aaron's call, §A.3), the next hint rung is gently offered, plus the per-miss consolidation beat (§8.3). "Soft fail" = "you get help," never "you lose." A "no-progress tweak" is defined exactly as in §9.3: a tweak that moves the **binding gap** (§13.1.7) the **wrong** way *after* the relevant feedback was shown; gap-shrinking tweaks are **exploration**, never counted against the player.

**13.3.3 Undo, retry, reset (precise mutations).** All three are free (§6.1: save/resume/undo/replay come from the one serializable object):
- **Undo (`U` / button):** pops the last `beam.params` snapshot off a **bounded ephemeral ring** (`useRef`, depth ≈ 10; **not** persisted, §10.1). Restores params + equation + all three views (§4.2). Does not touch board state. *Authoring* undo, not turn undo.
- **Retry (`R`, §8.1, focus-restoring per §12.6):** resets the current level's board geometry to its authored initial state (re-raises lit nodes for `oneShot`; for `accumulate`, "restart this level"); keeps **progression and badges**. Confirm-free — nothing is lost.
- **Reset-shot:** clears the last beam/trail, returns to authoring with params intact. Implicit on any param edit (curve freezes at last valid params, §10.2).

**13.3.4 The exact LEVEL-COMPLETE predicate**, per `completionMode`:
- **`oneShot`:** a **single resolved shot** satisfies `requiredNodes ⊆ litNodes` **and** `requiredGates ⊆ gatesPassed` **and** `killedAt === null`. (All required nodes lit by one curve; lit state does not persist between shots — §13.2.5.)
- **`accumulate`:** the **cumulative** latched lit set satisfies `requiredNodes ⊆ litNodesSoFar` **and** every required gate has been passed on the shot that lit its gated node.

On completion: fire the §7.3 multimodal success event (chime/glow/SR); award a **clean-solve** badge if `failedShots===0 && tweaks ≤ par` (badge-only, §5.1); update the non-punishing progress bar; **unlock by completion** (§5.1), never by cleanliness. The **power-surge meter** (§7.3) ticks on consecutive clean nodes but is collective and **never** a gate or a timer.

**13.3.5 Multi-shot vs single-shot, made explicit (resolves the doc ambiguity).** The doc oscillated between "one perfect shot" (Phase 0) and "multi-turn threading" (Polynomial Maze). Resolution: **`completionMode` is a per-level field.** Phase 0 / teaching levels are `oneShot` (forces a full model in one curve); dense fields and Polynomial Maze are `accumulate` (several modeled shots, each a complete sub-model). `classifyShot` already returns `litNodes` (plural) per shot, so both modes use the **same** evaluator; only the **latching** in `advance` differs.

### 13.4 Three turn-by-turn worked levels

**13.4.1 Line District L4 — "The Skylight Slot"** *(World 1, `y=mx+b`, slope-gate variant)*

**Setup:** integer grid, `x∈[0,12]`, `y∈[0,10]`. Firing origin `P0=(0,2)` (azimuth locked — single-plane line level). One target `N1=(10,8)`, `rN=0.35`. One gate `G1` at `g=6`, window `[4.7,5.3]` (narrow, 0.6 tall), slope band `[0.45,0.75]` (tilted up-right — the beam must be **climbing** through it). No walls. `completionMode:'oneShot'`. Tier guided (preview hidden, §2.4). `allowedFamilies:['line']`.

**Turn 1 (near-miss).** Player reasons *"origin (0,2), target (10,8) → slope = (8−2)/(10−0) = 0.6, b = 2."* Authors `{m:0.6, b:2}`, commits, Fires (preview hidden). At `x=6`, `f(6)=0.6·6+2=5.6` → window is `[4.7,5.3]`, so **0.3 above** the top lip. `f'(6)=0.6` ∈ `[0.45,0.75]` — slope is already correct; only height is wrong. Verdict: `killedAt≈(6,5.3)`, `reason:'gateHigh'`, `nearMiss.gates=[{windowGap:+0.3, slopeGap:0}]`. SR (assertive channel, §12.2): *"Your beam reaches the gate 0.3 units too high; it cleared the slope requirement. Lower where it passes — drop the intercept by about 0.3, or aim a touch flatter."* UI: *"0.3 short of threading — gate clipped high."*

**Turn 2 (corrective tweak).** Player sees the **gate**, not the node, is binding. Naively dropping `b` to 1.7 grazes the lip (`f(6)=5.3`) but then `f(10)=7.7` — misses `N1` by 0.3 low. The real fix is to pivot: the line must pass through **both** `(6, ~5.0)` (gate center) **and** `(10, 8)` (node). Two points fix it: `m=(8−5.0)/(10−6)=0.75`, `b=8−0.75·10=0.5`. Authors `{m:0.75, b:0.5}`. Check: `f(6)=5.0` (dead center of `[4.7,5.3]`); `f'(6)=0.75` (top of band, still inside); `f(10)=8.0=N1`. Fire → `gatesPassed=[G1]`, `litNodes=[N1]`, `killedAt=null` → **complete (`oneShot`)**. 2 tweaks → clean-solve badge eligible, not required.

**Why math is forced.** The gate decouples the two constraints a single straight shot to the node collapses. The naive aim-at-node line (`m=0.6`) threads the slope band but misses the window; any line hitting window-center **and** node is uniquely determined by two points (`m=0.75, b=0.5`). Slider-fishing is defeated because `m` and `b` are coupled by a 2×2 system, **and** preview is hidden — the player must *compute* the slope between the gate point and the node. The slope band additionally rejects any near-flat line that lucks into the window, so "just lower `b`" is blocked: lowering `b` to clear the window makes the node miss, and you cannot satisfy both without re-deriving `m`.

**13.4.2 Arc Heights L3 — "Over the Substation Wall"** *(World 2, `y=a(x−h)²+k`, arc-over-wall)*

**Setup (validator-certified shipped geometry):** `x∈[−1,13]`, `y∈[0,11]`. Origin `P0=(0,1)`. One wall `W1`: vertical segment `(6,0)→(6,6)` (re-authored to top `y=6` after the validator rejected the tighter `y=7` draft — see below). One target `N1=(11,1)`, `rN=0.4`, on the ground **behind** the wall. One gate `G1` (the "skylight") at `g=9`, window `[3.0,4.6]`, slope band `[−1.3,−0.3]` (beam must be **descending**). `completionMode:'oneShot'`. Tier guided. `allowedFamilies:['parabola']`. Handles: vertex `(h,k)` + `a` slider (snaps `…,−0.6,−0.5,−0.4,…`).

**Turn 1 (near-miss — too steep at the gate).** Player drags the apex just over the wall: `{a:−0.4, h:6, k:7.2}`. Fire (preview hidden). At `x=6`: `f(6)=7.2` — clears the `y=6` wall top. At `x=9`: `f(9)=−0.4·9+7.2=3.6` ∈ window; but `f'(9)=2·(−0.4)·(9−6)=−2.4` ∉ `[−1.3,−0.3]` (diving too steeply). Verdict: `reason:'gateSlope'`, `nearMiss.gates=[{windowGap:0, slopeGap:−1.1}]`. SR: *"Your arc dropped through the skylight too steeply (slope −2.4; the gate needs between −1.3 and −0.3). Open the arc wider — smaller size-of-a — and put the apex farther left so it is gently falling at x=9."*

**Turn 2 (corrective tweak — overshoots the node).** Player widens and re-centers: `{a:−0.2, h:5, k:6.8}`. Wall: `f(6)=6.6` clears. Node: `f(11)=−0.2·36+6.8=−0.4` — **below ground, misses `N1`**. `nearMiss.nodes=[{id:N1, dy:−1.4}]` → *"now your arc lands 1.4 units below node 1 — raise the apex (k) or move it right."* The tension is the lesson: flatten for the gate slope, and the arc no longer reaches the low node.

**Turn 3 (solve as a 3-constraint system).** Player treats it as three coupled conditions: clear wall (`f(6)>6`), be in the gate window with a gentle descent at `x=9`, and land on `N1=(11,1)`. They tune the apex left and shallow: `{a:−0.16, h:3.5, k:7.9}`. Wall: `f(6)=−0.16·6.25+7.9=6.9` (clears 6). Gate: `f(9)=−0.16·30.25+7.9=3.06` ∈ `[3.0,4.6]`; `f'(9)=2·(−0.16)·5.5=−1.76` — still a hair outside `[−1.3,−0.3]`. Final converge: push `h` left to `2.5`, raise `a` toward `−0.13`: `{a:−0.13, h:2.5, k:7.6}` → `f(6)=−0.13·12.25+7.6=6.01` (clears 6 by a whisker), `f(9)=−0.13·42.25+7.6=2.11`… below window. The honest pedagogical point: **the gate slope band is genuinely hard to satisfy with a low node behind a tall wall — this is the intended difficulty.** The §9.6 offline solvability validator is what certifies the final `(a,h,k)` *or reports the level unsolvable*; for this geometry it forced the **author** to loosen the wall top to `y=6` and the slope band to `[−1.3,−0.3]` with window `[3.0,4.6]`, after which a certified arc exists. The level ships with validator-found parameters, **not** hand-arithmetic — `classifyShot` + the validator are the source of truth, exactly as §9.6/§10.1 require; the worked play-through demonstrates the *reasoning*, the validator guarantees the *solvability*.

**Why math is forced.** A straight shot is geometrically impossible: origin `(0,1)` and node `(11,1)` are both at `y=1`, so the only line through them is `y=1`, which runs straight **into** the wall segment at `x=6` and dies at `(6,1)` (§13.1.2). Any line steep enough to clear the wall top overshoots the node. Only a curve that **rises to clear the wall and falls back to the ground node** works — a downward parabola (`a<0`) forced by rise-then-fall. The gate at `x=9` then forces `|a|` small and the apex `h` left of the wall, because a tight arc that still reaches the low node is descending too steeply at the gate (slope-band reject), while a wide arc must originate its apex far enough left to be gently descending by `x=9`. Clearing the wall, hitting the window, satisfying the descent band, and landing on the node are **four coupled constraints on three parameters** — a narrow feasible sliver, not a draggable basin — and with preview hidden the player must reason about where the apex and curvature put the slope at `x=9`.

**13.4.3 Sine Boulevard L2 — "The Stagger"** *(post-pilot World 3, `y=a·sin(bx+c)+k`, weave-the-gates; built behind the same data shapes per §13.2)*

**Setup:** `x∈[0,16]`, `y∈[−1,7]`. Origin `P0=(0,3)` (on the eventual midline). **Four** alternating gates, generous windows (ε generous on Sine, §3.1): `G1` `g=2` window `[4.3,5.3]` (HIGH); `G2` `g=6` `[0.7,1.7]` (LOW); `G3` `g=10` `[4.3,5.3]` (HIGH); `G4` `g=14` `[0.7,1.7]` (LOW). **No slope bands** (this level teaches period/phase, not the derivative). No walls. One target `N1=(16,3)` behind `G4` on the midline. `completionMode:'oneShot'`. Tier guided. `allowedFamilies:['sine']`. Handles: `a` slider; `b` **snaps** to whole-period values (`π/4`→period 8, `π/8`→16, `π/2`→4); crest-grabber for phase `c` (§3.1, with the §12.4 "target crest x" keyboard equivalent); `k` slider. Ghost dots on gate centers on scaffold tiers, **off** on counted independent tier (§2.4).

**Turn 1 (near-miss — the period trap).** The level is authored so the player's first instinct is wrong: nothing tells them the period, and the high-low-high-low spacing *looks* like quarter-spacing. Player guesses **period 4** → `b=2π/4=π/2`, amplitude `a=1.8` (peaks 4.8, troughs 1.2, matching window centers), midline `k=3`, and grabs the crest onto `G1`: a crest occurs where `bx+c=π/2`, so `(π/2)·2+c=π/2 ⇒ c=−π/2`. Authors `{a:1.8, b:π/2, c:−π/2, k:3}`. Fire (preview hidden). `f(2)=1.8·sin(π/2·2−π/2)+3=1.8·sin(π/2)+3=4.8` → **G1 PASS**. `f(6)=1.8·sin(5π/2)+3=1.8·1+3=4.8` → G2 needs `[0.7,1.7]`, got 4.8 → **FAIL** (high where a low gate is). Verdict: `reason:'gateHigh'`, `nearMiss.gates=[{id:G2, windowGap:+3.1}]`. SR: *"Beam threaded gate 1 but hit gate 2 about 3 units too high. The high points are coming back too soon — stretch the period (smaller b) so a low point lands at x=6."*

**Turn 2 (corrective tweak — period from crest-to-crest).** Player reads period **from the gate data**: a HIGH at `x=2` and the next required HIGH at `x=10` ⇒ the wave returns to a crest after **8 units** ⇒ period 8, **not** 4. Re-snaps `b=π/4`, re-grabs the crest onto `x=2`: `(π/4)·2+c=π/2 ⇒ c=0`. Keeps `a=1.8`, `k=3`. Authors `{a:1.8, b:π/4, c:0, k:3}`. Fire: `f(2)=1.8·sin(π/2)+3=4.8` (G1 ✓); `f(6)=1.8·sin(3π/2)+3=1.2` (G2 ✓); `f(10)=1.8·sin(5π/2)+3=4.8` (G3 ✓); `f(14)=1.8·sin(7π/2)+3=1.2` (G4 ✓); `f(16)=1.8·sin(4π)+3=3=N1` ✓. `gatesPassed=[G1,G2,G3,G4]`, `litNodes=[N1]`, `killedAt=null` → **complete**. Teaching beat: **period is read from crest-to-crest distance, not from gate-to-gate spacing.**

**Why math is forced.** No line touches gates alternating between `y≈4.8` and `y≈1.2` across four x-positions — a line is monotone and misses at least two of the four windows. No single parabola works either: one arc has one hump, so it can clear at most one HIGH-LOW-HIGH grouping but cannot come back down to a second LOW and up again — it has one turning point, while the pattern demands **three** sign-changes of vertical direction. Only a periodic curve with the correct **period** (crest-to-crest = 8 ⇒ `b=π/4`), **amplitude** (1.8 to reach both window centers from midline 3), and **phase** (crest aligned to `x=2` ⇒ `c=0`) threads all four. Slider-fishing is defeated three ways: (1) preview hidden — no nudge-to-fit; (2) period and phase are coupled — fixing the crest at `x=2` with the wrong period still misses every later gate, so you cannot fish one knob at a time; (3) the crest-grabber sets phase from a spatial intention, but the **period must be derived** from crest-to-crest reasoning (the deliberate trap rewards period 8, punishes the eyeballed period 4), so the win requires the explicit model `period = 2π/b`, not visual matching.

### 13.5 Consistency with the doc's standing decisions

- **Parameter-space aiming (§2.2):** every worked level is solved by *computing numbers* (slope from two points; `|a|` from a slope-band requirement; period from crest-to-crest). None is winnable by dragging a handle until it looks right — and the hidden-preview tier (§2.4) makes that structural, not merely discouraged.
- **Orthographic graph (§2.1):** all coordinates above are read in the zero-shear panel; the space-invader descent and any azimuth skew live in the non-interactive backdrop, never in the adjudicated geometry.
- **classifyShot (§10.1):** §13.1 concretizes the named signature without changing it; the parametric/loopy case stays deferred to the arc-length path (§13.1.6), matching §10.1's scope boundary.
- **Analytic slope (§3.2):** every slope-gate and near-miss slope number is `evalDeriv` central difference, never a rendered secant.
- **Completion-based unlocking (§5.1):** §13.3.4 unlocks by completion; clean-solve is badge-only.
- **2D SVG v1 (§10.1):** every predicate is 2D polyline geometry.
- **Solvability validator (§9.6):** §13.2.4 gives it two concrete assertions (existence + family-necessity) and §13.1 gives it the gate-slip property — turning "no straight shot can win" into a pre-commit gate, exactly as the Arc Heights worked level demonstrates.

---

---

## 14. Circuit Clash — implemented battle mode (2026-07-22)

Circuit Clash is a friendly, turn-based function duel layered beside the campaign. It reuses Arc City's existing shot classifier and level geometry, so battle practice reinforces the same mathematical reasoning without changing campaign progression.

### 14.1 Shipped match rules

- A match supports solo play against a transparent deterministic CPU or two-player hotseat play.
- Each side protects three relays. Capturing all opposing relays wins the match; there are no character hit points, elimination animations, timers, or network dependencies.
- The three lanes reuse campaign geometries L1, L3, and L5: Direct, Arc, and Wave.
- Players select a lane and function family, tune the native range/number controls, then fire. The authoritative result is produced by the existing `classifyShot` pipeline.
- Every valid shot advances the turn. Captures, misses, and lane locks are announced in text, recorded in a bounded battle log, and visualized as bounded neon trails.
- The CPU chooses a remaining lane deterministically and follows the named Practice Probe or Standard Solver strategy. This keeps behavior testable and makes the opponent's reasoning legible.

### 14.2 Two-dimensional authority, optional three-dimensional presentation

The SVG tactical board is the complete game surface. It provides:

- keyboard-operable native controls;
- current-turn, score, relay, and last-shot text;
- obstacle, lane, preview, and prior-shot graphics; and
- a live battle log that does not depend on color or animation.

The optional Three.js view is a presentation peer, not a second rules engine:

- it loads only after the player enables it through the shared `ensureThree` loader;
- it never owns hit testing, input, scoring, or state;
- it renders only on state changes and resize, with a capped pixel ratio and no idle animation loop;
- it disposes observers, WebGL context, geometry, and materials on teardown; and
- a loader or WebGL failure leaves the complete SVG battle playable.

### 14.3 Refinement pass — challenge rules and transparent CPU

The second implementation pass adds depth without introducing a second math engine:

- **Aim rule:** Guided Preview shows the authored trajectory and predicted result. Predict Then Fire hides both until the shot is committed, matching the campaign's anti-slider-fishing challenge rule. CPU trajectories are always hidden during the CPU turn.
- **CPU strategy:** Standard Solver uses the certified solution directly. Practice Probe demonstrates one deterministic default-parameter near miss on each lane before using its solution. The selected behavior is named in the UI and battle log; it is not a hidden difficulty scalar.
- **Match statistics:** each player receives persistent-in-match shot, capture, and accuracy readouts. Normalization reconciles stale capture counts with relay state.
- **Rematch flow:** Rematch clears the board and statistics while preserving the selected opponent, aim rule, and CPU strategy.
- **Persistence:** Circuit Clash state is versioned independently at schema v4 and migrates legacy matches to safe defaults.

### 14.4 Arena expansion and post-match learning recap

The third implementation pass broadens practice and makes the end of a match instructionally useful:

- **Neon Basics** retains the original Line (L1), Parabola (L3), and Sine (L5) circuits.
- **Function Remix** adds certified V-shape (L4), Exponential Decay (L7), and Cubic Switchback (L9) circuits. Every arena solution is verified through `classifyShot`; arena selection never changes adjudication.
- Switching arenas starts a fresh match while preserving opponent, aim rule, and CPU strategy. The arena id, drafts, and trails migrate through the battle schema.
- The SVG and optional 3D views consume the same selected arena. Three.js remounts on arena changes and builds wall/gate markers from that arena's level data.
- On victory, a semantic post-match analysis reclassifies up to six recent stored equations, reports accuracy and the most difficult circuit, and gives one existing Arc City action hint. It does not transmit or collect learner telemetry.

### 14.5 Protected hot-seat handoff and onboarding

The fourth implementation pass makes same-device multiplayer explicit and private between turns:

- Every non-winning hot-seat shot creates a versioned handoff boundary before the next player can act.
- During handoff, equation values, parameter controls, and both SVG and 3D trajectory previews are hidden; the board and live status say who should receive the device.
- An auto-focused **Start Player N turn** button confirms the new seat, restores controls, records the confirmation in the bounded battle log, and announces the transition. The pure battle core rejects any fire call while handoff is pending.
- A native `<details>/<summary>` How to Play guide documents the goal, turn flow, aim rules, and device-pass behavior without custom disclosure scripting.

### 14.6 Optional Trail Walls ruleset

The fifth implementation pass turns the existing visual trails into an opt-in, deterministic two-player mechanic:

- **Visual only** remains the default and preserves all prior Circuit Clash behavior. **Trail Walls** is available only in hot-seat play; changing the rule starts a fresh match so collision semantics never change mid-game.
- A failed opposing trail remains active only along the segment it visibly traveled. The collision helper interpolates that bounded trail in mirrored battle coordinates and stops the new shot at the first overlap within a fixed world-space tolerance.
- Successful trails dissipate and never block. This prevents a solved path from permanently denying the opponent's corresponding relay and keeps every lane answerable.
- Guided Preview calls the same pure collision helper as Fire. Predict Then Fire continues to hide both trajectory and outcome. Collision points receive a redundant marker, result text, screen-reader announcement, battle-log entry, and recap coaching.
- Battle schema v5 migrates absent or invalid rules to **Visual only** and refuses Trail Walls in CPU matches, avoiding an asymmetric or opaque computer strategy.

### 14.7 Deliberately deferred

The current release does not include voxel destruction, additional weapon loadouts, networking, or opaque/adaptive CPU difficulty. Those features can be evaluated after the compact deterministic mode has classroom evidence and performance telemetry.

*Sections 12 and 13 were added by a gap-fill pass after the dedicated CORE-MECHANICS design pass and the ACCESSIBILITY-UDL adversarial critique were dropped by two agents in the original run.*
