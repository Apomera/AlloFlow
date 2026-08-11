# Machine Lab (Simple Machines & Stored Energy) — Spec for Review

**Status:** **P1 through P4 BUILT 2026-08-10** and passing their gates, uncommitted and
undeployed. All six design questions resolved by Aaron (see section 13). Remaining: P4b
(`archStudio` import) and P5 (rigid-body debris).

**Recommendation on P5b: do not vendor `cannon-es`.** The library check in section 6.2 stands
and the dependency would work, but P5a made it close to pointless. The 3D wall is an
instanced voxel batch, and a breached block is displaced by a hash of its own grid
coordinates. That delivers the visible collapse at zero dependency cost, and it is
*better* than a rigid-body layer on three counts:

1. **It is reproducible.** The same wall always falls the same way, so it can be
   screenshot-tested. A solver seeded from wall-clock time cannot be.
2. **It cannot desync from the score.** The rubble is derived from the same block states the
   ledger reads, rather than running alongside them.
3. **It costs one buffer update per shot.** A 400-body solver on a school Chromebook does not.

What a real solver would add over this is tumbling and inter-block collision, which is
eye-candy on a tool whose subject is the machine. Ship P5a; revisit P5b only if the
displacement heap looks unconvincing in the browser, which is a judgement call that needs
Aaron's eyes on it rather than another test.

**Scope note on the wall:** it renders in BOTH the 3D scene and a 2D SVG diagram, with a
course-by-course table always in the markup. The 3D view failing changes nothing about the
numbers or the other two representations.

**One structural finding from P4:** the gatehouse arch was a floating block, because a
block-grid support rule ("rest on the block below") has no way to express an arch. Arch
blocks now carry an `arch` flag and are held by their springing, so taking one side drops
only that half. That is the lesson the gatehouse preset exists to teach, and it fell out of
a test that refused to accept a floater.

**One correctness fix from building P3, now pinned by tests:** the ledger treated
`muzzleKE − impactKE` as the drag loss. With `launchElevation > 0` the stone *gains*
`m g h` on the way down, so that row went negative and the impact bar overflowed its track
whenever the machine stood on a tower. `shot()` now returns `dropGain` and `dragLoss`
separately, the ledger shows the drop as a credit, and the bars normalise against the
largest quantity in the chain rather than against crank work alone.

**One content correction:** the onager copy claimed worse transfer efficiency than a
ballista. The model says the opposite and the model is right: two bundles store twice the
energy but there are two arms to accelerate, so the onager gets a better share of a smaller
store. The copy now says that, and a test pins both halves.

**Two model findings from building P2, both now pinned by tests:**

1. **The integrator is velocity Verlet, not semi-implicit Euler** as section 5.4 originally
   specified. Semi-implicit Euler at dt = 1 ms missed the closed-form vacuum solution by
   about 0.07%, which is fine for an animation and not fine for a test pinned to an
   identity. Velocity Verlet's position update is *exact* for constant acceleration, so the
   vacuum case now matches to 1e-5 and the result is step-size independent.
2. **The interior range optimum needs air.** Section 5.3 claimed maximum range sits at an
   intermediate projectile mass. That is true only with drag on: in a vacuum,
   `R = 2E sin2θ / (g(m_p + m_eff))` falls monotonically as mass rises, so lighter is always
   further. Both facts are now tested, and the g9-12 copy makes the point explicitly, since
   "the sweet spot is a fact about drag, not about levers" is a better lesson than the
   original claim.

| Phase | State |
|---|---|
| P1 `machines` view, 6 benches, 4 grade bands | **Built.** `stem_lab/stem_tool_machinelab.js` |
| P2 `build` + `range` (3D trebuchet, energy ledger, flight) | **Built.** |
| P3 Ballista + onager, `compare` view, Field Manual, AI panel, i18n | **Built.** |
| P4 `siege` view, 4 wall presets, deterministic damage, breach scoring | **Built.** |
| P4b `archStudio` import | **Built.** |
| P5a Wall in the 3D scene, deterministic rubble, no dependency | **Built.** 235 tests across 9 files |
| P5b `cannon-es` rigid-body debris | **Probably unnecessary now.** See below |
| P4 / P4b `siege` view, wall presets, archStudio import | Not started |
| P5 `cannon-es` debris | Not started |
**Date:** 2026-08-10, revised 2026-08-10 after Aaron's answers
**Name:** Machine Lab (Aaron's pick over "Siege Lab": accurate to the curriculum, no
combat association, and it keeps the tool's subject in its title). "Siege" survives only
as the internal id of the target-wall view.
**Proposed id:** `machineLab`
**Section:** Engineering & Design (`_cat_EngineeringDesign`, `stem_lab_module.js:5239`)
**Pattern siblings:** `physics` (projectile kinematics), `throwlab` (spin/drag ballistics),
`bridgeLab` (structures under load), `archStudio` (3D block building, has a "Castle Tower"
preset), `coasterLab` (3D + energy telemetry).

---

## 1. Why this is a new tool and not a 3D reskin of `physics`

Verified by reading the tree, not assumed:

| Already shipped | What it owns |
|---|---|
| `stem_tool_physics.js` (3,209 lines) | angle/velocity/gravity/air-resistance, Cadet-Gunner-Sniper target rounds, predict-then-launch, energy bar, vector overlay, Vx/Vy graphs, myth quiz |
| `stem_tool_throwlab.js` (6,518 lines, 422 KB) | Magnus spin, wind vector, release height across baseball / golf / football / volleyball / cricket |
| `stem_tool_skatelab.js` | air time as projectile motion |
| `stem_tool_bridgelab.js` | 319 references to collapse / stress / failure / truss, real case studies |
| `stem_tool_archstudio.js` | real THREE scene (`window._archScene`, `stem_lab_module.js:3339`), raycast block placement, STL export, "Castle Tower" preset |

So parabolas are covered three times and structural failure is covered once, well.

**The actual hole:** grepping `mechanical advantage|fulcrum` across all 156 files in
`stem_lab/` hits only `anatomy`, `aquaculture`, `bikelab`, `fisherlab`, `printingpress`
and `raptorhunt`, every one of them incidental. There is **no lever, pulley, wheel-and-axle,
inclined plane, wedge or screw tool** anywhere in the lab. That is a core K-8 engineering
standard with zero coverage, sitting in the section that has the fewest tools
(Engineering & Design has 5; Earth & Space has 27).

**Design consequence:** the machine is the subject, the projectile is the measurement.
The viral castle-demolition demos are rigid-body showcases whose teaching payload is
roughly zero. Chasing the debris produces an expensive second copy of `physics`. Chasing
the machine fills a real gap, and the flight becomes the payoff.

**The one non-negotiable architectural rule** (see section 6): every number the student is
graded on comes from the deterministic analytic model. The rigid-body sim, if we ship it,
drives cosmetic debris only and never feeds a score.

---

## 2. Tool identity

```js
window.StemLab.registerTool('machineLab', {
  icon: '🏰',            // 🏰  (alt: ⚙️ if we want to foreground the machine)
  label: 'Machine Lab',              // alt: "Machine Lab"
  desc: 'Build a trebuchet, ballista or onager. See how levers, pulleys and winches ' +
        'store and move energy, then measure what actually reaches the target.',
  color: 'amber',
  category: 'engineering',
  questHooks: [ /* section 8 */ ],
  render: function (ctx) { /* ... */ }
});
```

Header boilerplate is the standard one from `stem_tool_physics.js:14-36`: the defensive
`window.StemLab = window.StemLab || {...}` registry stub, the shared reduced-motion CSS
block, the WCAG 4.1.3 live region, then the IIFE.

---

## 3. Views

Five views behind a single `d.view` switch. Grade-band gating via `ctx.gradeLevel`.

### 3.1 `machines` — Simple Machine Shop (the curricular core, ships first)

Six benches, each an isolated, manipulable diagram with a live number readout. No siege
weapon yet; this is the vocabulary the rest of the tool spends.

| Bench | Manipulable | Live readout |
|---|---|---|
| Lever | fulcrum position, effort arm, load arm | `MA = d_effort / d_load`, effort force needed |
| Pulley | number of supporting rope segments (1..6) | `MA = n`, rope pulled vs load raised |
| Wheel & axle (windlass) | handle radius R, drum radius r | `MA = R / r`, turns per metre of rope |
| Inclined plane | ramp length, height | `MA = L / h`, force along ramp |
| Wedge | length, thickness | `MA = L / t` |
| Screw | pitch, handle radius | `MA = 2πR / pitch` |

Every bench carries the same closing line, because it is the single idea the whole tool
is built to deliver:

> Mechanical advantage trades **distance** for **force**. It never creates energy.
> Work in equals work out, minus friction.

Each bench has a "prove it" panel: student enters predicted effort force, tool checks
against the computed value, awards XP on a correct prediction. Mirrors the
predict-then-launch pattern already proven in `physics` (`d.predictedRange`,
`d.predictionStreak`).

### 3.2 `build` — Machine Shop (3D)

Pick a machine, tune it, watch the parts move. Three machines, each a different energy
store, which is the comparison that makes the unit work:

| Machine | Energy store | Simple machines present |
|---|---|---|
| **Counterweight trebuchet** | gravitational PE (`Mgh`) | class-1 lever (beam), sling as second lever stage, windlass to cock |
| **Torsion ballista** | elastic PE in two twisted rope bundles | two levers (arms), block-and-tackle draw, ratchet pawl (wedge), tensioning screws |
| **Onager** | elastic PE in one torsion bundle | single lever arm, windlass, wedge stop |

Controls, all live-updating the energy ledger:

- Trebuchet: counterweight mass `M`, drop height `h`, beam ratio `L_long : L_short`, sling length, release-pin angle.
- Ballista: bundle stiffness (turns of twist), arm length, draw length, string mass.
- Onager: bundle stiffness, arm length, arm mass, stop angle.
- Shared: projectile mass `m_p`, projectile diameter, launch elevation.

Also shared: **winch gearing** (handle radius, drum radius, pulley count). This is where
mechanical advantage becomes visceral: raising the MA does not increase the shot at all,
it only reduces the crank force and increases the number of turns. Expect students to get
this wrong, and design the panel so the "wait, the range didn't change" moment lands.

### 3.3 `range` — Test Range

Fire. Track the shot. Full ledger on the right, flight graph below.

Reuses the existing projectile treatment rather than growing a third one (section 5.4).

### 3.4 `siege` — Target Wall

The wow view. A masonry wall takes hits. Damage is a deterministic per-block energy
budget, see 5.5. Optional cosmetic debris from the rigid-body layer, see 6.2.

**Targets ship as built-in presets. The `archStudio` import is a bonus on top, never a
prerequisite** (Aaron, 2026-08-10). A student who has never opened `archStudio` gets a
complete tool, and the presets double as the fixed geometry the damage tests assert
against, which the import path could never provide.

Four built-in targets, ordered so each one teaches a different structural lesson:

| Preset | Geometry | The lesson |
|---|---|---|
| `curtain` | flat wall, 12 wide × 6 courses | Baseline. Energy per hit vs. block budget, nothing else going on |
| `gatehouse` | wall with an arched opening and flanking towers | The arch redistributes load, so the spandrel is stronger than the flat span beside it |
| `keep` | square tower, 4 walls, 10 courses | Corners are stiff, mid-wall is not. Aim point matters more than power |
| `motte` | tower on an earth mound | Elevation as a defensive variable. Forces the student back to the launch-angle question |

Each preset is a plain block list (`{id, x, y, z, material}`), the same shape
`archStudio` already stores, so the import path is a pass-through rather than a
translation layer.

`wallPreset: 'imported'` reads the student's most recent `archStudio` build. Because the
tool is fully playable without it, this can slip to P4b if the cross-tool contract turns
out to be more work than it looks.

Framing is historical and engineering, not combat: no defenders, no casualties, the
scoring language is "breach the curtain wall in the fewest shots at the lowest crank
effort," which is an engineering-efficiency objective rather than a body count.

### 3.5 `learn` — Field Manual

**Confirmed in scope, including the historical content** (Aaron, 2026-08-10).

Grade-banded explainers, the energy-ledger walkthrough, the historical notes, and the AI
"Explain at grade level" panel following the exact pattern at the tail of
`stem_tool_physics.js` (`ctx.callGemini`, level chips, `aria-label` prefix/suffix keys).

Historical content, with the sourcing rule that governs it:

| Topic | Claim type |
|---|---|
| Greek and Roman torsion artillery (the `ballista`, `onager`, the `modiolus` tensioning system) | Well documented, cite Marsden or the Vitruvius/Heron primary descriptions |
| Torsion bundle materials (sinew, horsehair, women's hair as an emergency substitute) | Attested in the sources but repeated uncritically in popular retellings; state what the source says, not what the internet says |
| Counterweight trebuchet arrival in Europe (12th-13th c.) | Broadly agreed, but exact dating and transmission route are contested. Hedge |
| Specific range figures ("300 m", "a 90 kg stone") | **Highest risk.** Reconstruction figures get quoted as if they were medieval measurements. Attribute to the specific modern reconstruction, or leave out |
| Whether siege engines "brought down castle walls" directly | Frequently overstated. Undermining and starvation did more. Say so; it is a better lesson than the myth |

**The rule, per the project's scientific-integrity constraint:** no contested claim is
stated as settled fact. Where scholarship disagrees, the manual says it disagrees and
names the disagreement, in the same way `parentingLab` hedges its contested findings.
Anything that cannot be sourced to a named work does not ship. This is a content-authoring
task with real research hours in it, not a paragraph of filler, and P3 should be sized
accordingly.

### 3.6 Grade responsiveness (cross-cutting, applies to all five views)

**RESOLVED 2026-08-10.** Aaron: "it should work for all grades, depend on what the student
selected." So every band gets the **whole** tool. Nothing is hidden, nothing is locked.
What changes is how the same physics is *said*.

That distinction matters, because the existing precedent does the opposite thing for a good
reason. `stem_tool_firstresponse.js:1634` uses `bandIncludes(card, gradeBand)` to **filter
cards out** below a band, which is right when the content is overdose and mental-health
protocols. Machine Lab has no content that is unsafe for a second-grader, so it **restates**
rather than filters. Same machine, same ledger, four registers. That is multiple means of
representation in the UDL sense, rather than gating dressed up as differentiation.

**The host contract** (verified, `stem_lab_module.js:7236-7244`):

- `ctx.gradeLevel` is a display string, e.g. `'5th Grade'`, defaulting to `'5th Grade'`.
- `ctx.gradeBand` is the coarse band the host derives from it: `'k2' | 'g35' | 'g68' | 'g912'`,
  defaulting to `'g68'` when the string does not parse.

Follow the `firstresponse` guard exactly, including the whitelist re-check, because a
malformed band must not reach the content lookup:

```js
var gradeBand = (d.bandOverride || ctx.gradeBand || 'g68').toLowerCase();
if (['k2','g35','g68','g912'].indexOf(gradeBand) === -1) gradeBand = 'g68';
```

Content records carry per-band variants with a fallback chain, the same shape
`firstresponse` uses at line 1649 (`card.first[gradeBand] || card.first.g68 || ...`), so a
missing variant degrades to the middle band instead of rendering blank.

| Band | Simple machines | Energy ledger | Predict-then-fire | Math shown |
|---|---|---|---|---|
| **k2** | Seesaw, ramp, wheel. "Push and pull." Which side is easier? | Three labelled buckets with pictures. "Where did the push go?" No units | "Farther or shorter?" two-button choice | None |
| **g35** | MA as a ratio, stated as a number. "You trade distance for force" | Labelled bars, plain numbers, joules introduced by name | Pick a range from three options | `MA = effort arm / load arm` |
| **g68** | All six benches, MA computed and predicted | Full Sankey with joules and percentages | Type a number | `E = mgh`, `KE = ½mv²`, `W = Fd` |
| **g912** | Adds the torsional spring model and its stated limits | Full chain plus a residual analysis against the vacuum model | Type a number, then justify the error | Adds `v = sqrt(2E/(m_p+m_eff))`, quadratic drag with `Cd`, and the optimisation: *why* does max range sit at an interior mass? |

`g68` is the design centre, since it is also the host's fallback.

**The band is overridable in-tool.** `d.bandOverride` defaults to `null` (follow the host)
and a visible control changes it. A teacher demoing to a mixed group, or a student who wants
to stretch past their setting, should not have to leave the tool to do it. This is also the
honest reading of "depend on what the student selected."

The AI explain panel inherits this: its level chips default to the current band rather than
always Grade 5, which is what `stem_tool_physics.js` does today.

**Testing note:** `machinelab_grade_bands.test.js` asserts that all four bands render every
view without throwing, that no band produces an empty string from the variant lookup, and
that an unrecognised band value falls back to `g68` rather than blanking. That last one is
the `semiconductor` failure mode, where a missing key silently blanked fifteen sub-tools.

---

## 4. State shape

Lives at `labToolData.machineLab`, initialised behind the standard guard
(`if (!labToolData || !labToolData.machineLab) { setLabToolData(...); return <loading/> }`)
and mutated through a single `upd(key, val)` helper, exactly as `physics` does at
`stem_tool_physics.js:130-162`.

```js
{
  // ── navigation ──
  view: 'machines',          // machines | build | range | siege | learn
  bench: 'lever',            // which simple-machine bench is open
  machine: 'trebuchet',      // trebuchet | ballista | onager

  // ── grade responsiveness (section 3.6) ──
  bandOverride: null,        // null = follow ctx.gradeBand; else k2|g35|g68|g912

  // ── simple machine bench state ──
  leverFulcrum: 0.5, leverEffortArm: 2.0, leverLoadArm: 1.0, leverLoad: 500,
  pulleySegments: 2,
  windlassHandleR: 0.45, windlassDrumR: 0.08,
  rampLength: 4.0, rampHeight: 1.0,
  wedgeLength: 0.30, wedgeThickness: 0.05,
  screwPitch: 0.006, screwHandleR: 0.25,
  benchPrediction: '', benchResult: null, benchStreak: 0,

  // ── trebuchet ──
  cwMass: 1200,              // kg
  cwDrop: 3.2,               // m
  beamLong: 4.5, beamShort: 1.2,   // m  (velocity ratio = long/short)
  slingLength: 2.0,
  releaseAngle: 45,          // deg, pin geometry

  // ── ballista / onager ──
  bundleTurns: 12,           // twist, maps to torsional stiffness
  armLength: 1.1,
  armMass: 6.0,
  drawLength: 0.85,
  stringMass: 0.35,
  stopAngle: 45,

  // ── shared machine + winch ──
  projMass: 25, projDiameter: 0.24, projMaterial: 'granite',
  launchElevation: 2.0,
  winchHandleR: 0.45, winchDrumR: 0.08, winchPulleys: 2,

  // ── environment ──
  gravity: 9.8,              // preset chips reuse the physics tool's Earth/Moon/Mars set
  drag: true, windMs: 0,

  // ── last shot (derived, cached for the ledger + replay) ──
  lastShot: null,            /* {
                                 workIn, crankForce, crankTurns, crankDistance,
                                 stored, storedKind, efficiency, muzzleV, muzzleKE,
                                 apex, range, flightTime, impactV, impactKE,
                                 energyDensity, path: [{t,x,y,vx,vy}, ...]
                               } */
  shotHistory: [],           // capped at 8, for the compare-overlay
  showLedger: true, showVectors: false, showGraphs: false, showFormulas: false,

  // ── predict-then-fire ──
  predictedRange: '', predictionResult: null, predictionStreak: 0,

  // ── siege view ──
  wallPreset: 'curtain',     // curtain | gatehouse | keep | motte | imported
                             // the four built-ins always ship; 'imported' reads archStudio
  wallBlocks: null,          // [{id,x,y,z,hp,state}]  state: intact|cracked|breached
  shotsFired: 0, totalCrankWork: 0, breached: false, siegeFeedback: null,

  // ── 3D ──
  view3D: true,              // false = accessible 2D schematic only
  three: { status: 'idle', rotY: 30, rotX: 18, zoom: 1, animating: false },
  debris: false,             // Tier 2 rigid-body cosmetic layer, default OFF

  // ── progression ──
  launchCount: 0, benchesProven: 0, quizDone: 0, badges: []
}
```

`lastShot.path` is capped (200 samples) so a snapshot round-trip through
`ctx.toolSnapshots` stays small.

---

## 5. The physics model

This is the part that has to be right, and it is the part that makes the tool worth
building. Everything below is closed-form or a fixed-step integrator: no rigid-body
solver touches any of it.

### 5.1 Work in at the crank

```
MA_winch   = (R_handle / r_drum) * n_pulleys        // wheel-and-axle × block-and-tackle
F_crank    = F_string / MA_winch                     // ideal; friction term in 5.6
d_crank    = d_string * MA_winch                     // distance paid back
W_in       = F_crank * d_crank  =  F_string * d_string
turns      = d_crank / (2 * PI * R_handle)
```

`W_in` is invariant under `MA_winch`. The panel shows all four numbers simultaneously so
the invariance is visible, not asserted.

### 5.2 Energy stored

**Trebuchet (gravitational):**
```
E_stored = M * g * h_drop
```

**Ballista / onager (torsional, two bundles and one respectively):**
Model each bundle as a torsional spring, stiffness `k_t` (N·m/rad) rising with twist:
```
k_t      = k0 * (1 + beta * turns)        // beta is a tuned stiffening constant
E_bundle = 0.5 * k_t * theta^2
E_stored = n_bundles * E_bundle
```
The linear-spring form is a deliberate classroom simplification. It is labelled as such
in the Field Manual rather than presented as the real constitutive behaviour of twisted
sinew, which is strongly nonlinear and hysteretic. (See Q3 and the scientific-integrity
constraint: no contested or simplified science presented as settled fact.)

### 5.3 Energy transfer to the projectile — the good lesson

Lumped effective-mass treatment. The arm, string and sling also end up moving, and that
kinetic energy is not delivered:

```
m_eff  = c_arm * m_arm + c_string * m_string      // c terms from the lever ratio
v      = sqrt( 2 * E_stored / (m_p + m_eff) )
eta    = m_p / (m_p + m_eff)                       // fraction reaching the projectile
KE_p   = 0.5 * m_p * v^2  =  E_stored * eta
```

This single formula generates the tool's best inquiry activity:

- Light projectile: high muzzle velocity, **low** transfer efficiency, most energy wasted spinning the arm.
- Heavy projectile: low velocity, **high** efficiency, but poor range.
- Maximum *range* sits at an intermediate mass; maximum *delivered energy* keeps climbing with mass.

So "what should I throw?" has a different answer depending on whether you want reach or
punch, and the student can find both optima empirically then be shown why. Neither
`physics` nor `throwlab` teaches this, because neither has a fixed energy budget upstream
of the launch. That is the whole justification for the tool in one paragraph.

### 5.4 Flight

**RESOLVED 2026-08-10. Neither extraction nor mirroring. Write a fresh 3D integrator and
pin it to the closed-form solution.** Aaron flagged uncertainty here and asked for whatever
gives the best outcome; reading the existing code changed the answer, so the original two
options in this section were both wrong. Superseded reasoning is kept below the line.

**What is actually in `stem_tool_physics.js`.** There is no trajectory function to extract.
The integration is inlined inside the `draw()` RAF callback
(`stem_tool_physics.js:541`), interleaved with canvas painting (sky gradient, twinkling
stars, trail rendering). It reads its inputs from **DOM string attributes**
(`canvasEl.dataset.angle`, `.velocity`, `.gravity`, `.airResist`), advances one step per
animation frame at `dt = 0.035` scaled by the sim-speed control, and models drag as a bare
magic constant, `var drag = canvasEl.dataset.airResist === 'true' ? 0.002 : 0`
(`stem_tool_physics.js:444`).

So "extract the trajectory step" means disentangling physics from painting inside a
~400-line render function, replacing `dataset` reads with parameters, and decoupling from
the frame loop, all inside a shipped, heavily used tool. That is a real refactor with real
regression risk, and it is precisely the shape of change that silently broke `bridgeLab`.

Three further reasons the shared helper is the wrong goal:

1. **Aaron's own instinct was right: the shape differs.** Machine Lab is 3D. It needs
   x/y/z so lateral aim and crosswind work in the scene. The `physics` version is 2D by
   construction. A helper general enough for both fits neither cleanly.
2. **The drag models must differ.** `0.002` is a tuned visual fudge, entirely appropriate
   for an animation whose job is to look right. Machine Lab's entire premise is an honest
   energy ledger, so it needs real quadratic drag with `Cd`, projectile area and air
   density. Sharing the fudge would corrupt the one thing the tool exists to show.
3. **The proposed agreement test would have failed anyway.** A frame-coupled `dt = 0.035`
   with a linear fudge does not converge to the true trajectory, so pinning the new
   integrator to it would have pinned it to an approximation. Good thing to have found
   before writing the test rather than after.

**Instead:** `_machineMath.integrateFlight()` is a standalone pure function, fixed 1 ms
step, semi-implicit Euler, 3D, no DOM and no frame loop. It is pinned by
`machinelab_flight_closed_form.test.js`, which asserts that with drag disabled it
reproduces the **analytic vacuum solution** to within 1e-6:

```
R     = v^2 * sin(2*theta) / g
h_max = v^2 * sin^2(theta) / (2*g)
t_f   = 2 * v * sin(theta) / g
```

A mathematical identity is a strictly better reference than a second implementation: it
cannot drift, and nobody can "fix" a failing test by matching a bug. With drag enabled the
test asserts the weaker invariants that still must hold (range strictly less than vacuum,
descent steeper than ascent, terminal velocity approached from below).

Model:
```
F_drag = 0.5 * rho * Cd * A * |v|^2, opposing the velocity vector
A      = PI * (projDiameter/2)^2
```

`stem_tool_physics.js` is left completely untouched. No shipped tool is put at risk to
build a new one.

---

*Superseded (kept for the record): the original recommendation was to extract the
trajectory step into a shared helper, or failing that duplicate it with a
`// MIRRORS stem_tool_physics.js` banner and a cross-tool agreement test. Both options
assumed a extractable function that does not exist.*

### 5.5 Impact and wall damage (deterministic, this is what gets scored)

```
KE_impact      = 0.5 * m_p * v_impact^2
contact_area   = PI * (projDiameter/2)^2
energy_density = KE_impact / contact_area          // J/m^2
```

Each wall block has an energy budget by material. Cumulative absorbed energy drives a
three-state machine (`intact → cracked → breached`), with a fixed spillover fraction to
the two neighbours below, so a low wall course collapsing takes the courses above with it.
Fully deterministic: same inputs, same wall state, every run, on every machine.

The material thresholds are order-of-magnitude classroom values and the panel says so in
those words. We are not claiming to predict real masonry failure.

### 5.6 Friction and efficiency chain

One global `eta_mech` (default 0.85) applied at the winch, plus the `eta` of 5.3, so the
ledger reads as an honest chain rather than a single fudge factor:

```
crank work → (×0.85 winch friction) → stored → (×eta transfer) → muzzle KE
           → (−drag losses) → impact KE
```

The ledger renders this as a Sankey-style bar with every loss labelled. **This bar is the
tool's signature UI element** and its text-table equivalent is what makes the whole thing
accessible (section 9).

---

## 6. 3D architecture

### 6.1 Tier 1: THREE only, no new dependency

Use **`makeOrbitViewer`** (`stem_lab_module.js:947`), not `makeBayViewer`. Already used by
`bridgeLab`, `titration` and `fireecology`. It gives us, for free:

- `ensureThree({orbit:true})` with local-vendored-first, multi-CDN fallback and a shared promise cache
- WebGL context-loss rebuild (capped)
- pause when the tab is hidden or the node is offscreen
- theme rebuild on dark / light / high-contrast
- graceful failure to the 2D view when there is no WebGL
- **`static: true` render-on-demand** (`stem_lab_module.js:1039-1055`)

That last one matters. Push `{static: true}` while the student is tuning the machine, and
`{static: false}` only for the seconds a shot is in the air, then back to static once the
wall settles. A siege tool sitting idle at 60 fps on a school Chromebook is exactly the
regression that has bitten the orbit bays before.

`attach` is the ref callback and **must be a single module-scope identity**, per the
warning at `stem_lab_module.js:944`. An inline arrow re-attaches and rebuilds the scene on
every keystroke.

Scene content: parametric beam / arms / ropes / counterweight / winch drum built from
primitives and driven directly from state, plus an instanced-mesh wall. No GLTF assets, so
no addition to the Pages file count (which is already against a 20,000-file ceiling).

**Bug found while speccing, worth a separate one-line fix:** `ensureThree` prefers the
local `vendor/three-r128/three.min.js` for the core, but the OrbitControls URL list at
`stem_lab_module.js:3170-3175` is **CDN-only**, even though
`vendor/three-r128/OrbitControls.js` exists on disk. Offline and desktop builds silently
lose orbit. One `localOrbitUrls` array, symmetric with `localThreeUrls`, fixes it for
every 3D tool.

### 6.2 Tier 2: lazy rigid-body debris — **library check run 2026-08-10, resolved**

**Verdict: `cannon-es` 0.20.0, loaded as an ES module via the in-house `_imp` pattern.
Both of the blockers flagged in the original spec turned out to be non-issues, and they
were resolved by reading what the app already ships rather than by guessing.**

**Finding 1: WASM already runs in production, so the CSP concern is dead.**
`view_export_preview_module.js:26-46` lazy-loads the Harper grammar checker, which is a
full Rust-to-WASM binary (`vendor/harper/2.4.0/harper_wasm_full_bg.wasm`, served from the
CDN). If a WASM module instantiates in the deployed surface today, a physics WASM would
too. The question was worth asking and the answer is settled.

**Finding 2: ESM-only is not a blocker, because the codebase already has a loader for it.**
The same function uses:

```js
const _imp = new Function("u", "return import(u)");
const mod  = await _imp(assetRoot + "/index.js");
```

`new Function` keeps the dynamic `import()` opaque to bundlers and transpilers that would
otherwise rewrite it. It ships in three view modules today, with a promise cache and a
`.catch(() => { _promise = null })` reset so a failed load can be retried. That is exactly
the shape `ensureRigidBody()` needs, and it means **no UMD build and no custom rollup**.

**Finding 3: the original UMD worry was correct, and now moot.** Confirmed against the
registry: `cannon-es@0.20.0` publishes `main: ./dist/cannon-es.cjs.js` and
`module: ./dist/cannon-es.js`. There is **no UMD build**, so `loadScriptResilient`'s plain
`<script>` injection genuinely would not have worked. The `_imp` path sidesteps it.

**Finding 4: size decides it against Rapier.**

| | License | Unpacked | Deterministic |
|---|---|---|---|
| `cannon-es@0.20.0` | MIT | **774 KB** (whole package; we vendor only `dist/cannon-es.js`) | Not guaranteed |
| `@dimforge/rapier3d-compat@0.20.0` | Apache-2.0 | **10.2 MB** | Yes, cross-platform |

Rapier is 13× larger. Its one advantage is determinism, and **determinism is worth exactly
nothing here**, because rule 1 below makes the solver cosmetic: it never feeds a score, so
there is nothing to reproduce. Paying 10 MB on a school Chromebook for a property the
architecture discards would be a bad trade. `cannon-es` wins on the only axes that matter.

**Implementation:** `ensureRigidBody()` beside `ensureThree()` in `stem_lab_module.js`,
following `_ensureHarper` rather than `loadScriptResilient` (different mechanism, same
caching and retry discipline). Vendor `dist/cannon-es.js` under
`vendor/cannon-es-0.20.0/` with the MIT `LICENSE`, local-first with a CDN fallback,
and add the entry to `THIRD_PARTY_LICENSES.md`.

Loaded **only** when the student first opens the `siege` view with `d.debris === true`.
Never on tool open, never in the other four views. It is also the first ESM loader in
`stem_lab/`, so it is worth a comment saying why the `new Function` indirection is there;
it looks like a mistake to anyone who has not seen the pattern.

Three hard rules:

1. **The solver is cosmetic.** Block state (`intact|cracked|breached`), the score, the
   breach determination and every displayed number come from 5.5. The solver receives the
   already-decided outcome and animates rubble. If it fails to load, the tool degrades to
   a CSS-transform tumble and nothing else changes.
2. **Cap the body count** (target ~150 active bodies) and freeze settled debris. This is
   the frame-budget guard.
3. **`d.debris` defaults to OFF** and is a labelled toggle, both for perf on school
   hardware and because falling masonry is a vestibular trigger for some students. It also
   respects `prefers-reduced-motion` via the shared CSS block already injected by every
   tool header.

One residual unknown, deliberately not chased: nobody has run `cannon-es` inside Gemini
Canvas specifically. Given Harper's WASM and the three shipping `_imp` call sites, the
risk is low, and rule 1 means a failure degrades to the CSS tumble rather than breaking
the tool. Confirm it during P5 with a smoke run rather than pre-emptively.

---

## 7. Determinism and testing

The analytic model is pure and side-effect free, so it should live in a testable block:

```js
var _machineMath = { winchMA, workIn, storedEnergy, transfer, integrateFlight,
                   impact, applyDamage };
```

exported the same way `stem_tool_money.js` exposes `_moneyMath`.

Proposed `tests/`:

| File | Asserts |
|---|---|
| `machinelab_energy_ledger.test.js` | conservation: `W_in * eta_mech == stored` within 1e-9; ledger stages sum to input |
| `machinelab_winch_invariance.test.js` | changing `MA_winch` changes crank force and turns but leaves `stored`, `muzzleV` and `range` bit-identical |
| `machinelab_transfer_optimum.test.js` | range peaks at an interior projectile mass; delivered KE is monotonically increasing in mass |
| `machinelab_flight_closed_form.test.js` | drag off: reproduces `R = v² sin2θ / g`, `h_max` and `t_f` to 1e-6. Drag on: range < vacuum, descent steeper than ascent, terminal velocity approached from below. **Replaces the cross-tool agreement test, which would have pinned the new integrator to the physics tool's frame-coupled approximation.** See 5.4 |
| `machinelab_wall_presets.test.js` | all four built-in targets are well-formed block lists, no floating blocks, `archStudio`-compatible shape |
| `machinelab_grade_bands.test.js` | all four bands render every view without throwing; no band yields an empty string from the variant lookup; an unrecognised band falls back to `g68` rather than blanking (the `semiconductor` failure mode) |
| `machinelab_damage_determinism.test.js` | identical shot sequence gives an identical wall state across 100 runs |
| `machinelab_a11y.test.js` | every interactive element has `role` + `tabIndex` + `onKeyDown`; canvas has a description; follows `archstudio_a11y.test.js` |
| `machinelab_bench_math.test.js` | all six MA formulas against hand-computed values |

Note that `deploy.sh` runs zero vitest, so these have to be run deliberately.

Applicable existing gates: `check_plugin_files.cjs`, the free-vars gate (only sees files
handed to it, so hand it the new file explicitly), the render-crash gate, and
`dev-tools/scan_canvas_var_colors.cjs`. That last one matters here: **any 2D canvas
fallback must not use `ctx.fillStyle = 'var(--x)'`**, which is silently ignored and leaves
the previous fill in place. If the tool ships a quiz bank, `scan_answer_position_bias.cjs`
applies too, and the rotation must happen at module scope rather than beside the literal.

---

## 8. Quest hooks

Following the `physics` shape exactly (`check(d)` plus `progress(d)`):

```js
questHooks: [
  { id: 'prove_3_machines', label: 'Prove the mechanical advantage of 3 simple machines',
    icon: '⚙️',
    check: d => (d.benchesProven || 0) >= 3,
    progress: d => (d.benchesProven || 0) + '/6 benches' },

  { id: 'winch_insight', label: 'Discover that gearing the winch does not change the shot',
    icon: '🔁',
    check: d => !!d.winchInsightSeen,
    progress: d => d.winchInsightSeen ? 'Found it!' : 'Try changing the pulleys' },

  { id: 'find_range_optimum', label: 'Find the projectile mass that throws farthest',
    icon: '🎯',
    check: d => !!d.foundRangeOptimum,
    progress: d => d.foundRangeOptimum ? 'Done!' : 'Vary the stone mass' },

  { id: 'breach_efficiently', label: 'Breach the wall in 5 shots or fewer',
    icon: '🏰',
    check: d => d.breached && d.shotsFired <= 5,
    progress: d => d.breached ? d.shotsFired + ' shots' : 'Not breached yet' },

  { id: 'compare_machines', label: 'Fire all three machines and compare their ledgers',
    icon: '📊',
    check: d => (d.machinesFired || []).length >= 3,
    progress: d => (d.machinesFired || []).length + '/3 machines' }
]
```

---

## 9. Accessibility and UDL

This is the argument for machine-first over debris-first, so it is not an afterthought.

- **The energy ledger has a full table equivalent.** Every Sankey segment is a row: stage,
  joules, percentage of input, loss and its cause. A screen-reader user gets the identical
  content, not a degraded summary. A "watch the castle explode" tool cannot make that claim,
  which is the concrete reason the ledger is the centrepiece.
- **Every 3D view has a 2D schematic equivalent** reachable by a toggle, not only as a
  WebGL-failure fallback. `d.view3D = false` is a first-class mode.
- Canvas surfaces use `ctx.canvasA11yDesc` and `ctx.canvasNarrate`.
- Every control is a real `<input type="range">` or `<button>`. Any custom control gets
  `role` **and** `tabIndex` **and** `onKeyDown` together; two of the three is a dead
  control, and there is a test for it. **Use `ctx.a11yClick(handler)`**, which the host
  already provides (`stem_lab_module.js:7289`) and which spreads all three plus the
  Enter/Space handler in one go. Hand-rolling the trio is how the mouse-only trap keeps
  happening.
- All four grade bands must be keyboard- and screen-reader-complete, not just `g68`. The
  k2 two-button predict control is the easiest one to accidentally ship as mouse-only.
- Shot results announce through `ctx.announceToSR` and the injected live region.
- `prefers-reduced-motion` suppresses debris, arm whip and camera moves; the ledger and
  numbers still update.
- High-contrast mode: no hardcoded dark colours mixed with theme variables. Verify in
  light, dark **and** contrast before calling it done.

---

## 10. i18n

- Alias once at the top of `render`: `var __alloT = function (k, fb) {...}`, the exact
  helper from `stem_tool_physics.js:96`. Single-argument-safe.
- Key namespace `stem.machinelab.*`.
- Every user-visible string wrapped at authoring time. Retrofitting i18n has been the
  expensive path every previous time.
- Language packs are hand-translated per the existing policy, never delegated.
- Coverage measurement caveat: a `ctx.t(` grep will miss the `__alloT` alias, so count
  with the alias name.

---

## 11. Registration checklist

1. Create `stem_lab/stem_tool_machinelab.js` with the standard guard header and `registerTool('machineLab', ...)`.
2. Add `'stem_lab/stem_tool_machinelab.js'` to `PLUGIN_FILES` in `build.js:1082`.
3. Add the menu entry in `stem_lab_module.js` immediately after the `_cat_EngineeringDesign` marker at line 5239.
4. **Rebuild `tool_index.json`.** It is currently 138 tools and stale the moment a tool lands.
5. Mirror to `desktop/web-app/public/stem_lab/`. Edits must be made to both copies, never file-copied.
6. Add `lang/` keys and wire the pack entries.
7. Add the tests from section 7.
8. Run the gates from section 7 before any deploy, and the TDZ render check at deploy time.

---

## 12. Build order

| Phase | Content | Ships |
|---|---|---|
| **P1** | `machines` view, all six benches, 2D SVG diagrams, MA math, all four grade bands, `_machineMath` + bench tests | Standalone value: the curricular gap is closed before any 3D exists |
| **P2** | `build` + `range`: trebuchet only, 3D via `makeOrbitViewer`, full energy ledger, flight, predict-then-fire | The signature lesson |
| **P3** | Ballista + onager, machine-comparison view, Field Manual, AI explain panel, i18n pass | Complete tool |
| **P4** | `siege` view, the four built-in targets, deterministic wall damage, breach scoring | Deterministic, testable, no dependency |
| **P4b** | `archStudio` import as an extra target source | Optional. The tool is complete without it |
| **P5** | Tier 2 lazy rigid-body debris (`cannon-es`), off by default | Pure polish, cuttable at any point |

P1 through P4 add no dependency. P4b and P5 are separable and reversible by design, and
each one is a bonus on a tool that already works without it.

---

## 13. Questions and resolutions

### Resolved by Aaron, 2026-08-10

1. **Name and framing.** → **"Machine Lab."** Accurate to the curriculum, no combat
   association. "Siege" survives only as the internal id of the target-wall view.
   Applied throughout this document and to the proposed tool id `machineLab`.
3. **Historical claims.** → **In, with a source pass.** Aaron: "historical claims are cool,
   adding that seems appropriate," and the Field Manual is confirmed in scope. The sourcing
   rules and the per-claim risk table are in section 3.5. The load-bearing constraint: no
   contested claim stated as settled fact, and anything unattributable to a named work does
   not ship. Budget real research hours into P3.
4. **`archStudio` bridge.** → **Both, presets first.** Aaron: "I like the ability to add a
   castle but there should probably also be default pre-built castles right?" Correct, and
   it is the better architecture for a second reason he may not have intended: fixed preset
   geometry is what the damage tests assert against, which an arbitrary imported build could
   never provide. Four built-in targets in section 3.4; import is a pass-through on top and
   can slip to P4b without hurting the tool.
5. **Rigid-body library.** → **Check run. `cannon-es` 0.20.0 via the `_imp` ESM pattern.**
   Both flagged blockers dissolved on inspection: WASM already ships in production (Harper),
   and the codebase already has an ESM dynamic-import loader in three view modules. Rapier
   loses on size (10.2 MB vs 774 KB) and its determinism advantage is worthless under the
   cosmetic-solver rule. Full findings in section 6.2.
6. **Shared flight integrator.** → **Neither option. Fresh 3D integrator pinned to the
   closed-form vacuum solution.** Aaron was right to be unsure: reading
   `stem_tool_physics.js` showed there is no extractable function (the integration is
   inlined in the RAF callback, reads DOM `dataset` strings, and models drag as a `0.002`
   magic constant), and the 3D requirement he raised makes a shared 2D helper the wrong
   shape anyway. `stem_tool_physics.js` is left untouched. Full reasoning in section 5.4.

2. **Grade band.** → **All grades, content follows the selected level.** Aaron: "it should
   work for all grades, depend on what the student selected." So nothing is filtered out;
   the same machine and the same ledger are restated in four registers driven by
   `ctx.gradeBand`, with an in-tool override so a student can stretch and a teacher can
   demo across a mixed group. This is a stronger answer than the collapsed-panels default
   I had proposed, because it treats the low bands as first-class content rather than as
   the high band with things switched off. Full design in section 3.6.

**All questions are now resolved. The spec is ready to build against.**

### Outstanding, unrelated to this tool

- The `ensureThree` OrbitControls bug in section 6.1 (local vendored `OrbitControls.js`
  exists but the loader lists CDN URLs only, so offline and desktop builds lose orbit
  across every 3D tool). One-line fix, not yet made, awaiting a go-ahead since it touches
  a shipped shared module.
