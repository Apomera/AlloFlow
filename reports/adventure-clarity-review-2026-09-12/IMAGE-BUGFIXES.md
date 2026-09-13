# Adventure image-generation bug fixes

Completed locally September 12, 2026.

## Confirmed causes and fixes

- **Extra opening image:** Adventure requested a temporary setting during cast review, then generated the actual scene after confirmation. Cast confirmation now owns the opening scene image; reviewing the cast does not request a temporary background.
- **Repeated scene requests:** The same scene could start several complete image pipelines. Requests now share a pending or completed result, scoped to the mounted Adventure state owner and scene.
- **React updater replay:** Turn effects were scheduled from a replayable state updater, allowing two image requests, item-image requests, sounds, and notices. A single deferred batch now runs for the resolved turn. Repeated completion callbacks for the same pending result are ignored, preventing a second turn advance.
- **Late image overwrites:** Completions previously checked only the turn number, which repeats in a new adventure. The pipeline now checks current request ownership and the live scene, and retires prior work on start, restart, resume, choice, written response, and Guiding Hand. Obsolete work stops before further editing or publishing its result. A provider request that has already started may still finish, but its result is ignored.
- **Duplicate or failed saves:** Image storage no longer runs inside a React updater. It runs once outside the updater, replaces the matching cache entry, and handles storage errors while preserving the displayed image.
- **Faster visuals:** This setting now skips the automatic cleanup edit. Optional cast matching remains available.
- **Stale loading UI:** Terminal turns no longer report image loading when no image is requested. Guiding Hand also clears the previous scene preview before preparing its next illustration.

## Expected image work

Each scene uses one base-image generation pipeline. Normal quality can still apply a cleanup edit, and consistent characters can apply a cast-matching edit. Those edits refine the same scene image. Character portraits are separate assets. Faster visuals skips the cleanup edit.

## Verification

- Before fixing the pipeline, six of seven image lifecycle tests failed. Repeated calls generated three base images; a stale same-turn result overwrote newer art; replayed state updates saved an image twice; storage failure handling and faster-visual behavior also failed.
- Two additional turn tests reproduced duplicate image dispatch and a repeated turn completion. Both now pass.
- **291 Adventure unit tests passed across 29 files.** See [final results](image-unit-final.json).
- **7 Chromium tests passed**, including actual React Strict Mode, a delayed old image arriving after a new adventure starts, and the existing choice, writing, and debate journeys. See [browser log](image-browser-run.log).
- All three host JSX files parse and provide the live Adventure state binding. Both rebuilt handler bundles match their public copies. Targeted whitespace checks pass.

The tests use scripted image providers and local shipped modules. No paid image generation or deployment was performed.

## Reproduce

- `npx vitest run tests/adventure_image_lifecycle.test.js tests/adventure_runtime_regressions.test.js tests/adventure_clarity_lifecycle.test.js tests/adventure_consistent_characters.test.js --maxWorkers=1`
- `npx playwright test -c reports/adventure-clarity-review-2026-09-12/playwright-images.config.cjs`
- `node reports/adventure-clarity-review-2026-09-12/verify-image-fix.cjs`
