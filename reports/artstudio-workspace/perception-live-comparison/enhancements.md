# Perception Lab: larger live comparisons

Application status: applied to the project and desktop copy. No commit was created. See [application.json](application.json).

Pin a drawing, then use **Comparison layout** to choose **Side by side**, **Stacked**, or **Switch views**. Side by side now responds to the available drawing width, including the sidebar and focused workspace. Stacked gives each drawing the full available width. Switch views alternates Current and Pinned in the same position at the same scale, without color blending or an animated transition.

The shared toolbar keeps viewing controls accessible with either drawing selected and aligns the two canvases. Switching preserves the workspace height, so different result lengths do not move the drawings. Hidden content is inert and omitted from the accessibility tree. The native layout selector and view buttons work with keyboard and touch. Clearing a comparison restores focus to Current.

Drawing edits return to Current; notes and predictions keep the selected view. Layout and view choices stay local to the open tool and do not change saved experiments or notebook data. A new learner starts with the default layout. Focused viewing preserves the comparison choice. Switching pauses moiré rotation; existing study masking and result-reveal rules remain in place. SVG and PNG export continue to capture Current, including when Pinned is visible; the interface explains this behavior.

Also corrected dark-theme comparison-table text, which inherited black and failed contrast checks, and aligned the toolbar controls.

## Verification

- **147 tests pass across six suites**: experiments, matching, repeated studies, focused workspace, PNG export, and 15 new live-comparison cases.
- **20 Chromium check groups pass**: all six experiments and three layouts; 320, 390, 768, 1280, and 1600 px viewports; focused workspace; keyboard focus; editing; light, dark, contrast, and forced-color themes; 200% text; study masking; and a decoded PNG exported while Pinned is visible.
- Browser checks measure equal canvas dimensions, stationary switching, stable container height, opaque/unfiltered drawing styling, 44 px controls, absence of horizontal overflow, and no targeted WCAG A/AA axe violations. The PNG pixel sample confirms Current's gray117 is exported rather than Pinned's gray200.
- Source and desktop mirror match. Experiment definitions, normalization, scientific drawing geometry, measurement calculations, and study helpers before the stylesheet are byte-for-byte unchanged. Nine English interface strings are added.
- Screenshots inspected include side-by-side, switched, focused phone, and final dark/high-contrast layouts. The broader historical test suite was not rerun; this report covers the selected six suites and Chromium checks.

The first unit run had one test-label mismatch (the displayed cube title is “Ambiguous cube”); the fixture was corrected. The first browser run exposed nine low-contrast comparison-table cells in dark mode. The CSS fix is included, and the final selected suites and browser run pass. Initial results and the detailed contrast diagnostic are retained.

## Evidence

- [Validation](validation.json)
- [Selected tests](selected-test-results.json)
- [Browser checks](comparison-browser-results.json)
- [Desktop side by side](desktop-auto.png)
- [Desktop stacked](desktop-stacked.png)
- [Desktop switched](desktop-switch.png)
- [Focused phone](focused-390.png)
- [Dark theme](dark.png)
- [High contrast](contrast.png)
- [Current exported while Pinned is visible](current-from-pinned.png)

Final source SHA-256: `a6b6471d0f760011823fbb2fb48c884f3e1eed40c8bcec6cfc999b6eb80d571d`.

No commit was created.
