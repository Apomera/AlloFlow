# Fourth-pass Activity Journal

## Scope

Only the builder activity-guide CSS and its installation changed. Activity identities, evidence/review rules, note storage, and navigation are unchanged. The source and public mirror share SHA256 `B3C4C919E53BB3EAB57305DFD954F397081EE84AF66D68BE6647D2E32FD249F2`.

The journal now uses a white reading surface with ink/teal, a sticky lesson header with a 44px Close control, unframed challenge/evidence sections, restrained repeated snapshot items, and readable native controls. On phones, redundant introductory copy is suppressed while the authored challenge remains intact.

## Before and After

The saved baseline is `before/report.json` with 21 screenshots. The final verification is `after/report.json` with 24 screenshots.

| Viewport | Before challenge heading Y | After challenge heading Y | Earlier |
| --- | ---: | ---: | ---: |
| 1280 x 800 | 405.66px | 351.97px | 53.69px |
| 390 x 844 | 401.53px | 281.19px | 120.34px |
| 320 x 568 | 448.41px | 281.19px | 167.22px |

Useful comparisons: `before/390x844-journal-top.png` and `after/390x844-journal-top.png`; `before/320x568-journal-notes.png` and `after/320x568-journal-notes.png`.

## Verification

- Final private Chromium run: 62/62 checks passed; six scoped axe audits reported zero violations.
- Notes and self-review survive Next and returning through the activity selector.
- Next places the active heading below the sticky header; Close remains visible and hit-testable at top, notes, bottom, and subsequent activity states.
- Desktop and both phone layouts have no horizontal text overflow, including increased text spacing, high contrast, and forced colors.
- No application or host runtime errors occurred. The private browser and server closed through their own handles; the user preview was not stopped.
- New style coverage: `tests/geometry_world_activity_guide_visual.test.js`, 8/8 passing. Five existing activity suites also passed 103 tests; root owns the combined regression run.
- Builder syntax and scoped diff whitespace checks passed; source/public parity was verified after QA.

Harness: `scratch/geometry-world-refresh-2026-10-02/fourth-journal-visual.mjs --after`. Chromium uses SwiftShader for reproducible real WebGL rendering; this is not a claim about hardware GPU performance.
