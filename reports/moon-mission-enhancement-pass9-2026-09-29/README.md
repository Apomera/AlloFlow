# Moon Mission enhancement, pass 9

Phase 5 now includes a computed powered approach from lunar orbit to 300 metres. The spacecraft brakes from 1,672.6 m/s sideways while its descent engine supports it against lunar gravity. Position, speed, thrust direction and fuel use come from the same integrated state.

- Added curved lunar dynamics with inverse-square gravity, centrifugal and radial/tangential coupling terms, changing vehicle mass, finite DPS thrust and throttle response. Available propellant bounds engine impulse.
- Added 600, 720 and 900 second computer-guidance plans. The nominal plan reaches 300 m at 9.001 m/s downward and 4.000 m/s sideways, using 7,225.9 kg of propellant. The short plan requests maximum thrust for 135.3 s; the longer plan uses more fuel supporting the vehicle.
- Added whole-approach and local cameras with equal physical axes, a spherical lunar limb, schematic surface texture, measured trail and velocity arrow, and an enlarged lander whose tilt and plume follow computed thrust.
- Added measured instruments, plan comparisons, saved pause/play, three playback rates, seeking, keyboard End/Home and two approach milestones. Hidden pages freeze the clock; resizing and camera changes preserve physical values.
- Recorded review survives rewind/reload. Changing the plan clears it. Malformed completion records restart unverified and clear the stored result. Review awards no points.
- Added approach evidence to flight reports, archived summaries and the debrief. Replay clears the plan, run and controls.

The approach is an educational preset, with continuous throttle and instantaneous guidance attitude. The existing 300 m landing practice starts from rounded speeds and resets its reserve according to difficulty and mission decisions. The UI states that separation explicitly. See [equations, measured results and primary sources](PHYSICS.md).

## Verification

All **455 distinct unit checks across 49 files** and **five Chromium workflows** pass. The exact scoped commit candidate passes **21 focused checks**. Physics checks cover conserved vacuum motion, propellant flow, torque, position derivatives, tiny fuel reserves, all three plans and an independent Cartesian midpoint integration.

Browser checks cover both cameras, physical instruments, review/rewind/reload, plan invalidation, corrupted terminal saves, the transition into manual landing with its unchanged practice reserve, hidden-page clocks, 320 px keyboard controls, resizing and accessibility. The phone layout has no horizontal overflow and **zero scoped WCAG axe violations**. Six final captures were reviewed. A sampled circular lunar horizon removes an oversized-canvas-circle edge artifact; a real-pixel browser check covers that fix.

See [verification](verification.json), [full unit results](unit-verified.json), [browser results](browser-verified.json), [candidate tests](candidate-tests.json) and [source checks](source-verification.json).

The first browser run exposed a corrupt result remaining in persistent state after the view rejected it. The canvas now clears rejected results explicitly; the same browser case passes. Initial unit failures were two test assumptions: torque was compared at different times, and the replay check used the wrong archive key. The independent physics check already passed. Original failed results are retained. A later broad run reported `STACK_TRACE_ERROR` in one dashboard check after 13 seconds; its suite passed unchanged in isolation. The raw broad run and rerun are retained, and the final unit report consolidates them by suite file and parameterized case index. No test timeout was increased.

Captures: [whole approach](browser/approach-whole-chromium.png), [local frame](browser/approach-local-chromium.png), [2 km approach](browser/approach-low-gate-chromium.png), [handover](browser/approach-handover-chromium.png), [short plan](browser/approach-short-plan-chromium.png), [320 px phone](browser/approach-phone-320-chromium.png).

Canonical/public parity and JavaScript syntax pass. The commit excludes the 34 recorded pre-existing Moonwalk hunks; those remain in both working source files. Shared handoff, baseline copies, browser trace directories and commit scratch files remain outside this enhancement commit. Unrelated staged work is preserved. No push, deployment or package build.
