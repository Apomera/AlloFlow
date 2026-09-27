# Track 11: recover concurrent dictionary success after provider failure

The dictionary now reuses a validated entry saved by another lookup when its own
pending request ends in a network/server error or an unusable response. Cancellation
still takes precedence. This avoids an unnecessary dictionary error/retry state when
useful help has already become available locally.

**496 tests passed across 17 files**, with stable monitored inputs and matching
dictionary copies. The combined run passed 465 tests but could not load the 31-test
speech suite because the runner hit `ENOSPC`. That suite passed alone after disk space
was available. `tests.json` preserves the original unsuccessful run;
`read-aloud-rerun.json` records all 31 recovered checks. No assertion failure remained.

## Reproduced behavior

Baseline HEAD: `a63e347b7d193cbc95b5fc3a9fec844322f1f455`. The working tree contains
concurrent changes; HEAD alone does not describe these source bytes or the deployed
release. `before.json` and `before/` preserve both dictionary files as inspected.
Final checked HEAD: `cbdace49bcacebd6d1693dced3d5d3fd75e9f36e`; HEAD moved concurrently while the monitored
runtime inputs stayed stable. No applicable `AGENTS.md` was found in the inspected
ancestors or affected directories; shared handoff instructions were followed.

Their baseline SHA-256 is
`dfc9c12a13c655d719f3fe19619998d73b8a8e320388b4ae33d5c7ecea7e39c0`.

Two callers can both miss the cache and fetch the same word. If one succeeds and saves
an entry, a later 404 already reuses it. Other failure paths previously returned null
without consulting that new entry. The successful cache was not erased, but the
pending popup did not display it until the user retried.

The source/popup reproduction ran the new dictionary tests and the entire popup adapter
suite against the unchanged loader: **14 assertion failures, 103 passed, zero skipped**.
Ten failures cover `lookup` and `lookupDetailed` across network rejection, HTTP 503,
invalid JSON, empty responses, and invalid response shapes. Four reproduce the missing
result in definition and phonics popups with AI enabled or disabled. The initial
filtered run separately records ten loader failures; its popup cases were excluded.

This is a reproduced local failure with deferred providers, not a reported live outage.

## Minimal change and safeguards

`dictionary_loader.js:190` adds a failure helper that checks cancellation first, then
uses the existing cache validator for the same normalized word. The five failure
branches at lines 205, 208, 211, 212, and 215 use this helper. A recovered entry returns
the existing success shape; otherwise the original failure reason is retained.

The recovery path performs no new fetch and does not rewrite storage. It rejects
missing, malformed, wrong-word, empty, and unreadable cache entries. The existing
404 behavior, negative-cache retry rule, result shape, and success writes are preserved.
The public dictionary copy is byte-identical to the root file.

Thirty-three new tests cover the five provider failures through both APIs, cancellation
before response and during JSON parsing, unavailable/invalid cache, a later explicit
lookup, and mounted definition/phonics popup recovery. The popup tests include AI-off,
AI failure, speech using the recovered meaning in English, and late failure after close.
They retain the captured request without requiring reselection.

## Evidence and scope

| Evidence | Purpose |
| --- | --- |
| `source-popup-reproduction.json` | Full two-file baseline run: 14 failures and 103 passing controls |
| `tests.json` | 465 executed tests passed; one uncollected suite hit ENOSPC |
| `read-aloud-rerun.json` | All 31 speech tests passed in the standalone recovery run |
| `verification.json` | Monitored input hashes, source/public equality, syntax and drift checks |
| `runtime.patch` | This follow-up's dictionary-only delta against the frozen baseline |
| `before.json`, `after.json` | Exact dictionary hashes before and after the change |

Production scope: `dictionary_loader.js` and
`desktop/web-app/public/dictionary_loader.js`. Tests:
`tests/dictionary_lookup_failure_recovery.test.js` and the added concurrency section in
`tests/reading_lookup_popup_adapter.test.js`.

Engine, reader, host, generated module, and locale implementations were not edited in
this follow-up. The validation gate is the 16-file lookup gate from
`../integration/README.md` plus `tests/dictionary_lookup_failure_recovery.test.js`.
No new Chromium run was needed for this loader-only change; popup checks mount the
production reader/engine in jsdom with the real dictionary API. No full application
build, install, server, Git mutation, commit, merge, push, deployment,
or other-session messaging was performed. Tests use disposable jsdom state and mocked
provider responses; no live provider or deployed-release claim is made.

## Integration handoff

Dependencies 06 and 17 retain their existing request-lifetime and language contracts.
The host's pane-language recovery remains intact. This follow-up changes no UI copy,
language argument, saved artifact schema, or public dictionary API.

Recovery is a one-time cache check when failure settles. It does not subscribe an open
popup to future storage changes, deduplicate requests, or keep shared in-memory results
when persistent storage is unavailable. Such cases retain explicit retry. Preserve other
owners' changes when preparing any commit or release; do not reapply older candidate
patches to the integrated source.
