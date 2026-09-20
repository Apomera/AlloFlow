# Quick Start after starting a fresh workspace

The recovery dialog's “Start a fresh workspace” action cleared lesson content but retained the previous workspace's closed/completed Quick Start state. Completing or skipping setup, or entering guided mode, could therefore suppress setup for the next workspace. The module loader was not closing the wizard.

The fresh-workspace handler now removes `allo_wizard_completed`, resets the previous initial source mode, and opens Quick Start. The existing role condition still waits for role selection and keeps teacher setup out of student mode. Saved recovery snapshots and background tool loading are unchanged. The four-line change is synchronized across the canonical shell and both desktop source copies.

## Verification

- Regression before the fix: 4 of the 6 new handler tests failed; all four browser scenarios skipped Quick Start.
- After the fix: 69 tests passed, 1 existing test skipped, 0 failed across the six focused test files. Coverage includes fresh-workspace state, recovery persistence, Quick Start rendering/accessibility, demand loading, and the deferred module pump.
- All four Chromium scenarios now open Quick Start through the actual recovery button and advance to the source step: previously completed setup, guided mode, cold loading at 320 px, and cold loading after role selection. Saved original content remains intact, with no page errors or unexpected network requests.
- All three shells parse with Babel and their changed handlers match exactly. Scoped whitespace checks pass. The 320 px screenshot was visually inspected.

The browser harness uses the real recovery component, Quick Start module, loading adapter, fresh-workspace handler and role handler in a controlled state host. It does not mount the complete application or exercise live AI calls. Blank unrelated translations/icons in its captures are fixture omissions, not a full-app appearance assessment. Before/after JSON and screenshots record the result. Run `node reports/quickstart-entry-recovery/browser-qa.cjs` (or append `--before` to exercise the captured old handler).

## Complete compiled app

The complete production app was also exercised through the real recovery, workspace-choice and role-choice UI: Start a fresh workspace → Full Platform → Teacher. The old bundle skipped Quick Start and retained the completion marker. The rebuilt bundle opens Quick Start, removes the marker and advances to the source-selection step with no page errors. Its settled 1280 px screenshot was visually inspected. This test replaces only the Canvas device-storage transport with a controlled saved-work fixture; UI, app state and handlers are the compiled application. It does not test Gemini's storage approval UI or live AI calls. See full-app-qa.cjs, full-app-before.json and full-app-after.json.

## Release

Source fix: 994aa53a6ef7c52d88e37760a40860daa0041480. Normal commit hooks, all blocking deploy preflight checks, the six-test changed-test gate, and the hosted build passed. The release uses an isolated checkout to preserve concurrent shared-workspace changes. The desktop build and its artifact checks also passed. Generated release 406dcbe47d695cdc48c7a9d8d6fbeec5411237ed was pushed to GitHub and Codeberg. Cloudflare Pages succeeded, and all 12 live SHA-256 checks match that release, including the canonical shell and every app/ file. Live app: https://alloflow-cdn.pages.dev/app/.

The initial isolated hosted build lacked the workspace's ignored .env and failed under fallback CRA lint settings. After restoring the existing project configuration, the hosted build passed. Unchanged deploy.sh stages 4 onward were resumed; repository preflight checks and hooks were not altered. The isolated checkout also needed the original repository's local Git author identity before the generated commit; after copying that identity, unchanged stages 6–10 completed. The script's initial CDN propagation warning is superseded by live-verification.json (12/12 matches). Firebase was intentionally skipped because no school-owned project is configured. No desktop installer was produced.

This is a focused regression/release check; it does not claim the entire repository CI suite passes.

Release logs: deploy-build-summary.txt and deploy-final.txt. The pending live snapshot is retained only as propagation history; live-verification.json is the final result. Concurrent work added after the focused source commit is preserved locally and is outside this deployment.
