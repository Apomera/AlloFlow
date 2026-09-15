# Coaster Lab: the onboard rider no longer passes through the ride (2026-09-14)

Report: "in first-person view the rider sometimes goes through things they shouldn't."

## What the camera was passing through

Measured with a new dev hook, `_lab.cameraClearance(s, seat, reach)`, which puts the
rider's eye at arc length `s` and casts short rays in six directions at everything but
the train. Swept every half metre of the seven templates, three random designs, a
figure-8 and a descending helix; then photographed the hits.

1. **Support columns through a lower track.** A column drops straight down from every
   twentieth sample. Where the track passes under itself (figure-8, helix, any
   out-and-back crossover) the upper leg's column stood in the lower leg, and the
   rider of the lower leg went through it. The seven templates and the procedural
   generator never cross themselves, which is why it was "sometimes": it needed a
   student's design. `scratch/coaster-onboard-before/fig8-onboard-233.png` shows it.
2. **The station on a curved approach.** The station is a straight 12 m platform placed
   along the heading at sample 0. A return leg sweeping in from the platform's side
   ran through its gate posts and bay plates (0.13 m from the camera at s = 3.5 on the
   figure-8).
3. **The rider's own arms.** In any row but the front, the camera sat between the two
   riders' shoulders (1.78 m above the spine; their heads are at 1.93). In airtime the
   arms swing up and forward, through the lens, as two flat slabs filling the sides of
   the view. `scratch/coaster-onboard-before/family-seat2-airtime-87.png`.

## Fixes (`stem_lab/stem_tool_coasterlab.js`, mirrored)

- **Clearance-aware supports** in `rebuildTrackMeshes`. A column is blocked when any
  sample of another stretch (more than 8 m of arc away) lies within 2.3 m of it in plan
  and below its top. A blocked span first tries a column 3.4 m to either side on a
  level outrigger cap, checking the column and the beam against a 2.2 m rider envelope;
  if both sides are blocked the span goes without. Braces of tall supports get the same
  segment test and are dropped individually. Templates are unchanged (same column and
  brace counts before and after).
- **Station placement search.** Samples within 30 m at platform height are projected
  into the station's frame; the station takes the nearest of a small grid of sideways
  offsets (2.6 to 9.1 m) and forward shifts (0 to 5 m) where no sample within its length
  falls between the far side of the canopy and the boarding edge. Templates land in
  exactly the old place.
- **Eye-level camera, own riders hidden.** Rear-row camera at 1.93 m above the spine
  (car origin 0.55 + head 1.38), so it looks over the seat shells of the car ahead
  instead of into them. `updateRiders` no longer draws the riders in the camera's car
  (`eyeCar()`); `capturePhoto` calls `updateRiders(true)` so the trackside photo still
  shows a full train.

## Verification

- `tests/e2e/coaster-onboard-clearance.spec.ts` (2 tests): figure-8, helix, looper,
  twister and oval swept at 0.9 m reach with zero intrusions and supports still
  present; rear row hides exactly two riders onboard, everyone visible for the photo
  and in orbit.
- `tests/coaster_*` (13 files, 374 tests) green after updating the two source pins.
- `dev-tools/check_deploy_mirror.cjs`: 0 drifted.
- After shots: `scratch/coaster-onboard-after/contact.png`.

## Second pass, same day

- **Headlight cone hidden from the nose camera.** The front-row camera sits 0.2 m off
  the cone's narrow end, and its additive walls piled up into a pale oval in mid-view
  (`scratch/coaster-onboard-after/before-nose-loop.png`). The point light stays; only
  the cone mesh is skipped for `onboard` seat 0 outside XR.
- **Chase and scenic cameras pull in past scenery.** `pullCameraClear(from, wanted,
  minimum)` casts a bundle of five rays (centre and 1.4 m either side and above/below
  at the camera end) from the train to the wanted position against supports, the
  station and trees, every third frame, and pulls the camera to 0.7 m short of the
  first hit (never closer than 4 m chase, 6 m scenic). Track tubes are skipped: thin,
  and the costliest geometry to test. Under a lift hill's column forest the train now
  stays visible (`contact-chase2.png`); a third-person camera inside a dense structure
  will still have columns beside it, which is the structure, not a defect.
- Dev hook `thirdPersonClearance(s, mode)` reports the settled distance and whether
  the pull engaged.

## Third pass (2026-09-15)

- **The Ferris wheel steps out of the way.** It is park dressing at a fixed spot
  (110, -94) that sits inside the 260 m design bounds, so a wide layout ran through its
  28 m ring. `placeFerrisWheel(ctr, rad)` runs with the tree scatter: if any sample
  comes within 26 m of the home spot the wheel moves out past the layout along the line
  from the layout's centre, and comes home once the track leaves. Templates untouched.
- **Rear rows swept too.** The gate now sweeps a rear row (eye 0.7 m higher than the
  nose camera) on the figure-8 and helix, adds the wide layout, asserts the wheel moved
  only there, and reports a full rebuild under 250 ms (35 to 105 ms under SwiftShader,
  noise between runs larger than the clearance tests' share).
- Clearance loops prefilter by plan box and height before any distance work.

## Fourth pass (2026-09-15) — malformed-save audit, no defect found

A lab-wide sweep found "unknown persisted tab id renders an empty shell" in 11 STEM and
34 of 68 SEL tools, so Coaster Lab was audited for the same class. **It is clean.** All
24 of its persisted keys were poisoned at once with seven junk shapes (`__junk__`, ``,
`{]`, `-999999`, `[]`, `{"points":[]}`, `null`) in a real browser: every panel renders,
no page errors, no console errors. Each read is allow-listed (`coaster_lab_challenge`,
`..._seat`, `..._theme`), binary-branched (`..._level`), or sanitised by the consumer
(`applyTrackViz` falls back to `track`; `genElementMath` ends at an always-available
capacity question); the saved design has a recovery path that backs the bad value up
and loads the starter layout.

Two things about how this was measured, both mistakes caught by checking:

- **The key list must come from the source.** The first sweep used a hand-typed list and
  missed 11 of 24 keys, including every JSON-valued one — the saved design is
  `coaster_lab_design_v2`, not `coaster_lab_design`, so the highest-risk key was never
  poisoned while the sweep reported clean.
- **Panel text length does not detect an empty shell.** With a planted
  `level !== 'engineer' -> return`, the Certify panel kept ~1.6 KB of static intro copy
  and a length assertion passed the mutation. The gate now measures the containers the
  tool fills at runtime (`#clab-problems`, `#clab-markerLegend`, `#clab-missionList`,
  `#clab-reportBody`, the Build palette and safety list); that version fails the same
  mutation at `Certify checkpoint work rendered: expected > 120, received 0`.

Gate: `tests/e2e/coaster-poisoned-storage.spec.ts` (8 tests, ~4 min), mutation-proven.

## Not changed

A design whose track crosses itself under 2.4 m already raises the `track-clearance`
finding and is left to the student.
