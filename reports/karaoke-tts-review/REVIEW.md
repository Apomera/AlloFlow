# Karaoke and TTS reliability review

Reviewed September 7, 2026. Changes are in the workspace; no deployment or live service restart was performed.

## Findings and fixes

| Area | Failure found | Result |
| --- | --- | --- |
| Regenerate | The fresh-generation flag was lost in the save bridge, and Kokoro/Piper returned cached clips even when regeneration was requested. | The request reaches the resolver and both loaders. Cache lookup, in-flight joining, and post-generation cache checks respect regeneration. A failed or incomplete generation preserves the previous good clip. Legacy regeneration also requests fresh audio. |
| Gemini and provider caches | Cache keys omitted model identity; queued Gemini requests could observe a later model setting. | Reader and AlloBot cache keys include the selected Gemini model. Queued requests snapshot their model. The secondary provider cache also distinguishes route and endpoint. |
| Stalled responses | A response could deliver headers and then hang while its body was read, blocking the speech queue or local-server fallback. | Gemini's hard deadline now covers response-body reads. AIProvider independently settles its waiter on cancellation/timeout even if the fetch adapter ignores abort. |
| Fallback | Non-Canvas English reading could miss Kokoro after a cloud error. Quota cooldown could reject cached cloud audio and bypass multilingual fallback. | Cached audio remains playable during cooldown. Kokoro and Piper remain available after cloud failure or cooldown. |
| Auto routing | Several backends handled by AIProvider were omitted from the reader's and AlloBot's Auto-route conditions. | Ollama, LocalAI, LM Studio, the built-in backend, OpenAI, Claude, and custom backend selections follow their existing speech routes. Available in-browser voices retain priority in local mode. |
| Saving audio | The save path assumed every WAV was mono 24 kHz PCM behind a 44-byte header. Other containers could be mislabeled MP3. | Encoding reads actual WAV chunks, sample rate, and PCM bounds. Complex WAV uses a decoder/downmix or preserves the original. Ogg, WebM, MP4, FLAC, AAC, and MPEG signatures retain appropriate MIME types. The legacy capture path uses the same encoder. |
| Saved provenance | Saving could bypass the normal resolver and lose the engine/model that actually generated fallback audio. | Playback and saving share one resolver. Actual provider/engine/model provenance survives saving. New saves separately track requested provider/model, so a valid fallback is reusable and a later model change is detectable. |
| Repeated sentences and failure feedback | Regenerate could target the first occurrence of a repeated sentence, or resume playback after saving no replacement. | It targets the selected occurrence and reports unsuccessful regeneration while leaving playback stopped. |
| Edge speech | The bundled server received no content-language hint. An unrecognized Gemini voice name could select the default English voice. | The bundled endpoint receives the content language and selects an available matching voice. Explicit language aliases and native Edge voice choices retain priority. |

## Compatibility and scope

- Previously vetted offline audio remains usable under its established compatibility checks. New request-identity fields are not required retroactively. A known legacy Gemini model mismatch is still rejected.
- Human recordings retain their existing compatibility protections.
- Older audio without model metadata cannot prove which model originally generated it; regenerate it if that distinction matters.
- Root modules, desktop public copies, and affected host cache pins are synchronized. The synthesis and encoding helpers match across all three host files.
- The existing AIProvider speech routes for non-Gemini backends use in-browser or local OpenAI-compatible speech services. This review does not add a paid remote OpenAI speech endpoint.
- Restart the bundled Edge TTS server to load its Python language-selection change. Reload the application to load the updated browser modules.

## Validation

- Broad regression run: **236/236 tests passed** across 14 suites, including save-as-played, resource reloads, glossary audio, export contracts, fallback, cancellation, and reader UI.
- Final backward-compatibility follow-up: **90 behavioral assertions passed**. Its cache-pin assertion detected a concurrent reader rebuild; after refreshing that pin, the targeted rerun passed. Together the runs cover **237 distinct JavaScript tests**.
- Bundled Edge server: **5/5 Python tests passed**, including content-language selection, explicit voice precedence, and synthesis routing.
- Real Chromium: **4/4 sample-rate round trips passed** through production MP3 encoding and saved-resource reload.
- Affected JavaScript modules passed syntax checks and matched their desktop public copies. All three host integrations passed JSX syntax checks.
- Machine-readable evidence: complete-validation.json, compatibility-validation.json, and final-pins-validation.json under .codex-artifacts/karaoke-tts-review/.

The first reproduction run failed both newly added local-loader regeneration tests against the original code. Both pass with the fix.

Several older test fixtures represented PCM as three ASCII bytes; they now use complete 16-bit samples. Cache assertions were updated for the expanded identity, and the old direct-Gemini save-path assertion now verifies the shared resolver. One previously stale stop-reason expectation was aligned with the already-existing `browser-tts-unavailable` behavior; that production behavior was not changed.

### Real Chromium audio checks

The production host encoder, local LAME encoder, durable store, serialization/hydration, and Chromium decoder were exercised together with two-second, 440 Hz WAV fixtures containing a padded metadata chunk.

| Source sample rate | Decoded saved duration | Measured pitch | WAV bytes | Saved MP3 bytes |
| --- | ---: | ---: | ---: | ---: |
| 16,000 Hz | 2.088 s | 440 Hz | 64,058 | 16,704 |
| 22,050 Hz | 2.064 s | 440 Hz | 88,258 | 16,509 |
| 24,000 Hz | 2.064 s | 440 Hz | 96,058 | 16,512 |
| 44,100 Hz | 2.038 s | 440 Hz | 176,458 | 16,302 |

The small duration increase is MP3 encoder padding. Every clip reloaded successfully and retained its pitch. See `browser-audio-results.json`; rerun with `node dev-tools/check_karaoke_audio_review.cjs`.

Provider responses and Kokoro/Piper inference boundaries were mocked for deterministic cancellation, cache, failure, and routing tests. Live Gemini account access, downloaded model inference, and external Edge service availability were not exercised. Native speech-synthesis behavior also varies by browser/device.

## Principal files

- `tts_source.jsx`, `ai_backend_module.js`
- `kokoro_tts_loader.js`, `piper_tts_loader.js`
- `read_aloud_audio_service_source.jsx`, `karaoke_audio_store_module.js`
- `immersive_reader_source.jsx`
- `AlloFlowANTI.txt`, `desktop/web-app/src/AlloFlowANTI.txt`, `desktop/web-app/src/App.jsx`
- `tts-server/edge_tts_server.py`
- `tests/karaoke_tts_review_runtime.test.js`, `tests/test_edge_tts_language_review.py`
- `dev-tools/check_karaoke_audio_review.cjs`

Original snapshots and machine-readable Vitest results are under `.codex-artifacts/karaoke-tts-review/`.

