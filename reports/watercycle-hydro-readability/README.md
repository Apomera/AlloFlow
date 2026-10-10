# Hydro Quest readability

The six mission cards now use larger labels, clear Open and Complete states, and a visible completion count beside the Hydro Points progress. The panel uses a stable paper surface matched to the actual renderer theme, including high contrast. Mission requirements, point values, ranks, learner records and reward behavior are preserved.

## Layout

The mission grid follows the panel's available width: one column below 560 CSS pixels, two from 560 pixels, and three from 900 pixels. The rank label and mission names use at least 15px text; supporting labels use at least 13px. The rank is a paragraph label within the existing named mission section. The progress track is at least 10px high. Whole words remain intact at narrow widths and 150% CSS zoom. Completed cards retain text and check marks, with a double border in forced colors.

All visible panel text clears 4.5:1 contrast in the reviewed matrix. The completion status remains visible and retains its polite live announcement and progressbar values.

## Scope and validation

Runtime SHA256: 6252fd6fd2ccfc1159a9df831ff6857dd1d09ca36e3179e279a8726a44974a4f

The three recorded source slices reverse exactly to the preceding ray-lab runtime bef9797b926aafb7430bcce82d7f24252c1d9e09361efc6a9cc6aea6ed29ec88. They add one local theme attribute, make the rank a paragraph label with its existing text, and append scoped presentation styles. Both installed runtime copies match. The water model, mission evidence calculation, native view controls, reward callbacks and saved records remain unchanged by this enhancement.

- 4 passing existing Hydro Quest source-contract regressions, with no failed or skipped tests. The unchanged test file, actual runner and minimal Node configuration are frozen in unit-inputs. The Node configuration avoids the general DOM setup for these filesystem checks.
- 1832 passing browser checks, 16 native keyboard view actions and eight scoped accessibility audits with zero violations.
- Eight final captures and two matched baseline captures cover desktop light and dark, 320px phones, a narrow desktop host, high contrast, forced colors and 150% CSS zoom.
- Frozen native evidence fixtures cover zero, three and six completed missions. Their mission names, requirements, ranks, points, accessible labels and spoken status match the preceding runtime exactly.
- Switching to System Map and back to Droplet Journey retains all other learner data, awards, the paused parcel and the underlying canvas. The parcel checks wait for numeric progress reported by the actual engine. Returning to 3D restores the exact prior snapshot and mission semantics.

The browser harness retains the actual THREE renderer and omits GPU drawing during panel checks. Model, input and frame loop remain active during native actions. After those actions, the exact rendered panel DOM and ancestor styles are copied and the engine is unmounted for capture. Screenshots contain the mission panel and exclude WebGL pixels. They use measured bounds, with a 2360px maximum panel height. Browser and local QA server cleanup both completed. Startup diagnostics remain in the task scratch folder and are excluded from passing counts.

## Verify

Run node reports/watercycle-hydro-readability/verify.cjs from the repository. Add --snapshot-only to validate archived evidence after later enhancements. The verifier checks the artifact inventory, exact source reversal, four native assertions, pinned native inputs, mission semantics, initialized native progress and state retention, text containment within each label and card, fonts and contrast, accessibility audits and all ten PNG receipts.

To repeat the browser matrix, run dev-tools/watercycle_hydro_readability_qa.cjs with --expected-sha=<current source hash> and a fresh --out=<folder>. WC_BROWSER_EXECUTABLE can select a compatible installed Chromium binary.

All changes remain uncommitted.
