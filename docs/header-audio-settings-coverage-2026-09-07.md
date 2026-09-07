# Header audio settings: coverage and refinements

Date: 2026-09-07. Review scope: header audio controls, shared speech/player pipelines, and their main-resource consumers in the current local working tree. This pass followed the main-24 quality/typography work.

## Measured coverage

| Header setting | Persistence and execution path | Finding |
| --- | --- | --- |
| Voice selection | `allo_voice_preference`; header selection flows through the preferred-voice setter, host `__alloSelectedVoice`, and the TTS pipeline. | Shared resource speech already selects the live voice. Flashcard sequences now read the live voice before each segment, instead of retaining the voice captured when playback began. Existing prepared audio keeps its recorded voice; changing a voice does not rewrite student-delivered audio. |
| Speed | `allo_voice_speed`; `__alloPlaybackRate`; shared player and Studio read-aloud consumers. | Shared speech supports header speed. DBQ explicitly overrode it with 0.9x; that override is removed. Flashcards now use header speed, with an explicit teacher group speed taking precedence when supplied. Existing immersive/karaoke paths retain their dedicated `playbackRateRef`; that is a separate playback control. |
| Volume | `allo_voice_volume`; existing PhaseK and Studio controls receive `voiceVolume`. | Confirmed gaps in shared AlloSpeechPlayer and flashcard sequences: neither assigned media volume. Both now apply the header setting, including zero, and update active HTML audio when the preference changes. Shared browser utterances use the same volume on start. |
| Global mute | `alloflow-global-muted`; `__alloIsGlobalMuted`; `alloflow-mute-changed`; global browser-speech gate. | Shared speech already stopped on mute. Flashcard audio had no mute listener/gate; it now blocks muted starts and cancels current/pending playback on mute. |
| Browser voice fallback | `alloflow_ai_config.browserTtsFallback`; existing PhaseK reads current policy. | Shared AlloSpeechPlayer ignored the opt-out. It now rereads policy at fallback time, including a failure after media starts. Explicit Browser TTS remains usable with fallback disabled; the Off provider forbids fallback. |
| Voice input engine | `alloflow_voice_pref`; `AlloFlowVoice.setVoiceEngine`, engine-change event and canonical engine resolver. | Inspected auto, private Whisper, browser service, Gemini and Off paths. The header exposes distinct recording/privacy behavior and the canonical preference flows to dictation/session consumers. No new engine-policy defect was established; existing runtime regression suites were exercised. |

The default browser-fallback policy is on in the current app. The flashcard sequence remains an audio-URL player: it does not provide a browser-utterance fallback of its own when all synthesis attempts fail. This inherited boundary should not be confused with universal browser-fallback coverage. Header selection persistence/recovery and the offline voice-download UI are owned by the root workstream, which also performs the final combined shell build.

## Implemented audio changes

- The shared player resolves explicit valid per-request preferences first, then live header defaults. It requests natural-rate audio and applies playback speed once.
- A host effect publishes live speed/volume changes only after their state declarations. Current media updates without starting another synthesis request; browser utterance changes take effect when the next utterance starts.
- Flashcard sequences own their timers, abort signal, media and listeners. They stop on global mute/shared stop, ignore delayed results belonging to older playback, and clear Playing after completion or a rejected media start.
- DBQ's shared-player call no longer forces a fixed speed; its compatibility browser path receives the header speed and volume.

## Changed files and validation

- Authorized audio-only chunks in `AlloFlowANTI.txt`: shared player block, voice preference effect and global volume bridge. Root owns final host mirrors/build.
- `audio_helpers_source.jsx`, generated `audio_helpers_module.js` and desktop/public mirror.
- `view_dbq_source.jsx`, generated `view_dbq_module.js` and desktop/public mirror.
- `tests/header_audio_settings_coverage.test.js`: shared preference, browser-policy and flashcard lifecycle regressions.

Both isolated builders completed and their root/public outputs match. **94 tests passed across 11 files**, including all **15 new runtime cases** in `header_audio_settings_coverage.test.js`.

The compatibility files were `speech_player_browser_fallback`, `voice_preference_and_engine`, `voice_hands_free_engine_parity`, `voice_session_coordinator`, `voice_dictation_controller`, `tts_fallback_ladder_regressions`, `audio_view_followup`, `audio_download_citation_safety`, `main24_learning_quality`, and `main24_learning_refinements` (all `.test.js`). Root owns the post-build `shared_speech_player_regressions.test.js` source-parity check across all host copies.

No real microphone session, provider synthesis, listening test on physical audio hardware, deployment or commit was performed.
