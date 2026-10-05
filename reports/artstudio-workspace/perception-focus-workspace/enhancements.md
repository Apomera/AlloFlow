# Perception Lab: focused live workspace

Updated October 5, 2026. Changes are left uncommitted.

**Focus experiment** opens the current live experiment in a nearly full-window workspace. The drawing and its controls move together into a native modal, with page navigation and the notebook inactive behind it. There is only one set of live controls and one current drawing.

All six experiments retain their existing controls. Learners can adjust surroundings, record impressions and full notes, save observations, reveal measurements, export the current SVG, and pin a comparison inside the focused view. The existing expanded layout can give the drawing more width, and current and pinned drawings keep equal scale. Opening the view opens the controls; closing it keeps drawing settings, notes, observations, and the chosen expanded layout.

Three-match studies can continue inside the focused workspace. Fixed settings stay locked and results stay hidden until the existing reveal action. A revealed recorded drawing can open above the focused view and return to it when closed. When the notebook is full, **Review notebook** closes the focused view before moving keyboard focus to the notebook.

**Back to workspace** and Escape close the view and restore focus to its opener. Escape does not collapse an expanded workspace. Background controls are inactive, and keyboard focus stays within the open dialog. Changing the learner profile or active experiment closes the focused view. If the browser cannot open a native dialog, the experiment remains available in its normal workspace with a status message.

Rotation pauses on entry and exit, preserving the visible angle. Status messages appear inside the focused workspace. Phone layouts show the drawing before the controls; short screens allow the entire dialog to scroll so enlarged text does not make controls unreachable. Dark, high-contrast, and system forced-color themes preserve the drawing's white background and original colors. Standalone experiment buttons also have clearer spacing.

There are five new English interface strings, synchronized with the desktop copy. Scientific calculations, SVG scene geometry, saved data format, and study-report output are unchanged. No new dependencies or browser fullscreen permission are required.

## Verification

All 690 Perception tests passed across 15 files, including 20 new focused-workspace cases and 670 existing tests. Chromium passed 24 new focused-workspace groups plus 32 paired-viewer, 28 single-viewer, 42 recorded-preview, and 19 visual-presentation regression groups: 145 total. Accessibility checks were clear across five widths, dark/high-contrast/system forced colors, and 200% text. The source and desktop mirror match, all 377 English entries pass parity checks, and tool discovery and integration checks passed. See [validation.json](validation.json).

New coverage lives in `tests/perception_lab_focus_workspace.test.js` and `dev-tools/perception_lab_focus_workspace_qa.cjs`. Existing browser suites use adapters that change only their report directories. Browser checks use Chromium and the existing local QA harness; Safari and Firefox were not tested.

## Previews

- [Desktop focused experiment](focus-ebbinghaus.png)
- [Expanded live comparison](focused-comparison.png)
- [Phone workspace](focus-390.png)
- [Dark theme](focus-dark.png)
- [System dark forced colors](focus-forced-dark.png)
- [Phone at 200% text](focus-large-text.png)
- [Reachable controls on a short screen at 200% text](focus-short-screen.png)
- [Workspace before this enhancement](../perception-visual-presentation/workspace-ebbinghaus.png)
