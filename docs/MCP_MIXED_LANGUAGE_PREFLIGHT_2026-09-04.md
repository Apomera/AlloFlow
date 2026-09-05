# MCP mixed-language narration and preflight — 0.7.0

The local development installer is `desktop/dist/mcpb/alloflow-remediation.mcpb`. This update has not been published or attested as a release.

## Changes

- Language-tagged blocks can switch automatically between English Kokoro and supported Piper voices. Each block inherits its nearest HTML language tag. A document-level language override remains available; narration does not translate text or detect unmarked language changes.
- Every synthesized clip is resampled through Web Audio to 24 kHz mono PCM before WAV/MP3 assembly. This prevents provider-specific sample rates from changing playback speed or breaking the combined output.
- Narration coverage reports now record each section's language, provider, voice, duration and cache reuse. Cache identity includes the selected route as well as the text, so identical words in different languages cannot share an inappropriate clip.
- `document_narration_preflight` checks one accessible HTML file or a folder of up to 60 files with only bundled local helpers. It reports ready/blocked files, language and voice routes, chunk counts, source hashes and rough spoken-audio duration. It makes no model download or synthesis request and does not certify accessibility. Processing time is not estimated.
- The offline helper bundle is generated from the app's existing narration functions and their dependencies; preflight needs neither React nor public libraries. Runtime source changes are detected before use.
- `document_narrate_start` now accepts a non-recursive folder of up to 60 accessible HTML files. It processes them sequentially and reports per-file failures. Generated read-along players are excluded from folder inputs. Existing saved-run recovery continues to apply.
- Cancellation also closes a narration preflight browser context.

## Verification

- 87 tests passed across seven final regression suites: protocol/schema/privacy/bundle checks, runtime drift, keyless workflow and recovery, real keyless pipeline, language routing, preflight and audio normalization.
- Folder workflow coverage verifies zero model replies, generated-player exclusion, successful files and visible failed files.
- Browser audio tests normalize 22.05, 24 and 44.1 kHz fixtures while preserving one-second duration and 440 Hz pitch, then assemble the complete three-second WAV.
- A real English/Spanish/French document generated all three sections using Kokoro then two Piper voices, with 8.34 seconds of combined audio at 24 kHz. Its EPUB passed EPUBCheck 5.3.0 with zero errors or warnings.
- Official MCPB manifest validation and extracted-artifact startup/source-parity verification passed: v0.7.0, 41 tools, one skill, one prompt and 12 hashed vendor assets.
- Capability parity and the updated bundled skill validation passed.

## Remaining limits

Language changes inside a single paragraph, heading, list or table are flagged before synthesis; split those passages into separately language-tagged blocks. Accessible structural announcements remain localized for en/es/fr/de/pt/it, with natural narration for the other configured Piper languages. A preflight-ready result confirms configuration and readable structure, not model availability, listening quality or accessibility conformance. Initial synthesis may still download public model/runtime dependencies.
