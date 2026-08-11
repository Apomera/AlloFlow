# Corpus refinement — Round 10 (2026-08-09/10)

**Focus:** the splitter's four catalogued failure shapes from the i1040 rebuild
(SESSION-LOG "What remains" item 3). **Cost: $0 in API fees.** Measured with
`tools/order_sweep.cjs` over the full corpus (1,068 referee'd pages);
`sweep-baseline.json` and `sweep-round10c.json` here are the before/after,
diffable with `tools/order_sweep_diff.cjs`.

## Shipped: two structural additions to `_alloOrderTextItems`

Applied identically to `doc_pipeline_source.jsx`, `doc_pipeline_module.js`,
and `desktop/web-app/public/doc_pipeline_module.js`, round 9's precedent.

1. **Sub-region horizontal preference.** In a region at depth >= 1 whose every
   channel is crossed, a band-cut organization is preferred over cutting
   through the crossers, kept only when a band actually finds columns. This is
   the crossers-stranded-mid-region fix: **i1040 p108 goes 0.8753 -> 0.9479**,
   the mid-page Qualified Overtime worksheet stops slicing columns 2-3.
2. **Interior crosser partition.** When the band cut cannot help, contiguous
   runs of y-levels containing candidate-crossing items become bands kept
   whole, clear runs between them are recursed for columns — gated to THICK
   runs (4+ levels after smoothing single-level gaps). Fixes the
   band-emitted-in-the-wrong-place shape: **p116's 8978 worksheet** now reads
   after its three columns instead of between columns 2 and 3.

Also permanent now: `opts.trace` on `_alloOrderTextItems` records every split
decision (candidates, vetoes, band cuts, partition rejections) — rounds 7-9
each re-derived this instrumentation and threw it away.

**Final corpus verdict: 17 of 1,068 pages changed. 1 better beyond eps
(p108 +0.0726), 2 worse (nces p15 -0.0161, i1040 p47 -0.0082, both
worksheet-grid pages where the content-stream referee is least reliable),
14 column-count-only.** The regression suites `ocr_column_reorder` and
`reading_order_multicolumn` stay green (19/19).

## Measured and REJECTED on the way — recorded so nobody re-derives them

| Policy | Why it looked right | What the corpus said |
| --- | --- | --- |
| Partition with THIN crosser runs allowed | won p124 Index +0.058 | scattered one-line run-in headings became band boundaries: p106 3->18 cols, p123 3->25 cols (-0.195), 22 pages worse |
| Crosser-volume veto on vertical cuts (>3 scattered crossing levels) | should stop cuts through blocks | rerouted well-read 2-col pages: nsf p2 1.000->0.960, sp800/usgs/nces -0.01..-0.03 |
| Consecutive-streak block test (4+ adjacent crossing levels) | tighter block definition | never fires: a worksheet's crossing lines interleave with cell rows, best streak 1-2 |
| Grid-texture gate on the horizontal preference (items/line >= 4) | separate worksheets from figure pages | pdf.js merges cell runs; worksheet bands read 1.4-2.7 items/line, indistinguishable from prose |
| Horizontal preference at depth 0 | same fix, wider | whole pages with all-crossed channels are usually 2-col articles whose text FLOWS AROUND a figure; banding interleaves each column's halves (15 pages worse) |

The load-bearing discovery: **depth is the honest discriminator.** A whole
page with only crossed channels is usually flow-around (banding wrong); a
sub-region already carved off by a band cut is a layout reset (banding right).

## Still open, deliberately — the "too little prose" shape

p121 and p125 (and p124's Index, whose thin-run win was given back): pages
whose columns hold too few lines for any current gate to pass (p121: nine text
lines over a full-width table, reported 1 column; the table packs against the
prose so no blank band exists, and 3-line columns cannot satisfy
`notATable`'s 8-line floor). Loosening constants here was measured in round 9
and lost more than it won ("that search wants a real region classifier, not
another constant" — still true, now with two more failed constants recorded
above). The per-REGION display-face measurement (p105, whose full-page table
is set in the display face) is the same classifier work. Fixture pages for
that round: 105, 121, 124, 125.
