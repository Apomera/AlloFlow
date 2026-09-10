# Be the Water: readable phase-change visuals

The energy-transfer cue now uses eight pooled, camera-facing arrows. Absorption points toward the water; release points outward. The existing particle shell remains a schematic teaching cue. A thinner, quieter ring and smaller overall footprint leave the parcel easier to see.

The cue starts visibly on the frame of a real phase change. Its clock freezes when the simulation pauses or the document is hidden, so an automatic learning pause retains the diagram. Resuming lets it finish normally. Reduced motion uses a static arrangement with readable arrowheads. Checkpoint restoration clears the previous cue; transitions within the same phase do not produce a latent-energy effect.

Water view places the schematic ahead of the camera, while Follow view anchors it to the parcel. These are illustrative indicators, not simulated energy particles or water escaping from the parcel. The physics kernel and energy-transfer classification are unchanged.

Wide scenes use an explanation card to the right of the parcel, based on the actual scene container width. Learning pauses provide at least 640 px of scene height, allowing the explanation and controls to remain readable. Small screens retain the full-width reading card. A short caption explains the live arrows and explicitly distinguishes them from water particles; historical observation reviews retain their recorded energy explanation without referring to live arrows.

## Validation

- JavaScript syntax passed; source and desktop public copies synchronized.
- Pilot experience and kernel suite: 116 tests passed initially; one rendering test timed out under concurrent load and passed when rerun separately. All 117 tests passed across the two runs.
- Live browser check passed for actual evaporation and condensation transitions, inward/outward arrow direction, pause retention beyond cue duration, expiry after resume, checkpoint clearing, static reduced motion, and no latent-energy cue for liquid cloud-to-rain formation.
- Responsive checks passed at 1280, 390, and 320 px, including notice bounds, horizontal overflow, and axe accessibility checks.
- Shared arrow geometry and material each dispose once. No captured JavaScript, shader, or WebGL errors.
- Focused Water view check passed: cue in front of the camera, with frozen time and arrow arrangement preserved.
- Desktop, phone, and first-person screenshots visually reviewed in `scratch/water-energy-review`.
- Existing preview restored at `http://127.0.0.1:58122/?immersive=1&cloud=1`; HTTP 200 confirmed.

Acceptance harness: `dev-tools/watercycle_pilot_energy_qa.cjs`. Regression results: `pilot-energy-regressions.json` and `pilot-energy-render-recheck.json` in this directory.
