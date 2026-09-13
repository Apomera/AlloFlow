# AlloFlow WCAG 2.2 A/AA audit — September 12, 2026

> **Remediation update:** AUD-01 through AUD-05 are corrected and verified in the local working tree. See the [follow-up results](remediation/README.md). The findings, counts and rendered results below preserve the pre-remediation baseline.

## Result

**The audit identifies confirmed exceptions; it does not establish full WCAG conformance.** The [updated VPAT](../../VPAT-2.5-WCAG-AlloFlow.md) retains 53 qualified Partially Supports ratings and two Not Applicable ratings. No criterion is promoted to Supports on the strength of test counts.

- Regression run: **6926 tests: 6826 passed, 97 failed, 3 pending** across 808 selected top-level accessibility test files. Raw runner success: false.
- Source scan: **616 files**, 14 heuristic checks, 380 matches; 170 classified by the scanner as covered by a CSS baseline and 161 as outside the accessibility tree; **49 non-exempt candidates** remain. These classifications were not comprehensively independently verified.
- Browser sampling: initial app chooser, settings dialog, teacher Quick Start step 1, loading catalog shell, and Video Studio initial Record screen. Results below preserve incomplete axe checks and loading limitations.

## Confirmed findings and priorities

| ID | Priority / WCAG | Reproduce and observed result | Recommended correction |
|---|---|---|---|
| AUD-01 | High / 1.4.3 | Open video_studio/video_studio.html. Set up recording (#studioNextBtn), Start recording (#startBtn), and Generate demo plan (#demoPlanBtn) show 14px white text on #6366f1, measured 4.46:1 against 4.5:1 required. Present at 1280px and 320px, with and without spacing override. | Darken the button fill or change text color, then measure default, hover, focus and disabled states. |
| AUD-02 | Medium / 4.1.2 | Video Studio #demoPreflightList is a generic div carrying aria-label, with no role permitting that name. axe reports aria-prohibited-attr in all sampled widths. | Give the status container appropriate semantics or remove the invalid name; verify announcements with a screen reader when populated. |
| AUD-03 | Medium / 2.5.8 | Open catalog.html at 320px. Navigation GitHub link is 40.7 x 17px; axe reports safe clickable spacing 23.2px, below 24px. With text spacing the safe distance is 22px. This is a standalone navigation target, not a link embedded in a paragraph. | Increase link height/padding or navigation spacing and retest the spacing exception at wrapping breakpoints. |
| AUD-04 | High / 1.4.3 | Fresh app → Full Platform → Teacher → Quick Start step 1, desktop width; hover College. That grade button has #64748b text over #eef2ff, 4.25:1. It is 14px bold and therefore does not qualify as large text. | Increase contrast and remeasure the actual button states. |

Application code was unchanged during the baseline audit. The subsequent [remediation pass](remediation/README.md) corrects all five confirmed findings and retains the original evidence.

## Supplemental label-in-name check

**AUD-05 — High priority, WCAG 2.5.3:** In the loaded desktop workspace, the visible More information button has aria-label=Expand, and AI Guide & Assistant has aria-label=Message (#tour-tool-udl). These names omit the visible labels. Use the visible wording as the accessible name, optionally followed by a clarifier. Verify both compact and expanded headers with speech input and a screen reader.

The explicit experimental axe label-content-name-mismatch rule reported three nodes. DOM review confirms the two mismatches above. Its additional Start & setup / Open Start and setup options finding is retained as **INV-02**, requiring interpretation of ampersand/word expansion before calling it a failure. This supplemental result explains why a default axe scan could report zero violations while label defects remained. See [raw targeted evidence](browser-label-check.json) and rerun run-label-check.cjs.

## Investigations and scope corrections

- **INV-01:** Desktop Create tab #tab-create references tour-input-panel while source input is still a loading placeholder. axe reports aria-valid-attr-value. A follow-up after dismissing Quick Start and waiting for tour-input-panel found that the reference resolved; the loaded 1280px workspace had zero axe A/AA violations, with three incomplete rule groups. Treat this as a transient loading-state relationship issue, not a confirmed steady-state defect. The 320px layout changes navigation and does not reproduce this finding.
- **Media:** Video Studio source supports imported/prerecorded video, caption import/edit/export, narration and recording. Prior blanket exclusions for 1.2.2, 1.2.3 and 1.2.5 are withdrawn. No actual video, transcript accuracy, synchronization, audio description or exported media was evaluated. Live speech recognition during recording does not itself create a live broadcasting service.
- **Shortcuts:** stem_lab/stem_tool_raptorhunt.js defines P/V/Z/T/M and other character shortcuts, presets and custom bindings. 2.1.4 is applicable; disabling, compliant remapping or focus-only activation remains to be verified.
- **Static triage examples:** AcTextarea in applied_challenge_source.jsx forwards props to textarea, with aria-label/aria-labelledby supplied at call sites; the scanner cannot resolve this. teacher_source.jsx's loading fallback already uses role=status and is not necessarily a modal. Offscreen texture and export canvases must be distinguished from meaningful visible canvas output. Reduced motion is not proof of compliance with the flash threshold.
- **Regression failures:** A failed source-contract assertion, fixture setup error, or timeout is not automatically a product WCAG violation. The retained failure details require classification and targeted reruns before changing criterion ratings.

## Environment and evidence limits

Web release metadata: **1.5**, released 2026-09-11T04:53:38.661Z. Base commit: `815d948165363182edfd776694c371dc64602080`. Node v24.11.1; Windows 11 Home ARM64 (10.0.26200); Chromium 148.0.7778.96; axe-core 4.12.1. UTC timestamps are September 13; the local evaluation/report date is September 12, America/New_York.

The working tree contains substantial pre-existing changes and was not frozen; other local work may continue during testing. The test-file manifest records hashes at run start. Existing compiled web assets were tested as present, without rebuilding the entire app. Component fixtures load canonical modules separately. These are separate evidence layers, not proof that every source change is deployed. No hosted build, native desktop wrapper, or third-party authentication/integration was verified.

Browser probes use a fresh local context, disabled service workers and a loopback static server. Requests to the AlloFlow CDN are supplied locally when resolvable; other origins are blocked. Catalog data remained loading, and the source/generator workspace panels initially showed loading placeholders behind onboarding. The additional loaded-workspace probe waited for tour-input-panel and evaluated that ready state. A clean axe result for those shells does not cover their unloaded content. Browser exceptions and blocked origins are retained in JSON.

Many existing browser regressions render fixture HTML in Chromium; they validate semantics/layout of those states but do not exercise all React effects, event handlers, real data or full user processes. Text-spacing checks and no document overflow do not by themselves prove that all internal content remains readable. Screen-reader speech, actual 200%/400% browser zoom, mobile assistive technology, media accessibility, generated PDF/Office output, live sessions and authentication remain untested in this run.

## Rendered results

Counts in parentheses are affected nodes per rule. Incomplete results need review and are not passes.

| State | Viewport | axe violations | Incomplete rules | Document scroll/client width |
|---|---|---|---|---|
| app-1280 | 1280 x 800 | 0 | aria-prohibited-attr, color-contrast | 1280/1280 |
| app-320 | 320 x 800 | 0 | aria-prohibited-attr, color-contrast | 320/320 |
| app-320-spacing | 320 x 800 | 0 | aria-prohibited-attr, color-contrast | 320/320 |
| catalog-1280 | 1280 x 800 | 0 | 0 | 1280/1280 |
| catalog-320 | 320 x 800 | target-size (1) | 0 | 320/320 |
| catalog-320-spacing | 320 x 800 | target-size (1) | 0 | 320/320 |
| video-studio-1280 | 1280 x 800 | aria-prohibited-attr (1); color-contrast (3) | aria-prohibited-attr, color-contrast | 1280/1280 |
| video-studio-320 | 320 x 800 | aria-prohibited-attr (1); color-contrast (3) | aria-prohibited-attr, color-contrast | 320/320 |
| video-studio-320-spacing | 320 x 800 | aria-prohibited-attr (1); color-contrast (3) | aria-prohibited-attr, color-contrast | 320/320 |
| backend-initial-1280 | 1280 x 800 | 0 | aria-prohibited-attr, color-contrast | 1280/1280 |
| teacher-workspace-1280 | 1280 x 800 | aria-valid-attr-value (1); color-contrast (1) | aria-prohibited-attr, color-contrast | 1280/1280 |
| teacher-workspace-after-dialog | 1280 x 800 | aria-valid-attr-value (1); color-contrast (1) | aria-prohibited-attr, color-contrast | 1280/1280 |
| teacher-workspace-320 | 320 x 800 | 0 | color-contrast | 320/320 |
| teacher-workspace-320-spacing | 320 x 800 | 0 | color-contrast | 320/320 |
| teacher-loaded-1280 | 1280 x 800 | 0 | aria-prohibited-attr, aria-valid-attr-value, color-contrast | 1280/1280 |

The teacher-loaded-1280 probe retained the text-spacing override from the earlier narrow probe; it was not a default-typography or browser-native zoom test.

AI settings keyboard sample: trigger activated with Enter; all 45 sampled Tab positions stayed within a dialog; Escape left zero dialogs and returned focus to AI Backend Settings. This is a scripted sample, not an NVDA or VoiceOver test. Screenshot review included Video Studio at 320px and teacher Quick Start at 1280px.

## Regression exceptions

The **97 failed assertions span 19 files**. Initial triage separates **34 opaque runner errors**, **24 cascading axe-busy errors**, **23 rendered fixture diagnostics**, and **16 source/DOM contract assertions**. These are not 97 confirmed product defects.

An isolated four-case rerun passed Geometry World and reproduced the Number Line contrast, Titration contrast and live-quiz focus assertions. The focus expectation and theme-host fidelity still need review. The full-suite aggregate remains unchanged; the targeted rerun is reported separately.

See the [diagnostic breakdown, file inventory and retest interpretation](regression-triage.md), [complete failure messages](failed-regressions.json), and [raw full-suite results](regressions.json). Three Coaster Lab focus cases were skipped.

## Reproduce and evidence

Run from the repository root with installed dependencies and Playwright Chromium:

```powershell
node reports/wcag-audit-2026-09-12/run-regressions.cjs
node reports/wcag-audit-2026-09-12/run-static.cjs
node reports/wcag-audit-2026-09-12/run-browser.cjs
node reports/wcag-audit-2026-09-12/run-workflows-ready.cjs
node reports/wcag-audit-2026-09-12/run-loaded-workspace.cjs
node reports/wcag-audit-2026-09-12/run-label-check.cjs
```

- [Environment versions](environment.json)
- [Regression manifest](regression-manifest.json), [regression output](regressions.json), [runner log](regressions.log)
- [Static findings](static-audit.json), [static log](static-audit.log) (the log prints the original scanner output name; the wrapper redirects the JSON to this folder)
- [Baseline browser results](browser-audit.json), [role/loading-state probe](browser-workflows.json), [settings and teacher probe](browser-workflows-ready.json), [loaded source-workspace probe](browser-loaded-workspace.json)
- Base app/catalog/Video Studio screenshots belong to the baseline run. Workflow probes reuse screenshot names; those PNGs show the latest capture (the label-check run), while each JSON file retains its own exact state and timestamps. The direct browser probes did not start recordings, authenticate, invoke AI generation, or publish.
- [Manual test plan](../../docs/accessibility-manual-test-plan.md)
- Standards: [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [ITI VPAT guidance](https://www.itic.org/policy/accessibility/vpat).
