# Quick Start after starting a fresh workspace

The recovery dialog's “Start a fresh workspace” action cleared lesson content but retained the previous workspace's closed/completed Quick Start state. Completing or skipping setup, or entering guided mode, could therefore suppress setup for the next workspace. The module loader was not closing the wizard.

The fresh-workspace handler now removes `allo_wizard_completed`, resets the previous initial source mode, and opens Quick Start. The existing role condition still waits for role selection and keeps teacher setup out of student mode. Saved recovery snapshots and background tool loading are unchanged. The four-line change is synchronized across the canonical shell and both desktop source copies.

## Verification

- Regression before the fix: 4 of the 6 new handler tests failed; all four browser scenarios skipped Quick Start.
- After the fix: 69 tests passed, 1 existing test skipped, 0 failed across the six focused test files. Coverage includes fresh-workspace state, recovery persistence, Quick Start rendering/accessibility, demand loading, and the deferred module pump.
- All four Chromium scenarios now open Quick Start through the actual recovery button and advance to the source step: previously completed setup, guided mode, cold loading at 320 px, and cold loading after role selection. Saved original content remains intact, with no page errors or unexpected network requests.
- All three shells parse with Babel and their changed handlers match exactly. Scoped whitespace checks pass. The 320 px screenshot was visually inspected.

The browser harness uses the real recovery component, Quick Start module, loading adapter, fresh-workspace handler and role handler in a controlled state host. It does not mount the complete application or exercise live AI calls. Blank unrelated translations/icons in its captures are fixture omissions, not a full-app appearance assessment. Before/after JSON and screenshots record the result. Run `node reports/quickstart-entry-recovery/browser-qa.cjs` (or append `--before` to exercise the captured old handler).

## Release

Source validation is complete. A focused deployment will be built from the committed fix in an isolated checkout, preserving concurrent unfinished STEM/UI work in the shared workspace. Release evidence will be added when publishing and live verification finish.
