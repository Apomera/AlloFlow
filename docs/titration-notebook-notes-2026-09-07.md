# Titration notebook annotations and export — September 7, 2026

The reading notebook now supports a 500-character student observation on each saved measurement. Notes use the existing tool state and remain attached to their reading across presets and apparatus views. Older saved notebooks without notes still load.

Each card has Use as A and Use as B buttons with pressed states and checkmarks. These controls share the existing comparison selections. Selected cards gain a visible border, and the comparison identifies the source reading numbers alongside the B-minus-A direction. Comparison eligibility and chemistry calculations are unchanged.

Download CSV exports every saved record, with stable English column headers identifying the setup, reagents, added volume in mL, separate pH and potential-in-volts columns, indicator, simulation observation, and student note. Cells are quoted, quotes are escaped, Unicode is retained, and formula-like text is prefixed as literal text. Numeric measurements remain numeric. The download is generated locally using a bounded data URL and needs no network or additional library.

Textareas have explicit labels, shared help, character counts, keyboard focus styling, and a vertical resize control. The notebook list now has a 520 px scroll limit to accommodate notes. Selected states have text/checkmarks as well as color. New English UI strings are registered in `dev-tools/i18n/stem_titration_en.json`; locale-specific translations remain follow-up work.

Implementation: `stem_lab/stem_tool_titration.js` and its byte-identical public mirror. Regression and browser evidence: `reports/chemistry-refinement-2026-09-06/titration-notes-*`. No deployment or dependency changes.

Validation: 49 focused tests across 4 files passed. Real Chromium verified a CSV download, multiline notes, A/B selection synchronization, note persistence across additions/resets/views/presets, redox units, and WebGL fallback. Nine axe scans across 1200, 360, and 320 px reported no WCAG A/AA violations or horizontal overflow. Desktop and mobile screenshots were visually inspected; syntax, source/public parity, and scoped whitespace checks passed.
