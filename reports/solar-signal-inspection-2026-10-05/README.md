# Solar System signal inspection enhancement

October 5, 2026. This task created no commits.

The communication lab now presents three prominent measurements: one-way command arrival, earliest immediate reply, and Earth–destination distance. The orbital diagram uses a taller 660 × 500 scientific frame that contains every modeled world and orbit ring. Its fixed 720px rendered width preserves readable labels; phones inspect the diagram in a named keyboard-focusable local scroll region. The surrounding page remains within the viewport. Phone presets and hypothesis choices stack vertically, independently of their translated accessible names.

The new journey chart divides the round trip into equal outbound and return legs. The return leg is striped, so the visual distinction survives without color. Both legs share a linear time axis for the current setup. Each setup fills its own frame, and the description directs learners to compare numerical times between destinations. Reply times assume an immediate response and an available path. The separate pulse remains a disclosed time-lapsed illustration.

Observation A remains fixed, and a third recording replaces only B. Their bars share one linear scale; B is striped. Equal restored observations explicitly report equal delay. Readings, explanations, and drafts remain independent for each destination. Changing the current setup leaves recorded observations and a valid sent-ping receipt tied to their original angles.

Restored destinations must name an own known world key; invalid values display Mars. Current angles accept finite numbers or nonblank numeric strings and display a clamped, rounded integer from 0° to 180°. Notebooks require own object records and own typed fields. Valid recorded angles retain their precision, with physical readings derived from the existing model. Malformed observations and inconsistent ping receipts are ignored for display. Reading a saved state does not rewrite it. Hypotheses accept only the three supported choices, and the saved marker requires literal `true`. A synchronous signature guard prevents repeated captured save handlers from duplicating journal entries while allowing revised evidence. Saving remains ungraded.

The distance calculation retains the law of cosines for circular, coplanar orbits and the existing constants. The model uses 149,597,870.7 km per AU and 499.0047838 seconds per AU; the physical definitions are supported by the [IAU astronomical unit resolution](https://www.iau.org/static/resolutions/IAU2012_English.pdf) and [NIST speed of light](https://physics.nist.gov/cuu/Constants/Value/c.html). The existing Earth–Mars reality check remains distinct from this mean-orbit model: [NASA describes about 3–22.4 minutes one way](https://science.nasa.gov/mars/mars-relay-network/). The lab retains its [communications reference](https://www.nasa.gov/centers-and-facilities/goddard/space-communications-7-things-you-need-to-know/) and [solar-conjunction caution](https://www.nasa.gov/solar-system/whats-mars-solar-conjunction-and-why-does-it-matter/). Compressed orbit radii and enlarged world markers are disclosed; numerical AU readings measure the modeled path. The display is not a current ephemeris.

## Evidence

- [Desktop before](before-signal-1060-dark-Mars-0-default.png)
- [Phone before: clipped Neptune](before-signal-320-light-Neptune-90-clipped.png)
- [Updated desktop bench](after-signal-1060-dark-Mars-0-default.png)
- [Updated reply-time chart](after-signal-journey.png)
- [Phone Neptune at a right angle](after-signal-320-dark-Neptune-90-outer-world.png)
- [Phone Pluto at a right angle](after-signal-320-light-Pluto-90-outer-world.png)
- [Phone recorded observations](after-signal-320-dark-Mars-90-captured.png)
- [Readable phone notebook detail](after-signal-phone-notebook.png)
- [Phone outer-orbit detail](after-signal-phone-outer-orbit.png)
- [Verification summary](verification-summary.json)
- [Visual metrics](after-metrics.json)
- [Visual QA helper](visual-qa.cjs)
- [Verification collector](collect-verification.cjs)

## Verification

All 59 distinct unit checks pass across six files: 20 new signal inspection cases and 39 existing science, color, table and learning-journey cases. All 16 distinct browser scenarios pass: ten new signal cases and six existing signal-lab/notebook cases. The final copy edit additionally passed five affected browser scenarios, and the final map-label adjustment passed the existing geometry case and both phone cases. The geometry case checks all eight destinations at 0°, 90° and 180°, including real SVG label bounds and Earth-label separation from both world markers. Other cases verify exact timing, shared observation scales, frozen receipts, malformed restores, revised evidence, repeated saving without XP, retained learning state, native keyboard scrolling, and both phone themes.

The 14 final visual states cover desktop dark/light, a tablet setup, phone dark/light, Neptune and Pluto at a right angle, inner worlds, captured and equal observations, malformed data, an invalid prediction, a frozen ping, and a conjunction caution. All have no page overflow or captured runtime errors. The minimum measured enabled DOM text contrast is 5.3577:1, and the minimum native control/link height is 44px. Phone browser checks also measure the visible journey labels. Computed color checks supplement direct inspection of desktop, phone outer-orbit, journey and notebook screenshots. The final Earth label sits below its marker, and the idle status gives a readiness hint without repeating the persistent animation boundary.

Canonical and desktop source files are byte-identical, with SHA-256 `47fdaa727594eb8252237ec6f81631820b26a91d60cb98be6955f82d04b36fe4`. Syntax, scoped source whitespace, and the scoped Git whitespace check pass.

Earlier attempt logs remain available. The sandbox initially blocked a test-runner cache rename before any tests ran; normal temporary-cache access resolved it. The first focused run passed the 39 existing cases and 16 new cases, while four new cases identified the missing explicit “one-way” wording in the journey's accessible name. That description was clarified, and all 20 new cases passed on the targeted rerun. The evidence collector combines those complete results by distinct file and case. The final status and map-label edits were verified by affected browser checks, and all visual captures were refreshed afterward.
