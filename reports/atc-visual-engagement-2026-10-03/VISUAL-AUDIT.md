# ATC visual and engagement audit

Baseline captured from the canonical ATC source in installed Chrome with the actual React host contract at 1440, 390, and 320 pixels. Images are named `before-menu-*`, `before-playing-*`, and `before-debrief-*`. The fixed crossing-priority exercise was used for the playing and early debrief views. This is a teaching simulation.

The strongest improvement opportunities were:

1. **Correct and readable radar labels.** The radar abbreviates space-separated callsigns, so fixed exercise callsigns such as MED101 render as `MEDundefined`. Text also scales down with the radar: at 390 pixels, a standard aircraft detail font is approximately 5.8 CSS pixels. Use the actual callsign, a readable minimum font size, strong selected contrast, and edge-aware placement. Preserve full HTML flight-strip equivalents.
2. **Radar visibility on phones.** Full briefing copy, statistics, the utility toolbar, pause notice, and all exercise criteria precede the radar. Put a compact objective/progress summary above the scope and make the full briefing expandable. Preserve radar-before-controls document order and keyboard access.
3. **A clear first learning action.** The menu's decorative radar consumes a large section of the phone viewport. A compact hero and a visible first-practice action make it easier to start a manageable, paused exercise.
4. **Measured progress and continuation.** The early debrief has seven equal statistics and generic advice. Emphasize the measured objective outcome, retain evidence, and offer the next suitable exercise after a successful attempt. Show progress from recorded completed exercises; do not infer mastery from score or a claimed completion flag.
5. **Motion preferences.** The sweep and some effects already honor reduced motion, but rotating selection dashes and pulsing emergency/conflict rings need the same treatment. Keep the flight movement necessary to understand the simulation.

## Final verification

The final independent `browser-qa.cjs` run passed **23 of 23 checks** against the canonical production source. There were no uncaught runtime errors or unexpected native dialogs. Axe found no serious or critical violations in the verified normal, zoom, and forced-colors views. Screenshots were reviewed for layout, hierarchy, and radar readability.

The visual changes address the baseline findings: full callsigns render without `undefined`, selected labels remain **12 CSS pixels** at desktop and phone sizes, tags stay within the radar at all four corners, the phone hero omits its decorative radar, and the Practice tab uses a compact two-row tab layout. The live objectives show action progress separately from safety conditions and start with briefing/hints closed. The completed debrief leads with its measured outcome and one prominent next-exercise action. An unfinished saved attempt is labeled **Attempt recorded** and has one prominent retry action.

| Viewport | Radar width | Radar document top | Selected label |
|---|---:|---:|---:|
| 1440 pixels | 638 CSS px | 569 CSS px | 12 CSS px |
| 390 pixels | 330 CSS px | 650.9 CSS px | 12 CSS px |
| 320 pixels | 260 CSS px | 758.4 CSS px | 12 CSS px |

The DPR 2 phone check verified a correctly sized backing canvas and radar hit testing. The 200% **CSS zoom** check verified horizontal fit in menu, playing, and debrief views. Reduced-motion checks verified suppression of both the sweep and rotating selection ring while aircraft still advanced. Forced colors retained selected states, readable controls, and visible focus.

The engagement check used real controls to assign runway 27, clear TRAIN101, resume, and observe touchdown at **11.35 shift seconds**. It verified one landing, no conflict events, automatic pause, saved objective evidence, durable `1 / 4` pathway progress, and a paused arrival-sequencing exercise launched by the next button. Reopening retained completion, an unfinished retry did not erase it, a real separation alert followed by live retry recorded the failed attempt and focused the fresh goal, and debrief-to-Practice navigation restored the active tab for keyboard continuation.

Browser verification also caught two integration issues that the root corrected before this final run: pathway calculation occurred before tool data was initialized, and a combined heading selector focused the earlier shift heading instead of the exercise goal. Explicit system-color rules removed forced-colors contrast discrepancies.

## Artifacts

The final screenshot dimensions are listed in `screenshot-dimensions.json`; machine-readable checks and measured details are in `browser-qa-results.json`. The saved real completion is available in `measured-completion-data.json`.

| Screenshot | Pixel dimensions |
|---|---|
| `menu-1440.png` | 1440 × 1100 |
| `menu-390.png` | 390 × 1678 |
| `menu-320.png` | 320 × 1923 |
| `playing-1440.png` | 1440 × 1978 |
| `playing-390.png` | 390 × 2899 |
| `playing-320.png` | 320 × 3204 |
| `pathway-320.png` | 320 × 2105 |
| `earned-pathway-390.png` | 390 × 2026 |
| `completed-debrief-desktop.png` | 1440 × 1100 |
| `measured-completion-desktop.png` | 1440 × 1440 |
| `forced-colors-390.png` | 390 × 2905 |
| `high-dpi-390.png` | 780 × 5798 |
| `playing-200percent-zoom.png` | 1440 × 3149 |

Reproduce with `node reports/atc-visual-engagement-2026-10-03/browser-qa.cjs`, then `node reports/atc-visual-engagement-2026-10-03/summarize-qa.cjs`.

These checks establish functional progression and accessible visual behavior. Classroom engagement outcomes were not measured.
