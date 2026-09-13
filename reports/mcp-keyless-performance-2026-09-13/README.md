# Where the keyless (agent-bridge) lane spends its time (2026-09-13)

Prompted by a collaborator's report that MCP remediation without a Gemini key "runs slowly". This note reconstructs the wall clock of today's four agent-bridge runs from the verbose connector logs (`timeline.cjs` parses the pipeline's own `+NNN.Ns` stamps) and ranks the causes by cost. Evidence for the runs is in [the gap-lane report](../mcp-gap-lane-pilots-2026-09-13/README.md).

## How the keyless lane spends a minute

On the keyless lane the connector pauses at every internal model call and publishes it; the MCP client's own model (Claude Desktop, Claude Code, Codex, Gemini CLI) reads the prompt, composes the reply and posts it back. Wall clock is therefore:

- pipeline compute in Chromium (page rendering, Tesseract OCR, axe and Equal Access, HTML assembly), plus
- the number of published calls, times the client's per-call time (reading a 15 to 20 KB prompt or a set of page images, then generating the reply; fix replies are complete rewritten HTML fragments, so they take minutes), plus
- on Claude Desktop, the time the client spends on polls that return nothing.

A 2-page born-digital form needed 23 client calls; a 4-page scan needed 30; the 54-page tables document would have needed 14 vision calls before the first audit finished. The client side dominates everything except scanned documents, where Tesseract dominates step 1.

## Measured timelines

| Run | Document | Wall clock | Step 1 (read) | Audit and fix calls | Notes |
| --- | --- | ---: | ---: | ---: | --- |
| `arun-bcdd26fc` | irs-f1040.pdf, 2 pages, born-digital form | 346 s | 123 s | 223 s | 23 calls; 20 s of step 1 was the palette prompt (see 3); passes 2 and the final audit were answered by a script in under a second, a human-paced client would have added 5 to 10 minutes |
| `arun-96487fa0` | 1954 scan, 4 pages | 1219 s | ~557 s | ~660 s | 30 calls; step 1 = Tesseract on 4 pages plus the client's transcription of 4 pages |
| `arun-0084bf67` | same scan, replay with instant answers | 593 s | 147 s | 446 s | step 1 with the client answering instantly is the pipeline's own cost: Tesseract 4 pages, with 60 s `worker.recognize` timeouts on pages 2 and 4 |
| `arun-fe680c0b` | Hebrew UDHR, 4 pages | 1608 s | 1313 s | 295 s | step 1 lost 4 × 120 s waiting for a Tesseract language that is not bundled (fixed, b77f0376b) |
| `arun-eea9603c` | OSEP letter, 2 pages, tagged (after the fixes below) | 333 s | 24 s | 309 s | 16 calls; the baseline already met the target and both fix passes were rejected by the text-shrink gate (see 5), so the loop spent 6 calls for nothing |
| `arun-daa7061e` | FDA PREA response, 7 pages, untagged (after the fixes below) | 422 s | 155 s | 267 s | 28 calls; step 1 is three auditor calls and an image inventory, each carrying all 7 page images, answered at human pace |

Form 1040 in detail (the only run with full per-call stamps): extraction vision call 25 s; palette prompt 20 s of nothing; structured-blocks vision call 77 s; baseline audit, three sections in parallel, 115 s; fix pass 1, three fragments, 47 s; re-audit 53 s. Pipeline compute between calls never exceeded 4 s.

## Causes, ranked by cost

1. **The auto-fix loop discarded every pass that had an unchanged chunk** (since 2026-08-16, fixed today in ede873969). Each pass costs three fragment rewrites plus three re-audits, and the loop runs two passes plus up to three auto-continue rounds until it sees no progress. Before the fix a document whose last fragment needed no change burned all of that, shipped the pre-pass HTML, and looked like "slow and it did nothing". On Claude Desktop, at one to three minutes per call, that is 20 to 40 minutes per document. Any bundle built before 13 September 13:10 (SHA-256 `7bd8ba60…`) has this defect. This is the first thing to rule out for the collaborator's run.
2. **An unbundled Tesseract language cost 120 s per page** (fixed, b77f0376b). Only English ships; a non-Latin scan waited out the worker timeout on every page before recognising with the English model.
3. **The "boring palette" prompt waited 20 s for a click that cannot happen** (fixed today, see `tests/mcp_headless_no_palette_wait.test.js`). Most government PDFs are grayscale, so nearly every headless run paid it. The two runs made after the change both had a coloured palette, so the skip is verified by the test and the driver stamp, not yet by a grayscale live run.
4. **The baseline PDF audit runs three auditors on the bridge.** The pipeline asks for a triangulated panel (`HEADLESS_AUDITOR_COUNT` caps it, the pipeline uses three) and publishes three vision calls, each carrying every page image and each wanting a complete audit. On the bridge all three go to the same client model with the same prompt, so they are not independent, and they triple the most expensive call of the run (three audits of 4 to 5 page images each, 9 to 15 MB pushed into a Desktop conversation). Not changed: the driver's checkpoint validator requires at least three requested auditors and the report prints the panel. A one-auditor bridge profile is a design decision, not a bug fix.
5. **Fix replies are complete fragments.** `GEMINI_CHUNK_CHARS` is 16,000, so each fix call asks the client to retype up to 16 KB of HTML even when the fragment needs nothing (pass 2 of the form run: "no changes produced"). There is no short "unchanged" reply. A sentinel handled in `remediation_agent_respond` (substitute the fragment from the request) would save one long generation per untouched fragment per pass. A related waste seen in the OSEP run, and at first misread: both fix passes were rejected by the text-shrink gate. The cause was the answering client, not the gate. The pipeline renders an image description as the alt attribute, as a visible figcaption and inside a toolbar script; the client shortened all three, and the figcaption is visible text, so the gate correctly refused a 3% text loss and the header-landmark edit in the same chunk went with it. Shortening only the alt attribute passes the gate (attributes are not counted as text). Two passes and six calls still produced nothing, which is the cost of a single rejected edit in a bundled fix.
6. **Tesseract runs the non-SIMD core, one page at a time, at 2× scale.** `desktop/mcp/vendor/tesseract-core.wasm.js` is the plain build; Tesseract.js picks the SIMD LSTM build by itself in a SIMD-capable browser, which Chromium is. The scan replay shows 147 s for 4 pages with two 60 s recognise timeouts. Bundling `tesseract-core-simd-lstm` (smaller, roughly twice as fast in Tesseract.js's own numbers) needs a measurement and a vendor-manifest update. Vision OCR by the client covers the same pages regardless, so for the bridge lane a lower OCR render scale is also defensible.
7. **Every vision call carries the run's full page set** at 1,600 px JPEG. For a 54-page document the audit slices the PDF into 14 vision calls and each one gets the same page images (gap-lane finding 6), so a `page_range` run still costs 14 calls. `ALLOFLOW_MCP_PAGE_WIDTH=1200` halves the bytes with no change in what the model can read; the slicing fix belongs in `__mcpGeminiVision`.
8. **Polling is capped at 30 s.** During a 150 s OCR phase a Desktop client makes five tool calls that return nothing, and each is a full model turn over a conversation that already holds every earlier prompt and image. `include_images:false` on status polls and one document per conversation keep those turns cheap; a higher `wait_seconds` ceiling depends on the host's tool timeout.
9. **First run on a machine** downloads Chromium (about 200 MB) through `remediation_setup`, and veraPDF and EPUBCheck need a local Java. Neither recurs.

## Status of the clear enhancements (later the same day)

Aaron asked for the improvements that carry no trade-off. Outcome, in the order they were listed:

1. **"Nothing to change" reply.** Done (a67ae4919). Both fix prompts now say that the model may answer with the single word UNCHANGED when a fragment needs no edit; the pipeline keeps the fragment verbatim, counts it as an unchanged chunk and never records a rejection. `tests/aifix_unchanged_reply.test.js` drives the real fix loop with a scripted model.
2. **Shorter image descriptions rejected by the text gate.** Not a defect after all, see cause 5 above: the gate refused a visible caption change that the answering client had bundled with the alt edit. No code change; the packet sheet for the OSEP letter says the same.
3. **Each audit slice gets its own pages.** Done by another session on this machine (landed in 3f3ae1896: the driver selects the pre-rendered pages a slice prompt names, and the sliced audit stays inside `page_range`, with `tests/mcp_driver_vision_slices.test.js`). That session re-ran the 54-page NCES tables document for pages 19 to 23: two slice calls instead of fourteen, each with its own pages, 74 → 76 review.
4. **Audit details in the report.** Done (a67ae4919). Every run result and report now carries `verification` (AI, axe and Equal Access: scores, counts, capped finding lists) and `verificationChecks` (the per-engine pass / failed / review-required status the app derives from the same objects). The calibration packet builder uses the block when it is present.
5. **Faster OCR engine build.** Done (a67ae4919). The vendored core is the SIMD LSTM build of the same tesseract.js-core 5.1.0. Measured on the 1954 scan with recorded answers replayed: the reading step fell from 147 s to 90 s and the two 60 s recognise timeouts did not recur; the installer is 1.4 MB smaller. The same run also exercised the palette fix live: "headless host, keeping original styling" at +90.6 s with the next call starting the same second.

## What to ask a collaborator who saw a slow run

- The connector version and bundle hash (`remediation_capabilities` reports `connectorVersion`; `SHA256SUMS.txt` sits beside the `.mcpb`). Anything before 0.11.0 built 13 September 13:10 has causes 1 to 3.
- The document: page count, scanned or born-digital, language.
- Whether the run finished, and the completion JSON or `remediation_job_diagnostics` output: `stats`, `modelCallsAnswered`, `coalescedReasks`, and the `[Auto-fix]` lines say where the time went.
- Which host: Claude Desktop turns are slower than Claude Code turns because each turn re-reads the whole conversation.

## Installer

`desktop/dist/mcpb/alloflow-remediation.mcpb` was rebuilt twice more. After the palette-prompt fix: v0.11.0, 71,150,584 bytes, SHA-256 `86831fe731fe60e7aa4fc4c3f31e8bb1cb860b00193c1afaf81e941070d09cfd`. After the three enhancements above (a67ae4919), the third-party notice correction (9120638be), the other session's sliced-audit fix (3f3ae1896) and the keyless-lane guidance in the bundled skill (f30ee4fa9): v0.11.0, 70,573,214 bytes, SHA-256 `1c89336639c4dad2ba195e10ded921d8eb35257eac054ac5f5d3b7a1cd9814ef` (build verification passed: 41 tools, 59 hashed vendor files, HTTP transport probed). That is the build to hand out; it supersedes every earlier build of 13 September (`7bd8ba60…`, `86831fe7…`, `5ac99487…`, `d6d63f22…`). `verify:mcpb-ci` (41 tests), `verify:mcp-parity` (73) and `verify:mcp-calibration` (219) all pass on this tree. Nothing was published or sent anywhere.

## Files

- `timeline.cjs`: rebuilds a per-run timeline from a verbose connector log directory (`node timeline.cjs <dir>`).
- `timelines.txt`: the output for today's logs.
