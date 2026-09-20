# Collective AlloFlow release — 2026-09-20

Everyone's staged workspace changes and the completed contributor commits were released following the user's explicit request to commit and run deploy.sh.

- Source commit: f5b045fc9b1e0a39927129763844fc12e76368a1 (7,642 changed files).
- Generated release commit: c1bd2e5cf97340a003ada0ca473c55ded8ae6c81.
- Live app: https://alloflow-cdn.pages.dev/app/
- Both release commits were pushed to GitHub and mirrored to Codeberg; backup tags were also synchronized.

## Release validation

All blocking deploy preflight checks passed. The existing >120-file policy deferred the full changed-test batch to CI; no skip environment variables or hook bypasses were used. The homework enhancement pass passed 200 tests across 16 files and two focused 320px browser scenarios. Additional release checks passed Games 34, Sidebar 72, Allobot 52, plugin registration 2, and reading/mailbox 67 tests; these figures are separate suite runs and are not a deduplicated total.

The hosted production build and isolated desktop build both succeeded. Desktop validation passed the baked-key scan, remediation source/public/app-build parity, hashed asset manifest, and service-worker precache checks. This rebuilt the desktop web artifact, not an installer. Firebase was intentionally skipped because no school-owned project is configured; no Apps Script deployment was performed by deploy.sh.

The deployment's final verification passed: source hash consistency, current key CDN modules, reachable app shell/service worker, and real veraPDF validator/JAR artifacts. Additional SHA-256 verification matched all 21 tested files against the generated release commit, including all 9 app files, canonical shell, homework modules, generated reading/mailbox modules, Games, Sidebar and Butterfly. The first propagation snapshot is retained separately; the final snapshot supersedes it.

A fresh Chromium page opened the live app to the workspace chooser with HTTP 200, no page errors, and no failed same-origin script or stylesheet requests. Root visually inspected the 1365x900 screenshot: the chooser cards and controls are readable and contained. This is a startup smoke check, not coverage of every feature, live mailbox action, live AI call, or background-loaded tool.

## Release repairs and recovery

The normal gates identified and we corrected a missing Games translator binding, Sidebar inputText forwarding, verified injected-helper baseline declarations, the mailbox reflection-type mirror, missing Butterfly PLUGIN_FILES registration, and stale generated theme CSS. Eight baseline declarations were individually verified against actual builder injection; no runtime bug was hidden by a blanket baseline update.

The commit hook also required existing generated STEM build copies to match current source. Forty tools/eighty generated files were refreshed, and the unchanged parity checker passed. The full desktop build subsequently regenerated and verified the complete artifact.

An abandoned Git index lock stopped the generated-file commit after both builds passed. With no Git process active and the lock unchanged for several minutes, its contents were backed up locally before removal. Staging then succeeded. Unchanged deploy.sh steps 6–10 were resumed with BUILD_HASH=f5b045fc9 and Firebase unconfigured, and exited 0 with “Deploy complete + verified.” The successful preflight/build stages were not bypassed. Two generated root modules omitted by the script's explicit staging list (live_aac_module.js and mailbox_script_source_module.js) were explicitly staged and included in the generated release commit; their canonical builds and focused tests passed.

## CI status and limits

Cloudflare Pages succeeded for the generated release. The separate Workers build failed; its status is distinct from the verified Pages site. GitHub exposes no error text or annotations for that failure, only the authenticated Cloudflare build-log link, so its cause was not inferred. The full GitHub verify run was still in progress when captured, with failures present. The static gate's remaining stale command-translation manifest and the four AlloBot visual differences exactly match the September 18 baseline; the STEM parity failure seen on the earlier source-only commit is resolved. The remediation job passed 800/801 tests and repeated the exact same sole tests/doc_pipeline_build_parity.test.js:32:83 assertion as the September 18 baseline (605/606 passed): a fresh source build does not byte-match both shipping locations. The remediation browser phase did not run. The repeated assertion is confirmed; the underlying byte difference remains unclassified. See release-ci-snapshot.json and the linked run for remaining results. This release does not claim an entirely green codebase test suite.

- Final deployment steps: release-final-steps.txt
- CI run: https://github.com/Apomera/AlloFlow/actions/runs/35492117260
- Live byte evidence: release-live-verification.json
- First propagation snapshot: release-live-verification-first.json
- Browser evidence: release-live-browser.json and release-live-app.png
- Focused homework evidence: README.md and validation-summary.json
- STEM mirror repair evidence: stem-mirror-release-fix.json

The following documentation/evidence commit does not change runtime files; the deployed runtime remains the content verified at c1bd2e5cf.
