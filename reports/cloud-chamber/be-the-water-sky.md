# Be the Water: sky, sun and surrounding clouds

The sky gradient now uses sky-local directions, and its dome follows the camera. Previously the gradient used world coordinates, so travelling could shift the apparent horizon colour. The visible sun now stays 720 display units from the camera along the scenario's existing solar direction. Its direction and projected position remain stable during horizontal and vertical travel.

A smaller sun disk and a soft angular glow in the sky shader replace the large, hard-edged halo mesh. The existing seasonal palettes and rainbow optical calculations remain unchanged. The glow and disk size are illustrative, not a physically accurate scattering or angular-size model.

Nine surrounding cumulus groups use varied sizes and depths, with soft irregular lobe contours and stronger underside shading. Their textures remain shared with the parcel cloud and first-person veil. The clouds fade near both sides of their wind-wrap boundary. Pauses hold their motion; enabling reduced motion now holds their current visual time instead of returning them to starting positions.

These changes refine scenery and its motion. They do not add volumetric cloud physics or change condensation, collection, phase-transition or transport rules.

## Verification

- Final pilot experience, kernel and rainbow regression results are recorded in `pilot-sky-regressions.json`.
- The final `dev-tools/watercycle_pilot_sky_qa.cjs` browser run passed sky-centre, sun-distance, direction and projection checks across horizontal/vertical travel; transparent texture corners; paused/running/reduced cloud motion; fades on both sides of the wrap; seasonal palettes; both cloud camera modes; mobile overflow and canvas-container accessibility; and shared-resource cleanup.
- No page, shader or WebGL errors occurred in the final browser run.
- Sun, surrounding clouds, parcel-cloud Follow view and inside-cloud Water view screenshots were visually reviewed in `scratch/water-sky-review`.
- JavaScript syntax passed and canonical/desktop source SHA-256 hashes match.
- Existing local preview returned HTTP 200 at `http://127.0.0.1:58122/?immersive=1&cloud=1`.
