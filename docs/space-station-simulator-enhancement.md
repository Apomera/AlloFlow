# Space Station simulator enhancement

The station tool now connects three kinds of investigation: interior momentum,
orbital maneuvers, and close-range spacecraft control. The map provides direct
routes into each experience. Existing crew-shift activities, learning checks,
keyboard navigation, reduced-motion behavior, and diagram alternatives remain.

## Physics and scope

- **Momentum bench (Inside → Unity):** SI-unit impulse, coasting, and analytic
  one-dimensional contact between adjustable crew and cargo masses. Catching is
  perfectly inelastic; the comparison bounce is perfectly elastic. Momentum is
  conserved at contact in both modes. Energy converted to deformation/heat is
  reported separately. Point masses start 2.5 m apart; the drawing offsets them
  vertically for clarity. Walls, air drag, and rotation are omitted. Time is
  scrubbed explicitly, with contact and five-second step controls. User-started
  playback runs at 1×, 4×, or 10× simulation speed.
- **Orbit transfer planner:** two-body Hohmann transfer with signed burns,
  vis-viva speeds, and Kepler-equation time propagation. Both burns are required
  to reach a circular destination orbit. The state display respects the existing
  prediction-before-answer exercise. Impulsive coplanar maneuvers omit finite
  burn duration, inclination changes, and perturbations. The coast can play at
  30×, 120×, or 300×; it stops at arrival and still requires the second burn.
- **Atmospheric drag investigation:** drag force and secular altitude decay
  depend on density, speed, frontal area, drag coefficient, and station mass.
  The atmosphere is an illustrative exponential model, not a weather forecast
  or an operational orbit prediction.
- **Docking:** linear relative orbital dynamics near a circular reference orbit;
  explicit simulation time, finite RCS propellant, inertial coasting, and
  terminal contact checks. Vehicle and thruster parameters are illustrative,
  not specifications for a named real spacecraft. The braking display checks
  remaining propellant using the rocket equation, budgeting both fixed thrust
  axes separately. Its distance estimate assumes constant initial acceleration;
  it is not a full powered trajectory or a guarantee of a clear capture path.
  The coast forecast uses the same relative-motion integrator as live flight,
  with a selectable 30, 60, or 120-second window and all thrusters off, including
  rate hold. The path and accessible readings stop at first contact or approach
  zone exit, using the simulator's actual speed and alignment capture limits.
  Rendezvous, final-approach, and cross-drift practice starts restore the vehicle
  and pause for inspection; retry repeats the selected start. Forecast controls
  never advance time or consume fuel.
- **EVA torque investigation:** a timed 0.5-second wrench pulse followed by
  2 seconds of free coast. Angular acceleration is −torque/inertia while the
  pulse is active; angular velocity and angular momentum persist afterward.
  Adjustable model inertia (16–64 kg·m², default 32) changes the response to the
  same angular impulse. The inertia stays fixed during each trial; changing a
  setting resets time. Restraints cancel body torque. Live body angle, angular
  speed, net torque and a speed graph share one analytic model with worksite
  feedback. Playback, scrubbing, and exact cutoff/end-of-coast inspection work
  with keyboard and touch. This illustrative one-axis model omits tether
  tension, joint motion and damping; it is not an operational EVA procedure.

Playback starts only on request, including with reduced motion enabled. Seeking,
changing an experiment's setup, hiding the page, or leaving the experiment stops
its clock. Saved projects retain elapsed time but never restore active playback.
Long frame stalls are capped to avoid a large catch-up jump. Changing the
departure altitude discards the old transfer state.

## Physics references

- [NASA Glenn: conservation of momentum](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/conservation-of-momentum-2/)
- [MIT OpenCourseWare: Clohessy–Wiltshire relative motion](https://ocw.mit.edu/courses/16-346-astrodynamics-fall-2008/e4f0632a9f1c98f7e9b25492e1a30eb1_lec_26.pdf)
- [NASA Glenn: specific impulse](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/specific-impulse/)
- [NASA Glenn: torque and angular acceleration](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/torque-moment/)

## Local review

`node dev-tools/space_station_enhancement_qa.cjs --serve` provides a local
working-tree preview. `--capture` exercises the actual browser implementation
and saves desktop/mobile screenshots under `reports/space-station-enhancement-qa`.
Add `--accessibility --tabs=interior,operations,map,day,systems,orbit,missions,history,quiz`
to run structural axe checks in Chromium, including the answered quiz and its
keyboard focus transitions. This uses the same rules as the existing jsdom
structural checks; color contrast and page-level regions are outside that scan.

Focused Vitest files cover momentum and energy invariants, orbital transfers,
docking dynamics, coast/contact forecasts and fuel budgets, EVA angular impulse,
and playback lifecycle.
The existing `space_station_tool.test.js` suite covers
the tool's learning, persistence, localization, and accessibility contracts.
