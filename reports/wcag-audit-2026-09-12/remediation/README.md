# AlloFlow accessibility remediation — September 12, 2026

**All five confirmed audit findings were corrected and verified in the local working tree.** The [VPAT](../../../VPAT-2.5-WCAG-AlloFlow.md) remains interim: these repairs do not establish product-wide conformance. The [original audit](../README.md) and its raw results are retained as the baseline.

## Changes and evidence

| Finding | Correction | Verification |
|---|---|---|
| AUD-01 / 1.4.3 | Video Studio action buttons use #4f46e5 with white text; hover uses #4338ca. | Measured 6.29:1 in default/focus and 7.90:1 on hover, for all three identified controls. Nine control/state checks pass. Disabled controls remain disabled and are outside this contrast check. |
| AUD-02 / 4.1.2 | The named Video Studio preflight container now has role=region and retains aria-live=polite. | No aria-prohibited-attr violation at desktop, 320px, or 320px with text spacing. Actual populated announcements still need screen-reader verification. |
| AUD-03 / 2.5.8 | Catalog navigation uses wrapping flex layout, gaps, and minimum 24px link dimensions. | GitHub measures 40.70 × 24px at 320px; 50.06 × 24px with text spacing. All three links meet the 24px height. Target-size audit passes. |
| AUD-04 / 1.4.3 | Quick Start grade buttons use text-slate-700 rather than text-slate-600 for the unselected state. | After the conflicting shared stylesheet loads, College hover measures 7.07:1 (#4338ca on #eef2ff), with no contrast violation in the four Quick Start samples. |
| AUD-05 / 2.5.3 | Removed overrides that replaced visible More information and AI Guide & Assistant labels. The guide button also exposes expansion state and hides decorative icons from its name. | Loaded workspace passes the explicitly enabled label-content-name-mismatch rule; More information retains its visible name. |
| INV-02 | The compact Start & setup text button takes its name from visible content. The expanded header's icon control keeps its descriptive label. | The earlier ampersand/word-expansion mismatch no longer appears in the explicit label check. |

The Quick Start issue depends on CSS arrival order. One preliminary follow-up did not reproduce it; a subsequent run captured the overriding rule .fixed.inset-0:not(.theme-dark):not(.theme-contrast) .text-slate-600 { color: #64748b !important; }. The final runner waits for this rule before testing hover. [Before-fix evidence](before-quickstart-fix.json) preserves that reproduction.

Canonical JSX was changed and the three affected modules rebuilt: HeaderBar, UDLGuideButton and QuickStartWizard. Their public mirrors and both Video Studio copies are synchronized. The catalog page exists in the public directory. No full release rebuild, commit, or deployment was performed.

## Verification

- **38/38 existing targeted tests pass**, across six test files. [Final results](final-regressions.json). An initial 5-second timeout in the Quick Start catalog test passed in isolation and in the final run with a 30-second limit; [initial results](regressions.json) and [isolated retest](quickstart-retest.json) remain available.
- **9/9 initial-page states pass axe A/AA and document-width checks**: app chooser, catalog shell and Video Studio at 1280px, 320px and 320px with text spacing. [Results and measurements](browser-audit.json).
- **All six targeted workspace gates pass**: source readiness, explicit label-in-name rule, Quick Start contrast, loaded workspace axe/reflow at desktop and 320px with/without text spacing, AI settings focus containment over 45 Tabs, and Escape/focus restoration. [Results](browser-label-check.json).
- **9/9 Video Studio color checks pass** across default, hover and focus. [Measured control states](control-states.json).
- Catalog at 320px with text spacing was visually inspected; links wrap without overlap. Screenshots for all sampled states are stored in this directory.

| State | Width (CSS px) | axe violations | Incomplete rules | Document scroll/client width |
|---|---|---|---|---|
| app-1280 | 1280 | 0 | aria-prohibited-attr, color-contrast | 1280/1280 |
| app-320 | 320 | 0 | aria-prohibited-attr, color-contrast | 320/320 |
| app-320-spacing | 320 | 0 | aria-prohibited-attr, color-contrast | 320/320 |
| catalog-1280 | 1280 | 0 | 0 | 1280/1280 |
| catalog-320 | 320 | 0 | 0 | 320/320 |
| catalog-320-spacing | 320 | 0 | 0 | 320/320 |
| video-studio-1280 | 1280 | 0 | aria-prohibited-attr, color-contrast | 1280/1280 |
| video-studio-320 | 320 | 0 | aria-prohibited-attr, color-contrast | 320/320 |
| video-studio-320-spacing | 320 | 0 | aria-prohibited-attr, color-contrast | 320/320 |
| backend-initial-1280 | 1280 | 0 | aria-prohibited-attr, color-contrast | 1280/1280 |
| teacher-workspace-1280 | 1280 | aria-valid-attr-value | aria-prohibited-attr, color-contrast | 1280/1280 |
| teacher-workspace-after-dialog | 1280 | aria-valid-attr-value | aria-prohibited-attr, color-contrast | 1280/1280 |
| teacher-workspace-320 | 320 | 0 | color-contrast | 320/320 |
| teacher-workspace-320-spacing | 320 | 0 | color-contrast | 320/320 |
| teacher-loaded-1280 | 1280 | 0 | aria-prohibited-attr, aria-valid-attr-value, color-contrast | 1280/1280 |
| teacher-loaded-320 | 320 | 0 | aria-valid-attr-value, color-contrast | 320/320 |
| teacher-loaded-320-spacing | 320 | 0 | aria-valid-attr-value, color-contrast | 320/320 |

Incomplete rules are retained for review and are not passes. The source-panel loading relationship, INV-01, remains observable; it resolves once tour-input-panel exists. Counts above concern selected states and rules, not a complete process or WCAG criterion.

## Remaining work

The original 97 regression failures were not globally rerun or declared resolved. Their [triage](../regression-triage.md) still requires follow-up on fixture fidelity, source contracts, timeouts, Nuclear Lab axe concurrency, tool-specific contrast and keyboard scrolling. INV-01 needs a stable panel relationship across the lazy-loading transition. An intermediate 320px scan also reported scrollable-region-focusable on the background workspace tabpanel while Quick Start was open (INV-03). It did not recur in the final onboarding scan, and both ready-workspace mobile probes pass. This is a loading/onboarding investigation, not a confirmed persistent defect. The entire application build and hosted deployment remain unverified.

NVDA/VoiceOver, native 200%/400% browser zoom, authenticated and live workflows, video captions/audio description, populated preflight announcements, generated exports and full tool/state coverage remain outstanding. Catalog entries were still loading. Local tests block remote services and exercise no AI generation, camera/microphone capture, account changes or live classroom actions.

## Reproduce

From the repository root, run:

~~~powershell
node reports/wcag-audit-2026-09-12/remediation/run-browser.cjs
node reports/wcag-audit-2026-09-12/remediation/run-label-check.cjs
node reports/wcag-audit-2026-09-12/remediation/run-control-states.cjs
node node_modules/vitest/vitest.mjs run tests/header_controls_a11y.test.js tests/header_popovers_a11y.test.js tests/view_header_reflow_a11y.test.js tests/quickstart_wizard_a11y.test.js tests/quickstart_wizard_render.test.js tests/video_studio_dialog_a11y.test.js --maxWorkers=1 --testTimeout=30000
~~~

The browser runners return a nonzero exit code if their stated gates fail. Source hashes, mirror checks, documentation links and WCAG row counts are recorded in [validation](validation.json). The working tree contains substantial unrelated changes; results apply to the sampled local files and runtime documented here.
