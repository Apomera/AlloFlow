# Bridge Lab exact interval controls

October 3, 2026. Changes remain uncommitted.

The energy inspector now places **Pinned time (s)** and **Inspected time (s)** together. Students can enter either endpoint to the millisecond without navigating to the timeline. Inputs pause replay and driving, accept finite numbers, ignore empty edits and clamp to the 0–24 s event.

**Swap moments** exchanges the pin and inspected frame while keeping chronological energy evidence unchanged. It keeps the selected A/B experiment, physical inputs, view and writing. Matching guided questions remain selected because interval identity uses the earlier and later moments. The action is disabled when the moments coincide and announces the result to assistive technology. Both fields and the button have 44 px minimum height and work in immersive scenes and the labelled 2D fallback.

The single-mode physics model, modal energy definitions and recorded history are unchanged. Changing endpoints changes the inspection, not the experiment.

## Validation

- 10 focused unit checks passed; 126 unrelated interaction checks were skipped.
- Nine browser workflows passed: exact editing and keyboard swapping at desktop and 320 px, four existing interval workflows and three guided-question workflows.
- Parsed source, identical canonical/public mirrors and 1,166 matching English fallback values in both registries.
- Desktop and phone controls inspected for readable labels and numeric fields; browser checks found no horizontal overflow.

Run verification: node reports/bridgelab-interval-controls-2026-10-03/verify.cjs

- [Desktop exact time controls](bridge-1000-exact-time-controls.png)
- [Phone exact time controls](bridge-320-exact-time-controls.png)
