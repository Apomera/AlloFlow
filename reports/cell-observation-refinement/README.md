# Cell simulator observation refinement

Observation mode now has a selected-specimen toolbar with Hide/Show labels, Center, and Specimen notes actions. It keeps the specimen name visible on phones, offers 44px-tall controls, and avoids repeating the selected-specimen caption.

The annotation preference is saved in cell state and initializes newly mounted canvases. Hiding labels removes their hit regions and closes the current observation tooltip. Selecting an anatomy row restores labels automatically. Play missions keep their required anatomy labels regardless of the observation preference.

When the selected organism's center is outside the canvas, its observation labels no longer remain pinned across the dish. Center restores the specimen and its visible annotations without resuming a paused simulation. Notes and anatomy navigation preserve keyboard focus behavior.

## Verification

- 15 unit checks passed: canvas lifecycle, play tutorial contracts, and render warnings.
- 6 existing browser checks passed for desktop/mobile anatomy layout and microscope controls.
- 3 new browser checks passed: the observation workflow at 1200px and 320px, plus plant-mission labels with observation labels disabled.
- New checks cover persisted preference, cleared hit regions, pan/offscreen behavior, recentering, header clearance, 44px controls, notes focus, and anatomy-row restoration.
- Desktop and narrow-phone screenshots were visually inspected.
- Syntax and diff whitespace checks passed. Source and desktop mirror match byte for byte.

## Previews

- [Desktop with anatomy](labeled-1200.png)
- [Phone with anatomy](labeled-320.png)
- [Desktop without labels](clean-1200.png)
- [Phone without labels](clean-320.png)

The randomized teaching model was paused for these captures. Logs: unit.log and browser.log. The local test run was slow but completed successfully.
