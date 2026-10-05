# Pass 40 independent review

Reviewed the six literal change guards against `baseline-runtime.js` and the initial candidate runtime (`6bdffb5f25dbca539c165069a9569846682e9f436e508020415a329652c98a36`). The corrected current runtime was subsequently reviewed at SHA `73cc490a61ab9f2c0f85c8a0ab8478e242e7291a517148b5a3c3391b9ab09788`. This was a read-only source review; no tests, browser, GPU, captures, or servers were run.

## Original finding: resolved in the current runtime

**P2: Observe can force the full HUD block every render frame.** The readiness invalidation at current runtime line 17922 compares `gameState.targetState` to `lastHudTargetState`, while only `updateMission()` acknowledges that state. The Observe action sets `gameState.observationUntil = gameNow + 6000`, and the HUD deliberately suppresses `updateMission()` during that interval. If movement or prey movement changes readiness while Observe holds its message, the state remains unacknowledged and every subsequent frame sets `lastHudAt = now - 125`. The whole HUD update, minimap draw, and threat processing then run every frame for the remaining hold interval. Gate readiness invalidation with the same observation expiry condition used for `updateMission()`, or acknowledge a separate flushed-HUD state. Gating preserves the six-second Observe message and permits the correct target guidance to appear when the hold expires.

The root fixed this issue by gating readiness invalidation with `(!gameState.observationUntil || now > gameState.observationUntil)`, exactly matching the condition that permits `updateMission()`. During the hold the invalidation no longer forces `lastHudAt`; when the hold expires, a pending readiness transition flushes once and `updateMission()` acknowledges the state. If readiness has not changed, the ordinary HUD schedule remains in effect. Read-only inspection confirms the corrected line at 17922 and matching hashes for all four runtime copies. The added CPU case in `tests/cephalopodlab_target_presentation.test.js` extracts the actual invalidation line and covers active hold, expired hold, ordinary changed state, and ordinary unchanged state. I inspected that case but did not execute it. No unresolved actionable findings remain from this source review.

## Reviewed without further blocking defects

- The added end-of-frame `updateTrackedPrey()` does not select prey, consume RNG, accept or resolve a strike, change movement, or alter capture thresholds. Pending strikes still retain their committed target, including null, until the original contact point. The original selection call and contact call remain intact.
- Pause and inspection gates prevent presentation refresh from mutating frozen tracked state. Camera orientation updates reuse the marker quaternion; inspection hides the marker, and leaving inspection restores its existing target position before the next render. No animated pulse or reduced-motion exception was introduced.
- The open bracket geometry is authored once: four corners, eight quads, sixteen triangles, forty-eight non-indexed position vertices. It uses one mesh and one material, with the existing target name, position offset, opacity and depth behavior. The unchanged scene traversal disposes its geometry and material.
- The extra per-frame tracking call creates bounded transient vectors, readiness/detail records and cover raycast arrays using existing helpers. It adds work but no retained collection or unbounded allocation. No new GPU resource is created per frame.
- The body cuticle hook leaves incomplete probe shaders untouched before uniforms are added. Complete material shaders receive local position normalized by the known positive scale values 1, 1.15 and 0.9. Hermit dimensions are selected by a static uniform, compatible with the common program cache key.
- GLSL divisions have positive denominators; smoothstep edge ordering is valid; the polynomial curves avoid signed fractional powers; hash operands remain small; returned roughness is clamped to the intended range. Derivative branches depend on renderer support rather than per-fragment control flow. Groove visibility and pore visibility fade with their screen footprint; pore derivative estimates use continuous lattice coordinates rather than discontinuous fract coordinates.
- The shader retains opaque standard material lighting, existing geometry/colors/normals, static material roughness, existing mesh/material count and texture count. Uniform objects are created only for compilation, and existing crab disposal traversals still dispose each body material.
- Range/depth wording corresponds to the unchanged horizontal crab range and spherical fish range. The signed Rise/Dive cue agrees with the existing depth-readiness rules.

## Timing nuance

The intentional readiness flush invokes the existing full HUD block, including `updateMission()`. That function owns HOME mission completion, so a readiness transition can recognize already-satisfied HOME criteria up to the old 125 ms HUD interval earlier. The criteria themselves are unchanged. It is accurate to claim preserved capture and selection rules; claiming that every gameplay timestamp is byte-exact would be too strong.

Native shader compilation, render quality, ordinary interaction and disposal still require the root agent's planned validation.

