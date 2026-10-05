# ATC operational clarity: Chrome review

Baseline review used installed Chrome, the canonical ATC source, the actual React fixture, and real traffic from the separation-recovery exercise. The exercise was resumed until its convergence entered the watch horizon, then paused for inspection. No aircraft positions or conflict counters were fabricated.

## Baseline findings

- The watch's Inspect controls changed aircraft selection but retained keyboard focus on the watch. The aircraft-control card remained above the viewport: 351 pixels at 1440, 439 pixels at 390, and 551 pixels at 320. A learner needed to find the controls again after asking to inspect an aircraft.
- Inspect remained enabled during a heading draft, then displayed a blocked message rather than navigating. The model correctly protected the original recipient and heading; this was a clarity issue rather than a command-safety failure.
- The runway board exposed estimates and cautions in prose but offered no direct aircraft inspection.
- Selected flight strips had a visible border/background distinction and `aria-pressed`, with no textual selection cue.
- The dense strips and watch fit all three widths. No horizontal overflow or runtime errors were observed.

Baseline captures: `before-separation-{1440,390,320}.png`, `before-watch-{1440,390,320}.png`, `before-runway-{1440,390,320}.png`, and `before-menu-390.png`. Measured values are in `baseline-findings.json`.

## Final implementation review

The focused suite passed **22 of 22 checks**, with no runtime errors or unexpected native dialogs. Its clean final run recorded a stable canonical source hash of `10e2cc7380c02927570bc2b27a0bce4d4afe3101031110ed41998211fd8a70b0`.

- The compact Traffic review is placed beside radar. It appears when there are actual watch, runway, or priority concerns; it does not invent an alert for convergence outside the watch horizon. A real projected concern displayed one pair and the projected severity. Review controls focused the existing detailed headings.
- Crossing exercises retained the existing compact-radar placement check after the redundant review paragraph was removed. Radar began at **834.9 pixels** at 390-pixel width and **942.4 pixels** at 320-pixel width, both below the 950-pixel threshold. Separate crossing screenshots were captured at both widths.
- Watch and runway Inspect selected the intended aircraft, preserved its instructions, and focused the existing controls in view at 1440, 390, and 320 pixels. Draft and math states disabled deliberate inspection.
- Full axe analysis, including contrast, found no serious or critical violations at the three widths. No horizontal overflow was detected. A separate forced-colors and CSS 200-percent-zoom stress check passed the same navigation and accessibility assertions.
- Traffic headers accurately reported the freeze caused by a draft, help, and math. Cancelling a draft or closing help resumed a previously running shift without setting user pause. The terminal header was verified in a labeled presentation fixture.
- Destination labels reflected successive altitude instructions. Repeated minimum-target instructions left both aircraft state and evidence unchanged. Approach cancellation, runway reassignment, and Release hold matched their visible explanations.
- An actual cleared first arrival descended to **866 feet** before being paused. Its manual down command correctly used neutral **Set target · 1,000 ft** wording. Sending it ended approach guidance, preserved the current altitude, and set the 1,000-foot target.
- The scrolling list used **twelve aircraft added through guided controls**, rather than a fabricated roster. Radar arrows revealed each selected strip by changing the nested list's scroll position. Maximum list scroll was **1,272 pixels**; document scroll stayed at zero and keyboard focus remained on the canvas.

Screenshots were visually inspected for the 390- and 320-pixel control cards, traffic-review panel, crossing radar placement, runway warning and inspection controls, below-floor target, twelve-aircraft list, and forced-colors layout. Text and command destinations were readable; command targets remained at least 44 pixels tall. The earlier pill/callsign spacing refinement was applied and verified in the final twelve-aircraft capture: Selected and British 422 have a clear gap. No blocking visual findings remain.

Final captures are named `after-*`; full results and measured command details are in `browser-qa-results.json`. Run the suite with `node reports/atc-operational-clarity-2026-10-04/browser-qa.cjs`.
