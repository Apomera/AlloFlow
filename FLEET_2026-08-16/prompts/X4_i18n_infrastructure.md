You are **Lane X4** of wave 3 in `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`, branch
`main`. Read `FLEET_2026-08-16/RULES.md`, `WAVE3_PLAN.md`, and W1's "the thing most worth your
attention" section (`reports/W1_report.md`) — this lane implements exactly what it recommends.
Lane ID **X4**. You own `dev-tools/i18n/**` and the `verify:gate` line in `package.json` for
these checks only; `ui_strings.js`/packs read-only (X3 is writing them — coordinate via
`CROSS_LANE_REQUESTS.md`, never edit).

## Mission: make translation staleness enforceable instead of advisory

Two proven failure classes, both currently invisible to the gate:

**1. Stale high-visibility values.** `check_lang_staleness.cjs` already detects renamed
English behind stale translations (it named every one of W1's finds) but runs warn-only, so
23k+ stale entries accumulated and every non-English user saw "Glossary & Language Selection"
for weeks. Implement W1's middle option: a **namespace denylist gate** — `--gate` scoped to
high-visibility namespaces (`sidebar.*`, `tools.*`, `glossary.*`, `visuals.*`, `universal.*`,
`guided.*`, `hints.*`; review and justify the final list) that exits 1 on staleness THERE
while the long tail stays advisory. Wire it into `verify:gate`. Baseline whatever is stale in
those namespaces at wiring time the same allowlist-plus-anti-rot way `module_freshness` does,
so the gate blocks growth from day one without demanding X3 finish first — and coordinate the
baseline's shrink with X3's blessing work.

**2. Value staleness the cmd check cannot see.** `check_cmd_i18n` verifies key PRESENCE only:
213 of 567 cmd/palette values in Spanish are byte-identical to English behind a green check,
including a pinned retired feature name ("Here — Throughline") that shipped in all 63 packs.
Build the value-level check for the `cmd.*`/`palette.*` namespace: a value identical to
English is only acceptable if it is on an explicit reviewed allowlist (surface names, the
`palette.ctx.*` passthrough convention W1 documented); anything else reports. Start
report-only with a `--gate` flag ready, and hand the resulting worklist to X3's report.

## Standing rules

Both checks must pass the planted-defect test before their green is believed: introduce a
deliberate violation, show exit 1, remove it (the repo's negative-control convention — see
`tests/dark_mode_contrast_gate.test.js` for the pattern, and add a vitest runner the same
way). Never let either check weaken an existing one. Document each tool's limits in its
header the way the fleet's other scanners do.

Report → `FLEET_2026-08-16/reports/X4_report.md`: the gate wiring, baselines, negative
controls shown firing, and the cmd value-staleness worklist sized honestly.
