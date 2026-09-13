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
5. **Fix replies are complete fragments.** `GEMINI_CHUNK_CHARS` is 16,000, so each fix call asks the client to retype up to 16 KB of HTML even when the fragment needs nothing (pass 2 of the form run: "no changes produced"). There is no short "unchanged" reply. A sentinel handled in `remediation_agent_respond` (substitute the fragment from the request) would save one long generation per untouched fragment per pass. A related waste seen in the OSEP run: the loop's text-shrink gate rejects a whole chunk when its alt text gets shorter, so an Equal Access "alt longer than 150 characters" finding cannot be fixed by the loop at all, and a header-landmark edit in the same chunk was thrown away with it; two passes and six calls produced nothing.
6. **Tesseract runs the non-SIMD core, one page at a time, at 2× scale.** `desktop/mcp/vendor/tesseract-core.wasm.js` is the plain build; Tesseract.js picks the SIMD LSTM build by itself in a SIMD-capable browser, which Chromium is. The scan replay shows 147 s for 4 pages with two 60 s recognise timeouts. Bundling `tesseract-core-simd-lstm` (smaller, roughly twice as fast in Tesseract.js's own numbers) needs a measurement and a vendor-manifest update. Vision OCR by the client covers the same pages regardless, so for the bridge lane a lower OCR render scale is also defensible.
7. **Every vision call carries the run's full page set** at 1,600 px JPEG. For a 54-page document the audit slices the PDF into 14 vision calls and each one gets the same page images (gap-lane finding 6), so a `page_range` run still costs 14 calls. `ALLOFLOW_MCP_PAGE_WIDTH=1200` halves the bytes with no change in what the model can read; the slicing fix belongs in `__mcpGeminiVision`.
8. **Polling is capped at 30 s.** During a 150 s OCR phase a Desktop client makes five tool calls that return nothing, and each is a full model turn over a conversation that already holds every earlier prompt and image. `include_images:false` on status polls and one document per conversation keep those turns cheap; a higher `wait_seconds` ceiling depends on the host's tool timeout.
9. **First run on a machine** downloads Chromium (about 200 MB) through `remediation_setup`, and veraPDF and EPUBCheck need a local Java. Neither recurs.

## What to ask a collaborator who saw a slow run

- The connector version and bundle hash (`remediation_capabilities` reports `connectorVersion`; `SHA256SUMS.txt` sits beside the `.mcpb`). Anything before 0.11.0 built 13 September 13:10 has causes 1 to 3.
- The document: page count, scanned or born-digital, language.
- Whether the run finished, and the completion JSON or `remediation_job_diagnostics` output: `stats`, `modelCallsAnswered`, `coalescedReasks`, and the `[Auto-fix]` lines say where the time went.
- Which host: Claude Desktop turns are slower than Claude Code turns because each turn re-reads the whole conversation.

## Installer

`desktop/dist/mcpb/alloflow-remediation.mcpb` was rebuilt after the palette-prompt fix: v0.11.0, 71,150,584 bytes, SHA-256 `86831fe731fe60e7aa4fc4c3f31e8bb1cb860b00193c1afaf81e941070d09cfd` (build verification passed: 41 tools, 59 hashed vendor files, HTTP transport probed). It supersedes the 13:10 build (`7bd8ba60…`) recorded in the gap-lane report. `verify:mcpb-ci` (41 tests), `verify:mcp-parity` (73) and `verify:mcp-calibration` all pass on this tree. Nothing was published or sent anywhere.

## Files

- `timeline.cjs`: rebuilds a per-run timeline from a verbose connector log directory (`node timeline.cjs <dir>`).
- `timelines.txt`: the output for today's logs.
