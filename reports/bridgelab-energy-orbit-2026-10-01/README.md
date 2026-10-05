# Bridge Lab: energy orbit

October 1, 2026 · Local changes are uncommitted.

## What changed

- Added an optional Energy orbit beside the force lens. The graph follows the displayed relative displacement and velocity, with a moving point, energy radius, and separate kinetic, elastic, and stored energy readings.
- Added full experiment paths: dashed during shaking and solid during free vibration. A reference and B current share the same fixed scale and clock, so their decay remains directly comparable.
- Added Next turning point and Next center crossing controls. These pause the scene at estimated free-vibration cycle moments and explain the matching energy and force behavior.
- Folded tools retain a compact stored energy reading. Saved scene observations restore the orbit preference and exact inspected time; notebook cards and printable evidence recalculate their orbit energies.
- Kept the graph available in the labelled 2D view and during graphics fallback. Larger axis labels and a height limit let the entire plot fit below the sticky header in the landscape Focus drawer.

## Try it

1. In Build, enable Earthquake experiment and choose a 3D viewpoint.
2. Open Measurements, or Scene tools when Focus is active, and expand Energy orbit. Opening it pauses replay.
3. Prepare the 5% / 20% comparison to see both paths, then inspect a turning point or center crossing. Switch A/B to inspect the same time in the other trial.
4. Set damping to zero to compare energy exchange with a damped decay. Fold tools to return to the scene, or save an observation and include its energy values in the evidence report.

## Physics and scope

The phase coordinates are x = ωu and y = v, where u is deck displacement relative to the ground, v is relative velocity, and ω = 2π times the assumed natural frequency. Both coordinates have units of m/s. From the existing elastic model, stored relative modal energy per kg is (v² + ω²u²)/2, so half the squared orbit radius equals stored energy.

After shaking ends at 16 s, an undamped mode exchanges elastic and kinetic energy at constant stored energy. With viscous damping, stored energy decreases and the orbit contracts. During shaking, input work can add or remove energy, so the dashed part need not contract. These model relationships follow the single-degree-of-freedom formulation in [FEMA 451B, Topic 3](https://www.ce.memphis.edu/7119/pdfs/feam_notes/topic03-structuraldynamicsofsdofsystemsnotes.pdf); the orbit construction is derived here from that energy expression.

Cycle times are estimated by locating zero crossings of the same 60 Hz interpolated motion used by replay. Turning points set relative velocity to zero; center crossings set relative displacement to zero. Controls inspect only free vibration from 16 to 24 s and become unavailable after the last matching moment. Zero shaking produces no fabricated cycle.

The orbit reads energy from displayed motion. Between stored samples, linear motion interpolation can cause a small energy variation even in an undamped orbit. The existing energy timeline interpolates recorded energy separately. The graph is part of the existing single elastic teaching mode; bridge motion remains magnified 10× and the earthquake model is independent of static member checks.

## Verification

- 186 distinct checks passed: 170 unit checks across 5 suites and 16 real WebGL workflows.
- Checked energy-radius identity, shared A/B bounds, undamped conservation and damped decay at integration samples, zero shaking, exact interpolated force/energy zeros, and cycle times against an independent analytic free-vibration solution.
- Checked paused inspection, reduced motion, keyboard tools, fullscreen, saved preference and time restoration, recalculated printable evidence, labelled 2D view, and deliberate graphics recovery.
- Reviewed desktop, phone, and landscape captures. Browser assertions check the complete graph fits below the sticky scene header. Verified source mirrors, JavaScript syntax, 1100 English fallbacks in both registries, and scoped Git whitespace checks.
- The verifier uses the latest completed result for each named check. An initial undamped assertion was refined to a relative integration tolerance; the 2D harness setup and landscape spacing were corrected and rerun. Earlier results are retained for traceability.

[Verification data](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-energy-orbit-2026-10-01/source-verification.json) · [Verifier](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-energy-orbit-2026-10-01/verify.cjs)

Final source SHA-256: 125cc8221de044567fc5f3d311f09bb66aa67bd31439487c57e044808f13eff1

## Screenshots

![Energy orbit in the bridge scene](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-energy-orbit-2026-10-01/bridge-1000-energy-orbit.png)

[Phone orbit](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-energy-orbit-2026-10-01/bridge-320-energy-orbit.png) · [Folded scene tools](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-energy-orbit-2026-10-01/bridge-1000-orbit-scene.png) · [Zero shaking in landscape](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-energy-orbit-2026-10-01/bridge-844-orbit-zero.png) · [Labelled 2D orbit](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/bridgelab-energy-orbit-2026-10-01/bridge-1000-orbit-2d.png)
