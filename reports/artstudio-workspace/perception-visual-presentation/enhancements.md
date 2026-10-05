# Perception Lab: clearer visual presentation

Updated October 4, 2026. Changes are left uncommitted.

Experiment choices now include miniature drawings alongside their existing names and families. The selected experiment has a stronger outline and underline. The previews are decorative, use the existing default experiment scenes, and add no keyboard stops or repeated screen-reader descriptions. On phones, the compact experiment selector continues to preserve room for the drawing.

The workspace has clearer heading hierarchy, a distinct controls panel, readable value badges, and a framed drawing area. The observation prompt and results have more separation from the controls. The drawing keeps its white background and original geometry and colors, including in dark mode and system forced colors.

Recorded drawings use a compact toolbar that brings trial selection and drawing actions onto the same row when space allows. Results, impressions, dates, and full notes have distinct visual sections. These changes also apply inside the enlarged single and paired viewers. Narrow screens and enlarged text wrap the toolbar naturally.

Notebook headings, statistics, table captions, and comparison results have stronger visual hierarchy. Dark, high-contrast, and system forced-color themes use matching borders and selection cues. Existing controls retain their minimum touch size, text labels, focus indicators, and keyboard behavior.

This is a presentation pass. Scientific calculations, illusion geometry, saved observations, localization keys, and exported study reports are unchanged. There are no new dependencies, animations, or saved fields.

## Verification

All 670 existing Perception tests passed across 14 files. Chromium passed 19 new visual groups plus 32 paired-viewer, 28 single-viewer, and 42 recorded-preview regression groups: 121 total. Accessibility checks were clear across five widths, dark/high-contrast/system forced colors, and 200% text. The source and desktop mirror match, all 372 English entries pass parity checks, and tool discovery and integration checks passed. See [validation.json](validation.json).

The new browser checks are in `dev-tools/perception_lab_visual_presentation_qa.cjs`. Existing paired-viewer, single-viewer, and recorded-preview browser assertions run through adapters that change only their output directories. Browser validation uses Chromium with the existing local QA harness; this pass does not claim verification in Safari or Firefox.

## Previews

- [Before: desktop workspace](before/workspace-1600.png)
- [After: desktop workspace at the same viewport](workspace-ebbinghaus.png)
- [Compact controls and results in the paired viewer](paired-toolbar.png)
- [Phone layout](workspace-390.png)
- [Dark theme](workspace-dark.png)
- [System dark forced colors](workspace-forced-dark.png)
- [Text enlarged to 200%](workspace-large-text.png)
