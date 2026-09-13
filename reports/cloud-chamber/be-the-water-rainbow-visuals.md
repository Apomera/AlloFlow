# Be the Water: rainbow visual refinement

The scene rainbow now uses narrower, softly blended color bands with lower opacity. The secondary bow remains wider, fainter, and reversed. A single blur pass replaces the original sharp-plus-glow composite. Normal blending allows the subtle darker band between the bows to darken the scene rather than being lost in screen blending. A vertical mask fades the overlay toward the lower scene.

The overlay no longer adds animated sparkles, duplicate rain shafts, a sweeping prism line, a central achievement seal, or breathing opacity. The existing WebGL rain field provides the weather motion. Rainbow discovery, achievement progress, scientific explanations, and notebook evidence remain in their existing panels.

In-scene labels follow the existing More HUD / Less HUD choice. The secondary label sits below the primary label to clear the camera toolbar. On narrow screens, the labels stay in the existing teaching panel rather than crowding the scene. During a learning pause, the rainbow overlay dims behind the explanation card.

The optical eligibility model and the illustrative SVG arc layout are unchanged; this pass does not introduce a physically projected 3D rainbow.

## Validation

- All 129 tests passed across `watercycle_pilot_rainbow`, `watercycle_pilot_experience`, and `watercycle_pilot_kernel`; results: `pilot-rainbow-visual-regressions.json`.
- Live browser checks passed for primary/secondary ordering and relative opacity, optional labels, preserved canvas and paused time, retained evidence, static overlay, both camera views, phone layout and axe accessibility, alignment gating, and snow exclusion.
- A focused final check confirmed both annotation labels sit below the toolbar, with no JavaScript or WebGL errors.
- Final scene, annotated scene, and phone screenshots were visually reviewed in `scratch/water-rainbow-review`.
- JavaScript syntax passed and canonical/desktop sources match.
- Existing local preview restarted at `http://127.0.0.1:58122/?immersive=1&cloud=1`.

Acceptance harness: `dev-tools/watercycle_pilot_rainbow_visual_qa.cjs`.
