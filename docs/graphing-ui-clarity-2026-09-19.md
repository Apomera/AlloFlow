# Graphing UI clarity — September 19, 2026

## Changes

Function Grapher now names its four graph options in plain language: Derivative f′(x), Signed area, Table of values, and Function guide. Stable labels and aria-pressed expose each option's on/off state. The group has an accessible name, wrapping labels, and 44-pixel minimum button heights. Existing graph overlays, panels, saved state, and shortcuts remain available.

Graphing Calculator now displays its five support choices in two columns at all widths, with Explore quadratics spanning the last row. Badges has a visible text label; AI is labeled AI help; Inquiry is labeled Explore quadratics. The named button group exposes the active choice through aria-pressed, with 44-pixel minimum button heights. Existing panels and state keys are unchanged.

Added English label keys to source/public catalogs, including the prior advanced-math pass's pending labels. Resolved the Windows catalog-write failure by opening the existing files without truncating them first. Other languages fall back to English for these new keys.

## Verification

- 43 tests passed across five existing Function Grapher and Graphing Calculator accessibility, contrast, and engine suites.
- Fixed an already-stale accessibility assertion: the observation textarea uses an associated visible label instead of the older translation key.
- Browser checks cover both tools in default, dark, and high-contrast themes, at 1120, 375, and 320 pixels (18 viewport checks).
- All nine controls accept keyboard activation and update their existing saved state. Function Grapher toggles also switch off with Space; calculator support selection remains exclusive.
- Controls meet the 44-pixel minimum and do not overflow their groups with increased text spacing. Scoped axe checks pass for both changed groups in all themes. No browser runtime errors occurred.
- Source/public tool and catalog mirrors match; the catalog parses successfully.

Evidence is in scratch/graphing-ui-clarity-2026-09-19/verification.json and the control captures. Browser checks use the existing component harness with mocked host context. AI services and the full deployed application were not exercised. Changes remain local; no deployment was performed.
