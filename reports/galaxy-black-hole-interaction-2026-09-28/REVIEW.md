# Black Hole Lab: placement, throwing, and debris

## September 29 follow-up

A separate optical view now computes light bending for the disk and sky. See [the optical-view review](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-optics-2026-09-29/REVIEW.md). Dropped-object light remains future work.

## What changed

The release is now something the learner can set up directly in the scene. **Place object** changes its position on the orbital plane. **Aim throw** changes its starting velocity. A yellow arrow shows that velocity, and the dashed line previews the center trajectory before release.

- Release distance spans 4–8 horizon radii, with a full choice of launch angle.
- Throws can point inward or outward and run in either orbital direction.
- Camera motion, placement, and aiming have separate modes. Pointer capture keeps an active drag consistent; Escape or a canceled gesture restores the previous release.
- Arrow keys and labeled sliders provide alternatives to dragging. Touch placement uses the same orbital-plane mapping.
- Drag events are combined into one preview rebuild per rendered frame. Releasing the pointer commits its final position.
- The main action is now **Release object**, which also fits orbiting and escaping launches.

## Breakup and rendering

Probe bodies, panels, and antennae can follow separate paths. The astronaut teaching model uses separate body segments. Stars become 32 glowing parcels with individual paths and trails. Star parcels align with their motion instead of tumbling into sharp crossing streaks.

At the illustrative disruption threshold, each parcel inherits the center's velocity and starts from its displayed offset. Its subsequent Schwarzschild trajectory is computed independently. Enlarged offsets that cross the horizon are excluded, including offsets that would otherwise incorrectly emerge on its far side.

The timeline includes a short debris observation period after center capture where applicable. It reports how many fragments remain outside. Rewinding reconstructs the intact model, and revisiting the same time reproduces the same fragment positions. Object lighting now makes the probe and body segments easier to recognize.

## Dynamics corrections

The center model now includes radial release velocity as well as signed angular momentum. Circular orbits complete after one revolution. An eccentric trajectory can whirl through a revolution and continue toward capture, so a revolution alone no longer ends such a run.

These equations use a nonrotating Schwarzschild spacetime and proper time, following the effective-potential treatment in [The Geometry of General Relativity](https://sites.science.oregonstate.edu/physics/coursewikis/GGR/book/ggr/orbits).

## Verification

- All **17 focused numerical tests pass**: analytical fall timing, circular and reversed orbits, escape, energy conservation, tidal scaling, drag-to-velocity conversion, deterministic fragments, horizon clipping, and input bounds.
- Chromium/WebGL checks pass for pointer placement, aiming, Escape cancellation, keyboard adjustment, touch placement without camera movement, fragment rewind/replay, all three objects, mass comparison, capture/orbit/escape, pause/step/reset, context recovery, leaving the lab during a drag, and reduced motion.
- Screenshots were inspected at desktop and phone sizes. The browser checks report no page/console errors and no horizontal overflow at 390px or 320px.
- The canonical plugin and desktop copy match. Eighteen new English strings are registered in both UI catalogs and the Galaxy English catalog. Other locales use the English fallback until translated.
- The full Galaxy run recorded **370 passed / 374 total**. One failure expected the old release-button label; that assertion now checks **Release object**, and **all 6 mode smoke checks pass** in `smoke-results.json`. Three remaining failures concern shared catalogs outside this change: two checks find literal escape text in `geoq_you_said`, and one finds registry mirror differences in plate-tectonics and lesson-board entries. The new black hole strings match exactly. Evidence is saved in `vitest-results.json` and `catalog-verification.json`.

The browser harness uses the actual plugin, React, Three.js, and app CSS in a small local host. It does not verify the full application shell or deployment. Run it with `node dev-tools/galaxy_black_hole_qa.cjs`; add `--serve` for an interactive local preview.

## Remaining limits and next priorities

**The next large visual improvement is consistent light bending.** The current disk and arcs remain stylized. A shared optical renderer should bend the disk, background, and falling-object light with the same solution, validated first for a nonrotating black hole. The distinction between the horizon and the observed shadow matters here; [NASA's anatomy guide](https://science.nasa.gov/universe/black-holes/anatomy/) explains the visible structures.

The new fragments are independent point trajectories, with enlarged display offsets and illustrative deformation thresholds. They do not calculate material strength, fluid pressure, self-gravity, collisions, or disk interaction. Their colors and playback timing do not implement a distant observer's received light. Disk spin still changes appearance only.

After the optical renderer, the most useful additions are synchronized comparisons of two saved releases and a shared physical profile between the galaxy nucleus and close-up lab.

## Captures

- `place-and-throw.png`: positioned probe, velocity arrow, and predicted trajectory.
- `after-star-disruption.png`: independently moving stellar parcels.
- `after-desktop.png` and `after-phone.png`: final controls and layout.
- `after-tidal-stretch.png`, `after-supermassive-probe.png`, and `after-astronaut.png`: object and mass examples.
