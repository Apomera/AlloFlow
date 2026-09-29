# Moon Mission enhancement, pass 5

## Delivered

Lunar ascent now uses a numerical flight model, followed by a separate, controllable final docking exercise. The former timed animation could declare docking and permit the return burn without a measured insertion or safe contact. The new return gate requires both results, and awards its 15 XP once.

- **Ascent:** fixed APS thrust, changing vehicle mass, finite propellant, spherical gravity, bounded pitch guidance and computed orbital insertion. Nominal cutoff is 436.17 seconds into a 19.03 × 85.00 km ellipse, with 138.46 kg APS propellant remaining.
- **Final approach:** a 120 m exercise around a circular 110 km reference orbit, using Hill relative-motion equations, finite RCS fuel and one-second precision pulses. Safe contact checks radial offset, closing speed and radial drift. Guided flight uses the same forces, fuel and contact rules as manual flight.
- **Visuals:** detailed ascent stage and descent remnant, deterministic vacuum exhaust and shallow liftoff dust, a measured trajectory, calibrated scale, insertion ellipse, aligned docking ports and separate RCS jets for each commanded axis.
- **Controls and records:** time scrubbing, insertion review, mission instruments, keyboard and touch pulses, guidance, pause, retries, saved progress, flight history and report output. Hidden tabs do not advance either clock. Paused canvases remain painted after resizing. Canceling a pulse extinguishes its jets.
- **Progression:** legacy or malformed completion flags cannot unlock the return burn. Review and guided completion do not award points. An unresolved mission event continues to block progression.

The intervening orbital rendezvous burns are explicitly omitted. The final approach holds attitude aligned and simplifies contact mechanics. The educational presets and contact tolerances are not a replay or certification model of Apollo hardware. See [physics details and NASA references](PHYSICS.md).

## Verification

**354 distinct unit checks across 38 files passed**, counting the latest executed result of each assertion. **Nine distinct Chromium scenarios passed.** The final keyboard scenario was rerun after the canceled-jet visual correction; it is counted once.

- Physics checks include independent analytic Hill solutions, conserved coast quantities, mass/fuel balance, rocket-equation impulse, exact fuel depletion, step convergence, bounded thrust, insertion failure and unsafe contact.
- Browser checks cover numerical readings, engine cutoff, deterministic paused views, reload, hidden clocks, reduced motion, guided capture, collision/retry, manual fuel use, one-time reward and keyboard control.
- Reviewed seven desktop and phone captures, including 390 px and 320 px layouts. No horizontal overflow or clipped controls in the checked phone flows. The scoped WCAG 2 A/AA and 2.1 A/AA axe check returned zero violations.
- Both runtime files pass JavaScript syntax checks, scoped whitespace checks and exact source parity. The final hash is in [source verification](source-verification.json).

Evidence:

- [Distinct unit results](verification.json)
- [Powered ascent](ascent/ascent-powered-chromium.png)
- [Insertion orbit](ascent/ascent-insertion-chromium.png)
- [Paused phone view](ascent/ascent-paused-phone-chromium.png)
- [Guided docking](ascent/docking-guided-phone-chromium.png)
- [Unsafe contact](ascent/docking-fast-contact-chromium.png)
- [Manual approach](ascent/docking-manual-chromium.png)
- [Final 320 px keyboard view](ascent/docking-keyboard-320-chromium.png)

The initial regression run caught the unsynchronized desktop mirror. Synchronizing it resolved the parity check. Two old test assumptions were corrected: returning within the existing progression-lock interval, and the former scripted canvas description. Targeted reruns passed; their earlier results remain in the report files for traceability. A transient Windows mapped-file lock cleared on the normal copy retry.

## Scope and saved work

Canonical runtime: `stem_lab/stem_tool_moonmission.js`; desktop mirror: `desktop/web-app/public/stem_lab/stem_tool_moonmission.js`.

Added physics, playback, visual and browser tests. Updated rendered ascent assertions in the existing ascent and Moon/splash suites; retained the legacy pure-helper coverage. The pre-existing Moonwalk, terrain and material work remains intact, as do unrelated workspace and index changes.

The baseline desktop snapshot is the complete source before this pass (SHA-256 `65d3ea31e3323581a50d13a50247e6fd3797668301664985dae8a9f59025958e`). The canonical-at-resume snapshot also includes the first delegated ascent helper changes. The narrow patch records this pass against the pre-pass desktop baseline.

**All work is left unstaged and uncommitted at the user's request. No push, deployment or packaged build was performed.**
