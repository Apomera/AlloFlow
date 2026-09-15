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

## Not changed

A design whose track crosses itself under 2.4 m already raises the `track-clearance`
finding and is left to the student.
