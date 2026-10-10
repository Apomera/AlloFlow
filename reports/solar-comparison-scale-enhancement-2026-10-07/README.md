# Solar System comparison enhancements — October 7, 2026

This pass adds a fixed chart scale across all listed worlds, improves the comparison-to-details navigation, and makes the comparison and planet facts easier to read on phones. Changes remain uncommitted.

## Changes

- **Measurement scale:** choose “Fit selected pair” or “Fixed across worlds.” Fixed diameter and gravity axes keep the same maxima when changing worlds, while portraits continue to fit the selected pair. Exact values and units remain visible and accessible.
- **Explore and return:** Explore focuses the selected world's heading after it renders. Back to comparison returns focus to the originating Explore button. Navigation cancels superseded requests and ignores disconnected targets without changing saved learning work.
- **Readability:** comparison and planet fact text is at least 13px in the checked regions; comparison controls are at least 44px high. Selected scale cards have a visible checkmark and an explicit accessible name.
- **Phone layout:** planet identity has room to remain legible, and Back occupies a separate row on small screens. World view tabs and fact cards retain their responsive layouts.
- The canonical Solar System script and the desktop public copy are byte-identical.

## Verification

The authoritative final status and source fingerprint are in [verification-summary.json](verification-summary.json). The finalizer writes that file only after checking that unit and browser evidence matches the current source, the desktop mirror matches, and syntax and scoped whitespace checks pass.

- **Focused unit coverage:** 38 tests across the existing comparison bench suite and the new scale/navigation suite. Coverage includes stable axes, exact values, malformed saved scale settings, learning-state preservation, committed focus, disconnected elements, and superseded destinations. See [unit-results.json](unit-results.json) and [unit-source.json](unit-source.json).
- **Browser coverage:** four Chromium cases at 1060px and 320px, each in light and dark mode. Checks cover overflow, page errors, type and control sizes, scale switching, Explore/Back focus, single-line planet titles, and the separate phone return row. See [visual-results.json](visual-results.json).
- **Visual inspection:** chart screenshots, planet headings, and fact cards were reviewed. Screenshot inspection caught and resolved a crowded phone heading that the initial interaction checks did not detect.
- Tests use one worker and one browser at a time. This is focused comparison verification, not a full repository test run.

## Previews

- [Light desktop charts](comparison-1060-light-Uranus-Neptune-charts.png)
- [Dark phone charts](comparison-320-dark-Mercury-Mars-charts.png)
- [Light phone charts](comparison-320-light-Earth-Neptune-charts.png)
- [Light phone planet heading](comparison-320-light-Earth-Neptune-heading.png)
- [Light phone planet facts](comparison-320-light-Earth-Neptune-facts.png)

## Reproduction

From the repository root, run these sequentially using the project's Node runtime:

```text
node --max-old-space-size=64 reports/solar-comparison-scale-enhancement-2026-10-07/run-checks.cjs visual
node --max-old-space-size=64 reports/solar-comparison-scale-enhancement-2026-10-07/run-checks.cjs unit
node --max-old-space-size=64 reports/solar-comparison-scale-enhancement-2026-10-07/finalize-report.cjs
```

The browser check requires the existing Playwright Chromium installation. Historical `before-accessible-label-*`, sandbox-attempt, and interrupted logs document earlier attempts; they are not the final verification result.
