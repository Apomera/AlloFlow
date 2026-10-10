# Research YouTube Connection

Local implementation, 2026-10-09. No commit, push, deployment, or live-provider call.

## Scope

- User-added YouTube video links use Gemini video input from the research URL action and configured-URL preparation. Discovered video sources offer an explicit Read video action; search alone does not transcribe videos.
- Standard watch, short, shorts, embed, and live links normalize to one video identity. Tracking/start-time parameters are removed; reading a selected time range is not implemented.
- Reused guarded Gemini transport sends `fileData.fileUri`, not a URL embedded in a text-only prompt. Existing key resolution, model selection, role guards, managed-media policy, retries and cancellation remain in force. There is no silent provider switch, text-only local fallback, or HTML fallback after a video failure.
- Video requests contain the video URL and a fixed transcription task, not the research topic, private notes, student context, or selected documents. The topic is used locally to select excerpts from the returned transcript.
- AI-generated transcript evidence is labeled in the teacher review, student source reader, portable source metadata, and exports. It is not represented as verified captions or an independently checked factual source.
- Old short/watch alias entries normalize without duplicate IDs, loss of exclusions, or restoration of removed sources. Configured aliases are deduplicated before requesting the video.
- The final needs-readable-text message checks the resulting source collection, avoiding a stale warning after an earlier link-only result becomes a readable video or webpage source.

Ordinary webpage reading and basic search behavior are unchanged. This pass does not remove the older basic-research YouTube discovery filter or add general source restoration/replacement controls.

## Bounds And Compatibility

Existing evidence limits remain: 1,200 characters per excerpt, four entries per source, and 24 entries per review. Video extraction selects up to three excerpts from at most 200,000 transcript characters. A 120-second outer deadline aborts the transport. Failed, cancelled, malformed, provider-blocked, and non-STOP/truncated API responses do not become transcript evidence. These checks do not independently verify transcription accuracy or completeness.

Public video accessibility is determined by Gemini, not URL syntax. Unavailable videos and unsupported providers offer manual transcript recovery. The current managed policy version approves text inference only, so video input remains blocked under that policy; this pass does not relax it. Older loaded Gemini modules without video capability fail explicitly instead of sending a text-only prompt.

Eight English catalog labels were added; other language packs are unchanged and use the existing fallback behavior.

## Verification

- Final focused verification: 287/287 passed across engine, Gemini video transport, review/settings UI, student projection/reader/export. The final sources were checked in two serialized, smaller-heap runs: 128 tests in `final-recovery-tests.json` and 159 tests in `final-remaining-tests.json`. The earlier complete run passed 285 tests before two feedback regressions were added.
- Adjacent run: 132/134 passed. Two failures in `gemini_media_request_shapes.test.js` are existing fixture mismatches: fixtures expect `?key=fixture-key` and omit the key header, while the directly tested AIProvider methods already use keyless URLs and `x-goog-api-key`. Those methods and fixtures were not changed by this pass. This was independently checked against HEAD; the failures do not exercise the new Gemini factory video path. See `adjacent-tests.json`.
- Final canonical browser run: 8/8 passed, with no browser errors or external requests. Visual inspection caught the configured-prepare feedback issue; two additional UI regression cases and a stronger browser assertion were then added. The final browser run and inspected screenshot confirmed the corrected feedback. Closing documentation was recovered in the following transcript-review pass after the disk-space failure.
- Inspected 320px, 390px, and desktop screenshots for transcript success, discovered-video upgrade, unavailable-video recovery, and configured-URL preparation. Feedback and Generate remain visible without overlap or horizontal overflow.
- Independent audits found and resolved a strict video-ID newline edge and a legacy alias-ID collision. No remaining blocking privacy, cancellation, or provenance issue was found.
- Six module families were built and their existing runtime/source mirrors synchronized. Root CDN pins were updated narrowly; desktop local module paths and unrelated host edits were preserved. See `artifacts.json` and `sync.cjs --check`.

Verification uses canonical application modules with synthetic provider responses, not live Gemini calls or production student data. No full application build or physical assistive-technology session is claimed.

Windows process pressure interrupted early inspection/agent execution and one preliminary UI test result was unavailable; it is not counted. The full final test rerun exhausted process memory after 231 passing tests; `focused-tests.json` and `focused-memory-failure.json` preserve that unsuccessful run. All 287 focused tests subsequently passed in the two smaller-heap runs above. A temporary Windows file-open error during synchronization succeeded on retry. Confirmed sandbox cache rename failures required approved unsandboxed local test execution. No assertions were weakened.

## Reproduction

From the repository root:

```text
node reports/research-youtube-2026-10-09/sync.cjs --check
node reports/research-youtube-2026-10-09/run-browser.cjs
```

The browser runner starts a temporary loopback fixture and stops it on completion. `start-preview.cjs` starts a separate hidden synthetic preview and writes its current URL to `preview.json`.

Official provider contract: https://ai.google.dev/gemini-api/docs/generate-content/video-understanding
