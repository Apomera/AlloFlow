# Geometry World landscape art direction

The replacement is ready in [landscape-art-direction.js](landscape-art-direction.js). It is a self-contained replacement for the existing `initLandscape` closure inside the core engine. This subtask has not edited the application source or launched a browser.

The prior wide scene has an almost continuous green dome behind the building. Its low-frequency terrain profile hides much of the distant relief, and the few small trees contribute little scale. The replacement lowers and varies the foothill silhouette, reveals a separate middle mountain chain, and staggers higher peaks behind it. The useful ridge crests sit approximately 80–115 units beyond the lesson boundary, working with the existing fog near 55 / far 145 and camera far 200.

The visual palette moves from the exact horizon green at every terrain boundary through moss on the foothills, muted evergreen and stone on the middle ridges, and cool gray-blue on the distant peaks. The upper ridges have restrained height-based color shifts. Joined terrain normals retain only 3% facet lighting so the silhouette carries the low-poly style without large stripes or patchwork shading.

Six uneven conifer groves use mixed height, width, crown layering and restrained tip color. They provide visible scale without forming a repeating tree wall. Sparse weathered rocks and small grass tufts share a single accent mesh. All detail remains outside the open building area.

| Budget | Detailed / balanced | Battery saver |
| --- | ---: | ---: |
| Merged meshes / materials | 6 | 6 |
| Triangles | 5,468 | 3,292 |
| Trees | 26 | 12 |
| Rocks | 12 | 6 |
| Grass tufts | 36 | 12 |
| Textures / per-frame work | 0 / 0 | 0 / 0 |

The previous landscape used 3,856 triangles. Saver reduces both contour resolution and ornament density while retaining all three terrain layers. The snippet creates only ordinary MeshStandardMaterial meshes, with lighting and fog enabled, shadow casting disabled, and empty raycast handlers. It never modifies blocks, history, collision or printable geometry.

## Integration

1. Replace the complete existing `initLandscape` IIFE after `initHorizon` with [the snippet](landscape-art-direction.js). Keep the current `refreshLandscape(lesson.ground)` call in lesson loading and `disposeLandscape()` call in world cleanup.
2. In `engine.applyRenderQuality`, after `_renderProfile` changes and before returning the profile, refresh the landscape when the tier changes and a lesson already exists:

   ```js
   if (previousTier !== profile.tier && engine.refreshLandscape && engine._currentLesson) {
     engine.refreshLandscape(engine._currentLesson.ground);
   }
   ```

   The cache key includes bounds, ground height and the saver/detail tier. Equal inputs reuse the same meshes; switching tier safely disposes and replaces all six meshes. This hook is not needed during initial engine setup because lesson loading already builds the landscape.
3. Mirror the canonical source to the desktop/public copy using the existing workflow. No package or asset changes are required.
4. Capture a fixed-camera populated scene in day and golden light after integration. Check that the skyline reads clearly without competing with the student's build, and compare saver/detail in the same frame before accepting the art change. Browser evidence is still pending at this handoff.

## Verification

[verify-landscape-art-direction.cjs](verify-landscape-art-direction.cjs) runs against the repository's actual THREE r128 geometry implementation. [The saved result](landscape-art-direction-verification.json) passes for ordinary, very long/offset, reversed-bound, and single-cell lesson grounds in both quality tiers.

Checks cover exact triangle budgets, deterministic position/normal/color arrays, upward terrain normals, finite vertex data, exact horizon boundary colors, disabled picking/shadows, unchanged block/history references, same-input reuse, quality regeneration, idempotent cleanup, and no recreation after engine teardown. All triangle edges remain at least 31.845 units beyond the occupied lesson footprint, which includes its half-block border. All 54 geometries and 54 materials created by the verification are disposed.

Run from the repository root:

```text
node reports/geometry-world-art-direction-2026-09-09/verify-landscape-art-direction.cjs
```

These are geometry and lifecycle results. They do not replace the pending visual integration review or physical-device performance testing.
