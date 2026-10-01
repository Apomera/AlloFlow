# Bridge Lab: watch energy transfer

## Follow the rates as well as the amounts

Open **Measurements → Energy transfer** inside a live earthquake scene. Three arrow rows show the current direction and rate of:

- **Input work ↔ stored energy**: the input term can add energy or reduce net input work.
- **Kinetic ↔ elastic energy**: the spring exchanges motion with elastic storage.
- **Stored → dissipated energy**: viscous damping removes mechanical energy.

A fourth reading states whether total stored energy is increasing, decreasing, or unchanged, with its rate in **W/kg of modal mass**. The existing energy bars show amounts in **J/kg**. Arrow lengths are fixed; their direction and numeric rates change with the inspected frame. A dot and dashed line identify a zero rate. Nonzero magnitudes below display precision read **<0.001**.

The panel follows the selected A/B trial and the shared replay time. Opening it, closing it, or folding the measurements does not start or pause playback. It is available in fullscreen and reduced-motion mode. The labeled 2D view also offers the diagram for the **current experiment**, including after loss of the 3D context.

## Suggested investigation

1. Prepare the 5% / 20% damping comparison, pause at one frame, and compare transfer rates for A and B.
2. Inspect **Shaking ends** at 16 s. Input work stops; damping can still reduce stored energy.
3. Set damping to zero and inspect the free-vibration interval. Kinetic and elastic energy still exchange while total stored energy stays constant in the ideal model.
4. Return to a frame during shaking where the input arrow reverses. The caption identifies this as a decrease in the relative-motion model's input work.

## Physics and implementation

The implementation derives power from the existing relative-displacement equation, with displacement u, velocity v, ground acceleration ag, stiffness per modal mass k, and damping coefficient per modal mass c:

    u'' + c v + k u = -ag
    Input power              = -ag v
    Damping loss             = c v²
    Kinetic → elastic power  = k u v
    Kinetic energy rate      = input - damping - elastic exchange
    Elastic energy rate      = elastic exchange
    Total stored energy rate = input - damping

These are rates per kg of modal mass. Power terms are evaluated alongside the solver's samples, then interpolated together. Both rate identities therefore remain consistent at times between stored samples. The diagram uses the same input-power values as the existing readout. Four rate fields are added to each response sample; the equations of motion and energy integrals are unchanged.

The underlying SDOF equation and the separation of kinetic, damping, and elastic energy are discussed in [PEER Report 2000/04, §3.2](https://peer.berkeley.edu/sites/default/files/0004_c._chou_c._uang_.pdf#page=19). The formulas above are the implementation's derivation for relative coordinates; the report's illustrated energy balance uses an absolute-energy convention. Bridge Lab retains its existing elastic teaching-model scope and 10× visual displacement.

The arrows use SVG inside the existing measurements panel. Each diagram has an accessible description including the trial, time, flow directions, magnitudes, and net stored-energy rate. Color is supplemented by arrow direction, dots, numbers, and text. Updating the flow adds no 3D meshes or independent animation loop.

## Verification

**110 distinct checks pass: 89 unit assertions and 21 Chromium workflows.** The browser run uses one worker, no retries, and has no skipped or flaky results. Desktop and phone screenshots were visually inspected.

Model checks compare rates with the equation of motion and independently calculated slopes of the energy histories. They cover all response modes, damping bounds, negative input power, zero input, undamped free vibration, interpolation, and quadratic scaling with shaking amplitude. Interaction and browser checks cover A/B scope, folded measurements, replay consent, fullscreen, narrow layouts, reduced motion, and graphics recovery.

The initial run passed all 63 interaction assertions and 25 of 26 model assertions. One new negative-input test fixture did not cross its chosen magnitude threshold at 10% damping. It was corrected to a verified 5% damping case, and all 26 model assertions passed on rerun. The verifier uses the latest result for each assertion and counts each once; both original reports are retained.

Both Bridge Lab source copies match. Syntax, scoped whitespace checks, and all **1,027** literal English fallbacks in both registries pass.

Run from the repository root:

    node reports/bridgelab-energy-transfer-2026-09-30/verify.cjs

- [Initial unit results](unit-results.json)
- [Final model results](unit-model-results.json)
- [Browser results](browser-results.json)
- [Source and coverage verification](source-verification.json)

## Previews

- [Desktop energy transfer](bridge-1000-energy-transfer.png)
- [Phone energy transfer](bridge-320-energy-transfer.png)
