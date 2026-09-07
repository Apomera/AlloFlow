# Titration bench tools — September 7, 2026

Added to `TitrationExperimentBench` in `stem_lab/stem_tool_titration.js`, with the same file mirrored to the desktop public bundle.

- Custom-volume dispenser accepts positive 0.1 mL increments up to the remaining preset simulation range. It uses the existing addition handler, chemistry calculation, and motion settings.
- Reading notebook stores up to 40 displayed measurements in `titrationLab.benchNotebook`. Each entry includes reagent setup, cumulative added volume, pH or potential, indicator, and current observation. A preview beside Save identifies the current measurement. Resetting volume, changing presets, or switching between 2D and 3D preserves the notebook; Clear notebook affects only its records.
- Reading comparison shows B minus A for volume and response, using the same visible precision as the notebook (0.1 mL, 0.01 pH, or 0.001 V). Comparison requires distinct records with matching preset and signal type. Presets currently define fixed reagent conditions.
- Notebook data is sanitized on use: malformed and duplicate records are rejected, text is bounded, and the list is capped. The tools remain available with the 2D diagram and when WebGL is unavailable.
- Lab update helpers now submit only changed fields to the host's functional merge. Previously an animation timeout could replay an older snapshot, overwriting a reading saved during the addition. A mounted two-instance React regression covers this race.

Controls use native labeled inputs/selects, 44 px minimum targets, visible keyboard focus, and a polite save/clear status. The layout stacks on phones. English labels and help are in `dev-tools/i18n/stem_titration_en.json`; locale-specific translations remain follow-up work. No scientific engine, deployment, or dependency changes were made.

Verification artifacts are in `reports/chemistry-refinement-2026-09-06/`: `titration-tools-tests.json`, `titration-tools-browser.cjs`, `titration-tools-browser-results.json`, and notebook desktop/mobile screenshots.

Final validation: all 251 titration tests across 17 files passed (`titration-tools-all-tests.json`, 30-second test/hook limits). Real Chromium WebGL interaction checks passed with no page errors. Nine axe scans (all three apparatus views at 1200, 360, and 320 px) found no WCAG A/AA violations or horizontal overflow in the bench. Desktop and mobile notebook screenshots were visually inspected. JavaScript syntax, source/public byte parity, and scoped `git diff --check` passed.
