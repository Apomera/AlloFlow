# Machine Lab workshop clarity — October 14, 2026

The workshop's whole-scene bloom was bleaching the pale background and obscuring the mechanism. Removed bloom from the workshop viewer while retaining its lights, shadows, reflections, palette and geometry. Switching an existing scene into high contrast now clears the previous theme's fog.

The native same-scene A/B confirms the cause: bloom clipped 96.68% of the windlass canvas to near-white; direct rendering reduced this to 4.66%. The corner changed from white to the intended RGB 234/240/246. The wheel, steel frame, rope and distance rails are visibly distinct again. Other viewers and their effects are unchanged.

Production SHA-256 (canonical and desktop mirror): `cc5a78cf1044d1aef086d393df5c0ca891d6d85005bc253fbcb4a2401b363289`.

Validation:

- 66 targeted tests passed in `tests/run-02`: six new rendering/theme regressions and 60 existing geometry, motion, contact and focus tests.
- 168 browser assertions passed across 24 scenes: all six machines in three themes, 320 px phone views and full workshop views. Four final screenshots and both diagnostic screenshots were visually inspected by two reviewers.
- `verify.cjs` proves the two rendering edits are the only changes from `db4550a7c`. Calculations, practice, state handling, camera controls and animation code remain byte-for-byte unchanged after restoring those edits. Source/mirror equality, frozen inputs and screenshot hashes pass.
- Native syntax and scoped whitespace checks pass. No full application build or deployment.

The first unit attempt (`tests/run-01`) failed before discovering tests because the sandbox temporary-directory rename was denied. The successful retry uses a temporary directory inside this report. The failed attempt is retained and excluded from pass totals. Production code was unchanged between attempts.

Reproduce the source/evidence audit with `node reports/machinelab-workshop-clarity-2026-10-14/verify.cjs`. Run tests into a fresh directory with `node reports/machinelab-workshop-clarity-2026-10-14/run-tests.cjs run-03`. Native visuals use `node dev-tools/ml_workshop_clarity_qa.cjs <fresh-output-directory>`; `--diagnostic` is for the baseline with bloom enabled.

The light room surfaces remain bright under the existing lighting; this pass restores the mechanism's visibility without retuning that lighting.
