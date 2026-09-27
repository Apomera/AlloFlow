# Correctness-only immersive lifecycle integration

Prepared from the current primary checkout on 2026-09-27. Shared runtime files, generated outputs, and Git were not changed. Both patches apply with exact context to the saved preimages; the resulting source and tests parse. No tests or builds were run during this review.

Apply `source.patch` and `tests.patch` only after checking the SHA-256 preimages in `review.json`. Byte-exact current preimages are retained in `preimages/`. This extracts the completed lifecycle fixes from the isolated `reader-performance-current` candidate; it does not import that older checkout wholesale.

Included: scoped ownership and cancellation of advance, device-start and resolver-watchdog timers; cancelled watchdog promise settlement; stale diagnostics callback guards; and guaranteed removal of temporary copy fields. These changes do not depend on the candidate's caches or passage observer.

The test patch adds eight correctness cases: seven owner cases (including generated/device advancement as two cases) and one review-added case for late clipboard rejection after close. The tests load the actual production `immersive_reader_module.js`; no candidate environment override is included. The review-added case has not been run yet.

After applying, the integrator should regenerate using `node _build_immersive_reader_module.js`, verify both generated copies match, and refresh only the ImmersiveReaderModule content-hash loader pins in the three host mirrors. The generator writes its temporary bundle input and root/public module outputs. Run:

```text
npx vitest run tests/immersive_reader_review_runtime.test.js tests/immersive_sentence_alignment.test.js tests/immersive_preference_persistence.test.js tests/immersive_cache_freshness.test.js tests/immersive_reader_dialog_a11y.test.js tests/immersive_reader_word_timing_source.test.js --maxWorkers=1
```

Recheck baseline failures before attribution, and verify immediate teardown in an isolated browser before release. The owner recorded 166 passing tests for the broader original candidate; that historical result does not certify this extracted subset or current assembled release.

Deferred: source/support caches, word-help mutation-observer caching, crawl memoization, and duplicate-position storage-write suppression. The latter intentionally stops refreshing durable recency, so it changes eviction policy and is not required for lifecycle correctness. Also excluded are the separate `view_simplified_source.jsx` diagnostics changes, which have no direct coverage in this immersive test extraction.

The full candidate's latency acceptance remains OPEN. Its reported comparison p95 increased in both paired runs (40.1 to 43.2 ms, then 79.7 to 197.8 ms), and the large-support fixture increased from 130.7 to 157.3 ms. Preserve all original performance evidence in the isolated worktree; do not describe this release as delivering that unaccepted performance optimization.

`browser-current.cjs` supplies eight browser lifecycle cases against the current generated module, served byte-for-byte in disposable browser contexts. It covers native local WAV completion and queued-advance teardown; device-voice queued advancement; a hung resolver closed before a late result; late successful clipboard completion after unmount; late clipboard rejection after close; feedback-timer teardown; replacement-scope feedback reset; and temporary-field removal after legacy copying throws. Device voice, resolver and clipboard outcomes are explicit deterministic stubs. This is not performance or full-host acceptance.

Run after integrated tests and LF normalization:

```text
node reports/releases/collective-2026-09-27/immersive-lifecycle-integration/browser-current.cjs
```

The default browser channel is installed Microsoft Edge; set `ALLO_LIFECYCLE_BROWSER=chromium` to use Playwright's Chromium. The runner launches a headless browser, compiles only the React fixture bundle in memory, blocks external requests, and writes only `browser-current-results.json` here. It starts no server and changes no runtime file, Git state, or user application storage. Source, generated pair, builder, dependency lock and all three host hashes are compared before/after; drift fails the run. The runner was syntax-checked during preparation, but no browser cases were executed then.
