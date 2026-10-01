# EVA timing review

## Implemented

- Suit oxygen decreases by active elapsed seconds. A 12 fps laptop and a 144 Hz display now receive the same difficulty budget. Existing difficulty rates are preserved; these are deliberately shortened classroom reserves.
- Sample collection and seismometer deployment share a one-second interaction cooldown, replacing 60 rendered frames.
- Sample rotation, sample pulse, instrument pulse, and optional traverse elapsed/parking timers use the same active clock.
- Tab visibility and WebXR suspend/resume reset the clock. Hidden time does not consume oxygen or advance interaction timers. A missed suspension event can charge at most one second.

The source helper is `mmAdvanceEvaResources` inside the EVA closure. The corresponding tests execute that production helper with deterministic clocks without needing WebGL.

## Validation

- `tests/moonmission_eva_resources.test.js`: 11 passing cases. Covers 12, 30, 60, and 144 fps; one-second interaction recovery; hidden time; missed suspension events; exhaustion bounds; and live-loop wiring. Report: `eva-resource-tests.json`.
- Initial focused run: 181 tests, 179 passed. It overlapped ongoing enhancement edits, so it is not a pristine baseline. The two failures were an exact floating-point fuel comparison in the new descent model and the expected source/public mirror mismatch before synchronization. The parent reported the fuel comparison fixed and owns final mirror synchronization and the integrated test run. Report: `baseline-tests.json`.
- No browser test was launched by this subtask, avoiding concurrent SwiftShader workloads.

## Remaining model scope

The rover still uses a maximum 0.05-second movement/suspension step per rendered frame, so its motion can slow below 20 fps. Correcting the whole terrain/contact integrator needs coordinated fixed substeps, beyond the bounded resource-clock change. The transit, entry, and launch phases already disclose or use several educational approximations; they were reviewed without altering their established phase progression here.

## Browser harness

`tests/e2e/21-moon-mission-gl.spec.ts` uses `GlHarness`, which serves current repository files, React, and Three.js locally. It does not test deployed code despite the default Playwright config's production base URL. The suite covers actual EVA WebGL, keyboard/touch movement, lunar hop duration, collection persistence, rover operation, cleanup, phase progression, and mute behavior. Run only one Playwright worker and one browser suite at a time on this machine.
