# Machine Lab pass 40: work balance

Paired area diagrams now explain how force and distance combine into work. Width represents distance, height represents force, and both diagrams share the same scales. Equal rectangular areas make equal work visible. Numeric products and joule totals remain readable when a rectangle is very thin. The panel explicitly identifies the ideal model and rounded displayed values.

Validation: 228 UI tests and 78 Chromium browser checks passed. Coverage includes all six mechanisms, 1150/390/320-pixel layouts, three themes, reversed/equal/high leverage, very thin screw areas, reading-level boundaries, and system high contrast. Exact SVG areas are checked for equality. The comparison with existing CSS bars accounts for the browser's rounded percentage serialization, verified in the precision diagnostic. Source/desktop parity, syntax, and scoped diff checks passed. Captured 30 final screenshots.

- [Phone work balance](pass40-light-final/work-windlass-320.png)
- [Dark desktop](pass40-dark-final/work-lever-1150.png)
- [System high contrast](pass40-contrast-final/work-forced-colors.png)
- [Validation details](pass40-summary.json)

Further opportunities: make phone camera controls more compact; save and compare two setups; offer guided experiments that vary one parameter at a time.

Changes remain local. No commit, push, or deployment was performed.
