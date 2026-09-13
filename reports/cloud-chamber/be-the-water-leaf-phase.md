# Be the Water: visible leaf-phase consistency

The main scene now keeps the parcel liquid during the model's `transpiring` preparation stage. The vapor shell and marker appear only when the kernel changes the form to `vapor`. This matches the existing molecular lens and the learning notice: xylem transport itself has no phase change, while the subsequent vapor transition absorbs latent heat.

A compact leaf-energy illustration appears during this preparation stage. It labels the parcel as liquid, identifies the energy arrow, and describes vapor as invisible. Its progress bar reflects the existing normalized model energy, not temperature or a measured quantity in joules. The illustration is enlarged and schematic. It hides while the learning notice is open, preserving the reading space.

The upper energy hint now describes leaf water rather than sunlit surface water. The leaf-release notice reports that the evaporation threshold was reached instead of displaying the zero-percent energy value after the kernel resets it. The desktop card also has explicit clearance above the flight controls.

The same pooled liquid and vapor meshes are reused; no new scene geometry or animation loop is introduced. The kernel, phase thresholds, timing, altitude mapping, and energy rules are unchanged.

## Validation

- Final verification: **117 tests passed, 0 failed**. The final focused mobile run also passed the corrected threshold notice, normal and forced-colors accessibility, and actual reduced-motion vapor release. Syntax passed, source mirrors match, and the preview returned HTTP 200.
- Existing experience and kernel regression report: `pilot-leaf-phase-regressions.json`.
- The complete browser acceptance run passed liquid presentation at zero, partial, and near-threshold energy; matching molecular phase; actual vapor and xylem transitions; pause and reduced motion; both cameras; notice separation; and desktop/mobile layout. Responsive and contrast checks wait for the resized scene to settle. No page or WebGL errors were observed.
- Browser acceptance: `dev-tools/watercycle_pilot_leaf_phase_qa.cjs`.
- Visual captures: `scratch/water-leaf-phase-review/`.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.
