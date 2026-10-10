# Cephalopod Hunter — pass 45

The water column now has a smooth per-fragment gradient and a broad glow toward the existing sun direction. The horizon starts with the exact fog color, and the dome follows the actual rendered camera during pause and inspection without advancing the world. Additive caustics fade to zero radiance in distant fog instead of adding a second colored veil.

The active terrain silhouette is still terrain; this change does not flatten the seabed or claim to remove all ridgelines. The initial dark band and paused dome offset were separate confirmed presentation defects. Nearby detail, fog ranges, gameplay, world generation, textures, and resource counts are preserved.

## Validation

- 88 targeted CPU checks accepted: 82 existing checks plus six new checks. See cpu-accepted-results.json for the original run and test-only correction. This is not a full repository suite result.
- Five native Chromium scenarios passed with one worker, zero retries and zero skips: water lifecycle on desktop/balanced and phone/low; three target-presentation gameplay scenarios. The new GPU probe uses the production caustic material and reads actual pixels at near, middle and far distances.
- Native checks cover initial pause, View, Inspect, reduced motion, real movement, exact fog/backdrop agreement, shader compilation/linking, retained resource identities, and disposal once.
- Four before/after pairs have identical camera poses, draw calls, triangles and point counts. The immediate-pause reef and phone pairs also have identical world-transform digests. The two active desktop pairs retain the same scene but 14 ambient animal transforms differ between independent runs; these are recorded in comparison-receipt.json, so those images are illustrative rather than an exact pixel comparison. Both captures also fix global visual randomness to seed 8191, alongside production world seed 2741. Active views use 60 controlled 0.05-second ticks, followed by pause. The first reef view pauses before the first active tick; the upper-water view uses a diagnostic camera.
- All four runtime copies have SHA-256 7c9727395f6ed765e142e13a7aa45dd1f0257203099187866ce93b2639c6dcbb. The strict inverse recovers the accepted pass44 source d93976fa207ae4fade26d361453042c2a8d0216f18c1c3932dcfac15eda3aed7. Scoped git diff --check passed.
- Audio output was disabled during automated rendering. No hardware frame-rate or audio-quality claim.

## Files

- gallery.html: interactive before/after review.
- comparison-receipt.json: camera/draw counts, per-view world-transform agreement, ambient actor differences and image hashes.
- final-native.json and final-native-receipt.json: native results and unchanged-source evidence.
- source-audit.json: runtime copies, syntax and scoped diff check.
- reference-migrations.json: historical test adapters only; original goldens remain unchanged.

No staging, commit, push or deployment was performed.
