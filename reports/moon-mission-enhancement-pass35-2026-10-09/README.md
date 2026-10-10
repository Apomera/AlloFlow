# Moon Mission: docking contact instruments

Completed October 9, 2026. Changes remain uncommitted.

## What changed

Docking now has three readable instruments for radial alignment, axial closing speed and radial drift. Each uses a fixed signed scale, a visible contact band, a moving marker, direction words and an explicit within/outside result. The panel adapts from three columns to one at phone widths and remains below the existing thruster controls. Zero labels align with the actual zero marks.

Readings use the simulation's current state. Classification uses full precision: radial offset is within ±0.6 m, closing speed must be greater than zero and at most 0.2 m/s, and radial drift is within ±0.1 m/s. Tiny nonzero movement and values just beyond a limit stay distinguishable even when ordinary decimal rounding would hide the difference. Markers clip at the scale edge while the full reading and off-scale notice remain visible. Completed contact shows recorded measurements.

Four guarded source edits add presentation, its pure measurement helper and its live update hook. Existing physics, integration, guidance, controls, saved-state authority and rewards are preserved. This is an instrument improvement; it adds no new physical model.

## Verification

- 20 focused unit tests pass across three files: seven new instrument cases, ten existing docking physics cases and three existing ascent visual cases.
- Four final Chromium workflows pass through the retained direct Playwright API runner, using real Playwright assertions and the existing harness. These are not Playwright CLI worker results.
- The existing scoped axe check reports 0 violations in the ascent/docking workspace. Its retained output reports violations only, so it is not a claim that every accessibility item was automatically resolved.
- The new workflow covers 320 px and 1100 px layouts; control order; fixed scale, label, band and marker geometry; exact/just-outside limits; zero, tiny and separating motion; pause/resize/reload state preservation; guided contact; collision/retry; and manual button/keyboard pulses.
- 10 accepted PNG captures are retained. The new instrument panel captures were visually reviewed on phone and desktop.
- Canonical/public runtime copies match. Both parse, scoped whitespace checks pass, all 128 prior test files remain byte-identical and the scoped Git index is unchanged.

- `direct-instruments-3`: docking contact instruments preserve signed measurements, exact limits and live control outcomes.
- `direct-guided-2`: a separate guided docking exercise works with reduced motion and earns TEI only once.
- `direct-contact-2`: fast contact refuses docking and retry preserves insertion while resetting the exercise.
- `direct-keyboard-1`: 320px keyboard docking ignores paused arrows, burns deliberately and pauses from the keyboard.

The existing ascent spec has its historical screenshot destination redirected in memory to this report directory. Its file and assertions remain unchanged. Every accepted workflow records source, spec and helper hashes before execution and checks them again afterward.

The first instrument attempt lost its execution session and its process was confirmed absent without a final result. Its incomplete evidence is retained and excluded. Successful runs before the final zero-label alignment are also retained and excluded from the four final workflows. The final instrument spec strengthens geometry checks; CSS percentage serialization allows 0.0001 percentage points while actual geometry checks remain within 0.6 px.

No full build, broad test suite, performance benchmark, staging, commit, push or deployment was performed.

## Files and evidence

- Runtime: `stem_lab/stem_tool_moonmission.js` and `desktop/web-app/public/stem_lab/stem_tool_moonmission.js`.
- New regressions: `tests/moonmission_docking_instruments.test.js` and `tests/e2e/moon-mission-docking-instruments.spec.ts`.
- [Final results](results.json), [integrity checks](verification.json), [unit log](unit.log), [unit inputs](unit-inputs.json), [source diff](runtime.diff), [reproducible browser runner](run-workflow.cjs).
- [Phone just outside limits](direct-instruments-3/phone-just-outside-limits.png) and [desktop guided contact](direct-instruments-3/desktop-guided-contact.png).

Final source SHA-256: `f8689059ea0aca089544f891a798107b094d84ebd02e64711342a86ec50e6dea` (1,439,239 bytes). The four changes reverse exactly to accepted pass34, `ffe2ac5862f814ccc4d3e5add421630ae1da9bb445b007346ce3aa3517690152`.
