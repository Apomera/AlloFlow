# Help Mode coverage and accuracy review - 2026-09-04

Implemented locally. No production deployment or production app bundle was created.

## Completed review

Reviewed 43 help entries against the current classroom workflow: 31 new explanations and 12 corrected descriptions. The corresponding English help titles now identify the actual action instead of relying on names derived from internal keys.

- Start & setup, Setup Wizard, and Guided Mode now describe their separate entry points accurately.
- Assignment Directions describes the composer, Draft for me, educator review, and Add to pack. It no longer describes a tool-instructions viewer. The composer now has dedicated help for its fields, drafting action, and save action.
- Guided Mode now has help for path choice, AI planning, customization, navigation, sample source, saved progress, returning to work, recent resources, phase review, readiness checks, finishing, and the separate Builder/share/live/preview actions. Both the ordinary and phase-checkpoint continuation buttons are covered.
- Builder help explains selected resource scope, format differences, and the output action. PDF/worksheet help accurately describes the browser print window. HTML, slides, QTI, and IMS descriptions no longer promise universal offline operation, LMS compatibility, or automatic accessibility approval.
- Help popups now update their dimensions when an open window is resized. The listener is removed on unmount.

Reviewed entry text and titles are recorded in reports/classroom-review-2026-09-04/help-reviewed-entries.json. Source evidence is in view_header_source.jsx, view_guided_mode_banner_source.jsx, view_directions_composer_source.jsx, view_export_preview_source.jsx, and the host's Guided delivery and persistence handlers.

## Dictionary integrity

Removed 35 duplicate definitions from help_strings.js. JavaScript previously used the last occurrence, so an earlier correction could be silently overridden. The cleanup preserves the effective values of every unreviewed entry; reviewed keys use the approved wording. Evidence: help-duplicate-cleanup.json.

Added dev-tools/audit-help-content.cjs. It checks canonical root sources and standalone modules, excludes generated duplicates, checks English help overrides, flags duplicate or empty definitions, and lists unmatched literal references separately from dynamic expressions.

Run:

```powershell
node dev-tools/audit-help-content.cjs --json reports/help-content-audit.json
```

The optional --check flag returns a failure status for duplicate, empty, or unmatched definitions. It is not enabled as a repository-wide CI gate while the existing review backlog remains.

## Verification

- 132 unique tests passed across seven files. Tests cover help integrity, real component anchors, specific help taking precedence over enclosing-area help, and Help Mode intercepting Next, sample loading, directions drafting, and saving without executing those actions. Ordinary actions still work when Help Mode ends.
- Added a popup-resize regression checking width, preserved focus, and listener cleanup.
- One existing readiness hydration test exceeded the default timeout during the initial runtime run. The runtime suites passed with a 30-second test limit; assertions were unchanged.
- Real-browser checks passed for keyboard activation, focus restoration, no unintended actions, and popup bounds at 320px, 360px, and 1200px widths. The targeted popup axe check found zero violations. The mobile screenshot was visually inspected.
- The development build completed; all four changed JSX modules pass syntax checks. The four generated modules, help strings, and English UI strings match their public mirrors. Scoped whitespace checks passed.

Evidence: help-content-regression.json, help-runtime-regression.json, help-content-browser.json, help-content-axe.json, help-directions-mobile.png, and help-content-dev-build.log in reports/classroom-review-2026-09-04.

## Remaining review

This is a semantic review of the 43 listed entries, not an accuracy certification for every help string or language pack. The static audit of canonical root files found 1,030 unique literal help references, 1,037 definitions, no duplicate keys, and no empty definitions. It still lists 60 references without global or English help definitions, plus eight dynamic expressions requiring review. Local or tour fallback behavior must be checked before treating every unmatched reference as an absent user-facing explanation.

The largest unmatched groups are School Rewards (25), Admin Hub backup/Drive controls (10), and Educator Evaluation (6). Other unmatched references include Adventure, AI setup, glossary, and workspace controls. The complete list is in help-coverage-after.json. The earlier coarse scan included a dynamic School Rewards prefix as a literal key; the new audit correctly reports that expression separately.

Other language packs were not retranslated. The browser checks use real components with a small host fixture and do not replace an end-to-end audit of all tools and configurations.
