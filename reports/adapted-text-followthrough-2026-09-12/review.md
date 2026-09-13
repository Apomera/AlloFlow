# Adapted text follow-through — September 12, 2026

## Changes

- Reading theme and Immersive Reader remain available in focused view. Teacher editing and authoring tools retain their focused-view guards.
- The shared theme generator now handles enabled:hover utilities. Dark and high-contrast themes correctly remap enabled-button hover colors while disabled controls retain their resting appearance.
- Regenerated the shared stylesheet from the current source inventory, resolving the previously reported generator drift. Rebuilt reader/styles modules, their desktop public mirrors, and canonical content-hash URLs.

## Verification

- 137 tests passed across eight reader, keyboard, dialog, accessibility, palette, and shared-theme suites; results in tests.json.
- Chromium matrix: 60 combinations of three app themes, ten reading palettes, and two viewport widths (390 and 1280 px). Checks cover inline text, narration highlight contrast, paragraph focus, keyboard word focus, help-dialog contrast, and horizontal overflow. Additional forced-colors and print checks passed.
- Focused Arabic–English reading retains both languages, theme selection, Immersive Reader, and correct keyboard sentence playback at both widths. Teacher tools remain absent. Phone screenshot visually inspected.
- Actual browser hover changes an enabled button's background with readable text and leaves a disabled button unchanged.
- Generated stylesheet consistency, module mirrors, and canonical content hashes verified.

## Scope

Changes are local. Browser checks use an isolated harness running the real reader and style modules; they do not exercise authenticated production services or deployment.
