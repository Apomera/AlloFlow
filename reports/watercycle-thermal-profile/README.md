# Thermal inspector: matching the air profile

The detailed particle inspector now uses the same exact air profile as the main temperature chart. It distinguishes full 0°C crossings, points that only touch zero, and sections that stay at zero. Opening the inspector preserves the interpretation and location of these air-temperature cues.

A/B/C markers identify cloud, middle-air, and near-surface levels. The selected marker, guide line, chart heading, and level button update together. Narrow layouts place temperatures on their own line. Light, dark, and forced-colors views retain readable labels and state cues.

Only the inspector renderer and stylesheet changed in production. Particle-state calculations, model transition bands, saved practice identities, and answer behavior are unchanged.

## Validation

- 286 browser assertions passed across 13 independently calculated profiles, including true crossings, near-end and close crossings, tangencies, endpoints, zero spans, and all-zero air.
- Native Space activation selects levels and moves focus. Same-level selection retains feedback; changing levels clears the answer. Weather controls and the live timeline remain unchanged by inspection.
- Four scoped axe audits found no violations. Ten candidate captures cover desktop, 320/390-pixel phones, dark mode, and forced colors. No horizontal overflow, page errors, or failed requests.
- Source and mirror match and parse. Reversing the two recorded edits restores the exact starting source; every other source section is unchanged.
- Port 8770 served the final runtime with HTTP 200.

The initial unit-suite baseline had 32 passes and two failures: a historical source-preservation assertion and a renderer-test timeout. The preservation audit found six historical differences and no current-turn differences across its 63 anchors. Renderer extraction is now cached, and 14 feature scenarios were added. Two candidate unit runs timed out before loading the suite, so final unit execution is incomplete. Metadata is saved in final-run.json and verified-run.json; the last attempt used unique output paths and produced no fresh test result. Stale output from the first candidate attempt was excluded. Browser checks passed on the final source independently.

The browser harness uses the local 2D fixture and does not re-audit the complete 3D renderer. Its source path is recorded in capture.cjs; run it with the runtime hash and the validation argument to repeat the focused checks.

Source SHA-256: `f29310e7d0bd78fdbb444e52ea36d6abae393ff268960aa956ae200dd139850a`.

From the repository root, run `node reports/watercycle-thermal-profile/verify.cjs` to verify artifacts, runtime hashes, syntax, and exact source reversal.

No commit was created.
