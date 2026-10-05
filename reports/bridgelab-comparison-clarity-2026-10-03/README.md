# Bridge Lab comparison precision and keyboard continuity

October 3, 2026. Changes remain uncommitted.

## Improvements

The saved-trial comparison table now uses the same small-value formatter as the paired bars. Nonzero readings below 0.001 and their signed differences use scientific notation instead of rounding to zero. Small percentage changes below 0.1% retain their sign and value in scientific notation. Ordinary readings keep their familiar formatting, and true zero remains 0.000 or 0.0%. The existing near-zero-reference guard continues to omit percentages when the reference is too small for a useful comparison.

An explanation appears when small readings or changes are present. Table values and bar values come from the same full-event results and remain stable as replay time changes. Printed tables preserve the same readings and changes.

Paired bars now scale to their actual maximum, with a fallback only when both values are zero. Very small valid imported inputs therefore retain a visible ratio instead of producing two nearly empty bars. Zero-input comparisons still render empty bars with finite scales.

Applying a controlled comparison moves focus to the persistent comparison section before the action disappears. The section does not become a new tab stop. The next Tab continues to the reference selector; the action also announces the completed input change and paused playback. This preserves keyboard navigation on desktop and phone layouts.

A separate read-only review confirmed the table rounding inconsistency, disappearing-button focus loss and tiny-scale issue. The underlying earthquake model, saved records, note fields and energy accounting are unchanged.

## Verification

- All 302 checks across the 16 Bridge Lab unit suites passed, including the accumulated investigation, saved-evidence and comparison enhancements.
- Eleven browser workflows passed: precision and focus, paired response bars, controlled comparisons and saved small-value reports at desktop and 320 px, plus three notebook and graphics-recovery workflows.
- Parsed source, identical source/public mirrors and 1,175 matching English fallback values in both registries.
- Desktop and phone table captures inspected; horizontal-overflow checks passed.
- Scoped whitespace and staged-file checks completed; no staging or commits.

Run verification: node reports/bridgelab-comparison-clarity-2026-10-03/verify.cjs

- [Desktop precise comparison table](bridge-1000-precise-comparison-table.png)
- [Phone precise comparison table](bridge-320-precise-comparison-table.png)
