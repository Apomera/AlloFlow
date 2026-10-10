# Research Simplicity and Accessibility

Date: 2026-10-09. Scope: research settings, source review, and transcript selection UI.

## Changes

- Pasted-text fields sit inside a native `Paste text` disclosure. Saved drafts reopen visibly; hiding fields does not clear their values.
- The dialog's Tab loop ignores controls hidden by any closed ancestor disclosure, disabled fieldsets, CSS visibility, or hidden/inert containers.
- Transcript pagination focuses a persistent result summary, including the first/last page where the initiating button becomes disabled. Filtering announces the matching count without stealing search-field focus.
- Transcript groups have source/range-specific names, and source titles expose level-three heading semantics.
- Clip validation exposes invalid state and field-associated format/error text. Provider guidance is associated with the URL field.
- Invalid settings URLs are associated with the error and receive focus, including repeated submission of the same error. Editing clears stale feedback.
- Review content exposes busy state. The focusable feedback area has a named group role. Explicit cancellation produces `Research cancelled.`; late results cannot replace it or erase drafts.

Search eligibility, privacy protections, provider behavior, evidence limits, source exclusions, and whole-video defaults are unchanged.

## Verification

- Six focused UI suites: **202/202 passing**, including 32 new accessibility cases. Final receipt: `ui-tests-complete.json`; `ui-tests-final.json` retains the earlier passing run before the feedback-role refinement.
- Initial run: 194/202. Six failures came from the new transcript fixture omitting its controlled-cache setter; two existing tests expected silent cancellation. The fixture and intended cancellation assertions were corrected, preserving late-response and draft assertions. Initial receipt: `ui-tests.json`.
- Runtime module copies and named loader references match. SHA-256: `1da258f3b570c771c1b7641a3e1d836571a61b4d0918f4cee683db14ff2801d6`. The final loader-pin write encountered a Windows/OneDrive `UNKNOWN` error twice; a narrow patch succeeded, then the guarded sync completed without replacing other edits.
- Parity checker `--selftest`: three fixture-only mutations detected (stale mirror, stale loader pin, missing loader). Each saved fixture was restored and reread before validating again. Production files are not mutated.
- Scoped `git diff --check` passes. Independent read-only review found no actionable regression.
- Final native-browser run: **8/8 scenarios**, **5 dialog-scoped axe scans with zero violations**, and **2/2 runtime mutation checks**. Three layout checks and screenshots cover 320px, 390px, and 1280px widths. No browser errors or unexpected external requests. Receipt: `browser-results.json`.
- Expanded axe diagnostics identified the existing feedback container's unsupported accessible name on a generic `div`; adding `role="group"` removed that finding. Earlier receipts are retained as `browser-results.initial.json` and `browser-results-pre-role-fix.json`.
- Four axe contrast items remain explicitly incomplete because scroll clipping prevented the scanner from resolving the background. Supplemental checks found `rgb(30,41,59)` on white, **14.63:1** contrast against a 4.5:1 threshold, no gradients/opacity/blending, and unobscured text after scrolling into view. These do not turn axe's incomplete results into automated passes.
- Baseline findings are retained in `baseline-notes.md` and `browser-baseline.json`. Final screenshots `simple-link-320.png`, `invalid-clip-390.png`, and `named-clips-desktop.png` were visually inspected.

The baseline had zero scoped axe violations but still dropped keyboard focus to the page body on last-page navigation. Manual keyboard checks are required alongside automated semantics checks.

## Reproduction

```text
node --max-old-space-size=512 --import ./reports/research-student-sources-2026-10-08/vitest-startup.cjs node_modules/vitest/vitest.mjs run tests/source_research_accessibility_ui.test.js tests/source_research_dialog_accessibility.test.js tests/source_research_review_ui.test.js tests/source_research_settings_ui.test.js tests/source_research_transcript_ui.test.js tests/source_research_video_clip_ui.test.js --maxWorkers=1 --testTimeout=60000 --hookTimeout=120000
node reports/research-accessibility-2026-10-09/run-browser.cjs --selftest
node reports/research-accessibility-2026-10-09/sync.cjs --selftest
node reports/research-accessibility-2026-10-09/sync.cjs --check
```

Browser verification uses built canonical modules in a focused research component fixture, with local simulated provider responses and external requests blocked. It is not a full-app end-to-end run, live Gemini evaluation, actual screen-reader speech test, or WCAG certification. Screen-reader phrasing, heading navigation within checkbox labels, and possible repetition when a live result is also focused remain manual assistive-technology checks.

Shared work and the Git index were preserved. No user files were deleted; no staging, commit, push, or deployment was performed.

## Local Preview

The simulated preview is running at http://127.0.0.1:55777/ (PID 43584 at verification). It loads the current canonical UI modules with local fixture responses; it does not call a paid provider. The old 49809 preview was no longer listening. Each test runner's temporary preview was stopped after verification.
