# Guided resume and tour navigation - 2026-09-04

Implemented locally; no production deployment or production bundle was created.

## Changes

- The Guided resume card names the saved step. Resume, review, and planning actions are disabled while a resource is being generated, consistent with the workflow's other navigation controls.
- Tour Back and Next look for reachable steps in the requested direction. A missing target no longer makes Back bounce forward to the step the user just left.
- Steps that reveal a tool, switch to History, or use a custom onEnter action still receive a chance to open their target. If that target remains missing, the tour continues in the user's chosen direction.
- Back is disabled when there is no earlier reachable step; the final reachable step uses Finish when there are no later candidates.
- Delayed tour measurements check that their tour and step are still current before changing highlights or advancing. Callbacks from a closed or changed tour are ignored.

## Verification

- 163 tests passed across six files, including 13 added cases for missing targets, backward and forward movement, revealable steps, stale measurements, endpoint labels, and Guided resume behavior.
- Real-browser checks passed at 1200×850, 360×780, 320×568, and 667×375. Resume controls disable while busy, navigation stays visible, and Space and Escape behave correctly. The targeted tour-dialog axe check reported zero violations. The updated mobile resume screenshot was visually reviewed.
- Evidence: reports/classroom-review-2026-09-04/guided-resume-navigation-regression.json, guided-resume-browser.json, tour-navigation-axe.json, and guided-resume-dev-build.log.

Browser checks use the real components with a small host fixture. Missing-target navigation and stale callbacks are tested against the actual host functions; this is not an end-to-end audit of every tool or tour configuration. English copy and fallback text were updated; other language packs were not retranslated.
