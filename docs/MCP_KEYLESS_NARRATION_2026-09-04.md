# MCP keyless workflow and narration — 2026-09-04

Implemented in connector 0.5.0. The local installer is `desktop/dist/mcpb/alloflow-remediation.mcpb`; this is a development build, not a published or attested release.

## User-facing behavior

- Full client-model remediation is the default keyless route. The client handles the pipeline requests; no Gemini key is needed. This still uses the client's model account and document-processing boundary.
- One file or a non-recursive folder of up to 60 supported files can run through the bridge. Files run sequentially; pending model replies can be submitted together. Per-file failures remain visible.
- Saved run IDs support explicit resume after restart. Completed remediation outputs are reused only when source, options, engine and artifact hashes match. The unfinished document may restart. An active client is required for model requests.
- Standard/thorough effort presets reduce configuration work; explicit options take precedence.
- Optional Kokoro audio uses the app's existing text preparation and audio services. Accessible narration announces structure; natural narration favors continuous reading. Accessible is the default when standalone narration is requested. Remediation produces no audio unless requested.
- Outputs include complete WAV/MP3, HTML with native playback controls and a companion MP3, and EPUB with embedded section audio and media overlays. Existing accessible HTML can be narrated without model replies.
- Successful audio sections are hash-checked and cached. Missing sections prevent a complete result and can be retried. A coverage report accompanies completed output.
- PDF visual evidence preserves selected source page numbers. Over-budget documents fail explicitly rather than silently truncating.

## Verification

- Protocol, keyless pipeline, folder/reply batching, interruption/resume, source-change invalidation, durable Gemini-job compatibility, runtime drift, page-image transport and audio regression suites passed. One browser parity case reached its 60-second limit in the combined run and passed when rerun with its protocol initialization.
- Real Kokoro synthesis produced both styles from a synthetic heading/paragraph/list document. Accessible narration was 12.3 seconds; natural narration was 8.35 seconds. A repeat run reused all three saved sections.
- The actual `document_narrate_start` MCP endpoint generated and registered all five output types with zero model replies. Its final read-along EPUB passed EPUBCheck 5.3.0 with zero errors or warnings after correcting the missing media-overlay highlight stylesheet.
- A synthetic three-page PDF verified exact pages 2–3, and refusal of a full document above a configured two-page budget.
- Capability parity passed. The official MCPB CLI validated the manifest; extraction/boot/source-parity verification passed for v0.5.0, 38 tools, one skill, one prompt and 12 hashed vendor assets.

## Practical limits

Kokoro currently accepts English in this adapter. Initial setup downloads Chromium if needed and public Kokoro dependencies/model weights; synthesis itself is local. Audio section caches contain document content and persist until removed. HTML needs its companion MP3; EPUB packages audio internally and playback support depends on the reader. Narration runs have a bounded duration (up to 180 minutes), and PDF evidence has page/memory limits. These checks do not certify every possible document or guarantee accessibility conformance. Existing app UI choices are retained.
