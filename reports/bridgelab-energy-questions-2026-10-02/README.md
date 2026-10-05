# Bridge Lab guided energy investigations

October 2, 2026. Changes are left uncommitted at the user's request.

## Student experience

Open **Energy between moments** in immersive scene tools or the labelled 2D view. Four question controls select exact windows in the selected experiment:

- **During shaking:** 0–16 s; compare input work, stored energy and damping loss.
- **After shaking:** 16–24 s; investigate where the remaining energy goes with no further input.
- **Elastic → kinetic:** the first free-vibration turning point to the following center crossing.
- **Ground removes energy:** the largest contiguous recorded decrease in net input work during shaking.

Selecting a question pauses replay and driving while keeping physical inputs and learner notes. Manual inspection clears the active question when the endpoints no longer match. A/B switching keeps the same inspected interval.

**Follow the energy** shows two bars on a common interval scale for A and B. The first combines stored energy at the start with positive net input work. The second combines energy stored at the end, damping loss and net work removed by ground interaction. Numeric labels accompany every component, with scientific notation for nonzero values below 0.001 J/kg; the numerical residual remains visible. Zero shaking produces empty bars and disables questions whose physical windows do not exist.

Saved observations keep the existing pin and frame times. Questions are derived again from validated inputs and endpoints in the notebook and print report, including when the live earthquake model is disabled. Imported cached question labels are ignored.

## Physics and scope

The existing illustrative single elastic mode and synthetic ground-motion event are unchanged. Recorded relative modal energy and work histories are interpolated together. The diagram accounts for signed work without turning negative input into an addition. Elastic-to-kinetic exchange uses sampled estimates of cycle crossings and includes damping loss; it does not assume all elastic energy becomes kinetic energy.

Available energy = initial stored energy + positive net input work.

Accounted energy = final stored energy + damping loss + magnitude of negative net input work.

Their difference equals the interval's numerical work–energy residual. These quantities are per kg of modal mass. This model does not estimate bridge damage or earthquake safety; scene motion is magnified 10×.

## Verification

- 276 distinct checks across all 16 Bridge Lab unit suites using a single thread worker. Latest complete results are counted once.
- 25 focused real-WebGL workflows, including the three new guided-question flows, 320 px phone, reduced motion, labelled 2D, A/B, fullscreen and printed evidence.
- Parsed source, identical source/public mirrors, matching English fallbacks and scoped whitespace checks.
- Desktop and phone captures inspected for readable values and full diagram visibility below the sticky tools heading.

One full unit run encountered two 30-second test timeouts and a worker startup timeout. The affected interaction and inquiry suites were rerun with a 120-second per-test allowance. Original runner results remain in `unit-results.json`; retry results remain in `unit-retry-results.json`. The verifier requires every failed assertion to pass in its replacement suite and checks all 16 suites.

Run source and results verification: node reports/bridgelab-energy-questions-2026-10-02/verify.cjs.

## Captured views

- [Desktop guided questions](bridge-1000-energy-questions.png)
- [Phone guided questions](bridge-320-energy-questions.png)
- [Desktop ground-removal budget](bridge-1000-ground-energy-budget.png)
- [Phone ground-removal budget](bridge-320-ground-energy-budget.png)
- [Zero-input 2D budget](bridge-844-zero-energy-budget.png)
