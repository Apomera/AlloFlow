# Bridge Lab paired response visualizations

October 3, 2026. Changes remain uncommitted.

Saved-trial comparisons now include paired bars for peak relative motion, peak deck acceleration, peak stored energy and energy dissipated by 24 s. Violet identifies the saved trial and gold identifies the current experiment, matching the comparison timeline. Each pair shares one scale, so bar lengths directly compare that measure. Different measures use different scales, stated beside the charts.

Exact numeric readings and units remain visible with every bar. Tiny nonzero readings use scientific notation. True-zero comparisons have empty bars and finite positive scales. The existing detailed comparison table and controlled-input actions remain available. The bars use full-event results and stay fixed as replay time changes.

The four measures use a two-column desktop layout and one column on phones. Printed reports contain the same readings and bars with a light background. Labels identify each experiment without relying on color; decorative bars are hidden from assistive technology to avoid repeating numeric information. No model inputs, physics, notes or saved records change when viewing the visualization.

## Verification

- Nine focused unit checks passed; 133 unrelated interaction checks were skipped.
- Nine browser workflows passed: paired visualizations and controlled comparisons at desktop and 320 px, saved investigations at both sizes, notebook save/restore/print at both sizes and graphics recovery.
- Parsed source; matching canonical/public mirrors; 1,174 English fallback values match both registries.
- Desktop and phone charts inspected; browser horizontal-overflow checks passed.
- Scoped whitespace and staged-file checks completed; no staging or commits.

Run verification: node reports/bridgelab-comparison-bars-2026-10-03/verify.cjs

- [Desktop paired response bars](bridge-1000-paired-response-bars.png)
- [Phone paired response bars](bridge-320-paired-response-bars.png)
