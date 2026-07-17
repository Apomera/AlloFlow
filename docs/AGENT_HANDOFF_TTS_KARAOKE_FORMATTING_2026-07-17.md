# Agent handoff: leveled-text formatting, citations, TTS prewarming, karaoke cache, and voice consistency

Date: 2026-07-17

## User-reported symptoms

1. Adventure Time speech has avoidable startup latency.
2. A leveled-text resource displays a literal `##` inside a paragraph instead of rendering the next heading.
3. Read-aloud/karaoke appears to include citation markers in the active highlight instead of skipping them.
4. Karaoke audio repeatedly fails to behave like a durable cache despite several fixes.
5. Speech sometimes switches to what sounds like Puck even when Kore (or another voice) is selected.

The user is nearly out of quota and explicitly requested a plan/handoff rather than a rushed implementation. This document is the only intentional repository change from this pass.

## Working-tree safety

The branch was otherwise clean apart from pre-existing untracked logs:

- `deploy_run3.log` through `deploy_run8.log`
- `skatelab-devserver-error.log`
- `skatelab-devserver.log`
- `skatelab-preview-error.log`
- `skatelab-preview.log`
- `sweep_out.txt`

Do not delete, stage, or overwrite those files without separate authorization.

## Reproduction artifact and confirmed Markdown failure

The supplied Dreams leveled text contains this exact malformed boundary:

```text
...throughout the night. [⁽⁴⁾](https://www.sleepfoundation.org/dreams) [⁽²⁾](https://www.merriam-webster.com/dictionary/dream)## Why the Brain Dreams
```

This is not primarily a renderer bug. Markdown headings must begin at a line boundary. Because there is no newline before `##`, the renderer correctly shows the marker as literal paragraph text.

The leveled-text path trims the model result, calls `sanitizeTruncatedCitations()` and `normalizeCitationPlacement()`, and stores it without a structural Markdown boundary repair:

- `generate_dispatcher_source.jsx:1966-2070`
- generated mirror: `generate_dispatcher_module.js:1969-2073`
- citation helpers: `text_pipeline_helpers_source.jsx:219-305`

`normalizeCitationPlacement()` does not intentionally collapse newlines. The malformed boundary may be emitted by the model, but the application currently trusts it. Prompt-only correction is insufficient; add a conservative deterministic repair.

### Formatting fix plan

1. Add a pure `normalizeMarkdownBlockBoundaries(text)` helper, preferably beside the existing text-pipeline citation helpers.
2. Protect fenced/inline code before repairing. Outside protected code, insert a blank line when a Markdown block marker occurs mid-line in a structurally unambiguous position, especially `)## Heading`, `.## Heading`, and equivalent `#{1,6} ` boundaries.
3. Call it after citation repair/placement and before every simplified-resource state write, including the refined/length-repair path and each streamed multi-chunk update.
4. Strengthen the leveled-text prompt with “place a blank line before every Markdown heading,” but retain deterministic repair.
5. Add the exact Dreams boundary as a regression fixture. Assert that the body contains `\n\n## Why the Brain Dreams`, never `)## Why`, and that valid inline uses such as `C#` or literal hashes in code are untouched.
6. Keep the repair conservative: fix only heading boundaries (`)## `, `.## `, and the other confirmed `#{1,6} ` heading cases). Do NOT extend to mid-line list/blockquote markers without their own fixtures — patterns like `3.- note` in ordinary prose are false-positive bait, and headings are the only confirmed failure.
7. Verify the repair does not perturb sentence segmentation: run the repaired Dreams fixture through `splitTextToSentences` and assert the audio-stripped sentence list is identical to the unrepaired text's list. The injected `\n\n` should be invisible to TTS/karaoke — prove it in the fixture, don't assume it.

Also verify file/transport encoding as UTF-8. The attachment displays correctly in the app, but Windows PowerShell 5.1 printed the superscript citation bytes as mojibake during this audit. Do not mistake terminal decoding for stored corruption.

## Citation speech versus citation highlighting

There are two representations in play:

- Playback sends a cleaned `textToSpeak` to TTS.
- The immersive renderer maps and highlights raw displayed tokens from the resource.

`phase_k_helpers_source.jsx:189-201` removes well-formed citation Markdown from speech by first converting links to labels and then removing superscript citation labels. However:

- Adventure prewarm at `phase_k_helpers_source.jsx:290-303` sends the raw sentence, not the cleaned sentence.
- Sequence look-ahead at `phase_k_helpers_source.jsx:501-550` duplicates the sanitizer instead of calling the shared helper.
- `view_simplified_source.jsx:455-466` has another copy named `cleanSentenceForAudio`.
- `karaoke_audio_store_module.js:32-59` has a fourth related normalization used for persistent keys.
- The immersive sentence-to-token matcher at `view_simplified_source.jsx:906-1010` indexes raw sentence text, so visible citation tokens inherit the active sentence highlight even when the synthesizer did not speak them.

Therefore the screenshot does not prove that Gemini audibly read the citation. It does prove that the visual karaoke model does not distinguish spoken tokens from display-only citation tokens. Raw prewarm can still synthesize citations and defeat the later clean request.

### Citation/TTS fix plan

1. Establish one exported pure `toSpokenText(text)` function and use it everywhere: current playback, all look-ahead/prewarm paths, karaoke preparation, overlay resolution, persistence keys, downloads, and browser fallback.
2. Preserve the raw display sentence separately. Never remove citations from the learner's visible resource merely to fix speech.
3. Make immersive token assignment citation-aware. Citation anchors/tokens should remain visible and clickable but should not count toward spoken sentence progress, should not receive the karaoke active fill/highlight, and should not be click-to-read targets.
4. Add a behavioral test with the exact `[⁽⁴⁾](URL)` form asserting:
   - the displayed citation remains;
   - `callTTS` receives neither URL nor citation label;
   - warm and current calls receive byte-identical normalized text;
   - the citation token is marked display-only/not highlighted.
5. Cover `[1]`, `[Source 1]`, superscript citations, Markdown citation links, adjacent citations, citations immediately before headings, and malformed/truncated links.

## Adventure prewarm regression (confirmed, introduced 2026-07-16)

Commit `2be495ad4` added Adventure scene prewarming. It can increase latency:

- Prewarm sends raw sentences; playback sanitizes first.
- Prewarm begins speaker resolution from `null`; live playback begins from a different speaker state.
- Committed continuation scenes keep cumulative voices in `adventureState.voiceMap`, while the host prewarm path can pass `adventureState.currentScene.voices`, which is often absent after the opening scene.
- `_advPrewarmedRef` deduplicates only an 80-character text prefix and ignores the voice map/request signature.
- All requests occupy the same FIFO TTS queue, so two wrong warm calls can run before the requested audio.

Primary anchors:

- `phase_k_helpers_source.jsx:123-177` — Adventure voice resolver
- `phase_k_helpers_source.jsx:290-303` — Adventure prewarm
- `phase_k_helpers_source.jsx:355-364` — live text preparation
- `phase_k_helpers_source.jsx:474-589` — current request and look-ahead
- `AlloFlowANTI.txt:26928-26965` — host prewarm/auto-read effects
- `adventure_session_handlers_source.jsx:501-516` — `currentScene` versus cumulative `voiceMap`
- `tts_source.jsx:71-229` — serialized synthesis queue

### Same regression elsewhere?

The exact Adventure speaker-map defect is Adventure-specific, but the broader cache-identity/lifecycle defect affects other read-aloud surfaces:

- **Persona:** currently the healthiest path. `preparePersonaTtsText()` is shared by warm/live and focused behavior tests exist. Preserve this model.
- **Standard leveled text and FAQ:** use the same `playSequence()` look-ahead, index/voice-only buffer keys, URL revocation, and duplicated sanitizer. They share stale-buffer and cache-lifetime risks.
- **Karaoke overlay:** warm/current use the same resolver and cleaned sentence list, so the raw-text mismatch is mostly avoided. However warm state is keyed only by sentence index and does not reset on voice/speed/language changes; persistent stored clips are returned without enforcing metadata compatibility.
- **Glossary:** warms raw terms with the selected voice and uses a dedicated map, so no equivalent heading/citation mismatch is evident. It still shares the global queue and can delay foreground speech.
- **Word Sounds/other background audio:** can fill the same FIFO. There is no foreground priority lane.

The implementation should audit by request signature rather than by feature name. Canonical identity should include at least normalized spoken text, canonical resolved voice, language, speed/model/route, and a session/content generation where appropriate.

## Why karaoke caching can keep failing

Yes, the prewarm finding is related, but it is not the only cause.

### 1. Persistent and transient caches use different identity rules

`KaraokeAudioStore.keyFor()` now correctly converges several raw/sanitized Markdown forms, and its regression tests pass. The transient TTS cache still keys exact text + voice + speed + language. Any raw/clean difference causes a miss and duplicate synthesis.

Anchors:

- `karaoke_audio_store_module.js:32-59`
- `tts_source.jsx:292-375`
- `tests/karaoke_audio_store_resilience.test.js:88-165`

### 2. Cache-owned blob URLs are revoked after playback but remain cached

`playSequence()` calls `releaseBlob(audioUrl)` on completion/error. Host `releaseBlob` revokes the object URL, but the TTS URL cache can retain that same string. Replay then returns a dead URL and enters 1s + 2s + 4s playback retries.

Anchors:

- `phase_k_helpers_source.jsx:400-435, 604-607`
- `AlloFlowANTI.txt:17280-17290`
- `tts_source.jsx:335-375, 555-586`

Choose one ownership model:

- **cache Blob/ArrayBuffer data and mint a per-play object URL (RECOMMENDED)** — the only option that fully closes the revoked-URL replay hole without coupling eviction policy to revocation timing; or
- let the TTS cache own URLs until bounded LRU eviction and do not revoke them after each segment; or
- evict every cache entry referencing a URL before revoking it.

Do not retain a revoked URL in a cache.

### 3. Sequence buffers are not content- or session-aware

`audioBufferRef` keys are only `${index}-${voice}` and survive `stopPlayback()`. A new resource/scene can wait on or reuse an old promise at the same index/voice.

Anchors:

- `phase_k_helpers_source.jsx:354, 560`
- `content_engine_source.jsx:2073-2112`

Key by request signature and playback session/content ID. Clear or abort stale generation on stop/session change.

### 4. Overlay warm state is index-only

`immersive_reader_source.jsx:1075-1090, 1246-1295` tracks warm/captured state by sentence index. A voice, speed, language, or resolver change can leave indices marked warm although the desired request signature changed. Reset on signature changes or store signatures instead of indices.

### 5. Background work is not cancellable/prioritized

Adventure warms two sentences and `playSequence()` can look ahead three. The karaoke overlay also looks ahead three. These use the same FIFO and are not aborted when a learner jumps, closes, or changes resources.

Add interactive/current, next-sentence, and background priorities. Eagerly warm only the next sentence by default; schedule deeper look-ahead during idle time and cancel it when the session changes.

## Strong explanation for unexpected Puck playback

### Confirmed stale stored-voice bug

`view_simplified_source.jsx:468-478` (`view_simplified_module.js:553-567`) returns `st.get(sentenceText)` immediately. It does not compare stored AI metadata with the selected voice, speed, or language.

The very next helper, `getReadAloudAudioProvenance()`, already calculates whether that clip is stale. The main `playSequence()` path also has a voice guard in `getStoredReadAloudUrl()` (`phase_k_helpers_source.jsx:66-94`). The karaoke overlay bypasses both guards. Consequently an older Puck clip can play while Kore is selected, exactly matching the report.

Fix by extracting one shared `resolveCompatibleStoredReadAloud()` helper used by main playback, overlay playback, preparation UI, and warmup. Human recordings remain voice-independent; non-human clips must match canonical voice, speed, language, and ideally route/model version.

### Other explicit Puck fallbacks to make observable

`tts_source.jsx` intentionally selects Puck when:

- the requested Gemini voice is invalid (`:71-74`);
- a selected Kokoro voice cannot pronounce the chosen language (`:325-326`);
- Kokoro is unavailable and the route falls back to Gemini (`:536-537`);
- callers omit a voice and inherit `callTTS`/provider defaults.

The fallback may be legitimate, but it is currently easy to mistake for random switching. Also, browser speech fallback uses an operating-system voice, which may merely sound like Puck.

Add a structured result/breadcrumb containing:

- requested voice;
- canonical/resolved voice;
- provider/model/route;
- cache source (`persistent`, URL cache, in-flight join, new synthesis, browser fallback);
- reason for any fallback;
- request signature and elapsed/first-audio timing.

Canvas currently lacks equivalent route telemetry. Do not rely only on console warnings.

## Recommended implementation order

### Wave 1 — pin behavior with failing tests

1. Add the exact Dreams text fixture.
2. Add a generated-Markdown test for `)## Heading` repair.
3. Add Adventure warm/live request-signature equality tests using Markdown citations and character voices.
4. Add a replay test proving no revoked URL is returned from cache.
5. Add a cross-resource/session test proving index 0 Kore audio cannot reuse a previous resource's promise.
6. Add a karaoke overlay test: stored Puck AI clip + selected Kore must synthesize/use Kore; stored human clip may still play.
7. Add voice/speed/language-change tests that invalidate warm signatures.

Avoid source-string-only assertions. Execute functions with spies and compare actual `callTTS` arguments/results.

### Wave 2 — canonical formatting and spoken-text identity

1. Implement `normalizeMarkdownBlockBoundaries()`.
2. Implement/export one `toSpokenText()` and one canonical request-signature builder.
3. Replace sanitizer copies in Phase K, simplified view, look-ahead, karaoke store, and preparation flows.
4. Make citation display tokens karaoke-inert without removing the visible links.
5. Ensure canonical resolved voice—not an invalid alias—is used in cache keys.

### Wave 3 — cache ownership and session cancellation

1. Resolve blob URL ownership and add bounded eviction.
2. Make `audioBufferRef` keys content/session/text-aware.
3. Abort/ignore all prior-session TTS and look-ahead work on stop, close, jump, or resource change.
4. Reduce eager look-ahead to one sentence and add foreground priority.
5. Move the unconditional 150ms post-synthesis delay off the caller's critical path; reconsider the 500ms Adventure auto-read delay after exact prewarming works.

### Wave 4 — voice consistency and diagnostics

1. Enforce compatible persistent-audio metadata in every resolver.
2. Reset warm/captured signatures on voice, speed, language, provider, or model changes.
3. Record requested/resolved voice and fallback reasons in both Canvas and non-Canvas routes.
4. Consider a stable voice-direction instruction for standard multi-sentence Gemini reads if controlled tests still show timbral drift after explicit Puck fallbacks and stale clips are eliminated.
5. Enable meaningful Kokoro prewarming; Kokoro already owns an audio LRU, so the current blanket prewarm skip is based on an outdated assumption.

## Acceptance criteria

- The Dreams sample renders “Why the Brain Dreams” as a heading with no literal `##`.
- Citations stay visible/clickable but are neither spoken nor included in karaoke sweep/highlight progress.
- Warm and current requests have identical canonical signatures.
- A learner-requested sentence is not queued behind stale look-ahead from another session.
- Replaying a sentence never receives a revoked cached URL.
- Changing Puck to Kore cannot play a stored Puck AI clip; human recordings remain usable.
- Every actual fallback to Puck/browser speech is visible in diagnostics with a reason.
- Time-to-first-audio, cache hit/miss/in-flight join, and resolved voice are testable/observable.
- Existing persisted karaoke v2/v3 payloads still hydrate and self-heal without deleting human recordings.

## Verified baseline before implementation

Command run:

```powershell
npx vitest run tests/adventure_refinements.test.js tests/karaoke_tts_regressions.test.js tests/karaoke_audio_store_resilience.test.js tests/persona_tts_warmup.test.js tests/canvas_search_citation_contract.test.js tests/restore_markdown_and_orphan_main.test.js
```

Result: 6 test files passed, 78 tests passed.

This green baseline does not disprove the bugs. Adventure tests are largely structural, Markdown tests do not cover the supplied malformed heading boundary, and the karaoke tests do not assert stored-voice compatibility or revoked-cache replay.

## Build/mirror discipline

Edit source files first (`*_source.jsx` where present), then regenerate mirrors with the repository build process.

**TRAP — build mode:** running `node build.js` WITHOUT `--mode=prod` downgrades the student loaders. Use the production invocation (`node build.js --mode=prod`) for any build whose output could be committed or deployed; verify loader state afterward rather than assuming.

**TRAP — ANTI edits need a Canvas re-paste:** this plan anchors edits in `AlloFlowANTI.txt` (host prewarm/auto-read effects, `releaseBlob`). Edits to the ANTI do not take effect in the primary Gemini Canvas surface until the ANTI is re-pasted into Canvas. Any smoke test of Adventure prewarm or blob lifecycle done in Canvas against a stale paste will falsely pass/fail. Re-paste before smoking; note the re-paste as a deployment step for Aaron.

Verify source/module parity and run at least:

```powershell
npm run verify:build
npm run verify:view-props
npx vitest run tests/adventure_refinements.test.js tests/karaoke_tts_regressions.test.js tests/karaoke_audio_store_resilience.test.js tests/persona_tts_warmup.test.js tests/canvas_search_citation_contract.test.js tests/restore_markdown_and_orphan_main.test.js
```

Before deployment, run the project's broader required suite and manually test both the main leveled-text read-aloud and the full-screen Karaoke Reader with the Dreams fixture.
