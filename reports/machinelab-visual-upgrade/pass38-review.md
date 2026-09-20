# Machine Lab pass 38: comparison rulers

The force and distance comparison charts now share the simulation's visual key: a solid diamond for effort and an open ring for load. Quarter-scale marks and larger numeric values make the two comparisons easier to follow. Bar widths remain proportional, and markers stay centered on the exact endpoint even for very small values.

The existing shared scale within each pair and numeric values remain the source of magnitude. The shapes distinguish effort from load without relying on color alone. System high contrast uses a system-colored ruler bed and preserves the solid/open marker distinction.

Validation: 228 UI tests and 72 Chromium browser checks passed. Browser coverage includes six mechanisms, widths of 1150, 390, and 320 pixels, three themes, equal/reversed/high leverage, a tiny screw ratio, and system high contrast. Checks verify normalization, marker-to-bar alignment, shape semantics, and horizontal overflow. Captured 30 screenshots and reviewed the examples below. Source/desktop parity and syntax checks passed.

- [Phone comparison](pass38-light/comparison-windlass-320.png)
- [Very small values in dark mode](pass38-dark/comparison-screw-tiny.png)
- [System high contrast](pass38-contrast/comparison-forced-colors.png)
- [Validation details](pass38-summary.json)

Changes remain local. No commit, push, or deployment was performed.
