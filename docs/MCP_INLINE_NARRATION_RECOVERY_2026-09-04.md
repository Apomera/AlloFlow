# MCP inline narration and reliable retries — 0.8.0

This is a local development build. It has not been published or attested as a release.

## Changes

- Both accessible narration and natural reading remain available. Voice routing now follows inline language tags as well as block tags, including nested phrases in headings, list items, table cells, captions and disclosure summaries. Source markup and text are preserved; EPUB highlighting stays on the containing block as its phrases change voices.
- Language runs come from the app's shared speech helpers. Existing app string exports keep their behavior. Accessible structure cues use the relevant element's language. Natural MCP narration preserves image descriptions without injecting an English image label into non-English text. Punctuation does not produce an extra synthesis request.
- Completed narration packages are reused across repeats and restarts when source, settings, runtime and output directory match. All artifacts, including the narration report, must pass size and SHA-256 checks. A valid completed package needs no browser startup or model download. Missing or changed artifacts rebuild the package using valid section caches. File hashing streams from disk to limit memory use for long audio.
- Folder results expose `outcome`, `failedFiles` and a concrete `retry` tool call. Logs report completed and failed file counts, avoiding the prior misleading claim that every output completed. Resumption still processes files sequentially and retains successful outputs.
- Coverage reports include each section's start time and document target alongside language, provider, voice, duration and cache reuse. Localized HTML player labels now also name the player's region. Short nonempty documents no longer show a zero-minute duration estimate.
- Bundled client guidance and privacy documentation describe inline tags, retry behavior and persisted completion metadata. Tool discovery reports inline language switching and completed-output reuse.

## Verification

- 97 tests passed across nine suites: keyless workflow and recovery, language routing, preflight, sample-rate normalization, WAV assembly, shared app audio, real keyless pipeline, runtime drift and MCP protocol/package checks. The initial run hit three outer test deadlines at five seconds; the smoke harness now allows 30 seconds around its existing 20-second IPC deadline. All 73 smoke tests passed on rerun with unchanged assertions; the other 24 tests passed in the initial run.
- A real English/Spanish/French inline document produced all four sections, totaling 6.985 seconds at 24 kHz mono. The first three phrases share one heading target while switching languages and providers. Both a repeat call and a fresh Node process reused all final artifacts with browser startup and new output creation explicitly forbidden by the verification harness.
- The real read-along EPUB passed EPUBCheck 5.3.0 under EPUB 3.3 rules with zero errors or warnings.
- The MCP protocol preflight reported the same four sections and English Kokoro / Spanish Piper / French Piper routes, with no blocked files.
- Official MCPB manifest validation, packaging, extraction, startup and source-integrity checks passed: v0.8.0, 41 tools, one skill, one prompt, 12 hashed vendor files, 27,437,912 bytes.
- Capability parity, bundled skill validation, syntax checks and scoped whitespace checks passed.

Local installer: `desktop/dist/mcpb/alloflow-remediation.mcpb`. Live sample artifacts are under `scratch/mcp-inline-live`.

## Limits

Narration uses language metadata; it does not detect unmarked language switches or translate the document. Accessible structural cues cover en/es/fr/de/pt/it; other configured Piper languages use natural reading. Initial synthesis can still download public dependencies. Preflight checks configuration and readable structure, not model availability, listening quality or accessibility conformance. A terminal batch status of `completed` means processing finished; clients must inspect `outcome` and file results.
