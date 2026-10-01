# Track 11: preserve dictionary success during concurrent lookup

Prepared an isolated dictionary candidate that keeps a useful cached entry when a
concurrent lookup returns a late 404. Shared application source and generated mirrors
were not edited. Integration is still pending.

## Baseline and evidence

Inspected and verified HEAD: `af3c6b82ab76dad40a5d44f785bf828d1adea86c`.
Dictionary source SHA-256:
`2f6cfa948fadef07d97c5705dc412e062bc070cf2a031bef9067169bf82bfd91`.
No applicable `AGENTS.md` was found in the workspace or inspected ancestors. The local
checkout does not establish the deployed release.

- **P2, reproduced source failure:** `dictionary_loader.js:170` writes a cached miss
  without checking whether another active request has already cached a valid entry.
  Two requests that both begin uncached can finish success-first/404-last, replacing
  useful offline help with null and returning an unnecessary failure to the late caller.
- `generate_dispatcher_source.jsx:3774` performs background glossary lookups separately
  from the popup's lookup; `:3777` runs three background workers. The loader therefore
  has independent callers beyond the popup's own per-session guard.
- The previous cache-validation candidate retained the same unconditional 404 write
  (`../cache/dictionary.candidate.source.js:191`). This follow-up complements its shape
  validation and partial-response recovery.

`source-reproduction.json` records two expected failures against the unchanged loader,
one for `lookup()` and one for `lookupDetailed()`. Only those cases were selected for
the baseline run. These are deterministic jsdom tests with controlled fetch responses,
not observations from the deployed application.

## Minimal change and safeguards

On a 404, reread the normalized word's cache through the existing validated `readCache`.
If a usable entry arrived while this request waited, return that entry with a successful
outcome and leave storage untouched. Otherwise retain the existing cached-miss behavior.

The abort check still runs before this branch. A cancelled caller remains cancelled even
when another caller succeeds. Requests keep separate signals; there is no new shared
transport or cancellation ownership. Existing `lookup()` entry-or-null and
`lookupDetailed()` outcome contracts are preserved.

Validation is required: malformed, mismatched, or unusable cached objects must not count
as successful help. Legacy entries that normalize into useful definitions remain valid.
The fix uses the existing best-effort local cache and adds no cross-tab locking or cache
schema changes.

## Acceptance and verification

**50 tests passed across two files:** 10 new race cases and 40 existing dictionary
recovery cases. The final run had no failures or skipped tests.

The new cases cover:

- Success followed by a late miss through both public APIs, preserving stored bytes and
  serving the next offline lookup without another fetch.
- A miss followed by success, replacing the cached miss with useful data.
- Cancellation before or after another caller succeeds, with independent signals.
- Malformed JSON, invalid entry shape, or mismatched word data arriving during a request.
- Valid legacy cached data arriving during a request, returned without rewriting it.
- A valid entry for a different cache key, which must not be substituted.

The candidate parses, its transform is idempotent, and both patches reproduce the tested
candidate in memory. Read-only `git apply --check --ignore-space-change -p0` succeeds for
the combined patch. `verification.json` confirms the dictionary source, candidate, and
recorded preparation/test dependencies remained unchanged.

This run validates the dictionary candidate only. The earlier 338-test result belongs to
the preceding cache/media candidates and was not rerun or carried forward here. The
shared engine has changed since that media baseline; reconcile it before combined
engine/host/reader integration and regression validation.

## Ownership and integration

Track 11 owns `dev-tools/prepare_dictionary_cache_race.cjs`,
`tests/dictionary_lookup_race.test.js`, and this report directory. The shared dictionary
owner/integrator applies the application delta and synchronizes public mirrors through
the normal workflow. No other session was contacted.

Choose exactly one integration route:

1. If the earlier cache patch is not integrated, apply `dictionary.patch`. It contains
   cache validation, partial-response recovery, and this race fix against current shared
   `dictionary_loader.js`; it replaces the earlier cache batch's dictionary patch.
2. If cache validation is already integrated, review/apply only `cache-race.patch`, the
   narrow follow-up against that validated loader.

Do not apply both patches or copy the full candidate over newer owner changes.
The separate pending media patches are unchanged. Dependency 06 and track 17's existing
language contract remain intact; this delta changes no reader, host, renderer language
arguments, speech API, or saved artifact fields.

Prepare the isolated artifacts:

```powershell
node dev-tools/prepare_dictionary_cache_race.cjs
```

The recorded candidate test run:

```powershell
$env:ALLO_DICT_CANDIDATE='reports/lookup-recovery/cache-race/dictionary.candidate.source.js'
node node_modules/vitest/vitest.mjs run tests/dictionary_lookup_race.test.js tests/dictionary_lookup_cancellation.test.js --maxWorkers=1 --reporter=default --reporter=json --outputFile=reports/lookup-recovery/cache-race/tests.json
node dev-tools/prepare_dictionary_cache_race.cjs --verify
```

For the source reproduction, use `ALLO_DICT_CANDIDATE='dictionary_loader.js'`, the race
test file alone, and `-t 'reuses successful offline help after a late miss'`, saving to
`source-reproduction.json`. Those two failures are intentional evidence, separate from
the passing candidate results. Regenerating a changed candidate requires fresh tests.

No deployment, push, Git mutation, app server, live provider request, or saved application
state change was performed. Test storage is confined to jsdom.
