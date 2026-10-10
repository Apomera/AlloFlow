# Cloud growth reading guide and pause behavior

The chamber now preserves the visible microphysics frame when paused. Ordered reference diagrams make droplet coalescence and ice deposition readable without motion. The diagrams reuse the simulation geometry and identify the sequence as an illustration.

## Changes

- Pause holds condensation tracers, merging droplets, and growing ice in 2D and 3D.
- Automatic storm progression in 2D and weather easing in 3D stop while paused. Deliberate weather edits still apply, while unrelated weather values remain held.
- Switching into an already paused 3D view displays the correct weather status.
- Three responsive reference frames explain each cloud-growth process. At exactly 0°C the guide does not select a growth process from temperature alone.
- The detailed explanation is available under “How to read this chamber.” Low-growth warm setups receive an explanation of the limiting conditions.

## Validation

- 36 browser checks passed, including exact last-playing/first-paused growth equality, held frames, resume, reduced motion, manual paused edits, and lifecycle playback.
- 6 screenshots checked at 1280, 390, and 320 pixels, including dark and forced-colors views. No horizontal overflow.
- The explanation opens and closes by keyboard. Initial paused 3D status passed.
- Both runtime copies match and parse. Scoped git whitespace check passed.
- Preview on port 8770 returned HTTP 200 with the final source hash.

The interaction harness hides only the 3D cloud-volume mesh to keep software rendering responsive. Actual particle geometry, native controls, and simulation state remain active. This run validates the new reference diagrams and pause behavior; it does not re-audit the full cloud shader.

Source SHA-256: `f3e3f9f692887b2e1bb76db09aac3c75e93121003035a32510b3f6eee9895f0f`.

From the repository root, run `node reports/watercycle-growth-reading/verify.cjs` to check the saved evidence and exact source deltas. The standalone browser checks can be rerun with `node reports/watercycle-growth-reading/qa.cjs f3e3f9f692887b2e1bb76db09aac3c75e93121003035a32510b3f6eee9895f0f`; visual checks use `node reports/watercycle-growth-reading/capture.cjs`.

No commit was created.
