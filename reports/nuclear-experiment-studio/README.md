# Nuclear Lab: experiment studio

The lab now opens with two short experiments. Students make a prediction, run a test, review their observations, and choose an explanation. The full topic library and reactor remain available through the three view buttons.

## What changed

- **Half-life:** a 64-dot sample steps through four half-lives. Predictions receive descriptive feedback; observations accumulate in a small table. The model explicitly distinguishes expected counts from random individual decay.
- **Shielding:** students compare water, concrete, and lead at adjustable thicknesses. The detector uses the existing 1 MeV attenuation coefficients. An explanation becomes available after testing two different materials at the same nonzero thickness.
- **Less information at once:** only the selected view mounts. Scientific background is available in an expandable section.
- **Progress:** the two experiments retain their settings, observations, and discoveries while students change views. Existing lab work and other tools' state are preserved.
- **Access:** keyboard controls, focus after view changes, announced results beside the controls, larger-text support, reduced-motion support, light/dark styling, and narrow-screen layouts.

## Implementation

The canonical implementation is `stem_lab/stem_tool_nuclearlab.js`. Its three desktop mirrors match. All 86 new English string keys are present in the four existing registries. The production module map still loads this source filename.

The original lesson implementation is preserved except for the wrapper and the three conditions needed to display the reactor on its own. Verification reverses those changes in memory and compares the result with the working-tree snapshot saved before this pass.

Existing lesson tests explicitly open the reference view. New studio tests use the default entry point, including a check that the full lesson panels are absent.

## Verification

- 348 tests passed across all 13 Nuclear Lab behavior/science test files outside the full axe suite.
- 19 existing browser tests passed for keyboard focus, prediction/comparison, and summary export.
- New studio browser checks cover both experiments, state retention, keyboard sliders, 320px and 390px layouts with larger text, motion preferences, light styling, forced colors, and axe checks with the app's real stylesheet.
- After the final feedback-placement adjustment, all four studio browser tests passed again (12.6s, 4.4s, 4.7s, and 4.1s). Redundant video recording was disabled after a prior run exceeded the browser-context teardown timeout. The same functional and accessibility assertions remain enabled, and explicit screenshots are saved.
- The source/mirror/registry verification self-test rejects deliberate drift, a missing production mapping, and an altered lesson baseline.

### Limits of the broader rerun

The first complete studio browser run passed all four tests, including axe with the real stylesheet in both themes and at both phone widths. The full 348-test unit run and all 19 existing interaction/export browser tests also passed.

Later verification ran while several other projects were using the same machine. Two focused Vitest attempts could not start a worker; their reports contain zero executed tests and are not counted as passes. In the extra chart suite, the dark chart test passed, then the light screenshot test exceeded its timeout. The full legacy axe rerun had not completed after more than 15 minutes. These two broad runs were stopped to reduce load. The complete legacy chart and axe sweeps are therefore unverified for this pass.

The structural verification and its four deliberate-failure cases passed. The untouched lesson implementation matches the saved pre-edit source exactly after reversing this pass's documented wrapper changes in memory.

## Preview

Run `node scratch/nuclear-engagement/build-preview.cjs`, then `node scratch/nuclear-engagement/preview.cjs`. Open the printed loopback URL. This local preview uses the existing browser test harness and the working source files.

Screenshots in this folder show desktop, light mode, narrow screens, the shielding comparison, and forced colors. This pass does not commit, publish, or deploy the project.
