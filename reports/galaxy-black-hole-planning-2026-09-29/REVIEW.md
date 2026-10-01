# Black Hole Lab: plan and compare releases

## Result

The object experiment now explains a release before it runs. A prediction beside the scene shows whether the modeled center is captured, circles the hole, escapes, or remains on a bound or unbound path within the computed interval. It also shows the closest distance reached in that interval.

**Compare paths** keeps one trajectory in purple while release changes update the cyan trajectory. Different dash lengths distinguish the paths as well as their colors. Restore comparison release brings back the object's type, black-hole mass, release distance, angle, sideways motion, and radial push. The comparison stays available through playback, ordinary resets, and switching to Light bending; it is cleared when the lab is closed or explicitly cleared.

![Capture compared with a circular orbit](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/galaxy-black-hole-planning-2026-09-29/capture-versus-orbit.png)

## Interaction improvements

- **Aiming preserves the existing throw.** Pointer-down and a click leave the velocity unchanged. Dragging adds a displacement to the original vector. Returning to the starting point restores that vector, including after reaching a slider limit. Escape still cancels the edit.
- **Release here** places the action directly below the scene, which reduces scrolling on phones. It respects the current pause setting and reduced-motion preference.
- **Dragging reuses rendering resources.** Changes to launch position and velocity update the intact model's placement and existing path buffers. They no longer rebuild the model's meshes for each drag update. A retained comparison has its own geometry, so subsequent updates cannot overwrite it.
- **Reset view includes the star's enlarged envelope.** Its camera distance now uses the same framing calculation as the initial view.
- **Tall scenes scroll normally.** The scene stays pinned only when its full height fits the viewport. This fixes lower controls being covered by the evidence section when Compare paths is expanded.

## Verification

- **42 focused tests passed:** 24 object-dynamics tests, 12 optics tests, and 6 Galaxy mode checks. New checks cover prediction bounds, finite observation intervals, anchored aiming, and control limits.
- The expanded Chromium/WebGL suite passed with no page or console errors. It verifies retained geometry during edits, replacing and clearing a comparison, restoring all release settings, view switching, click and drag behavior, direct release, and the existing placement, breakup, replay, context recovery, and cleanup checks.
- Active comparison controls passed at 390 and 320 pixels with no horizontal overflow.
- A final rendering check verified the clearer path colors, buffer updates, independent comparison geometry, and clickable lower controls with a tall scene.
- The optical browser suite passed, including paused rendering, context recovery, state preservation, and desktop/phone layouts. The measured shadow radius remained 70.5 pixels against a predicted 70.35 pixels.
- Both Galaxy source copies match. The three English catalogs parse and contain the 18 new labels. The scoped whitespace check passed.

Results: [focused tests](./vitest-results.json), [object browser checks](./browser-results.json), [comparison checks](./planning-results.json), [final rendering checks](./final-render-results.json), [optical browser checks](./optical-browser-results.json).

## Scope

Predictions and comparisons describe the modeled **center path**. Fragments may diverge after breakup. Bound and unbound previews retain their finite-interval labels; they are not presented as completed circular orbits or guaranteed final outcomes. Distances use horizon-radius units, so changing black-hole mass can change the tidal illustration without changing the normalized center trajectory. The underlying motion equations are unchanged in this pass.

No commit was created.
