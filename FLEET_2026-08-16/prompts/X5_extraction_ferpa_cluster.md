You are **Lane X5** of wave 3 in `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`, branch
`main`. Read `FLEET_2026-08-16/RULES.md`, `WAVE3_PLAN.md`, and the S1 sections of BOTH
`reports/L5_report.md` and `reports/W1_report.md` — their method notes (per-file translator
aliases, call-site coverage, string-concatenation invisibility, complete-panels-only) are
binding. Lane ID **X5**. You are this wave's primary writer on `AlloFlowANTI.txt` and
`ui_strings.js` (both under lock, Edit only, re-read after acquiring, burst discipline).

## Mission: continue the extraction sweep, starting with the cluster that matters most

`node dev-tools/scan_shell_i18n.cjs` stands at ~621 findings in ANTI. W1 measured the real
clusters with `--csv` (console output truncates and badly understates them):

| Lines | Findings | What |
|---|---|---|
| 47000-47500 | ~120 | **Class Mailbox / live session / FERPA and privacy copy** |
| 35500-36500 | ~72 | saved-work encryption, recovery keys |
| 45500-46000 | ~38 | rest of the storage and recovery manager |
| 51500-52000 | ~34 | AlloHaven |
| elsewhere | long tail | scattered |

Work the table top-down. **The 47000 block first, with named care:** it contains FERPA and
privacy-disclosure copy where a loose translation is a compliance statement, not a UI string.
For those specific strings: extract them so they CAN be localized, keep the English values
verbatim (no rewording during extraction), and tag each such key in your report so X3 and
future translators know these need reviewed translation, not casual translation.

## Standing rules

- Complete panels only — a half-localized panel is worse than an untouched one.
- Watch for the scanner-invisible classes both prior lanes documented: object-literal seeded
  content, string concatenation (convert to interpolated keys — concatenation also freezes
  word order), ternary fragments.
- New keys go in namespaces matching the surface; list every added key for X3 in your report,
  and mirror `ui_strings.js` to `desktop/web-app/public/`.
- `@babel/parser` full-file parse after every ANTI burst; `JSON.parse` on ui_strings after
  every burst; scanner before/after numbers in the report.
- No em-dash sweeps — that rule is emails-only now (see the fleet's memory correction);
  leave existing dashes in the copy you extract.

Report → `FLEET_2026-08-16/reports/X5_report.md`: per-cluster before/after, the FERPA-tagged
key list, keys-for-X3, and the honest remainder.
