# Builder Clarity And Readability

Date: 2026-10-03.

Final builder source and public mirror SHA256: `839701808B0AC211774FFBA84A2C4DF3195E65C7776C127FDBCCC1B4F18D8750`.

## Changes

- Added a native Category selector to Find a tool: All tools, Build, Edit, Share, Print, Keep, and Explore. Search and category filters combine; Clear filters restores both controls and search focus.
- Finder status now reports matching tools without keyboard instructions. Opening it starts with the complete catalog; Enter still opens the first available result and Escape restores the toggle's focus.
- Distinguished World & scenery from the core Workspace customization settings. The dock header uses Build tools instead of Sandbox mode.
- Large text uses fixed 13/15/17-pixel text sizes for metadata, controls, and headings, with wrapping and preserved control targets. Solid surfaces remove translucency from floating builder panels.
- Unavailable finder results remain readable instead of being faded. Forced-colors metadata uses system text colors.
- Phone finders reserve room for results by expanding vertically and hiding repeated dock header/footer controls. Short-screen search labels sit beside their inputs.
- Removed the redundant World home shortcut from collapsed-toolbar, fullscreen, and touch-landscape states so it cannot cover the core navigation controls.
- Send to Print Lab is unavailable in an empty world, explicitly asks for blocks, and does not close the finder on submission. It becomes available after student blocks are placed. The pure tool-catalog API is unchanged.
- The collapsed launcher now says Studio and retains the explicit Expand Free Build Studio accessible name and Free Build Studio tooltip. Portrait touch launchers sit on the left, clear of the center target; desktop, touch landscape, and expanded Studio positioning are unchanged.
- On portrait touch screens below 568px tall, a compact Studio sits beside the closed Position entry. The closed Position entry has a 44px summary at the upper edge, the longer placement cue is wider, and five movement rail buttons use 44px targets with 4px gaps. The competing tiny swipe caption is hidden in this state.
- Open Position temporarily hides the collapsed Studio launcher and placement cue on all portrait touch screens; closing Position restores both. Expanded Studio, learning views, and native Position disclosure semantics are unchanged.

## Verification

- [`../sixth-builder-final-regressions.json`](../sixth-builder-final-regressions.json): the pre-launcher-refinement baseline passed 55/55 cases across all four requested files with exit 0 and `success:true`. This includes 19 finder/preview cases, 10 selected-creation cases, 14 builder-navigation cases, and 12 mobile-inspector cases.
- Latest focused assertion coverage is 56 cases across two reports, not a clean 56-case suite. [`../sixth-builder-studio-final-regressions.json`](../sixth-builder-studio-final-regressions.json) contains 46 passing cases with `success:true` across navigation (15), finder (19), and mobile inspector (12), but the requested fourth file was omitted and the aggregate command exited 1. With browsers closed, [`../sixth-builder-studio-selected-inspector.json`](../sixth-builder-studio-selected-inspector.json) passed the missing 10/10 selected-inspector cases with `success:true` and exit 0. The added navigation case verifies Studio's explicit name, tooltip, native expansion, and unchanged project data.
- Earlier 18-case finder and 12-case mobile passes overlap this final batch and are not additional cases.
- `builder/browser-report.json`: 29/29 real React/Three/WebGL browser checks passed at 1280x800, 390x844, 320x568, and 844x390. Twelve scoped normal/high-contrast/forced-colors axe audits reported zero violations. The matrix verified the final finder spacing and touch-landscape shortcut fix; the late empty-world and general collapsed-toolbar shortcut refinements receive follow-up checks.
- `builder/empty-browser-report.json`: 4/4 final-source desktop/phone checks passed. Native Enter preserves the finder and world when Send is unavailable; after a block is placed, it focuses the enabled real action without launching or changing the world. No runtime errors.
- Actual screenshots were inspected. The first narrow-screen image exposed a zero-height results region; the final phone image contains a full tool result with readable text.
- [`builder/studio-contract-browser-report.json`](builder/studio-contract-browser-report.json): 23/23 checks passed on final hash `8397...`, exit 0, with `resourcesClosed:true`. This is explicitly contract-level CSS-state coverage, not native Settings/fullscreen workflow coverage. At 320x480 and 320x568 it repeats 22 bounded checks covering standard/large text, Ready and longest placement cue fixtures, normal/toolbar-collapsed/fullscreen root attributes, hit-testing, 44px targets, label fit, Position open/close, unchanged expanded Studio, and retained student geometry with no runtime errors. One focused 390x844 check verifies the consistent temporary cue hide, restoration, unchanged expanded Studio, and retained two-block geometry. The earlier clean 22-check report is preserved as `builder/studio-contract-browser-report-before-position-consistency.json` and is not additional coverage.
- Inspected fresh contract screenshots: [`builder/studio-contract-short-phone-normal-large.png`](builder/studio-contract-short-phone-normal-large.png) and [`builder/studio-contract-narrow-normal-standard.png`](builder/studio-contract-narrow-normal-standard.png). The same report lists hidden-toolbar and fullscreen CSS-state screenshots for both phones.

## Measured Portrait Layout

At 320x568, the normal, hidden-toolbar, and fullscreen CSS states all retain dock `(8,270,92.7,59)` and large Studio target `(21,277,72.7,44)`. Closed Position is `(8,68,78.8,56)`. Ready cue is `(12,128,146,58.4)`; the longest cue is `(12,128,146,130.8)` ending at 258.8. The dock has 11.2px clearance below that cue and ends at 329, 5px above the joystick's top at 334. It stays left of the central 44px target.

At 320x480, those three CSS states retain compact dock `(90,68,80.7,55)` and large Studio target `(101,73,64.7,44)`. Closed Position is `(8,68,78.8,57)`. Ready cue is `(12,128,182.8,36)`; the longest cue is `(12,128,222,103.8)` ending at 231.8, 14.2px above the joystick at 246 and 10px left of the rail. The five-button rail is `(244,112,64,236)`; all targets are 64x44 with unclipped labels. Upper viewport controls end at 101, leaving 11px rail clearance. Both overlay fixtures are temporarily hidden during open Position inspection in this extra-short layout.

At 390x844, the native exploratory flow observed all 14 phone checks passing, including actual fullscreen, hidden toolbar, both text sizes, Position disclosure, expanded Studio, unchanged two-block geometry, and zero runtime errors. The dock is `(8,270,96.7,64)`, large target `(25,277,72.7,44)`, Position `(8,68,78.8,56)`, Ready cue `(12,128,182.8,36)`, and longest cue `(12,128,216,103.8)`. These observations are partial-run evidence, not a completed clean browser matrix.

The final consistency rule resolves the taller-portrait Position/placement-cue competition too: both compact overlays temporarily disappear during Position inspection and return on close. [`builder/studio-contract-tall-phone-position-open.png`](builder/studio-contract-tall-phone-position-open.png) shows the open coordinate panel without a competing Studio launcher or placement cue.

## Runner Caveats

Do not count incomplete or nonzero-exit runs as clean suites. The initial three-file continuity attempt reported 24 passing cases across two files but omitted the mobile inspector file. A subsequent two-file run reported 23/24, with `STACK_TRACE_ERROR` in the first empty-world navigation case, without an expected/actual assertion. The default-only standalone navigation attempt reported zero files. The final complete 55-case batch above supersedes these attempts; that navigation case passed without an app-code change.

Earlier final 19-case finder attempts, including a threads-pool retry, reported zero tests and zero files. The verbose forks diagnostic was `[vitest-pool-runner]: Timeout waiting for worker to respond`, with transform/setup/import/tests all zero milliseconds. When the host became responsive, the same final code passed a standalone 19-case run and the complete 55-case batch without changing Vitest internals. The initial empty-world browser attempt passed both phone checks but timed out during desktop setup; the later 4/4 final-source retry above completed cleanly with extended initialization time.

The first launcher four-file attempt reported 44 passing assertions and skipped all 12 mobile assertions after its `beforeAll` hook timed out. The 60-second-hook retry produced the 46-case aggregate described above, omitted the selected-inspector file, and exited 1 despite `success:true`; do not count it as a clean suite.

[`builder/studio-browser-report.json`](builder/studio-browser-report.json) and [`builder/studio-browser-harness-retry.json`](builder/studio-browser-harness-retry.json) retain an earlier exploratory 16-pass/3-timeout result. The last native exploratory run on hash `7684...` printed 24 passing checks (including the complete 14-check 390px flow and unchanged desktop/landscape checks) and two bounded state-wait failures at smaller phones. Its private cleanup then stalled after the browser had closed, so the final in-memory report did not flush; only its Node process remained and was explicitly terminated. Its session exited 1. Do not treat the older captured JSON as that latest native run or count the partial run as clean. The independent final 23-check contract run completed and closed its private browser/server normally. All private sessions are now closed; the shared root preview was left running.

No geometry algorithms, project ownership, save-recovery compositing, or learning-progress data were changed by these presentation and finder refinements.
