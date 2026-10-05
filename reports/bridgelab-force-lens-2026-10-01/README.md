# Bridge Lab: force lens

October 1, 2026 · Local changes are uncommitted.

## What changed

- Added an optional Force lens in the scene tools, with gold spring, violet damping, and white net force arrows. Signed readings follow the selected A/B trial and exact replay frame.
- Kept one force scale for the full event and both comparison trials. The camera can turn, walk, and tilt while the arrows retain the physical direction across the bridge. Geometry is reused during replay.
- Added a compact color legend when tools are folded. Phone arrows sit above the drawer; small nonzero forces use smaller origin markers so the marker does not cover the arrow.
- Connected force readings to relative velocity and damping power. Saved scene observations retain the lens preference and print recalculated spring, damping, and net force values.
- Kept manual inspection usable with reduced motion and graphics fallback. Fixed focus restoration after graphics failure during native fullscreen exit.

## Try it

1. In Build, enable Earthquake experiment and choose a 3D viewpoint.
2. Open Measurements, or Scene tools when Focus is active, and expand Force lens. Opening it pauses replay.
3. Inspect a key moment or replay the event. Fold tools to see the arrows with their compact legend. A/B switches preserve the shared clock and force scale.
4. Record and save a scene observation. Its notebook card and evidence report include the forces at the saved time.

## Physics and scope

For relative displacement u and relative velocity v, the existing elastic teaching model gives Fs/m = −ω²u and Fd/m = −2ζωv. Their sum is the deck acceleration in a stationary frame. Damping removes relative modal energy at −(Fd/m)v. These relationships follow the base-excited single-mode formulation in [FEMA 451B, Topic 3, slides 57–58](https://www.ce.memphis.edu/7119/pdfs/feam_notes/topic03-structuraldynamicsofsdofsystemsnotes.pdf).

Arrow position is schematic and arrow length uses a separate force scale. Bridge motion remains magnified 10×. The earthquake model is independent of static member colors and safety factors; it does not predict bridge damage. Between stored time samples, force-lens power is derived from the interpolated velocity, while the existing energy timeline interpolates sampled power.

## Verification

- 171 distinct checks passed: 159 unit checks across 5 suites and 12 real WebGL workflows.
- Verified force balance, complete-event force bounds, force direction, zero shaking, A/B scales, geometry reuse, walking and camera tilt, saved preferences, printable evidence, reduced motion, and graphics recovery.
- Reviewed desktop, phone, and landscape captures. Checked exact source mirrors, JavaScript syntax, 1082 English fallback keys in both registries, and scoped Git whitespace checks.
- The verifier uses the latest completed result for each named check. Initial new-test selector and interpolation assumptions were corrected. The fullscreen focus regression was reproduced and fixed; its targeted rerun passed. Earlier reports are retained for traceability.

[Verification data](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-force-lens-2026-10-01/source-verification.json) · [Verifier](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-force-lens-2026-10-01/verify.cjs)

Final source SHA-256: 73bd12cb1b7a1bdd9ce456314607c7957f4a8372e47ed4de1df42a7260782250

## Screenshots

![Phone force lens](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-force-lens-2026-10-01/bridge-320-force-walkway.png)

[Riverbank scene](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-force-lens-2026-10-01/bridge-1000-force-bank.png) · [Expanded force tools](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-force-lens-2026-10-01/bridge-1000-force-tools.png) · [Zero shaking in landscape](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-force-lens-2026-10-01/bridge-844-force-zero.png)
