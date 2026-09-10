# Machine Lab: twelfth visual pass

All six workshop stations now use matching distance tracks and a clearer force-and-distance comparison card.

- **Shared distance scale:** both foreground tracks start at the same zero and move in the same direction. Their lengths preserve the actual ratio instead of capping large advantages or inflating short paths. The longest path fills the board, while the other uses the same linear scale. Quarter marks, smaller markers, and a shared-scale legend make the comparison easier to read. Invalid advantages show no fabricated paths.
- **Comparison card:** the existing tradeoff card now has labeled distance and force pairs with values and units. Distance bars use the selected advantage; force bars show its reciprocal. The card explains whether the current settings trade less force for more distance, more force for less distance, or equal force and distance. Very short bars remain proportional, with readable numerical labels beside them.
- **Grade-aware explanations:** the youngest learners get appropriate plain-language explanations for reversed and equal tradeoffs. Older learners retain the work-in/work-out comparison, and the cards stack on narrow screens.
- **Keyboard behavior:** changing the effort-arm slider updates both the numerical card and the 3D tracks. The browser check brings the canvas back into view before checking it, respecting the host's intentional pause for offscreen viewers.

**804/804 tests passed across 25 Machine Lab files.** Twenty-eight added checks cover uncapped geometry and motion ratios, common origins, work-bed bounds, invalid states, reciprocal card bars, accessible labels and grade-appropriate wording. Syntax, whitespace and byte-for-byte desktop parity passed.

Final Chromium/WebGL reviews passed in light, dark and high-contrast themes. Each covers all six stations, a moving lever, ratios below and equal to one, a fine-pitch screw, 320px/390px mobile layouts, reduced motion and keyboard synchronization. All final runs reported no page errors, horizontal overflow or mobile overlay obstruction.

Changes remain local; deployment is still paused.

![Paired distance tracks](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass12-final/workshop12-lift-lever-detail.png)

![Force and distance comparison](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass12-final/workshop12-lever-comparison.png)

![Reversed tradeoff on a narrow screen](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass12-contrast-final/mobile-lever-320-comparison.png)

![Fine screw ratio in dark mode](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass12-dark-final/mobile-screw-320-comparison.png)

[Validation summary](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass12-summary.json) · [Full test results](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass12-tests.json) · [Keyboard update capture](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass12-final/keyboard-lever-equal-comparison.png) · [Previous pass](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/machinelab-visual-upgrade/pass11-review.md)
