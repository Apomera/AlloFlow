# Track 11 follow-up: dictionary retry and multi-block context

**Superseded integration handoff:** use [enhancements/README.md](enhancements/README.md).
Its cumulative patches include this work plus the subsequently authorized four enhancements,
with 224 tests passing. Do not apply both sets of patches. The remaining text records this
earlier follow-up and its 199-test candidate snapshot.

Workspace: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`.
Inspected HEAD remains `fd4044c862ed9b345b340d69cb1411a19c09dafb`.
This is a concurrently edited local checkout; it does not establish the deployed release.
No applicable `AGENTS.md` was found in the repository or its ancestors.

## Current status and ownership

Both follow-ups are implemented as isolated source patches and validated candidates.
They have **not** been applied to the shared engine, dictionary loader, reader, host,
source mirrors, or generated application modules. The first track 11 recovery adapter
was already integrated by track 01 before this follow-up began.

The integration ledger reserves the engine for the parent coordinator's active fix;
the reader also continues to change. This follow-up preserves those reservations.
No deployment, publishing, push, Git mutation, server, live-provider request, app-state
operation, or cross-chat message was performed.

At final verification, engine and dictionary sources still matched the tested bases.
The reader had advanced after candidate generation. All three patches passed
`git apply --check --ignore-space-change -p0` against the then-current source.
This applicability check does not establish that the newer reader passes the tests.
The exact hashes, test count, and verification timestamp are in
`followup-verification.json`; source bases are in `followup-base.json` and
`reader-adapter-base.json`. The reader patch now contains only the additional retry control.

## Ranked evidence and scope

1. **P2 source gap: dictionary requests can remain pending indefinitely.**
   `content_engine_source.jsx:2645` bounds plugin loading but awaits the dictionary
   without a deadline. `dictionary_loader.js:151` fetches without a cancellation signal.
   The current popup status renderer at `view_simplified_source.jsx:3052` has AI retry,
   but no independently retryable dictionary control. These are source-confirmed gaps;
   no live network hang was reproduced. Deterministic deferred-promise and fake-clock
   tests validate the proposed deadline, cancellation, and retry behavior.
2. **P2 source gap: a selection crossing blocks loses passage context.**
   `content_engine_source.jsx:2570` resolves context from the starting block even when
   the range ends in another paragraph or list item. Bilingual rows are interleaved in
   DOM order, so simply reading their common ancestor would also collect the other pane.
   Candidate tests exercise both languages, paragraphs, lists, actual bilingual rows,
   and both exact-comparison versions. No browser/deployed-release failure is claimed.
3. **P2 recovery gap: malformed successful responses become cached misses.**
   `dictionary_loader.js:159` caches null after an unusable response. Ordinary lookups
   then reuse that null. Candidate tests verify that only real 404s create new cached
   misses, and an explicit retry can bypass an existing cached miss. Successful cached
   entries remain reusable offline.

Line references above identify the source observed during this follow-up; active owners
can move them. The patches and recorded hashes provide the stable review references.

## Existing safeguards preserved

- Saved artifact grade already wins over ambient grade in the first recovery implementation.
- The host already recovers the selected pane's `data-reading-language`; this follow-up
  adds no redundant language argument to word-click rendering.
- AI, dictionary, and prepared results already have separate ownership. Provider failure
  preserves useful help. Stable popup setters retain request ownership across host renders.
- Close, replacement, navigation, and late-completion guards remain in place. AI-disabled
  behavior still makes no AI call. Dictionary retry does not change that rule.
- Prepared-card More help uses its original word opener, preserving its passage context.
- Existing word speech, passage speech, dictionary recording, and separately marked English
  definition speech retain their established language contract.

## Minimal staged changes

`engine-followup.patch` adds a ten-second dictionary-attempt deadline covering both lazy
loading and lookup. Each attempt owns its timer and abort signal. Duplicate retry clicks
do not start overlapping attempts. Close cancels the current attempt; late plugin or
provider completion cannot overwrite a newer result. `retryDictionary()` reuses the
captured word and request, independently of `retry()` for AI. Failed retries preserve
existing dictionary, AI, and prepared content.

The same engine patch projects selected blocks into passage text with newline boundaries,
stable `selectionStart`/`selectionEnd`, and `lookupText`. It excludes controls, inline help,
foreign-language paragraphs, and comparison versions outside the starting pane. Define
uses that captured text after browser selection is cleared. Existing revision/glossary
selection text is unchanged. The policy remains one lookup in the starting pane's language;
it does not introduce a mixed-language lookup contract.

`dictionary-followup.patch` extends the compatible `lookup(word, options)` entry point with
an optional signal and `bypassMissingCache`. Cancelled responses cannot populate the cache,
including responses whose JSON completes after cancellation. Fetch throws/rejections,
server errors, and malformed responses retain the existing null-on-failure API and remain
retryable. The popup owns the deadline; unrelated dictionary consumers gain no new timeout.

`reader-adapter.patch` adds the independent dictionary retry button for unavailable entries.
It remains available when AI is disabled. It uses the translation fallback key
`simplified.lookup_dictionary_retry` with text `Try dictionary again`.

## Changed preparation and test files

- `dev-tools/prepare_reading_lookup_followup.cjs` — bounded engine/dictionary transformations,
  patch generation, source hashes, and an optional isolated engine candidate.
- `dev-tools/prepare_reading_lookup_adapter.cjs` — adds the retry control to either the original
  staged adapter or the already-integrated reader; never writes shared reader source.
- `tests/reading_lookup_candidate.js` — explicit staged-engine test loader.
- `tests/reading_lookup_recovery.test.js` — deadline, cancellation, independent retry, snapshot,
  duplicate-attempt, cross-block, and bilingual-filtering acceptance cases.
- `tests/reading_lookup_popup_adapter.test.js` — actual reader controls, AI-disabled dictionary
  retry, bilingual multi-paragraph selection, and both exact-comparison versions.
- `tests/dictionary_lookup_cancellation.test.js` — abort propagation and cache ownership.
- Artifacts in `reports/lookup-recovery/`, including this report and the updated handoff pointer.

## Verification actually run

Final recorded run: **11 files passed, 199 tests passed, 0 failed**, exit 0.
The Vitest JSON result is `followup-tests.json`. The two lookup suites explicitly exercise
the staged engine; the popup suite and candidate-aware reader suites use the frozen reader
candidate. Neighboring lifecycle/host suites continue to use their normal module loaders.
The dictionary suite applies its staged transformation in memory. This is focused validation,
not a production build, full-checkout test pass, browser smoke test, or deployment check.

The final run covers ambient grade/language differences, both bilingual panes, saved
artifact context, dictionary success plus AI failure, retry without reselection, retry
with AI disabled, prepared-help survival, hanging lookup/lazy loader, duplicate retries,
late completion after timeout/close, cancelled JSON/cache writes, real cached misses,
malformed responses, and cross-paragraph/list selection with consistent offsets.

Commands used to generate isolated candidates and run the final suite:

```powershell
node dev-tools/prepare_reading_lookup_followup.cjs --candidate
node dev-tools/prepare_reading_lookup_adapter.cjs --candidate
$env:ALLO_ENGINE_CANDIDATE='reports/lookup-recovery/content_engine_module.candidate.js'
$env:ALLO_VIEW_CANDIDATE='reports/lookup-recovery/view_simplified_module.candidate.js'
$env:ADAPTED_HELP_VIEW='reports/lookup-recovery/view_simplified_module.candidate.js'
node node_modules/vitest/vitest.mjs run tests/reading_lookup_recovery.test.js tests/reading_lookup_popup_adapter.test.js tests/dictionary_lookup_cancellation.test.js tests/adapted_word_help_lifecycle.test.js tests/adapted_explanation_lifecycle.test.js tests/student_ai_hidden_host_guard.test.js tests/adapted_reading_popup_read_aloud.test.js tests/adapted_word_help_ui.test.js tests/adapted_reader_fixes.test.js tests/original_reader_markdown.test.js tests/reader_keyboard_a11y.test.js --maxWorkers=1 --reporter=default --reporter=json --outputFile=reports/lookup-recovery/followup-tests.json
```

Patch applicability, transformation idempotence, engine candidate equality with its scoped
wrapper output, and whitespace checks were also completed. Frozen candidate modules are
test artifacts only; do not copy them into deploy outputs.

## Integration handoff

1. Integrator 01 should wait for the active engine/reader owners' release and recheck source.
   Apply the three narrow patches or regenerate them against the current source; do not
   replace whole files with candidate modules. Anchor changes fail explicitly.
2. Track 06 must preserve the new lookup snapshot fields while integrating selection/revision
   changes. The existing artifact resolver remains authoritative; no revision algorithm was changed.
3. Track 17 should localize `simplified.lookup_dictionary_retry` and retain the existing pane
   language names and fifth speech argument. Cross-language selections continue to use the
   starting pane; a broader mixed-language contract is outside this change.
4. Build only the integrated engine/reader with their existing builders. Synchronize the engine
   source mirror and dictionary public mirror through the normal integration workflow; the
   reader builder must retain `reader_place_store.js`. Host pins/build metadata belong to 01.
5. Rerun the focused acceptance cases against the assembled current files and generated modules.
   The shared reader's later changes have not been certified by this candidate run. Preserve the
   original tests' source-ownership and speech assertions through integration.

No further shared-file writes are planned by track 11 for this follow-up.
