# Machine Lab (Simple Machines & Stored Energy) — Spec for Review

**Status:** **P1 through P4 BUILT 2026-08-10** and passing their gates, uncommitted and
undeployed. All six design questions resolved by Aaron (see section 13). Remaining: P4b
(`archStudio` import) and P5 (rigid-body debris).

**Visual verification, 2026-08-11.** `dev-tools/ml_scene_shots.cjs` renders the tool in a
real Chromium with the REAL host module and THREE/OrbitControls preloaded from `vendor/`
(so `ensureThree` short-circuits; a harness that lets it reach for a CDN silently produces
the 2D fallback and the shots then "prove" a 3D view that never rendered). It writes 18
shots across every view, all three machines, four wall presets and four battered walls,
the last computed by the tool's own damage model rather than hand-authored.

Six defects that 263 passing tests could not see, all now fixed:

1. **The ledger said "Stored in the raised counterweight" on a ballista and an onager.**
   Neither has a counterweight. Same for the loss line, "energy left in the moving arm and
   counterweight". Both are machine-aware now.
2. **The winch panel showed "—" for crank force and turns on both torsion machines**, while
   still quoting a crank-work figure. `crankDetail` was keyed to counterweight mass;
   it now takes (work, travel, MA, handle radius) and covers all three machines.
3. **`breached` was stored state, not derived**, so a wall restored from a snapshot or
   replaced by an import reported itself intact while standing wide open, with the Loose
   button still live. It is computed from the blocks at render time now.
4. **The 3D bay was hardcoded dark navy** and stayed that way on a light-theme page.
   `clearColor` follows the pushed theme in all three scenes.
5. **Breached blocks in the 2D wall were drawn in near-background colour**, present in the
   markup and all but invisible on screen. They now render as dashed rubble at 0.35.
6. **The trebuchet framed a box the size of its whole swing**, so it sat small in a mostly
   empty frame with hairline members, and the cocked sling hung the stone *below ground*,
   out of frame entirely. It now frames the machine's real extents, the members read as
   timber, and the sling rests on the ground where a crew would load it.

Also fixed while looking: the ballista's two arms swung in the same direction with no
bowstring, so it read as parallel sticks rather than a bow.

**All three themes have now been looked at**, not just contrast-checked numerically
(`--dark` and `--contrast` on the harness). Two more defects, both fixed:

7. **The 3D scenes derived their colours from `dark` alone**, so high contrast (a distinct
   THIRD palette, not dark with the knobs turned up) rendered a navy bay and mid-grey
   framing on a pure-black page. All three scenes now honour `contrast`: black bay, white
   structure, yellow payload.
8. The same omission left the ground plane navy in contrast mode.

The K-2 band was also viewed for the first time and reads correctly: no formula, mechanical
advantage shown as a plain multiplier beside a "How it feels" word, and a three-option
question with a labelled diagram.

Note on the harness: `dark` and `contrast` are pushed as SEPARATE flags. A viewer that
infers one from the other cannot render high contrast correctly, which is exactly how
defect 7 arose.

## The Siege Field (2026-09-04)

Aaron: the bays read as schematics, and he could not see a firing animation. Two answers.

**A seventh view, `scene`, "Siege Field".** The same siege as the Target Wall (same
`wallBlocks`, same `loose()`, same `siegeFlight`; a breach here is a breach there),
staged as a place: procedural terrain with a flat firing lane and hills beyond, a sky
shader with a sun disc, sun + hemisphere + fill light with a 1024 PCF shadow map, four
hours (dawn / noon / dusk / night: sun direction, fog, stars, campfire), a castle built
from the wall blocks through `makeVoxelBatch` with a procedural stone texture, merlons
over standing top-course blocks, two towers and a waving banner, the Build engines skinned
to timber and rope by re-mapping their constant colours, three crew, a tent, a stone pile,
110 instanced trees, rocks, birds. The stone flies the model's path with a trail; landing
spawns a debris burst and a look-at shake on a hit. A DOM HUD written by the tick (not by
React) shows live speed, height, downrange, time and the ½mv² / mgh / total ledger.
Camera modes: cinematic (engine → follow the stone → hold on the impact), follow the
stone, engine, castle, whole field, free look (drag switches to free). Ambient motion is a
toggle; the field is render-on-demand with it off.

- ★★★A STATIC bay gets ONE tick per push. A camera glide that lerps toward its goal stalled
  a fifth of the way there and Castle looked like Engine. Snap when `data.static`.
- ★★★BUDGET: 2048 PCFSoft shadows over a 96² terrain with 150 shadow-casting trees measured
  4.7 s PER FRAME under SwiftShader. 1024 PCF, 64² terrain, 110 trees, trunks not casting:
  ~10 fps under SwiftShader, which is the floor school laptops have to clear.
- ★★The scene builder is called BEFORE the host assigns `S.data`, so `S.tick(0)` at the end
  of a build sees no data; guard every read.
- ★Sky sphere radius must sit inside the host's `far = dist * 8 + 200`, else it clips; the
  clear colour is the horizon colour so a clipped sky is invisible.
- ★A tent placed at -x, -z of the engine sat between the Engine camera and the engine.
  Place dressing on the far side of every framing you ship.

**The firing animation.** It existed in all three bays, gated on
`prefers-reduced-motion`. Windows "Animation effects: off" sets that media query, and under
it the stone JUMPED to the end of its arc: a shot that looks like nothing happened. Now:

- `motionPref` (`auto` | `on` | `off`) in state, a select in the Range conditions and the
  Siege Field setup. `reducedMotion` derives from the preference before the OS.
- Under reduced motion the Range and the Field draw the arc as a STROBE (seven ghost stones
  along the path), the textbook projectile figure, instead of nothing.
- ★★A SHORT shot never flew at all in either siege bay: `loose()` returned with a sentence.
  It now flies to where it lands (`siegeFlight.outcome = 'short'`), wall untouched.
- `ml_interaction_smoke.cjs` battered the wall by clicking Loose 120 ms apart and read the
  in-flight disabled button as "never breached" (3 of 99 red before this work). It waits
  for the flight to clear now.

### Wave 2 (same day)

- **Blocks tumble.** The set of blocks THIS shot knocked out is decided once on the
  landing frame (breached now, not breached in `prevBlocks`) and each travels from where
  it stood to where it lies over 1.1 s with a small hop. Reduced motion skips it.
- **Wind you can read.** `windZ` rides on the push: the banner streams downwind (flipped
  by sign, drooping in light air), the flame leans, and eight smoke puffs drift with the
  square of their height. The setup card names it when wind is non-zero.
- **Predicted arc.** Dashed line + impact ring, built from `previewPath` and rebuilt IN
  PLACE when `previewSig` changes. ★It is deliberately NOT in the scene `sig`: the Target
  Wall puts range/apex/drift in its sig and rebuilds per slider tick, which would rebuild
  the whole valley here. Toggle `scenePath`.
- **Range stakes** every 10 m down both lane edges, taller and red every 50 m.
- **Slow-motion replay** (`lastFlight` kept on both hit and short; `replay: true, rate: 3`
  on the flight; the swing clock is divided by the rate). Button in both siege bays.
- **Start-here card** (`sceneIntroDismissed`), HUD labels restated for K-2 / 3-5.
- ★Sun direction must have NEGATIVE z or the castle face (toward the engine) is a silhouette
  from every default camera. Noon and dusk were wrong on first pass.

Tests: `tests/machinelab_scene.test.js` (25) pins reachability, the shared siege, the
text alternatives, the pure terrain/sky helpers extracted by name from the source, and the
motion preference. Screenshots: `ml_scene_shots.cjs` gained the field at dusk, the castle
framing at dawn, night, and the range strobe.

## WebGL context churn

Two module-scope viewers attach and detach as the view changes, and a browser caps live
WebGL contexts at roughly sixteen. A teardown that leaked one per switch would kill 3D after
a handful of view changes, and it would surface much later as "the 3D just stopped working"
with no obvious cause.

Measured rather than reasoned about, in `ml_frame_budget.cjs`: **24 view switches leave one
canvas in the DOM**, renderer construction stays bounded at one per attach, and — the
decisive check — **3D still draws 73 frames on a shot afterwards**. So the host's teardown
(`forceContextLoss`, `dispose`, `removeChild`, observers disconnected) does run, and this
tool's stable module-scope ref triggers it correctly on unmount.

A verified non-issue, but the check stays: the failure mode is silent, delayed, and would be
very hard to attribute to a view switch after the fact.

## Render cost

`dev-tools/ml_render_cost.cjs`, 8 checks. Sliders re-render on every drag, and some views do
real work per render, so a render that misses a frame makes dragging feel like mud. Nothing
else in this repo's tooling measures that.

Measured medians against a 12 ms budget (one 60 Hz frame is 16.7 ms, and layout and paint
still have to fit): machines 6.3, build 5.5, siege 4.2, range 1.9, compare 1.9, learn 0.9.

Two results worth recording because they contradict the obvious guess:

- **Compare is among the cheapest at 1.9 ms**, despite running four full flight
  integrations per render. Velocity Verlet over a few thousand steps is simple arithmetic
  and costs almost nothing. The instinct to memoise it would have been wasted work.
- **The slowest view is the Machine Shop**, because `buildBenches()` reconstructs all six
  benches' copy (roughly 180 translator calls) on *every* render of *every* view — the
  selected bench feeds the screen-reader summary, so it is never skipped. Still inside
  budget, so it is left alone; the check is what would catch it if that changed.

## Two i18n non-issues, verified

Worth writing down so nobody re-investigates: no stem tool's keys are in `ui_strings.js`, and
none are in the 63 language packs either — not `stem.physics.*`, not `stem.titration.*`, not
this tool's. Stem tools carry their English inline as `__alloT(key, fallback)` and rely on
the runtime path. This tool matches that exactly, so its ~350 keys are in the same position
as every other stem tool's, not a gap it introduced. `check_translation_keys.cjs` reports 4
missing keys repo-wide, all pre-existing in `AlloFlowANTI.txt`, none from here.

## Defect 17: the camera was frozen and unreachable

`makeOrbitViewer` takes `rotY`/`rotX`/`zoom` from **every** push and assigns them
unconditionally (`stem_lab_module.js`: `S.rotY = next.rotY`). A push that omits them sets
the camera to `undefined`, which reads as 0. So the `rot: { y: 22, x: 12 }` this tool
configured was applied once at build and **thrown away by the first frame**, and every 3D
scene rendered dead-on from then on. The screenshots had been showing that all along and it
read as a styling choice.

Worse, `rotY` is written in exactly three places in the whole host — build, push, and the
camera read. There is **no drag handler**. So `makeOrbitViewer` scenes are not rotatable by
mouse either: the view was frozen and adjustable by nobody.

The contract is that the caller owns the camera, and `stem_tool_titration.js` and
`stem_tool_bridgelab.js` already honour it. This tool did not. Now it keeps the camera in
its own state per bay, sends it on every push, and offers labelled **turn / tilt / zoom /
reset** buttons, so the view is steerable by everyone rather than by no one. Yaw wraps at
360, tilt clamps to -70..78 so the scene can never go fully under or over, and zoom clamps
to 0.5..2.6. `fitSlack` compensates for corners swinging outside the head-on fit box once
the camera is turned.

`stem_tool_fireecology.js` passes no camera fields either, so it is likely to have the same
frozen view. Not fixed here, but worth someone looking.

**A thing I nearly shipped and removed instead:** arrow-key steering bound to the bay itself.
It needs `tabIndex` on a `role="img"` element, which creates a focus stop that announces as
an image and offers no obvious action. The labelled button strip is clearer, and dead code
left behind is exactly the `showWorkPanel` mistake.

## Host-edit safety check

Two edits were made to the shared `stem_lab_module.js` for this tool (the OrbitControls
local-first fix, and the snapshot restore line), and until 2026-08-11 they had only ever
been exercised by Machine Lab's own tests. Thirteen host-dependent test files from other
tools were run against them and all pass. The single failure encountered,
`data_lab_snapshot_values.test.js`, asserts the host does **not** contain a phrase that is
present in git HEAD, so it is part of the repo's known pre-existing test debt rather than
anything these edits caused. Worth doing rather than assuming: a shared file touched for one
tool can break a different one silently.

## Celebration

`ctx.celebrate` fires on the two moments in this tool that are unambiguously achievements
rather than progress: **breaching a wall** (which takes a machine you tuned, a range you
found and a wall you battered) and **proving all six benches** (which completes the
curricular half). Deliberately not on every correct prediction — a celebration that fires
constantly stops meaning anything. The interaction smoke asserts the breach actually
celebrates rather than only toasting.

## Work record

The tool accumulates a lot of evidence of thinking — benches proven, a prediction streak,
machines fired, a shot log, a siege result, and now a written hypothesis and explanation —
and had nowhere to show any of it. A student finishing a session had nothing to hand anyone.

A "Your work" topic in the Field Manual gathers it into one readable record, with a copy
button and read-aloud. It says outright that it is **a record of your work, not a mark, and
nothing here is scored**, which matters given how much of the rest of the tool does grade.

Two details it gets right by construction:

- **Lines that have no content are omitted, not shown empty.** No siege line until there has
  been a siege; no hypothesis line until something was written. A record padded with
  "Hypothesis: (none)" reads as a list of things the student failed to do.
- **Whether the wall fell is derived from the blocks**, not read from a stored flag, so a
  restored or imported wall reports honestly. That is the same defect as number 3, and
  writing this record was the second place it would have bitten.

## Inquiry widget

Every other surface in this tool grades you against a number: predict the effort force,
predict the range, hit the wall. Nothing invited a student to form a theory in their own
words, and this repo already has a house pattern for exactly that (`stem_tool_atctower.js`
and friends), which the shared smoke harness even knows how to detect via
`findInquirySignal`.

It sits on the Compare view, because "which machine is better" genuinely has no single right
answer: it depends on the stone. It follows the house contract exactly.

- A **hypothesis** box, asked before anything else and pitched at the reader's band (K-2:
  "Which machine do you think throws best? Say why." / g9-12: predict the ordering at 5 kg
  and 200 kg and say which term in `m_p/(m_p + m_eff)` decides each case).
- **Log this comparison**, which records all three machines at the current stone mass into a
  captioned table, so a student can accumulate evidence rather than remember it.
- An opt-in **"I'm stuck"** that reveals **open questions and no answers**. A test asserts
  every revealed line ends in a question mark, so the reveal cannot quietly become an answer
  key.
- **"I can explain in my own words"**, which opens an explanation box only once claimed.
- The signature line: *Inquiry widget — no score, no reveal, no answer dump*, plus the
  reminder that the table is the tool's simplified model and not a measurement.

## Read aloud

This tool is mostly prose: six bench explanations, three machine explanations, and a Field
Manual. A student who cannot read it fluently got none of it, which is a poor showing for a
UDL tool. `ctx.callTTS` had never been touched.

A 🔊 control now sits beside the bench explanation, the machine explanation and the Field
Manual, following the convention in `stem_tool_anatomy.js` (labelled button, `title` and
`aria-label`). `force: true` is correct here because the button *is* the explicit user
action the header mute gate exists to defer to. On a host with no voice the button is
absent entirely, rather than present and inert.

**The manual speaks exactly what it renders.** Its spoken text is collected as the content
is built (`para()` pushes, history entries push, and the bullet lists are arrays of strings
feeding both the `<li>`s and the speech), so it cannot drift from a second hand-maintained
copy. That drove a small refactor: the two bullet lists were hand-written `<li>` sequences,
and my first attempt wrapped each one inline, which produced unbalanced parentheses and a
syntax error. Building the list from one array is both simpler and the reason the speech
can be trusted.

## First-run tutorial

Six views is a lot to land on cold, and the tool's spine (benches → engine → ledger → range
→ wall) is not obvious from the nav alone. `ctx.renderTutorial(toolId, steps)` takes the
steps as a parameter, so unlike the other tools using it — whose arrays sit in
`stem_lab_module.js` as `_tutGalaxy`, `_tutCompanionPlanting` and so on — Machine Lab's stay
in its own file, and the host keeps owning the overlay, the step counter and the seen-once
flag.

Five steps walking that spine, band-aware on the opener, and closing on the two things the
tool is easiest to get wrong: **the fastest shot is not the furthest**, and **walls are
battered with direct fire**. Both are pinned by test, since they are the misconceptions the
tool exists to correct.

## A note on the shared tree

`tests/machinelab_snapshots.test.js` originally asserted byte-parity of the two
`stem_lab_module.js` copies. That failed on 2026-08-11 for a reason that was nobody's
mistake: another session had added screen-reader announcements to the CDN copy and had not
yet mirrored them. Machine Lab's suite was failing for somebody else's in-flight work.

The assertion is gone. What this tool owns is that **its own** restore line is present in
both host copies, checked directly, and that `stem_tool_machinelab.js` is byte-identical
across CDN and desktop, which `machinelab_a11y.test.js` asserts. A tool's tests should pin
its own invariants, not police a shared file that several sessions are editing at once.

## Saving a design (and defect 16, in the host)

`ctx.saveSnapshot` is a host capability the tool had never touched. The Build view now saves
the current design under a label worth reading in a list: "Trebuchet · 102 m · 34%".

The payload is deliberately the **design** (machine, its controls, the conditions) and not
the transient shot, wall or tutor state. Restoring should hand back a machine, not replay
somebody's half-finished siege. A test pins both halves of that: the design fields are in
the payload and the transient ones are not.

**Defect 16, in `stem_lab_module.js`.** The host's snapshot **Load** button carries a
hardcoded per-tool restore list (`volume`, `base10`, `coordinate`, `protractor`,
`codingPlayground`). Any tool not on it saves and lists perfectly well, and Load then just
*opens the tool without restoring anything* — a button that does not do what it says.
`machineLab` is on the list now, following the `codingPlayground` line exactly, in both host
copies, and merged onto the existing slice rather than replacing it wholesale.

This is the one place the tool's own partial-state hardening pays off directly: the payload
is a subset of the tool's state, and the defaults fill is what makes restoring a subset safe
instead of blanking everything the payload omits.

## Trajectory overlay

The light-stone / heavy-stone trade-off is the tool's signature lesson, and until now the
only place you could see it was a table of numbers in the shot log. A table *states* a
trade-off; two arcs side by side *show* it.

Each logged shot now keeps a compact 40-point trace (`compactPath`), small enough to hold
several in state and to survive a snapshot round-trip, and the flight graph draws the last
four behind the current shot as faded dashed arcs. The graph scales to fit **every** trace,
not just the current one, or a longer earlier shot would run off the edge; a test checks
exactly that by parsing the rendered points back out.

Same accessibility contract as the ledger and the wall: the picture is never the only
carrier. A text line states the comparison outright, "Dashed arcs are earlier shots: 5 kg →
60 m, 200 kg → 75 m, …", and there is a toggle for visual bulk.

One thing it has to tolerate: history rows saved before traces were kept have no `path`.
They are skipped rather than throwing or drawing a broken line, and that is tested.

## The impossible stone (defects 18 and 19)

**Defect 18. Stone mass and stone diameter are separate sliders, and nothing said so.**
The shipped default was 25 kg at 0.24 m across, which is 3454 kg/m³: denser than any rock,
about iron, in a tool that calls it granite. A student could just as easily build a 1 kg
boulder or a 300 kg orange. This is not cosmetic. Drag depends on frontal area and inertia
on mass, so the implied density silently decided every range number the Compare view
invited a student to reason about, and it was invisible.

Three changes:

- The default diameter is 0.26 m, which puts 25 kg at ~2717 kg/m³, genuine granite.
- `density()`, `diameterFor()` and `densityNote()` in `_machineMath`. The Build screen
  now prints the implied density under the two sliders it comes from, in words the student
  can check against the world ("about stone", "about iron", "lighter than dry wood"), and
  says plainly when the object could not exist.
- The torsion defaults were also wrong, and the density fix exposed it. 12 turns at 0.85 m
  of draw with a 6 kg arm stored 1210 J and threw 8.6 m, which made both torsion engines
  look like toys next to the trebuchet's 102 m. 18 turns, 1.0 m draw, 3 kg arm: 2420 J,
  and a best-stone range around 145 m, which is in the historically plausible band for a
  bolt-shooter.

**Defect 19, in the fix itself: "best" is not one question.** The first cut of the
best-stone sweep reported the stone that flies furthest and called it best. Every answer
was a pebble: 2.5 kg for the trebuchet, 0.1 kg for the onager. That is what the model says
and it is correct, but presented as "best" it teaches a student to throw gravel at a
castle. The panel now asks *"Which stone flies furthest?"*, prints impact energy beside
range, and sets the found stone's impact against the student's own. At the shipped
defaults the onager's furthest-flying stone travels 256 m and lands with 96 J, while the
25 kg stone travels 11 m and lands with 1.2 kJ. Range and delivered energy are competing
objectives, and that tension is the lesson rather than a footnote to it.

Three things the sweep had to get right before it could be believed:

- **The peak is real, not a search artifact.** Launch speed saturates at `sqrt(2E/m_eff)`
  once the payload is light against the machine's own inertia, while drag deceleration goes
  as area over mass and keeps rising as the stone shrinks, so range genuinely turns over in
  between. A test asserts range falls off on both sides of the reported peak.
- **The search can still hit its own edge**, and when it does it says so with a footnote
  instead of quoting the boundary as if it were a maximum. The first floor of 0.3 kg
  clipped the onager, whose true optimum is 0.1 kg.
- **Density is held constant across the sweep**, so every candidate is a real object.
  Without that the "best" stone is just the same ball made implausibly light, and the
  answer is a drag artifact.

**Cost.** ~120 flight integrations behind one click, so it is a button, not a render. The
bracketing pass runs at 10 ms steps (it only has to pick a grid cell); the refining pass
runs at the real 1 ms, so the number on screen is one the tool stands behind. Measured in
Chrome: 21-35 ms median to run, 66-80 ms on a cold first press. `ml_render_cost.cjs` now
pins both.

A stored answer goes stale the moment a slider moves, which is worse than no answer, so
the settings that produced it are stored alongside and a mismatch is called out in the
warning colour with the table dimmed. Proven in the browser harness, where the button
actually runs; the SSR tests cannot build a matching signature because it is derived from
live state.

**A tooling note worth keeping.** Timing this in a Node `vm` sandbox reported 5-8 seconds
for work that takes 120 ms in Chrome, because the sandbox does not JIT the integrator the
way a browser does. It nearly bought a redesign for a problem that did not exist. Time
main-thread work in the environment the student is in.

### The follow-up sweep: a half-wired warning is worse than none

Defects 18 and 19 fixed the physics but left the fix itself only partly wired, which the
next pass over the tool caught. Three things:

**The two stone sliders live in Build, but every other view spends their numbers.** The
Test Range scores a prediction against them and the Target Wall computes damage from them,
and neither said a word about an impossible stone. A warning that appears only where the
value is set is a warning you can walk away from, so `oddStoneNote()` now appears in both,
briefly, naming the actual numbers and pointing back to Build. It is `null` on a real rock,
so a well-built stone costs nothing.

**"Things worth trying" was telling students to build the very thing the warning warns
about.** The first prompt read "drop the stone mass to a fraction of a kilogram," which at
a fixed 0.26 m diameter is a stone lighter than balsa. It now says to shrink the diameter
to match, and points at the button that does it properly.

**The two tables in Compare told opposite stories with nothing joining them.** The top one
has the trebuchet winning by five times on a shared 25 kg stone; the new one below has the
onager reaching twice as far as the trebuchet does. The entire difference is the stone. A
second note now names that: holding the stone constant is what makes the comparison fair,
and it is also a stone that suits exactly one of the three machines.

The Field Manual's "What this model is not" gained the matching entry, because the tool now
prints the implied density and therefore has to say plainly that it will still simulate an
impossible one rather than refusing. Its test checks the SOURCE, not the markup: the manual
collects spoken text as it renders, so a hand-written `<li>` renders identically to a
`bullets()` entry and is silently absent from the read-aloud.

### Defect 20: three panels were speaking in one register, including the ledger

Section 3.6 settled that this tool serves all grades and RESTATES rather than filters, and
the machine copy, the Field Manual and the Compare intro all do. Rendering the whole tool
at `--band=k2` and reading it showed that three blocks never had:

1. **Everything defect 18 and 19 added.** The density line said "2717 kg per cubic metre" to
   a five-year-old, and the warning explained itself in terms of inertia and frontal area.
2. **The Compare prompts, its note and its screen-reader caption.** "Watch what happens to
   the share of energy that reaches the stone" was the same sentence at K-2 and grade 12.
3. **The energy ledger.** This is the one that matters: it is where the tool teaches, and
   every stage label, every loss cause and the efficiency line were single-register. A K-2
   reader met "Kinetic energy at impact" and "Transfer efficiency" cold, as panel labels.

All three now restate. For the younger bands a density is put as a weight that can be
checked against a real rock ("a real stone this big would weigh about 724 kg; yours weighs
1 kg"), which is a better statement of the same fact than the number is, and the ledger
reads "Saved up in the lifted weight" and "Energy the stone has when it lands" over the same
four figures. Only the naming changes: bars and screen-reader table are still built from one
`stages` array, so they cannot drift apart. The drag toggle was relabelled to match, since
the ledger now calls it "pushing through the air" and a control saying "Air resistance on"
would have contradicted it.

The gate is `nothing speaks over a five-year-old` in `machinelab_density.test.js`: it renders
every view at K-2 and fails on a list of terms that carry a grade 6 definition, with a
companion case asserting the older bands still get the proper names. That is the check that
would have caught all three of these on the day they were written.

**Two things this cost, worth knowing before the next band change.** The SSR harness renders
at g35, so a suite full of assertions against grade 6-8 wording had been passing by
coincidence; `machinelab_views` and `machinelab_machines` now pin `bandOverride` explicitly.
And a test asserting `g35` contains "Transfer efficiency" had encoded the defect: the phrase
itself is the thing that does not belong in that band.

**The last two blocks, done in a following pass.** The winch panel and the per-part notes in
"Simple machines in this engine" were the remainder, and finishing them turned up the rule
that should have governed the whole job:

**Where a term is the lesson, keep it and gloss it. Where it is only a label, restate it.**
The Machine Shop already does the first: at K-2 it prints "Mechanical advantage 4×" and puts
"How it feels: Much easier" directly beneath. So the winch panel keeps "Winch mechanical
advantage" at every band and adds "that means the winch pulls 11.3 times harder than you do"
for the younger two, rather than renaming it away. The ledger is the opposite case: "Kinetic
energy at impact" is a bar label, not the subject of a lesson, and kinetic energy is not a
K-2 idea in any framework, so there it is restated. Both are defensible; what would not be is
choosing differently in two panels for no reason.

`young` now lives at render scope beside `band`. It was briefly declared inside `ledger()`
while the winch panel two functions away referenced it, which `node --check` cannot see and
which `renderTool` can swallow into empty output. The test for the part notes asserts the
text is present rather than trusting a green run, for exactly that reason.

The joule figures stay shared across bands on purpose, because the whole thesis of the ledger
is that it is the same four numbers at every level.

### Defect 21: the work record was vouching for an impossible shot

The work record is the thing that leaves this tool and reaches a teacher. It reported
"furthest was 301.4 m with a 1 kg stone" with no qualification, for a stone the tool had
already flagged on screen as one no material could form. Every other surface refused to
stand behind that number and the record stood behind it.

It says so twice now, deliberately. The headline line carries its own caveat, because a
skimming reader takes that number at face value and the counted note is several lines below
it. Both travel with the copy-to-clipboard text.

That needed a fix underneath: a logged shot kept `projMass` but not `projDiameter`, so its
density could not be recovered after the fact. It rides along now. Rows saved before this
carry no diameter, and an unknown density is not evidence of an impossible one, so those are
left unremarked rather than guessed at.

Running the best-stone search was also invisible in the record. It now reports what the
search found rather than that it happened, which makes the line evidence instead of a tick.

The browser harness proves the chain rather than the pieces: fire with an impossible stone,
confirm `fire()` actually writes the diameter onto the logged row, carry that history into
the record and read it. The SSR tests hand-build a history row, so they would not have caught
a `fire()` that stopped logging the diameter.

**A note on the perf gate.** `ml_render_cost.cjs` measures a software-rendered WebGL context
and drifts badly under load: one run reported 143 ms for a render that measures 9.8 ms on a
quiet machine. It now says so on failure rather than sending someone after a regression a
second run would clear. Loosening the budget instead would defeat the point of having one.

## The reachability audit

The crosswind find prompted a sweep of every field in `defaultState()` against whether a
control writes it or the UI reads it, and of every value `shot()` returns against whether
anything displays it. Two more:

**Defect 15. `effMass` was computed, returned, and never shown.** It is *the* quantity
behind the transfer efficiency, and the g9-12 copy quotes the formula it appears in, so a
student was handed `m_p/(m_p + m_eff)` with no way to see `m_eff` and check it. The ledger
now spells the arithmetic out from g68 up: "The stone is 25 kg, and the moving parts of the
machine add another 48.6 kg of effective mass, so the stone gets 25 ÷ (25 + 48.6) = 34%."
A test asserts the stated masses actually reproduce the stated percentage, so the sentence
cannot drift from the model.

**`showWorkPanel` was dead state** — its own default and nothing else. Removed.

The audit script over-reports (bench fields are reached dynamically through `d[c.key]`, so
a `d.<field>` grep misses them), which is worth knowing before trusting it on another tool.
It is a starting list, not a verdict.

## Crosswind (dead capability, now reachable)

**Defect 14.** The integrator has modelled crosswind since P2, `shot()` threaded `windZ`
into it, the wall damage has always used lateral drift to decide which column is struck,
and one of the flight tests asserted "drifts downwind and only downwind" and passed. But
**no control anywhere could change it**, so it sat at zero forever, and `shot()` did not
even carry `drift` back out. The siege view was already telling students "Wide of the wall.
**Check the wind.**" — advice about a control that did not exist.

Now: a crosswind slider in the Test Range conditions and at the Target Wall (where aiming
off matters most), band-appropriate copy explaining it, drift reported alongside range and
apex, and the wide-miss feedback says how far off it went and why.

The physics was already right and already tested, which is exactly why this survived: a
green suite proves the model, and says nothing at all about whether a student can reach it.

## The bench ↔ engine link

The tool's whole thesis is that a siege engine is the six benches bolted together. Until
2026-08-11 that was asserted **only in Field Manual prose**: a student could prove all six
benches and never once see the trebuchet beam *as* the lever they had just proved. Two
panels now carry it, and they read one table so they cannot drift apart.

- **Build → bench.** "Simple machines in this engine" names each part as the machine it is
  (the throwing beam, the winch drum and handle, the cocking tackle, the trigger and pawl,
  the tensioning gear or the loading ramp), shows its **live** mechanical advantage where
  the tool genuinely models it, and offers a button through to that bench.
- **Bench → Build.** "Where you meet this machine" lists the engines that use the bench you
  are standing at, names the part in each, and offers a button through to it.

Where an advantage is real in the mechanism but not in the energy model (the trigger wedge,
the tensioning screw, the loading ramp) the panel says **"in the build"** rather than
printing a number the model never derived.

`MACHINE_BENCHES` at module scope is the single source for which engine uses which bench;
both panels and `tests/machinelab_bench_machine_link.test.js` read it. The test inverts the
table and asserts the Machine Shop panel names **precisely** the engines the table claims,
with no missing and no invented ones, and that the Build panel lists exactly as many bench
buttons as the table declares. A one-directional check would have let the two halves drift.

## Quest hooks

`tests/machinelab_quest_hooks.test.js`, 15 tests. The five `check`/`progress` functions in
the registered config had never been called by anything. The host reads quest state with
`_getToolQuestState()`, which resolves `toolData[toolId]` (`stem_lab_module.js:2425`); this
tool stores at `toolData.machineLab` and declares no `questDataKey`, so the hooks receive
that slice directly. Verified rather than assumed, because a hook reading a key the tool
never writes can never fire and nothing else would notice.

Pinned: all five survive `{}`, `undefined` and `null` without throwing and return a string
progress containing no `undefined` or `NaN`; a fresh tool reads `0/6 benches` rather than
blank; and `breach_efficiently` refuses to credit a breach with an unknown shot count, so
`shotsFired: 0` on an untouched tool cannot read as "breached in zero".

## Frame budget

`dev-tools/ml_frame_budget.cjs` counts real `WebGLRenderer.render` calls. **7 checks, exit
2 on failure.** The `static: true` claim was asserted in the spec, in the code comments and
in the memory notes, and measured nowhere. A no-tick orbit bay quietly burning 60 fps is a
documented regression here and is invisible to every other kind of test: identical markup,
identical numbers, and the only symptom is a warm laptop.

Measured: **0 frames** on the Machine Shop (no 3D at all), **0 frames in 2.5 s** on an idle
trebuchet bay, **0** on an idle target wall, **74 frames in 1.2 s** during a shot (~62 fps),
**0** once the swing ends, and **0** while the tab is hidden. The design does what it
claimed.

**Two defects it found:**

9. **The machine's animation was unreachable.** The only Fire control lived in the Test
   Range, which has no 3D view, so nobody could be looking at the machine while it moved.
   You would have had to fire and switch to Build within 1.8 seconds. There is a **Test
   fire** button beside the 3D machine now, which is where watching it belongs anyway.
10. **The first version of the harness counted nothing.** three.js r128 assigns `render` as
    an OWN property on each `WebGLRenderer` instance, not on the prototype, so wrapping the
    prototype intercepted nothing and the run reported a serene 0 frames everywhere,
    including while the scene was visibly animating. It wraps the constructor now, and it
    **proves the counter ticks on a scene that must render before trusting a single zero**.
    Worth copying: in a file where every check reads a zero as good news, a dead instrument
    turns the whole run green while measuring nothing.

## Interaction smoke

`dev-tools/ml_interaction_smoke.cjs` presses the buttons. **43 checks, exit 2 on failure.**

Everything above it is server-side render only: it proves the markup and the pure model,
and it never once runs an `onClick`. So `fire()`, `loose()`, `submitTyped()`,
`markProven()` and `importArch()` — which award XP, count streaks, accumulate crank work,
flip the animation flag and mutate the wall — had never executed anywhere. This drives them
through the real DOM event path (a control that is present but disabled or not actually a
button fails), against the real host module with THREE preloaded.

What it pins that nothing else could: a correct prediction proves the bench and awards XP
while a later miss resets the streak without re-awarding or un-proving; a blank answer is
rejected rather than scored as zero; firing records a shot, announces it, and **clears its
own animation flag after the swing** (otherwise the 3D loop runs at 60 fps forever); the
Loose button disables on breach and Rebuild restores a full wall; an import switches the
target and carries its depth multiplier.

**Defect 13, found by driving the AI tutor:** `callGemini` was hardcoded `null` in every
harness, so the tutor's success, failure, synchronous-throw and hang paths had never run
anywhere. `aiLoading` disables the Explain button and was cleared only by `.then` or
`.catch`, so **a promise that never settled disabled the tutor permanently with no way to
retry** — and AI calls on this surface do throttle and hang in practice. It now settles
exactly once, whichever of resolve / reject / timeout arrives first, with the timeout
(`_aiTimeoutMs`, 30 s) as the backstop. All four paths are driven, including the retry
after a failure.

**A behaviour it discovered:** the first draft aimed a 45-degree lob at a 6 m wall from
60 m and never touched it in 61 shots. Both halves of that are the tool being right. A high
lob clears a low wall entirely, and a 120 kg stone cannot reach 60 m from this machine, so
the shot correctly reported "Short by …" every time. Walls are battered with DIRECT fire;
a lob is for throwing things *over* them, which is a different job. The smoke now pins both
paths, and a shallow 12-degree shot from 25 m breaches a curtain wall in seven.

**Deck proportions, now fixed.** The torsion deck was a fixed 2.6 x 1.4 slab on 0.7 m legs
regardless of arm length, so on a 1.1 m machine the furniture outweighed the engine. Deck,
legs, bundles and stock are all sized from the arm now, and the camera frames the machine
rather than the table.

**A defect that fix exposed, and one it caused:**

11. **The onager's arm was invisible.** Cocked at -70 degrees it pointed straight through
    the deck and under the ground, so the machine rendered as a table with a cylinder on
    it. A cocked onager lies nearly flat, winched down, and whips up into a padded stop;
    it poses at -10 degrees now, and the stop is placed programmatically at the angle the
    arm actually finishes at rather than guessed at a spot the arm never reached.
12. Scaling the deck moved the arm pivots, but the tick still placed the stone from the old
    hardcoded offsets, which would have floated it off the arm tip. The pivot is recorded
    on `S.ml` and read from there now. Caught by re-shooting immediately after the change.

**Recommendation on P5b: do not vendor `cannon-es`.** The rubble heap was screenshotted
across four presets and reads convincingly as a collapsed wall with the surviving towers
standing. The library check in section 6.2 stands
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

**The accessibility suite** (`tests/machinelab_a11y.test.js`) closes the gap left by
section 7. It asserts against the RENDERED output rather than source strings, across all
six views and all four grade bands: no hand-rolled clickable div anywhere (every control is
a native `<button>` or `<input>`, so the browser supplies role, tab stop and Enter/Space),
every button has an accessible name, every slider and text input is labelled, every
`for`/`id` pair resolves, every graphic has a text alternative and its SVG is hidden from
the accessibility tree, every table is captioned with `scope` on both header axes, results
carry `role="status"` and errors `role="alert"`, and neither the ledger nor the wall is
ever picture-only.

It also computes **WCAG 2.1 contrast ratios from the palettes parsed out of the source**,
so the test cannot drift from what the tool renders. All three themes (light, dark, high
contrast) meet AA 4.5:1 for body text on both surfaces, for the muted and dim secondary
text used at 11 to 13 px, for button labels on the accent fill, for the ok and bad status
colours, and for the accent used as text in the ledger.

Two things it caught immediately: a number-formatting bug (`fmt` stripped a fully-zero
fraction but not trailing zeros in a partial one, so 5.1 at two places rendered "5.10"),
and CDN/desktop mirror drift the moment the source was edited without the mirror. The
mirror-parity check now guards that permanently.

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
| P5a Wall in the 3D scene, deterministic rubble, no dependency | **Built.** |
| A11y suite (spec section 7) | **Built.** 263 tests across 10 files |
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
