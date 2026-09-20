# Directional wildlife attention

Foxes orient their heads toward the prey cue used for listening, tracking, stalking, and pounce preparation. Alert or retreating rabbits and voles orient toward the nearby threat that supplied their existing behavior cue. Head angles are calculated relative to the animal's current body position and heading, using the prior-frame target position used by the decision.

Head turns ease by at most 0.09 radians per sample, with restrained species-specific limits and a smaller turn during retreat. Near the directly-behind angle seam, an established turn retains its shoulder instead of swapping sides. Ears compensate for the head's current orientation and preserve the existing gradual, asymmetric motion. Resting, absent, and airborne animals release target attention; alert animals without a nearby cue retain the existing scan.

This changes presentation only. It adds no sensing range, line-of-sight model, feeding links, capture outcome, or numerical food-web effects. Head tracking is horizontal; the existing feeding, resting, and pounce pitch poses remain. Recorded attention reconstructs deterministically on rewind. No new geometry, textures, materials, draw calls, or animation timers are added.

## Validation

- 15 unit checks passed across directional attention, ear motion, behavior, and action transitions. The new circular-angle assertion was corrected to account for wrapping before its successful rerun.
- Both browser scenarios passed: directional attention and existing ear articulation. Coverage checks actual head and ear transforms, the selected representative's position, replay, reduced motion, mobile layout, unchanged saved run data, and runtime errors. Desktop fox, rabbit, vole, and mobile rabbit captures were visually reviewed.
- The existing ear-articulation browser regression passed. The new test handles the intentionally disabled selector when only one representative remains.
- JavaScript syntax passed; web and desktop source copies match.

SHA-256 for both ecosystem JavaScript files:

`7D2791DB839C2CC1B014BC7EBB9D83AB86D4A92BEE520BA461E54DBAFF2A0E45`

Permanent tests: `tests/ecosystem_directional_attention.test.js` and `tests/e2e/ecosystem-directional-attention.spec.ts`.
