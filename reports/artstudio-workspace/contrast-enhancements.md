# Contrast Lab enhancements — September 30, 2026

Contrast Lab now has a larger live text preview with separate foreground and background editors. Each color supports exact three- or six-digit hex entry, a native color picker, HSL sliders, and selected Thread Kit swatches. Swapping roles retains the same ratio. Invalid drafts never alter the preview, Escape cancels them, and leaving an unchanged hex field does not round an existing HSL recipe.

The preview measured **1,036 pixels wide** in a 1440 × 1000 Focus workspace. On a 390 × 844 phone, the preview appears before the editors, controls have at least 44-pixel targets, and the page has no horizontal overflow. Learners can enter their own sample text and compare its 24-pixel bold and 14-pixel normal presentations.

Choose an AA or AAA normal-text goal directly in the lab. “Find passing text color” and “Find passing background” search lighter and darker variants while keeping the other role fixed. Candidates are converted to actual RGB swatches and checked against the goal before being offered. An unreachable goal is explained instead of presenting a failing suggestion. The search follows HSL lightness; it is not a perceptual color-distance optimization.

Thirty-step undo/redo includes color changes, swaps, goal changes, palette transfers, suggestions, and complete slider drags. Keyboard shortcuts work within the lab, while text fields retain native undo. History and drafts reset for a different learner, project, restored study, or externally replaced recipe. Cancelled slider gestures end cleanly, and new edits clear redo.

Save the foreground, background, and goal back to Thread Kit, or download a CSS rule containing the exact HSL values used by the preview. HSL sliders retain fractional channels; a displayed hex value is the nearest 8-bit RGB representation. Studies now capture explicit normalized contrast settings, including defaults, and retain custom sample text. Existing saved HSL data remains supported, with legacy hex values used as fallback colors.

The calculation uses the current sRGB transfer breakpoint and unrounded ratios for pass/fail. A value of 4.499 can display as 4.50 while correctly failing AA normal text. The lab checks AA normal and large text plus AAA normal and large text. Its introduction now describes the WCAG 2.2 calculation actually implemented, replacing the old APCA claim. The English source, served, and catalog registries agree on all 37 referenced contrast keys, including 27 new strings.

## Validation

- Initial compatibility run: 34 tests passed across the existing contrast accessibility, translated badges, and shared Thread Kit workflows.
- New focused run: **21 tests passed**, covering independent sRGB reference calculations, threshold boundaries, exact hex input, malformed saved state, both suggestion directions, 150 varied color pairs, gesture history, project/learner isolation, CSS export, palette transfer, and saved-study defaults.
- **177 tests passed across 19 files** in the broader run, covering Contrast, Thread Kit, Color Wheel, Mixer, Gradient, saved studies, learner hydration, accessibility, and malformed saved state. See [regression results](contrast-regression-results.json) and [validation metadata](contrast-validation.json).
- Actual Chromium checks passed with **zero page errors**. The downloaded CSS produced the same computed text/background colors as the live preview. Native slider-drag undo, swap invariance, exact hex rendering, palette role/goal capture, tab round trips, and unreachable-goal guidance passed. See [browser results](contrast-browser-results.json).
- Desktop and phone screenshots were reviewed. JavaScript syntax, pinned Spectral verification, source/public equality, and scoped whitespace checks passed. A diff against the full pre-pass working copy was reviewed to preserve previous uncommitted enhancements.

Previews: [desktop Focus view](contrast-focus-desktop.png), [phone preview](contrast-phone-preview.png), [phone color controls](contrast-phone-controls.png), and [downloaded CSS](contrast-browser-export.css).

The threshold guidance follows W3C's [Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [Contrast (Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html). The calculation follows the [WCAG 2.2 relative luminance definition](https://www.w3.org/TR/WCAG22/#dfn-relative-luminance). These checks address solid text/background color pairs; transparency, imagery, and other accessibility requirements are outside this lab's calculation.

Implementation: `stem_lab/stem_tool_artstudio.js` and its identical served copy in `desktop/web-app/public/stem_lab/`. Browser checks: `dev-tools/artstudio_contrast_qa.cjs`. No full repository suite or deployment was performed. All changes remain local and uncommitted, as requested.
