# Machine Lab pass 37: visual motion explanations

Each Motion detective explanation now includes a pair of visual direction cards: effort motion and load motion. Curved, vertical, sloping, and separating arrows clarify each mechanism's response, with text alongside every icon. The ramp arrow follows the selected slope, including a vertical ramp. A short note distinguishes motion direction from the front tracks' distance scale.

Cards sit side by side on desktop and stack on narrow phones. Operating-system high contrast uses system colors. Explanations still use native keyboard-operable disclosure controls and do not change the current pose or camera. Switching stations closes the previous explanation.

Validation: 228 UI tests and 171 Chromium browser checks passed across all six mechanisms, three viewport widths, and light, dark, and high-contrast themes. Checks include keyboard opening/closing, layout, pose preservation, vertical-ramp direction, station switching, and system colors. Captured 27 screenshots and inspected the examples below. Source and desktop copies match; syntax and scoped diff checks passed.

- [Wheel and axle on a phone](pass37-light/motion-map-windlass-320.png)
- [Wedge in dark mode](pass37-dark/motion-map-wedge-1150.png)
- [System high contrast](pass37-contrast/motion-map-forced-colors.png)
- [Validation details](pass37-summary.json)

Changes remain local. No commit, push, or deployment was performed.
