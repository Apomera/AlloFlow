# Human calibration packets (2026-09-13)

Five outputs of the AlloFlow remediation connector, each bundled so that a person who had no part in producing them can review the output against its source and record a verdict. The point is to compare what the pipeline claimed (its score and its ready / review / withheld decision) with what a person concludes, which the calibration harness in `tests/fixtures/pdf_calibration/` measures once the reviews are imported. Until then the human manifest stays empty and every calibration report keeps printing `humanMetrics: null`.

All five outputs came from the keyless agent-bridge lane: the pipeline paused at each model call and Claude, in a Claude Code session, answered it; no Gemini key was configured. Two of the outputs (the 1954 scan and the Hebrew UDHR) were produced by builds that still carried defects fixed later the same day; their packet sheets say so. The sources are public documents from `mcp-testing/corpus/` (not copied into the packets; the sheet gives the corpus path and the public URL).

`packets/SUMMARY.md` lists the packets with the pipeline's own numbers. Each packet folder holds the output HTML, the pipeline's report and completion manifest, the decision-bearing pipeline log lines, an `observation.json` in the corpus format, a `review.json` form with the artifact hash already filled in, a `review-notes.md` for free text, and a `README.md` sheet that explains the document, what the pipeline claimed and what the reviewer is asked to do.

## For the reviewer

Read the packet's `README.md`, open the source and the output side by side, spend 20 to 30 minutes, write notes in `review-notes.md`, and complete `review.json`. A screen reader pass is the most valuable part; a keyboard-only pass is the next best. You do not need to run anything. The reviewer should be someone who did not take part in producing the output; say so in `review.json` with `independent: true` or `false`.

## Importing a completed review

From the repository root, for a packet whose review is complete:

```powershell
node dev-tools/pdf_calibration_ingest.cjs --observation reports/mcp-human-calibration-packets-2026-09-13/packets/<slug>/observation.json --artifact reports/mcp-human-calibration-packets-2026-09-13/packets/<slug>/<output>.html --review reports/mcp-human-calibration-packets-2026-09-13/packets/<slug>/review.json --dry-run
```

Drop `--dry-run` to write the entry into `tests/fixtures/pdf_calibration/manifest.json`, then `node dev-tools/evaluate_pdf_calibration.cjs` reports human metrics. Reviewer names are declarations, not credentials; use initials if the manifest will be committed.

## A caveat on the observation records

These five packets were produced before the connector exported its per-engine audit evidence. Their observation records therefore reconstruct per-layer summaries (score, remaining violations, review-finding counts) from the report fields and the pipeline's own log lines, and each layer says where its numbers came from (`_source`). Counts the connector did not emit at the time (axe incomplete checks, AI chunk coverage) are `null`, which the evaluator reports as partial evidence rather than as a pass. From connector build a67ae4919 on, every report carries a `verification` block with those objects and `build_packets.cjs` uses it as is, so packets built from newer runs will not carry this caveat.

## Regenerating

`node build_packets.cjs packets.json <dir with the connector logs>` rebuilds every packet from `packets.json` and the run folders; it overwrites the generated files but never `review.json` contents you have filled in, so copy a completed review aside before re-running.
