# Earthquake experiment: mechanics and limits

## What the experiment calculates

The deck is represented by one elastic lateral vibration mode. Its displacement relative to the moving ground, `u`, follows:

`u'' + 2 ζω u' + ω²u = −a_ground`

Here `ω = 2πf_n` is the assumed natural frequency and `ζ` is the damping ratio. Absolute deck displacement is ground displacement plus `u`; absolute deck acceleration is relative acceleration plus ground acceleration. These reference frames follow the base-excitation formulation in [FEMA 451B, Topic 3, slides 57–58](https://www.ce.memphis.edu/7119/pdfs/feam_notes/topic03-structuraldynamicsofsdofsystemsnotes.pdf).

Three teaching modes use natural frequencies of 0.65, 1.10, and 1.80 Hz. They vary assumed stiffness per unit modal mass. They are independent of the chosen bridge shape and do not rank truss, arch, or suspension bridges by earthquake safety. Matching input and natural frequencies can amplify response; real earthquake shaking contains many frequencies. See [USGS: resonant frequency and earthquake response](https://www.usgs.gov/programs/earthquake-hazards/science/washington-dc-stone-and-brick-buildings-vulnerable-distant).

## Shaking and energy

The input is a synthetic 16-second sinusoidal displacement packet with a smooth `sin⁴` envelope, followed by 8 seconds of free vibration. Ground velocity and acceleration are analytic derivatives of that displacement. The packet is scaled to the selected peak ground acceleration on the integration grid. It starts and ends with zero ground displacement, velocity, and acceleration.

The numerical solution uses fourth-order Runge–Kutta integration at 240 steps per second and stores 60 samples per second. Scene and readout values use the same clamped interpolation. Peak values use all integration steps. The 3D scene magnifies displacement 10×; numerical values and the history chart retain model units.

Energy is measured **per kilogram of modal mass in the relative-motion system**, not for the entire bridge:

- Relative kinetic energy: `½(u')²`.
- Elastic strain energy: `½ω²u²`.
- Cumulative viscous dissipation: `∫2ζω(u')² dt`.
- Net effective input work: `∫−a_ground u' dt`.

Starting from rest, net input work equals kinetic energy plus strain energy plus dissipation, apart from numerical error. Input work can decrease when motion returns energy; cumulative dissipation cannot decrease. After the input stops, damping converts remaining mechanical energy into dissipated energy. With zero damping, free vibration continues and mechanical energy is conserved.

## What the result does not establish

The response mode has assumed properties. It is not calculated from the static truss geometry, material, member area, or current vehicle load. Static member-force colors and safety factors remain a separate analysis.

This model does not predict earthquake damage, bridge capacity, total bridge energy, earthquake magnitude, multiple vibration modes, nonlinear yielding, foundation or soil response, differential support motion, or failure of connections and bearings. Its purpose is to let learners compare frequency, damping, displacement, acceleration, and energy under a controlled common input.

## Numerical checks

The focused model tests verify zero input, linear displacement/acceleration scaling, quadratic energy scaling, independent work–energy balance, an analytical damped free-vibration solution, resonance under equal peak ground acceleration, damping effects, consistent ground derivatives, finite control boundaries, and sample interpolation. All 12 checks passed when the helper was completed.

## Direct inertia example

The Forces tab now asks for an assumed mass in tonnes and an assumed acceleration in g. It converts these to kilograms and metres per second squared, then shows `F = m × a` in kilonewtons. For example, 100 tonnes at 0.5 g gives 490.33 kN. This is an ideal rigid-body inertia example, not an estimate of bridge base shear.

The previous unsupported magnitude-and-distance formula for peak ground acceleration and its derived damage-intensity output were removed. Four behavior checks verify the unit conversions, zero acceleration, bounded restored values, independence from the obsolete inputs, and paused navigation into the motion experiment.

## Seismic design explanations

The Forces tab now explains strength, ductility, and isolation without a collapse-prevention guarantee. Isolation can reduce transmitted forces while increasing deck displacement; bearing travel and energy dissipation both matter. These corrections follow the [FHWA LRFD Seismic Analysis and Design of Bridges Reference Manual](https://www.fhwa.dot.gov/bridge/seismic/nhi130093.pdf), sections 9.1.1.2 and 10.12.3. These mechanisms are background context; the experiment simulates an elastic mode with viscous damping.
