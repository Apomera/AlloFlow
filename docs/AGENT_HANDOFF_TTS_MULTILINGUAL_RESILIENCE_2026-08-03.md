# Agent Handoff: Multilingual TTS Queue, Playback, and Save-TTS Resilience

Date: 2026-08-03
Repository: `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`
Branch / starting commit: `main` at `4385e186f`
Status: implementation is partially applied to source files, but it has NOT been rebuilt or tested after these edits.

## User intent

Finish the TTS fixes prompted by a field report in which English generally worked, but a non-English adapted text spoke/saved the first sentence and then skipped the remaining sentences without saving them.

The original reproduction language was Hebrew, but the user explicitly clarified that regression coverage must be language-agnostic: cover the shared non-English path with a representative language such as Spanish or French. Do not add Hebrew-specific production branches or a Hebrew-only regression.

The user also previously clarified that the affected reader is the ordinary/general Leveled Text view, not only Immersive Reader. Both playback surfaces should remain healthy, but direct coverage of the Phase K/general Leveled Text sequencer is important.

## Field log

Fresh log supplied by the user:

`C:\Users\cabba\.codex\attachments\a5258c70-024a-4623-bb12-df712b6cb7ed\pasted-text.txt`

The earlier diagnostic log is also available at:

`C:\Users\cabba\.codex\attachments\0fa7e713-2b2b-405a-a9f6-cb87064a3f71\pasted-text.txt`

### Confirmed evidence from the fresh log

- Non-English sentence 0 reached Gemini successfully in about 2.4 seconds.
- The played clip was captured with `saved:true`.
- Sentence 1's speculative preload/buffer timed out in the UI at about 20.6 seconds (the playback layer had a 15-second wait).
- That underlying network request did not settle until about 62.6 seconds, returning HTTP 401 after roughly 60.2 seconds.
- Sentence 2's fresh request timed out in the UI at about 35.6 seconds, while its underlying request later returned 401 after roughly 60.1 seconds.
- There was no 429 rate-limit event and no browser-speech fallback in this trace.
- The intended non-English language reached the provider correctly.
- English requests in the same session were also unstable; previously stored English clips masked some failures.

### Diagnosis

This is not evidence of a Hebrew text splitter or a Hebrew-only synthesis defect. The central failure is shared infrastructure:

1. The Gemini fetch watchdog aborted an `AbortController`, but some Canvas proxy/host fetches ignored the signal and stayed pending until their own approximately 60-second 401 response.
2. Because fetches are serialized by lane, the unresolved request kept a queue lane occupied even after the UI had timed out.
3. General Leveled Text playback trusted a speculative preload/buffer promise for too long. When it stalled, the active sentence did not promptly promote to a fresh interactive request.
4. When synthesis eventually produced no playable URL and browser fallback was unavailable, playback advanced to the next sentence. That looks exactly like "skipping every line" and also prevents capture/save.
5. Speculative preloads used an unnecessary retry budget, increasing the chance that background work consumed time while a learner was waiting.
6. Save TTS already supplies per-entry language/occurrence descriptors from `view_simplified_source.jsx`, but the legacy bridge ignored `options.entries` and rebuilt from the plain sentence strings. That discarded source-lane versus English-translation language overrides.
7. Lack of a local Piper voice for a particular language can reduce fallback coverage, but it was not the trigger in this log because the cloud requests themselves stalled and later 401ed.

## Partial source changes already present

There are unstaged edits in exactly these four TTS-related source files:

- `tts_source.jsx`: +51 / -16
- `phase_k_helpers_source.jsx`: +32 / -6
- `read_aloud_audio_service_source.jsx`: +40 / -5
- `AlloFlowANTI.txt`: +6 / -5

`git diff --check` currently passes for all four files.

### 1. `tts_source.jsx`

A new `awaitTtsHardDeadline` wrapper was added near the TTS timeout constants.

Intended behavior:

- Reject at the app deadline even if the underlying host fetch ignores `AbortSignal`.
- Abort the provider controller as cleanup.
- Keep observing the late fetch promise so a later rejection is not unhandled.
- Reject immediately on a caller/session abort instead of retaining the queue slot until the hard timeout.
- Apply the same behavior to both `fetchTTSBytes` and `callTTSDirect`.

Review carefully before accepting:

- Validate the helper's listener/timer cleanup under success, timeout, provider rejection, and caller abort.
- Confirm a late provider settlement cannot mutate cache/auth state. The wrapper only observes the fetch promise; parsing and success bookkeeping should remain downstream of the raced await.
- Confirm timeout errors remain regular/transient errors, while caller cancellation remains `AbortError`.
- Confirm the serialized `state.queue` and `state.interactiveQueue` advance after the hard failure plus the existing 150 ms settle gap.
- The current intended budgets remain 12 seconds interactive and 25 seconds background.

### 2. `phase_k_helpers_source.jsx`

Partial changes:

- Default audio resolution wait increased from 15 seconds to 30 seconds.
- Added a 2-second `READ_ALOUD_PRELOAD_PROMOTION_MS`.
- When an active sentence receives a pending speculative `preloadedAudio` or buffer promise, it waits only 2 seconds, deletes the stalled buffer, and recursively requests the same sentence without the preload at `retryCount + 1`.
- Speculative next-sentence preloads now pass `maxRetries: 0`.
- Model refusal or exhausted synthesis with no browser fallback now terminates playback rather than advancing/skipping the sentence.

Review carefully before accepting:

- Ensure recursion calls the same index with `preloadedAudio = null`, keeps the same session/content id, and cannot loop more than once.
- Ensure an `AbortError` terminates rather than promotes.
- Ensure active fresh synthesis still uses `priority: 'interactive'`, `maxRetries: 1`, and the segment's language.
- Ensure speculative synthesis remains on the normal/background lane with zero retries.
- Ensure terminal TTS failure clears generating/playing state and does not highlight or speak the following sentence.
- Direct behavioral coverage should target this exported `PhaseKHelpers.playSequence`, because this is the general Leveled Text path.

### 3. `read_aloud_audio_service_source.jsx`

Partial changes:

- Added `descriptorSynthesisProfile` to collect per-entry `language`, voice, speed/rate, provider, engine/model metadata, etc.
- Segment descriptors now retain `occurrence`, caller `identity`, and `synthesisProfile`.
- Reconciliation can use an explicit per-entry occurrence when matching repeated text to canonical resource descriptors.
- Adapter fields pass the per-segment synthesis profile into the core service.
- `prepare(..., options)` now selects `options.entries` when present, instead of always using the plain `sentences` array.
- A previously misplaced binding declaration was corrected. Current code should read:
  ```js
  const suppliedSegments = Array.isArray(options.entries) && options.entries.length
      ? options.entries
      : (Array.isArray(sentences) ? sentences : null);
  const binding = bindingFor(suppliedSegments, 'reference');
  if (!binding) {
      // safe empty result
  }
  ```

Review carefully before accepting:

- Test repeated identical spoken text spanning source and English-translation lanes.
- Verify explicit occurrences map to the intended canonical `segmentId` without reuse or off-by-one errors.
- Verify a supplied top-level `language` overrides the global English profile for that segment.
- Verify stored v4 entries contain the matching per-segment synthesis profile.
- Decide whether the caller's advisory `identity` needs any role beyond reconciliation. Stable persisted identity should continue to come from canonical semantic segment ids.

### 4. `AlloFlowANTI.txt`

The host's `_enumerateReadAloudResourceSegments` now attaches language metadata:

- ordinary FAQ/body/source segments use `leveledTextLanguage || currentUiLanguage || 'English'`
- the target lane after `--- ENGLISH TRANSLATION ---` explicitly uses `English`

This complements the per-entry descriptors already produced by `view_simplified_source.jsx`.

Review carefully before accepting:

- Confirm all side-by-side generation paths use the exact `--- ENGLISH TRANSLATION ---` contract.
- Confirm source is the adapted-text language and target is English.
- Ensure FAQ behavior should use the active leveled-text language in this product context.

## Existing related coverage

`tests/tts_pipeline_source_resilience.test.js` already has language-agnostic descriptor coverage using Spanish. It verifies duplicate occurrence numbering across bilingual source/target lanes and language-aware buffer identity. Keep this generic; do not replace it with Hebrew-specific assertions.

Useful existing behavioral suite:

- `tests/tts_karaoke_handoff_regressions.test.js`
  - exposes `PhaseKHelpers.playSequence`
  - has `makePlaySequenceDeps`, `SequenceAudio`, and fake-timer patterns
- `tests/karaoke_tts_regressions.test.js`
  - loads real `createTTS`
  - already stubs Canvas fetch, object URLs, and fake timers
- `tests/read_aloud_audio_service.test.js`
  - has `makeLegacyBridgeHarness`
  - tests duplicate occurrence and per-profile synthesis behavior
- `tests/tts_pipeline_source_resilience.test.js`
  - source contracts and generic non-English identity
- `tests/local_tts_loaders.test.js`
  - local fallback contracts

Before the current partial edits, this focused command passed 55 tests:

```powershell
npx vitest run tests/tts_pipeline_source_resilience.test.js tests/read_aloud_audio_service.test.js tests/local_tts_loaders.test.js tests/karaoke_tts_regressions.test.js --maxWorkers=1
```

Nothing has been tested after the current four-file edits.

## Required new regression coverage

Use a representative non-English language such as Spanish or French. The assertions must exercise shared multilingual behavior, not language-specific text rules.

### A. Hard provider deadline releases the queue

Add a `createTTS` behavioral test, likely in `tests/karaoke_tts_regressions.test.js`:

1. Use fake timers.
2. Configure Canvas mode and a non-English language/profile.
3. Make the first mocked fetch return a never-settling promise that ignores its signal.
4. Call `callTTS` with `priority: 'interactive'` and `maxRetries: 0`.
5. Advance past 12 seconds and assert the first call settles (normally `null` after unavailable fallbacks), rather than hanging for the provider's 60-second behavior.
6. Allow the 150 ms queue settle gap.
7. Make a second sentence's fetch return valid inline audio and assert it succeeds.
8. Assert there were two provider calls and the second was not blocked by the first zombie.

Also add or extend a cancellation case: aborting the caller should release promptly as `AbortError`, without waiting 12 seconds.

### B. General Leveled Text promotes a stalled preload

Add a direct `PhaseKHelpers.playSequence` test in `tests/tts_karaoke_handoff_regressions.test.js`:

1. Set `leveledTextLanguage` to a representative non-English language.
2. Supply a never-settling `preloadedAudio` promise for the current sentence, or seed `audioBufferRef.current` with one under the correct `sequenceBufferKey`.
3. Advance fake timers just over 2 seconds.
4. Assert the sequencer hands off recursively to the same sentence index with:
   - null preload
   - retry count 1
   - same session/content id
5. Assert it does not advance to the following sentence.
6. Verify the fresh active call uses the interactive lane and preserves the non-English language.

Add a terminal-failure assertion: if the fresh request returns no URL and browser fallback is disabled, playback stops and does not call the next sentence.

### C. Save TTS preserves per-entry bilingual profiles

Add a legacy-bridge test in `tests/read_aloud_audio_service.test.js`:

1. Canonical resource descriptors should include one adapted-language source sentence and one English translation sentence.
2. Call:
   ```js
   bridge.prepare(
     entries.map(entry => entry.text),
     onProgress,
     { entries }
   )
   ```
3. Entry shape should mirror `view_simplified_source.jsx`:
   ```js
   { text, language: 'Spanish', occurrence: 0, identity: 'source:0:0' }
   { text, language: 'English', occurrence: 0, identity: 'target:0:0' }
   ```
4. Assert synthesis requests receive languages `['Spanish', 'English']`.
5. Assert the stored entries retain those corresponding synthesis profiles and canonical segment ids.
6. Include repeated text/occurrence coverage if practical.

### D. Source contracts

Extend existing source-resilience checks to pin:

- `awaitTtsHardDeadline`
- `READ_ALOUD_PRELOAD_PROMOTION_MS`
- `pk:preload-promoted`
- speculative `maxRetries: 0`
- terminal failure rather than blind `advance()`
- `options.entries` used by the legacy bridge
- English target-lane language in the host enumerator

Behavioral tests are preferred for the central failure modes; source assertions are only supplemental.

## Build steps after source changes

The generated modules are currently stale. After review and tests are added, rebuild:

```powershell
node _build_tts_module.js
node _build_phase_k_helpers_module.js
node _build_read_aloud_audio_service_module.js
node build.js
```

Expected direct source-to-module outputs include root modules and desktop mirrors, such as:

- `tts_module.js`
- `desktop/web-app/public/tts_module.js`
- `phase_k_helpers_module.js`
- `desktop/web-app/public/phase_k_helpers_module.js`
- `read_aloud_audio_service_module.js`
- `desktop/web-app/public/read_aloud_audio_service_module.js`

Inspect `git status` immediately after each build so unrelated generated files are not accidentally absorbed.

## Verification sequence

Recommended focused sequence:

```powershell
npx vitest run tests/tts_pipeline_source_resilience.test.js tests/read_aloud_audio_service.test.js tests/local_tts_loaders.test.js tests/karaoke_tts_regressions.test.js tests/tts_karaoke_handoff_regressions.test.js --maxWorkers=1
npm run verify:view-props
npm run verify:build
git diff --check
```

Then run the broader relevant TTS/karaoke tests discovered with:

```powershell
rg --files tests | rg "tts|karaoke|read_aloud|edit_audio|leveled_text"
```

Manual verification should include:

1. ordinary Leveled Text in a non-English language, several sentences, no pre-saved clips
2. ordinary Leveled Text with side-by-side English translation
3. Save TTS, reload/rehydrate, play every source and target sentence
4. Edit Audio generate/play for a sentence after a simulated provider failure
5. Immersive Reader smoke test to ensure shared changes did not regress it
6. cancel/stop while a provider fetch is pending
7. duplicate sentences in one or both bilingual lanes

## Important dirty-worktree warning

The worktree already contains many unrelated user changes. Do not reset, clean, checkout, overwrite, stage, or include them in a TTS commit.

Unrelated modified/untracked paths currently include:

- `memory_palace_module.js` and its desktop mirror
- multiple `stem_lab/*` modules and desktop mirrors
- Beehive, GIS, and Memory Palace tests
- untracked `tests/beehive_campaign_intelligence.test.js`
- untracked `tests/beehive_drone_coach_runtime.test.js`

Only the four TTS-related source files listed above were changed during this unfinished pass. Generated TTS modules will become legitimate TTS changes only after their corresponding builders are run.

## Completion criteria

The task is complete when all of the following are true:

- A host fetch that ignores abort cannot hold either TTS queue lane beyond the app deadline.
- Caller cancellation releases promptly.
- A stalled speculative preload is promoted to a fresh interactive request for the same current sentence.
- Speculative preloads have no retry budget.
- Terminal no-audio failure stops visibly instead of silently skipping the sentence.
- General Leveled Text and Immersive Reader both still work.
- Save TTS preserves adapted-language source profiles and English translation profiles per segment.
- Reloaded saved clips resolve under the same canonical identities.
- New regression coverage is generic non-English, with no Hebrew-only logic.
- Generated modules are rebuilt and focused verification passes.
