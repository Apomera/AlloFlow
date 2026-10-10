# Moon Mission: docking port close-up

Completed October 9, 2026. Changes remain uncommitted.

## What changed

The docking canvas now offers an Approach overview / Port close-up selector. The close-up shows actual port coordinates on a one-metre grid with an equal distance scale on both axes. The radial field spans four metres; the along-track field adapts to the available width. The green corridor uses the model's actual ±0.60 m alignment tolerance.

An amber diamond marks Eagle's port and a ring marks Columbia's port. When Eagle lies outside the close-up, a separate arrow points along its true direction from Columbia. The measured coordinates stay unchanged; the arrow alone is placed at the edge. Contact captures are labeled Recorded contact state, including unsafe contact with misaligned ports. Symbols show positions, rather than spacecraft dimensions.

The view selector changes local presentation only. It does not write saved flight fields, consume propellant, cancel a pulse or reset the active clock. Retry keeps the selected view; reload opens the overview. Keyboard thruster controls remain available from either view. The canvas has a view-specific accessible description.

## Verification

- 27 focused unit tests pass across four files: seven new close-up cases, seven existing instrument cases, ten docking physics cases and three ascent visual cases.
- Four final Chromium workflows pass through the retained direct Playwright API runner, using real Playwright assertions and the existing harness. These are not Playwright CLI worker results.
- The new workflow covers 320 px and 1100 px layouts, true port geometry, boundary visibility, the direction arrow, complete paused saved-state preservation, resize/reload, actual guided docking, unsafe contact/retry and a queued one-second thruster pulse preserved across a synchronous DOM view change.
- The existing workflows protect the contact instruments, phone keyboard control and pause/resize/reload/hidden-tab physical clock behavior. Source review confirms the new view branch returns before any clock, pulse or persistence changes; the queued-pulse test does not independently measure running-clock continuity.
- Three scoped axe scans report zero violations. The retained scans report violations only; they do not establish that every accessibility item was automatically resolved.
- 15 accepted PNG captures are retained. The close-up captures were visually reviewed on phone and desktop.
- Both runtime copies match and parse. Seven guarded edits reverse exactly to pass35. All 130 prior test files and the scoped Git index are unchanged; scoped whitespace checks pass.

- `direct-closeup-3`: docking port close-up preserves physical geometry, saved state and uninterrupted control outcomes.
- `direct-instruments-1`: docking contact instruments preserve signed measurements, exact limits and live control outcomes.
- `direct-keyboard-1`: 320px keyboard docking ignores paused arrows, burns deliberately and pauses from the keyboard.
- `direct-lifecycle-1`: docking pause, resize, reload and hidden-tab transitions keep one physical clock.

The existing ascent spec's historical screenshot destination is redirected in memory to this report directory. Its file and assertions remain unchanged. The prior instrument spec uses its existing report environment variable. Accepted runs record source/spec/helper hashes before execution and verify them again afterward.

The first close-up browser run also passed. It is retained but excluded from the final total because the queued-pulse assertion was strengthened: the pulse click and view-change event now execute synchronously before any animation frame can complete the burn. Runtime code did not change between those runs.

The second close-up run finished its workflow and page/context cleanup, then lost its execution call during browser cleanup. Its recorded process was confirmed absent without a final result. That incomplete attempt is retained and excluded; the unchanged third run is the accepted result.

No full build, broad test suite, performance benchmark, staging, commit, push or deployment was performed. This change improves the physical display and adds no new flight dynamics or contact mechanics.

## Files and evidence

- Runtime: `stem_lab/stem_tool_moonmission.js` and its `desktop/web-app/public` mirror.
- New checks: `tests/moonmission_docking_closeup.test.js` and `tests/e2e/moon-mission-docking-closeup.spec.ts`.
- [Final results](results.json), [integrity checks](verification.json), [unit log](unit-1/unit.log), [unit inputs](unit-1/inputs.json), [source diff](runtime.diff), [browser runner](run-workflow.cjs).
- [Phone close-up](direct-closeup-3/phone-contact-corridor.png), [desktop close-up](direct-closeup-3/desktop-contact-corridor.png), [recorded contact](direct-closeup-3/desktop-guided-contact.png).

Final source SHA-256: `f333e9fa1499e11765610e063bd329c0d251b5fcab0cd2b89f6fb0bef6cd6cd5` (1,446,436 bytes). Accepted pass35 baseline: `f8689059ea0aca089544f891a798107b094d84ebd02e64711342a86ec50e6dea`.
