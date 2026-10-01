# Galaxy Explorer: stellar evidence and comparisons

## What changed

Metallicity now supports a controlled investigation: log a combination, choose **Compare**, and change one input at a time. The saved reference keeps its own metallicity, mass, and age. It stays fixed when sliders change, another combination is restored, another mode is visited, or the eight-entry log rolls over.

- Both charts show the saved reference with cyan diamonds. The formation chart also shows numbered logged combinations and the current star with a violet ring.
- A comparison panel reports changes in abundance, mass, age, and estimated hydrogen-burning lifetime. Clear comparison removes the reference; Reset clears the investigation.
- Desktop rows and phone cards offer separate Restore and Compare buttons. The active reference has a visible highlight and a pressed state for assistive technology.
- Positive metal abundances use a logarithmic scale, so small values remain visible. Zero has a separate lane. The slider reaches exactly zero and uses a consistent 0.001 increment.
- Lifetime estimates use readable Myr/Gyr units, distinguish age zero from the first logarithmic tick, and include a 13.8 Gyr universe-age reference.
- Phone charts use larger tick labels and captions outside the plot. Both plots keep their axis direction when the interface uses right-to-left text.

## Scientific corrections

**Zero and low abundance are distinct.** The former view called every value below 0.05 solar abundance “Population III (zero-metal).” It now reserves a metal-free reference for zero and labels positive values as composition groups. Stored log labels are recalculated from their numeric abundances, correcting older mislabeled entries. Population III is shown as an idealized reference to the first generation’s birth gas. [NASA’s first-star explanation](https://science.nasa.gov/mission/webb/science-overview/science-explainers/what-were-the-first-stars-like/) describes its largely hydrogen-and-helium composition.

**Metallicity does not uniquely give age.** The former universal enrichment curve and its acceptable band have been replaced by the actual trial combinations. The view explains why chemistry depends on the birth environment. Observed age–metallicity diagrams contain substantial scatter and old metal-rich stars. [Feltzing, Holmberg, and Hurley’s primary research](https://arxiv.org/abs/astro-ph/0108191) supports this correction.

**Hydrogen-burning lifetime is an estimate.** The view still shares Star Life’s mass-only relation, 10/M^2.5 Gyr, with its existing 2 Myr lower bound. It now states that extreme masses and metal-free stars require detailed models. Passing the estimate does not uniquely imply a remnant: a giant phase can intervene. [Swinburne’s lifetime explanation](https://astronomy.swin.edu.au/cosmos/m/Main%2BSequence%2BLifetime) derives the approximation and explains its limits at very high and low masses.

**Formation time is exact within the chosen inputs.** The chart uses 13.8 minus the chosen age without the previous 0.2 Gyr clamp. Setting age to 13.8 Gyr receives a warning that this would place formation at the Big Bang, before stars existed.

Composition groups are teaching guides, not measured stellar-population assignments. The footer distinguishes total heavy-element abundance relative to the Sun from the iron-only [Fe/H] scale. Logged points are hypothetical inputs, and neither chart supplies observational data or a full stellar-evolution calculation.

## Verification

- 453 passing checks across all 16 Galaxy test files. Eighteen new checks cover zero abundance, composition boundaries, corrected legacy labels, comparison snapshots, malformed saved comparisons, cosmic endpoints, readable lifetime units, and chart references.
- The final parallel test run completed 13 files with 388 passing assertions but exited with an error and omitted three files. Those three files were rerun with one thread worker and passed all 65 checks. The combined summary records both reports; no failed assertion remains.
- Real browser checks cover keyboard input, comparison and note preservation, restoring entries, mode changes, log rollover, clear and reset, mobile Compare buttons, and right-to-left layout.
- Chart text is checked at its actual rendered size and against its visible plot bounds. Desktop, 390 px, and 320 px layouts retain the controls within the viewport; log actions have at least 44 px height.
- Connected-workflow regressions cover all five stellar lifecycle branches, Galaxy/Star Life/chemistry links, keyboard time-lapse, quiz resume and restart, cancellation, deadlines, and stale replies.
- Black hole browser regressions cover fragment moments, exact chart navigation, pointer and touch picking, horizon occlusion, drag cancellation, local speed and clock references, stable selection rings, rewind, replay, and cleanup.
- Galaxy source and its desktop mirror match. All 63 active chemistry labels match the English catalog and both Galaxy registries. The live preview serves the same source.

The astronomy model outside this investigation remains as in the preceding passes. Changes are uncommitted.

## Try it

Open the [local preview](http://127.0.0.1:53693/) and choose **Metallicity**. Log the initial star, change mass or age, then choose **Compare** on the saved combination. Restore another entry to see that the reference and notes remain. Use the metallicity slider’s Home key to explore the zero-abundance reference.

## Evidence

- [Full Galaxy suite](galaxy-tests.json)
- [Remaining three test files](remaining-tests.json)
- [Final validation summary](validation-summary.json)
- [Stellar browser checks](browser-results.json)
- [Desktop charts](stellar-charts-1440.png)
- [Phone charts](stellar-charts-320.png)
- [Phone extreme inputs](stellar-charts-320-extreme.png)
- [Right-to-left layout](stellar-comparison-320-rtl.png)
- [Connected-workflow regressions](connected-regression/browser-results.json)
- [Black hole fragment moments](black-hole-regression/moment-browser-results.json)
- [Black hole picking](black-hole-regression/picking-browser-results.json)
- [Black hole local motion](black-hole-regression/motion-browser-results.json)
