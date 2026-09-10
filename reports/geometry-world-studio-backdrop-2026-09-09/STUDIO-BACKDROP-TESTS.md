# Studio backdrop color-path regression checks

The actual builder implementation passes **12 tests in one loaded suite**, with process exit code **0** and no failed tests. The suite uses the repository's actual THREE r128 and loads the current builder source; it does not duplicate the implementation under test. No browser was launched for these checks.

## Coverage

- Direct sRGB rendering receives display-space ivory; linear render targets receive linear ivory. Both NoToneMapping and ACES configurations retain their original renderer settings.
- Explicit render targets, including explicit `null`, take precedence over a stale renderer target. Omitted targets fall back to the renderer, and untagged render textures default to linear encoding.
- Runtime output/target changes preserve the owned background and fog color objects.
- Existing `onBeforeRender` callbacks run first with the original receiver, arguments and return value. Replaced background/fog objects remain untouched.
- Disposal is idempotent and restores only the callback it owns. A later callback remains installed, while a retained old wrapper stops recoloring the scene.
- Actual Studio entry, Meadow/Studio switching, exit and look-resource teardown restore the original scene state and release Studio resources exactly once.
- Construction material identities/properties, geometry data, object transforms, history and exact selected STL remain unchanged.

The tests intentionally do not lock the Studio floor to a particular tint. Root's framebuffer probes and screenshot comparison cover the chosen visual match.

## Evidence

- Test source: `tests/geometry_world_studio_color_sync.test.js`
- Machine result: `reports/geometry-world-studio-backdrop-2026-09-09/studio-backdrop-tests.json`
- Command: `node node_modules/vitest/vitest.mjs run tests/geometry_world_studio_color_sync.test.js --maxWorkers=1 --testTimeout=30000 --reporter=default --reporter=json --outputFile=reports/geometry-world-studio-backdrop-2026-09-09/studio-backdrop-tests.json`
- Console and JSON both report one suite and 12 passing cases; the process exited 0.
- Canonical builder and desktop mirror are byte-identical at verification time. SHA-256: `9774475d49096b53957e101d0248fb477ca057a7ea384b6c1329666da41a8514`.

Only the new test and this report were authored in this subtask; the production hook and visual tuning belong to the coordinated implementation pass.
