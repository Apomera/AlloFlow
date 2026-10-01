# Galaxy: saved rotation investigations

Date: 2026-10-01

Galaxy → Motion now turns the rotation probe into a saved investigation. Collect inner and outer radii, compare the same locations across the three gravity models, and retain an explanation of the result.

## What changed

- Save up to eight unique radii. Locations are rounded to 0.1 kpc, sorted from inner to outer, and shown as hollow diamonds on the active rotation curve.
- Revisit a saved radius without changing the selected star. Saving, removing, and restoring a point move keyboard focus to the relevant control.
- Saved cards show speed, orbital period, and inferred enclosed mass. Switching models recomputes every value from the existing shared rotation law.
- Compare the outermost and innermost saved radii using radius, speed, and mass ratios. Explanations distinguish the core, a comparison crossing the core, and the outer curve.
- Keep an evidence note of up to 600 characters. Radii and notes survive mode changes and restoration from the host's JSON tool state.
- Remove a radius and Undo its removal. Undo preserves later additions and note edits, and cannot overwrite a re-saved radius or exceed capacity.
- Download a CSV containing all three models at every saved radius, numerical units, the evidence note, and the model assumptions. Notes containing spreadsheet formula prefixes are exported as literal text.
- Download failures retain the investigation and explain what happened. Malformed persisted collections and notes recover to usable controls.
- Radius controls use the same left-to-right spatial direction as the chart in RTL layouts.

## Reading the result

The feature compares illustrative model predictions. It does not collect telescope observations. Saved data contains radii and the note; speeds, periods, and masses are rebuilt from the current model.

For an outer comparison from 6 to 12 kpc, the flat model retains the same speed and doubles enclosed mass. The compact model slows by a factor of √2 while enclosed mass stays fixed. The rigid model doubles speed and increases inferred mass by a factor of eight. Comparisons inside or across the 2.4 kpc core use their actual values and their own explanation.

The mass inference assumes circular orbits and spherical gravity, following the simplified approach described in [The Mass of the Galaxy](https://openstax.org/books/astronomy-2e/pages/25-3-the-mass-of-the-galaxy). The core, reference speed, and radius range remain this tool's teaching parameters.

## Verification

- **627 tests passed across 22 Galaxy files**, including 37 investigation model and rendering checks.
- **35 browser checks passed**: 16 investigation checks, 14 rotation probe checks, and five black-hole launch/notebook regression groups. No browser errors were recorded.
- Native chart input, keyboard collection, real star selection, touch removal and Undo, download success and failure, model changes, capacity, persistence, and reduced motion were exercised in a real React and WebGL host.
- Desktop at 1440 px and phones at 390 and 320 px passed page and card overflow checks. New buttons meet the 44 px height target. RTL layout and keyboard direction passed.
- Desktop and phone screenshots were inspected. Source and desktop mirror match; the 30 investigation labels match both English registries and the Galaxy catalog.
- Source, mirror, and three QA scripts passed syntax checks. The scoped diff passed whitespace checks.

## Review artifacts

- [Validation summary](validation-summary.json)
- [Investigation browser checks](browser-results.json)
- [Rotation probe regression](probe-regression/browser-results.json)
- [Black-hole notebook regression](notebook-regression/browser-results.json)
- [Desktop view](rotation-investigation-1440.png)
- [Phone view](rotation-investigation-320.png)
- [Example CSV](rotation-investigation.csv)
- [Local preview](http://127.0.0.1:53693/): Galaxy → Motion.

Commit scope: Galaxy source and mirror, Galaxy translation entries, investigation tests and QA script, and these review artifacts.
