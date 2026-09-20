# Ecosystem ground navigation

Ground-moving representatives now anticipate rocks and fallen wood, turn toward a passing route, and limit steps that would cross a prop's clearance envelope. Species-sized allowances provide more room for foxes than smaller animals. The renderer and navigation share the same seven rock and wood positions.

Existing overlaps recover through outward movement without snapping positions. Overlapping clearance envelopes use a shared escape direction. Recorded travel reflects actual movement so planted feet and gait remain aligned with the path. Inspection adds a short explanation when the selected animal adjusts its route.

This is deterministic local steering around conservative circular envelopes, not full mesh collision or global pathfinding. Starting overlaps clear when movement resumes. Flying owls and committed airborne fox pounces retain their existing routing. Representative paths and proximity-driven behavior can change; numerical food-web results and saved run data remain unchanged. Reduced motion suppresses the navigation cue.

## Validation

- 20 unit checks passed across ground navigation, behavior, action transitions, behavior cues, and mammal rest.
- 3 browser scenarios passed: ground navigation, behavior, and mammal rest.
- The final navigation browser scenario also passed with an outside-approach sample selected for visual review.
- Desktop and mobile captures reviewed: `detour.jpg` and `mobile.jpg`.
- JavaScript syntax check passed. Source and desktop mirror are identical.
- No additional scene geometry, materials, textures, or draw calls.

SHA-256 for both ecosystem JavaScript files:

`2FBEAF0A985EB6B852185132979021AD7C1B37D4126F27B4EB75F4F8FE95F216`

Permanent coverage: `tests/ecosystem_ground_navigation.test.js` and `tests/e2e/ecosystem-ground-navigation.spec.ts`.
