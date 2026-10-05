# Bridge Lab energy between moments

October 1, 2026

## Student experience

Open **Energy between moments** in the immersive scene tools or the labelled 2D view. Pin the displayed frame, enter an exact time, or pin the end of shaking. Move replay time to inspect the interval. Earlier and later frames are ordered chronologically, including when scrubbing backwards.

The two stacked bars show kinetic and elastic energy at the interval endpoints. A fixed event scale is shared by A and B. The budget reports signed net input work, damping loss, kinetic and elastic changes, and the change in stored energy. A white square and dashed circle on the energy orbit identify the pin in the selected experiment.

Saved scene observations retain the pin, physical inputs, selected A/B trial and current frame. Notebook and print evidence recalculate the interval; imported cached totals are ignored. Legacy observations do not inherit an unrelated live interval.

## Physics and scope

The existing illustrative elastic lateral mode uses synthetic ground motion for 16 seconds followed by 8 seconds of free vibration. It does not estimate bridge damage or capacity. The scene magnifies motion 10×.

The interval differences the recorded cumulative input work and dissipated energy and the recorded kinetic and elastic energy. The recorded energy terms are interpolated together at each endpoint, preserving the numerical work–energy balance. This differs slightly from the orbit, which computes energy from interpolated displayed motion.

Input work = change in kinetic energy + change in elastic energy + damping loss, within integration error. Negative input work is retained. After shaking, input work is zero; stored energy lost equals energy dissipated by damping. Without damping, free vibration exchanges kinetic and elastic energy while preserving their total. All energy values are per kg of modal mass in the relative coordinate system.

## Validation

- 268 checks across all 16 Bridge Lab unit suites.
- 22 real-WebGL workflows covering exact pins, shared A/B clock and scale, fullscreen, 320 px phone, landscape, reduced motion, labelled 2D, saved evidence, print and graphics loss/recovery.
- Source syntax, identical source/public mirrors, English fallback matches and scoped whitespace checks.
- Captured views were inspected for readable values and controls, whole orbit visibility and clearance below the sticky tools heading.

The initial fork run completed 13 suites and 214 assertions. Under heavy host load, workers for the seismic model, design workflow and tab accessibility suites failed to start. Those three suites were rerun using a single thread worker. Both result files are retained, and verification requires completed passing assertions for every Bridge Lab suite.

Run unit verification:

~~~powershell
$bridgeTests=@(rg --files tests -g 'bridgelab_*.test.js')
node node_modules/vitest/vitest.mjs run $bridgeTests --pool=threads --maxWorkers=1 --teardownTimeout=60000 --testTimeout=30000 --hookTimeout=30000 --silent --reporter=dot --reporter=json --outputFile=reports/bridgelab-energy-interval-2026-10-01/unit-results.json
~~~

Run source and result verification with node reports/bridgelab-energy-interval-2026-10-01/verify.cjs.

## Captured views

- [Desktop interval during shaking](bridge-1000-driven-interval.png)
- [Phone interval during shaking](bridge-320-driven-interval.png)
- [Desktop pinned energy orbit](bridge-1000-pinned-orbit.png)
- [Phone pinned energy orbit](bridge-320-pinned-orbit.png)
- [Free-vibration interval](bridge-1000-energy-interval.png)
- [Phone free-vibration interval](bridge-320-energy-interval.png)
- [Labelled 2D energy interval](bridge-1000-interval-2d.png)
- [Landscape zero-input interval](bridge-844-interval-zero.png)
