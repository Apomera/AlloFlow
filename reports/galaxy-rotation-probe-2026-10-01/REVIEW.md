# Galaxy: consistent rotation measurements and saved experiments

Date: 2026-10-01

The rotation chart, animated spiral stars, selected-star measurements, orbital periods, and enclosed-mass estimates now use one model. The reviewed black-hole launch workflow and saved-experiment improvements are included in this commit scope.

## Rotation exploration

- Click, drag, tap, or use the native radius slider to probe 0.6–15 kpc. Keyboard Home, End, and arrow keys work. Vertical touch scrolling preserves the probe.
- Keep the radius fixed while changing gravity models. All three chart markers and the comparison table show the same radius, speed, and period.
- Follow a selected star, or keep the probe independent while selecting other stars. The selected star’s own measurements remain at its actual radius.
- The probe persists through mode changes and JSON restoration. Existing evidence notes and black-hole experiments are preserved.
- Chart axes use kpc and km/s. Larger labels, a line-pattern legend, and an active-row marker work at desktop and phone widths.
- The mass comparison shows both inferred enclosed masses and their ratio. Core and outer-radius explanations describe the result at the current probe position.
- Circular disk estimates appear for spiral morphologies. Elliptical and irregular modes retain their own motion context.

## Model details

These are illustrative models, rather than fitted observational data. The flat and compact models share a uniform-density core of 2.4 kpc, reaching 220 km/s at its edge. Outside the core, the flat speed remains constant; the compact speed declines as 1/√radius, giving a constant enclosed mass. The rigid model has a constant angular speed and reaches 220 km/s at 8.2 kpc. Its speed is not capped, so the animation and numerical model both describe a solid disk.

The CPU and GPU use the same radius scaling and speed law. Orbital period follows 2πr/v. Enclosed mass uses M(<r) ≈ v²r/G with an explicit circular-orbit and spherical-gravity assumption. The animation runs faster than real time. The rigid-model explanation now correctly describes enclosed mass growing as radius cubed.

The scientific check used the circular-orbit and spherical-mass approach explained in [The Mass of the Galaxy](https://openstax.org/books/astronomy-2e/pages/25-3-the-mass-of-the-galaxy). The core, speed, and radius choices above are this tool’s teaching parameters.

## Black-hole improvements included

- Visible Place → Aim → Release workflow, with mouse, touch, keyboard, and Escape rollback on 48 px launch handles.
- Eight saved experiments with independent release inputs, names, notes, paused restore, reversible removal, and JSON export.
- A kept reference center on the distance graph, sampled at the same elapsed model time. Its curve ends at its own modeled endpoint. A live release table identifies changed inputs.
- Backup import with a read-only preview, rebuilt predictions, selective additions, capacity checks, conflict handling, explicit reference restoration, and Undo that preserves later edits.
- Pending file reads retire on cancellation, mode changes, newer file selections, and unmounting.

The center trajectories use the existing nonrotating Schwarzschild model. Tidal deformation remains illustrative. Backups store inputs and text; current predictions are rebuilt from them.

## Verification

- **590 tests passed in 21 Galaxy test files**, including 30 new rotation model and rendering checks.
- Fourteen rotation browser checks passed, including native keyboard, pointer and touch input, vertical scrolling, model switching, real star selection, fixed and followed probes, saved-state restoration, and reduced motion.
- The black-hole launch/notebook, reference comparison, and backup import browser regressions passed against the current source.
- 1440, 390, and 320 px layouts passed page and internal-card overflow checks. New controls meet the 44 px height target. RTL layouts passed, and screenshots were reviewed.
- Source and desktop mirror match. Both Galaxy translation namespaces match, with English catalog coverage. Other locales retain the existing fallback.
- Source and all four QA scripts passed syntax checks. The scoped diff passed whitespace checks.

## Review artifacts

- [Validation summary](validation-summary.json)
- [Rotation browser checks](browser-results.json)
- [Backup browser regression](backup-regression/browser-results.json)
- [Reference comparison browser regression](comparison-regression/browser-results.json)
- [Launch and notebook browser regression](notebook-regression/browser-results.json)
- [Desktop view](rotation-probe-1440.png)
- [Phone workflow](rotation-workflow-320.png)
- [Local preview](http://127.0.0.1:53693/): select Galaxy → Motion.

Commit scope includes only Galaxy source, Galaxy translation entries, tests, QA scripts, and these review artifacts.
