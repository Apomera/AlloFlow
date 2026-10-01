# Main changed after the integration snapshot

Read-only comparison captured **2026-09-29 04:34:58 UTC**; UI mirror comparison captured **04:36:13 UTC**. Compared the five live canonical files with `integration-preimages/<path>.gz` and the integrated candidate. No application files were edited or merged.

## Scope and conflict assessment

| Canonical file | Changes since saved main baseline | Relationship to candidate fixes |
| --- | --- | --- |
| `AlloFlowANTI.txt` | One Simplified View URL cache stamp changed from `3123536f` to `86029309`. No other text change. | No overlap with candidate changed ranges. The exact-context patch applies to the candidate in memory. Preserve this newer module stamp during reconciliation. |
| `ui_strings.js` | 537 added STEM keys and 4 modified bridge seismic-design explanations. Groups: scaleExplorer 38, astronomy 70, bridgelab 67, firstresponse 46, galaxy 18, microbiology 213, physics 19, platetectonics 5, nuclearlab 65. | No changed key has a divergent candidate edit. These additions and revisions are absent from the candidate snapshot and must be retained when integrating into current main. |
| `lang/arabic.js` | 21 added `stem.anatomy` quiz-flow strings. | No divergent candidate key overlap. |
| `lang/french.js` | 21 added `stem.anatomy` quiz-flow strings. | No divergent candidate key overlap. |
| `lang/spanish_latin_america.js` | 21 added `stem.anatomy` quiz-flow strings. | No divergent candidate key overlap. |

The four revised English strings explain seismic strength/load paths, ductility, controlled yielding, and isolation-bearing displacement. They replace oversimplified claims in the earlier copy. They are independent of roster privacy, role transitions, Guided Mode, and the reconciled source controls.

## Current mirror state

- Both generated host files match live canonical ANTI byte for byte.
- Arabic, French, and Spanish Latin America root/public pairs match. Arabic's public file changed again after `integration-final-manifest.json` was recorded and had caught up with its root by this audit.
- Live `ui_strings.js` and its public copy do **not** match. The root has 655 `stem.platetectonics` keys absent from public. One additional value differs: root `lesson_board.symbol_results` is `{count} symbols found. Choose one.`; public is `Symbols found: {count}. Choose one.`. This is a current mirror discrepancy; this audit does not attribute all of it to changes after the snapshot. The public catalog also changed after the manifest was recorded.

Whole-file replacement from the candidate would discard later main work. Reconcile the independent source stamp and catalog keys against current main, then resolve the catalog mirror discrepancy with the current file owner's work and regenerate mirrors. The tested candidate remains a snapshot, not proof that these later main edits were tested together.

## Exact live SHA-256 hashes

| Path(s) | SHA-256 |
| --- | --- |
| `AlloFlowANTI.txt`; `desktop/web-app/src/AlloFlowANTI.txt`; `desktop/web-app/src/App.jsx` | `31cb9d270f861c3c66a1ac9810c3c388edec7ccb6fab970e277b4a7cb9075c97` |
| `ui_strings.js` | `90d7fdc4a87546efd7bac15a6292d32d4d8ee8b0cbd1651b1d90f5fba59a37af` |
| `desktop/web-app/public/ui_strings.js` | `352cc75b2911648c14f9eddb3cd8a00bfd5aa93688494f2e10b9c92e7468a7e4` |
| `lang/arabic.js`; `desktop/web-app/public/lang/arabic.js` | `d14620f5125ac583fe2cbbfd744ef243f28cc35191ad18ffaf1ff86203250d13` |
| `lang/french.js`; `desktop/web-app/public/lang/french.js` | `212fcec9ec44b4fbe9efb66ab5f368e256a19c9c6ffa843ff1c2f74dae517b60` |
| `lang/spanish_latin_america.js`; `desktop/web-app/public/lang/spanish_latin_america.js` | `e82c85c3338f374c73f5edaefe860143a622959771ee3ecc35d9511bc6d06c02` |

Detailed baseline/candidate/live hashes, the single ANTI hunk, catalog key deltas, and mirror differences are in `main-drift-evidence.json`. `inspect-main-drift.cjs` reproduces the canonical read-only comparison. These hashes describe the observation time; active agents may subsequently change main.
