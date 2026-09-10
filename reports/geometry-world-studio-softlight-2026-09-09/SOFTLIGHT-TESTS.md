# Studio softlight regression verification

The new isolated suite passes **31 tests in one loaded test file**, with process exit code **0**. It loads the actual local THREE r128 and current integrated builder helper. No production files were changed by this verification subtask.

## What passed

- The new floor shader changes only the PCFSoft branch plus its required uniform declaration. Stock frustum checks, bias, basic/PCF/VSM filtering and point-light shadow paths remain intact, as does the global shader library.
- The static disk uses no more depth comparisons than r128's original PCFSoft branch and introduces no dynamic loop.
- Square and nonsquare shadow cameras at small, medium and large spans produce equal physical softness on both axes without changing the camera. Uniform objects are reused within each material, isolated between materials and compatible with a shared program cache key.
- Custom positive finite physical radii scale the uniform without changing the compiled shader or its cache key; omitting the radius retains the 0.14-world-unit default. Explicit null, string, NaN, infinity, zero, negative and boolean radii fail without material mutation.
- Actual Studio softness scales with creation size and is capped at 0.14 world units. A tiny quarter wedge receives a smaller radius than the large build; the same wedge during placement pop has identical canonical bounds and softness, with geometry/STL unchanged.
- Invalid materials, zero/reversed/nonfinite camera spans, incompatible shader markers and absent includes fail without material/source mutation or dangling shader references.
- Actual Studio entry works for a single fractional block, a widely separated selection extending from X -60 to 60 and Y 1 to 86, and rotated wedges with an active placement animation.
- Construction material identities and hooks, geometry attributes, transforms, history and exact selected STL bytes survive entry and exit unchanged.
- Studio keeps three decorative meshes, two existing textures and one shadow-casting light. Its floor remains two triangles and excluded from picking.
- Disabling shadows preserves Saver's stronger existing contact fallback; reenabling shadows resumes the same floor material/uniform without additional resources.
- Repeated Studio/Meadow changes and teardown dispose owned materials, geometry and shadow render targets exactly once without disposing construction resources.

## Scope and evidence

These tests validate actual helper output and lifecycle behavior in a DOM test environment. Root's browser verification covers GLSL compilation, rendered shadow quality and pixel appearance; this suite does not claim GPU execution.

- Test source: `tests/geometry_world_studio_softlight.test.js`
- Final result: `reports/geometry-world-studio-softlight-2026-09-09/softlight-tests.json`
- Command: `node node_modules/vitest/vitest.mjs run tests/geometry_world_studio_softlight.test.js --maxWorkers=1 --testTimeout=30000 --reporter=default --reporter=json --outputFile=reports/geometry-world-studio-softlight-2026-09-09/softlight-tests.json`
- Console and JSON both show 31 passing cases and exactly one loaded suite; process exit was 0.
- Initial diagnostic retained in `softlight-initial-tests.json`: 21 passed and one test assertion rejected the required new uniform declaration. The assertion was corrected to allow that declaration while continuing to require every original surrounding shader path unchanged. No production fix was needed.

The pinned r128 shader markers and per-material program key are deliberate compatibility boundaries. A future THREE upgrade should rerun these tests and the real-browser shader check before retaining this filter.

Final adaptive-source verification: canonical builder and desktop mirror are byte-identical. SHA-256: `de92c523db3f677332ba94e94946e63180e738bcd3bb76a4a0da23e9eb980856`. The nine added adaptive cases and the previous 22 cases all ran in the final 31-test suite.
