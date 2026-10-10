# Supporting hand unit validation

Fixture: `firstresponse_supporting_hand.test.js` (109 checks).
The 54 fixed scene cases come from source SHA256 `642b337db93a4c13cdbb1f95040662f3db45cf50529e5fd333938cd3de86be99` in `before.js`.
`verify-supporting-fixture.cjs` pins the source hash and checks the three captured age files, manifest and inline fixture baseline without building scenes or running tests.

Run these eight filters sequentially in fresh Vitest processes. Use one worker, no browser runner in parallel, the normal assertions and normal timeout settings.

| Filter | Checks |
| --- | ---: |
| `preserves every.*adult.*scene` | 18 |
| `frames the complete.*adult.*supporting hand` | 12 |
| `preserves every.*child.*scene` | 18 |
| `frames the complete.*child.*supporting hand` | 12 |
| `preserves every.*infant.*scene` | 18 |
| `frames the complete.*infant.*supporting hand` | 12 |
| `supporting hand lifecycle and camera compatibility` | 8 |
| `supporting hand visual observation and pose comparison` | 11 |

## Coverage

- Scene fingerprints include every geometry attribute/index, transform, mesh visibility, material/shader properties, object count, unique geometry/material count and pick list across all three ages, nine recovery poses and both contrast settings.
- Camera checks project every supporting-hand vertex and five cheek context points through the public viewer reset/nudge/focus contract on desktop and phone dimensions. They check clipping, view bounds, outward surface visibility and learner state identity for six poses and guides both on and off.
- Frame checks preserve object/geometry/material/typed-array identity and all camera metadata values, including nested context point identity.
- Lifecycle checks cover camera-only target registration, activity/early-pose absence, age/pose/guide/contrast rebuilds, resize, reset, detach, unmount, missing targets, and the existing palm-detail/heel-side contracts.
- UI checks cover pose/status gates, comparison completion gates, same-pose focus, comparison queued from poses 0, 2 and 8, pressed state, observation disclosure, activity scope and rejected camera focus. Comparison changes preserve every learner field except the intentionally selected review pose.

The runner verifies the expected pass count for each group. See `unit-final-summary.json` for the completed 109 checks.
