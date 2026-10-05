# Geometry World Continued Improvement QA

Checked October 3, 2026 with Chromium, real Three.js/WebGL, local React, and the existing host-context harness.

## Coverage

- Desktop 1280x800, phone 390x844, narrow phone 320x844; focused follow-up also covers short portrait 320x568.
- Catalogue topic filtering, row selection, native jump synchronization, selection without launching, preview-link focus, launch-before-map ordering, enlarged text spacing, and viewport containment.
- Optional reflection before answering questions: blank/whitespace save disabling, skipping without an event, retained drafts, saving once, contextual measured-volume evidence, and focus return.
- Native thinking-prompts summary in both directions of the dialog Tab loop; scrolling-inspector reflection entry and a visible, unobscured 44px sticky close control.
- Measurement/estimate clearance from the live touch rail and joystick, including six-button fly/build mode. Short portrait suspends covered touch controls while the reading panel is open.
- Twelve scoped axe audits across catalogue, expanded measurement, reflection, and estimate in the broad run, plus three final measurement audits after the clearance change: zero violations.
- One viewport-filling live canvas in all three broad profiles: 1024/1024 sampled pixels nonblack, 402/434/485 distinct sampled colors, context not lost, and camera movement confirmed.
- No runtime or host-harness errors in any checked profile. All QA browsers and private servers were closed; the user preview was not stopped.

## Results And Artifacts

The initial broad report has 53 passing checks of 54. Its one failure sampled the 320px toolbar before ResizeObserver settled after applying text spacing. The screenshot already showed the settled layout. The harness now waits for the stored toolbar height to match its actual bounds. The targeted final follow-up passes 21/21 checks, including that exact narrow-toolbar case after settlement and all new mobile clearance behavior.

- `report.json`: broad workflow evidence and the original timing sample.
- `../second-pass-mobile-follow-up/report.json`: final mobile checks, all passing.
- Final mobile inspector and short-portrait screenshots are in `../second-pass-mobile-follow-up/`; desktop catalogue/reflection captures are in this directory.

This verifies the tool in its real-renderer test harness, not deployment, hardware WebXR, or every surrounding host-app integration.
