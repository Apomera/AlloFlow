# Clearer flight approach guides — 9 September 2026

The three cyan approach rings are now open frames with dark outlines. Gaps preserve more of the landscape view, the next frame receives stronger emphasis, and nearby or passed frames fade. Their position and size stay fixed while paused; they are optional guidance rather than checkpoint evidence.

The active frame is labeled **GUIDE · OPTIONAL** with its number. The label uses the upper edge when there is room, or the lower edge when the upper edge is outside the usable view. Both the Three.js scene and the 2D fallback use the same guide state.

The existing route inspector now includes a compact visual legend explaining the cyan frames, gold DCA volume, and dashed target bearing. Shape and text distinguish the cues as well as color. The legend explicitly identifies them as human learning aids. Flight-school wording now directs the learner to meet the gold DCA volume's range and altitude conditions together.

The DCA volume retains its 72 model m radius and 100–130 model ft altitude band. Its decorative rotation is held still. Guide presentation never records a checkpoint or alters flight physics, energy, randomness, or scoring.

Visual review also found an existing heading/motion caption overlap during downward drift. Captions now separate vertically where needed, while retaining the camera-projected cue positions and keeping the motion caption clear of its ring near the lower instruments.

## Verification

- 30 focused unit checks passed for optional guide state, exact DCA conditions, visual cues, and WebGL lifecycle. A final 14-check renderer/motion run also passed after label refinements: 38 distinct passing assertions in total.
- Four distinct browser scenarios passed across the runs: canonical DCA entry, 3D approach frames and checkpoint separation, mobile fallback and legend accessibility, and existing camera-aligned motion cues. The final three-case run passed in full.
- The initial mobile test failed because its stroke instrumentation compared a fractional canvas line width with exact equality. Screenshot review confirmed the frames rendered; the probe now uses a numeric tolerance and passed on rerun.
- Browser checks verified fixed guide geometry, modeled DCA dimensions, unchanged paused physics, optional-guide labeling, caption separation, keyboard disclosure, both themes, 320 px overflow, scoped Axe checks, and forced-color visibility.
- Visually reviewed the final chase view and dark mobile legend. Source syntax, scoped whitespace, and matching desktop/source checks passed.

The complete repository suite and a performance benchmark were not run. Existing unrelated workspace edits were preserved.

## Artifacts

- `scratch/beehive-flight-deck/open-guides-chase.png`
- `scratch/beehive-flight-deck/open-guides-cockpit.png`
- `scratch/beehive-flight-deck/open-guides-fallback.png`
- `scratch/beehive-flight-deck/flight-scene-key.png`
- `scratch/beehive-flight-deck/flight-key-mobile-light.png`
- `scratch/beehive-flight-deck/flight-key-mobile-dark.png`
- `scratch/bee-open-guides-unit.json`
- `scratch/bee-open-guides-final-unit.json`
- `scratch/bee-open-guides-browser.log`
- `scratch/bee-open-guides-final-browser.log`
