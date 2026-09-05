# Multilingual MCP narration — connector 0.6.0

The MCP now reuses the app's pinned browser Piper loader alongside Kokoro. This supersedes the English-only narration limitation in the 0.5.0 implementation note. The local development installer is `desktop/dist/mcpb/alloflow-remediation.mcpb`; it has not been published or attested as a release.

## Behavior

- Automatic provider selection uses Kokoro for English and Piper for other configured languages. An explicit provider override also permits Piper for English.
- Language comes from the source HTML `lang` attribute, with `narration_language` as a BCP-47 override. Missing metadata assumes English and produces a report warning. Narration does not translate text.
- `document_narration_voices` discovers 29 configured Piper language defaults, available styles and voice model-card links without downloading models. Defaults follow the app catalog, including its chosen locale; for example French defaults to fr_FR even for a fr-CA document.
- Accessible structural announcements and playback labels are localized for English, Spanish, French, German, Portuguese and Italian. Other configured languages offer natural narration. The bundled skill chooses the appropriate style when the user has not specified one; explicit style requests are preserved.
- Mixed-language documents fail before synthesis with an actionable explanation. Separate language sections are required for now; voices are not silently forced across languages.
- Read-along timing now targets individual blocks inside common document containers. Duplicate IDs are repaired, and readable bare text is retained. Large blocks are split into bounded synthesis chunks.
- `remediation_agent_runs` discovers recent saved remediation/narration runs, including interrupted work, so users do not need to retain run IDs. This is read-only and does not resume arbitrary tasks automatically.
- Dependency failures identify the failing origin. Piper's ONNX Runtime download is permitted only from its public cdnjs runtime path. Documents remain local during TTS synthesis.

## Verification

- Final regression run: 98 tests passed across seven suites, including MCP registry/schema/privacy checks, bundle staging, runtime drift, the real keyless pipeline, language selection, narration planning, workflow recovery and alternative exports.
- Additional Piper voice-ID, existing audio and routing checks passed (20 tests in the earlier focused run; overlapping tests are not additive).
- Real Spanish accessible narration: two sections, 6.03 seconds, Piper es_MX-ald-medium. Real French natural narration: two sections, 3.38 seconds, Piper fr_FR-siwis-medium. These are synthetic smoke samples, not listening certification of every voice in the catalog.
- Both generated multilingual EPUBs passed EPUBCheck 5.3.0 with zero errors or warnings.
- A final real MCP call verified automatic Spanish Piper selection, localized player labels, all narration sections, zero model replies and discovery of the completed saved run.
- The official MCPB CLI validated the installer; extracted-artifact boot and source-parity verification passed for v0.6.0 with 40 tools, one skill, one prompt and 12 hashed vendor assets.

## Next useful improvements

1. Route mixed-language sections to matching voices and normalize differing audio sample rates before assembly.
2. Extend localized structural narration beyond the initial six languages, with native-speaker review and listening checks.
3. Add an early document preflight for language coverage, expected downloads and estimated work, plus a keyless folder triage summary before expensive remediation.

Piper supports a broader upstream catalog than the pinned browser loader exposes. New voices should be added only when the runtime can resolve them. See the [official Piper voice documentation](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/VOICES.md) and [browser runtime](https://github.com/Mintplex-Labs/piper-tts-web). Individual model cards carry voice-specific information and licensing; discovery links to them instead of treating every model as interchangeable.
