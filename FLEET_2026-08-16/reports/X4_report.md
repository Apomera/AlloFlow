# X4 report — enforceable translation staleness (wave 3)

**Status: COMPLETE** · 2026-08-17 · run inline by the coordinator

## 1. Namespace staleness gate — mostly already existed; extended and pinned

Finding first, honestly: W1's wave had already implemented what this task asked for —
`check_lang_staleness.cjs --gate-guarded` (hard-fails on stale keys in guarded namespaces)
plus `--ratchet` (watermark stops backlog growth), and `verify:gate` already runs
`--quiet --gate-guarded --ratchet`. What was missing from the prompt's suggested list:

- **Added `guided` and `hints` to GUARDED** (both verified stale-free at addition; `guided.*`
  is the highest-visibility namespace for non-English users). Final list: sidebar, tools,
  glossary, visuals, universal, launch_pad, storage, alignment_graph, guided, hints.
  `tools.*` was already there; the prompt's proposed list is fully covered.
- **Pinned** the list + the verify:gate wiring in `tests/cmd_value_staleness_gate.test.js`
  so delisting a namespace fails a test.
- Baseline coordination with X3: guarded namespaces are stale-free, so X3's blessing work
  only shrinks the ratchet watermark (it auto-lowers).

**Live catch while wiring:** the ratchet is RED at HEAD — 23054 vs watermark 22930 (+124),
caused by `help_mode.*` (344 changed English keys) and `stem.*` (150) from the STEM Lab
Create work / concurrent sessions. Filed in CROSS_LANE_REQUESTS to the owners; I did not
raise the watermark (that is the exact anti-pattern the file's own note forbids).

## 2. cmd value-staleness check — built new

`dev-tools/i18n/check_cmd_value_staleness.cjs`:

- Compares every `cmd.*`/`palette.*` value in all 63 packs to `cmd_keys_en.json`.
  Identical-to-English outside the reviewed allowlist = reported. `palette.ctx.*`
  passthrough allowed in code (W1's documented convention); brand/surface names in
  `cmd_value_identical_allowlist.json` (seeded: AlloFlow, AlloBot, AlloHaven, AlloSheet,
  Lumen, STEAM Lab, Gemini Canvas, OK — reviewed against how packs treat
  `cmd.open_stem_lab`).
- **Report-only by default** (per the prompt); `--gate` is baseline-per-pack growth-only
  (backlog grandfathered, growth fails), baseline written. NOT wired into verify:gate yet —
  deliberately, per the prompt's "start report-only"; wiring is one token in package.json
  when Aaron wants it.
- Limits documented in the header (value-identity is a proxy; code-switching packs
  over-report; one-letter lazy translations pass).
- Test seams (`--lang-dir/--baseline/--out-dir`) so negative controls never touch the real
  ledger.

**The worklist, sized honestly: 13,066 identical values across 63 packs (~207/pack —
matching W1's 213-of-567 Spanish measurement).** Full per-pack key lists in
`dev-tools/i18n/cmd_value_staleness/_summary.json` → handed to X3.

## Negative controls (the repo's planted-defect convention)

`tests/cmd_value_staleness_gate.test.js` — **5/5**: a fully-translated synthetic pack passes
the gate at zero; ONE planted English-identical value beyond baseline exits 1 with the GREW
message; passthrough convention pinned; GUARDED list + verify:gate wiring pinned.
