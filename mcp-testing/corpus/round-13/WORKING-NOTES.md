# Round 13 working notes — region classifier (in progress)

Fixtures + round-10c baselines (sweep-round10c.json):
- p105: 4 cols, 0.8583 — d0 cut x=215 goes THROUGH the top worksheet table
  (right-side fill is ungated in notATable). DEFERRED unless cheap: already
  4-col, regression risk highest.
- p121: 1 col, 0.7429 — d0 cands=0 (full-width table fills every gutter);
  blank bandCut only finds the footer. Faces: prose = serif f1 10pt (~17
  items, y≈695-750); table = sans f3 8.5 title/headers + serif 8.5 cells.
- p124: 1 col, 0.6772 — index. cands=2 crossed; notATable veto: L fill .49
  R fill .24 (fill/chars gates built for prose). baselineMatch .73, ipl 2.2.
- p125: 1 col, 0.8209 — cands=0. Banner items (43.5pt title, 25.5pt gray
  band) flood the x-histogram; blank bandCut candidates peel 1-3 items and
  fail the >=6 floor.

## Mechanisms (all classifier-gated; the 5 round-10 rejected policies stand)
1. BANNER PEEL (p125): bandCut's 6-item side floor relaxes when the small
   side is a banner — <=4 items AND (size >= ~1.6x region body size OR item
   width >= 0.6 span). Title peels, columns region recurses.
2. FACE BAND CUT (p121): when blank bandCut fails, cut at a y-boundary where
   line composition flips between body-prose (dominant face+size) and
   other-face (table) with high purity both sides, both sides substantial.
3. PROSE LINE-FLOOR RELAXATION (p121 top): notATable lines>=8 floor drops to
   >=3 ONLY when both sides are high-purity body-face prose (fill/chars/ipl
   still gated).
4. LIST-REGION GATE (p124): notATable passes when BOTH sides are list-like:
   regular y-pitch, ipl<=3, concentrated left stops (>=70% of lines start at
   <=3 x-stops), lines>=12. Must NOT fire on forms/figures (usgs p14,
   irs-f1040 p2, nsf p13 were the round-9 losers).

Shared helper `_regionProfile(arr)`: body face by char mass, per-line
face/purity, pitch regularity, left-stop concentration.

Tooling: mcp-testing/tools/trace_page.cjs (NEW, permanent) — single-page
trace + face table. Traces in scratchpad/round13/. Sweep:
node mcp-testing/tools/order_sweep.cjs doc_pipeline_module.js <out> ;
diff vs mcp-testing/corpus/round-10/sweep-round10c.json with
order_sweep_diff.cjs (eps 0.005). Rebuild module: node build.js --compile
(syncs desktop copy). Suites: ocr_column_reorder, reading_order_multicolumn.
