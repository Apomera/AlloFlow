# Startup and file-intake reliability — September 4, 2026

## Changes

- File selection now calls `__alloLazyFileIntake`, promoting MiscHandlers out of the deferred background queue. The existing loader retains responsibility for in-flight deduplication, timeout state, and retry. The upload handler still checks its document epoch before dispatch or error reporting.
- A failed intake now tells the user to select Upload and choose the file again. The input is cleared so selecting the same file can trigger another attempt.
- The desktop HTML loads `./ai_backend_module.js` relative to the application. The staging rewrite also handles older tags with id/defer attributes.
- `AlloQuestContract` is included in the canonical desktop asset-copy list. The module was copied into public and existing local build asset folders.
- The tool catalog resolves beside the app on localhost/127.0.0.1; hosted AlloFlow keeps its root catalog path, and Canvas keeps the CDN path.
- Canonical host and both desktop source copies carry the changes. The existing local HTML/assets were repaired, but the compiled desktop main bundle is still the previous build.

## Browser evidence

An isolated esbuild preview of `desktop/web-app/src/index.js` replaced only the main JavaScript response in a fresh browser context using the real desktop runtime and its local assets. This is source-preview verification, not a completed production build or signed-in Canvas test.

Two final fresh contexts selected the fictional rainfall PDF while MiscHandlers was still absent, with an additional 500 ms delay on its request. Both reached the audit chooser, with exactly one intake request and no uncaught page errors. Final observed durations were 14,081 ms and 2,295 ms; earlier iterations ranged down to 1,235 ms. These are observations under variable machine load, not performance guarantees.

AI backend and intake returned HTTP 200 locally; the quest contract was available at HTTP 200. The tool-index 404 disappeared after its path fix. Remaining diagnostics were requests for the absent optional `/allo-shell-config.json` and a React fetchPriority warning in the source-preview build. No AI audit, repair, or export was started. No credentials or student records were used.

Evidence: `scratch/startup-reliability/browser-results-source.json` and `upload-1.png` / `upload-2.png`. Reproduction helpers: `scratch/teacher-guide-capture/build-source-preview.cjs` and `verify-startup.cjs --source-preview`.

## Regression coverage

Final result: **69 tests passed across 7 suites**.

`tests/startup_intake_reliability.test.js` exercises queue promotion, delayed registration, stable file retention, already-loaded intake, timeout/retry, stale upload rejection, root/nested AI-script paths, legacy HTML staging, asset inclusion, and desktop/hosted/Canvas catalog routing. Existing intake, module-readiness, desktop packaging, service-worker, and catalog suites were also run. The catalog integrity test initially exceeded its default five-second timeout while reading files; final verification uses a 120-second test timeout without changing application timeouts.

## Packaging limitation

`node desktop/scripts/build-desktop-web.cjs --isolated-output` failed with ENOSPC while copying public assets into its temporary build directory. The official builder removed that temporary directory. The C: drive had approximately 1.1 GiB free afterward. No completed desktop shell rebuild, installer, or deployment is claimed.

After sufficient disk space is available, rerun the official isolated build and then `node scratch/teacher-guide-capture/verify-startup.cjs` without `--source-preview` to verify the packaged shell. Do not treat the current old compiled main bundle as containing the intake or catalog source changes.
