# Bridge Lab deep review and enhancements

This records the first enhancement pass. The [second pass](../bridgelab-enhancement-pass2-2026-09-27/README.md) adds whole-crossing optimization, per-member force ranges, actual brace intervals, and the evidence portfolio; it supersedes the corresponding model and workflow descriptions below.

## What changed

### Consistent structural results

- The simulator, design brief, printable report, and Inquiry investigations use the same governing strength and Euler buckling analysis.
- Applied load, left/right support reactions, bending moment, and material length are calculated from the actual truss and loading geometry. The previous quantity estimate counted members that were not present in Warren trusses.
- A vehicle load interpolates between load-transfer points, including the supports. This preserves force and moment balance throughout the crossing.
- Zero loads and vehicles directly over a support produce a clear “No member demand” result. They no longer inherit unrelated default forces or an infinite numerical verdict.
- The solver rejects invalid, nonfinite, degenerate, and singular input and checks its equilibrium residual. Restored design settings are bounded before controls, geometry, and analysis use them.
- Pratt and Howe diagrams now draw the solver's actual members, so a member's label, force, and physical location agree.

### Design and investigate

- A design notebook saves four sets of inputs and notes, compares cost for matching loading conditions, and restores trials using the current analysis.
- The member inspector shows signed force, tension/compression, length, stress, buckling length, and governing safety factor. A labelled 2D view identifies the selected member; an expandable table makes all member forces available as text.
- The vehicle crossing test checks every load-transfer point and 2% intervals, plots the safety margin, and jumps to the weakest tested position. Changing the design invalidates the prior result.
- Auto-Drive now moves the vehicle. It stops on manual control, tab/mode changes, page hiding, and unmount. Restored sessions do not resume automatically. Reduced-motion preferences use deliberate steps.
- The 3D view shows the vehicle's location. View selection and camera reset controls make the 2D/3D relationship explicit.
- Lateral braces attach to actual top joints, including the final joint. The buckling model caps the effective unbraced length at the top chord's real extent.
- The optimizer checks the largest force across all members and supports its full 30,000 mm² search range in the controls. It recommends wood, steel, and FRP only; the single-strength model cannot establish the tensile or reinforcement behavior of stone, cast iron, or reinforced concrete.

### Learning, accessibility, and reporting

- Print includes the current loading mode and position, unequal support reactions, both failure checks, governing member, bracing, and actual material quantities. It uses accessible row headers.
- Inquiry records the tested geometry, loading, cost, strength/buckling evidence, and learner notes. Existing observations are preserved and older yield-only records are identified.
- Quiz answers use native radio groups. Results receive focus and an announcement; restored invalid answers do not corrupt scores.
- Selection states, visible keyboard focus, wrapping result rows, and scoped box sizing improve keyboard and phone use. Verbose live results pause announcements during automatic vehicle movement.
- Overbroad claims about bridge codes, inspection intervals, flutter, damping, and safety factors were corrected. A safety factor of 2 is identified as this lab's learning target.
- All 708 literal Bridge Lab translation fallbacks match the root and desktop English registries, with 72 new keys added without changing existing unrelated data. Other language packs use the new English fallbacks until translated.

## Validation

The added tests exercise behavior and engineering invariants:

- A hand-solvable triangular truss with vertical and horizontal loading.
- Joint equilibrium and support reactions across 144 vehicle-position, truss-style, and bay-count combinations.
- Load and cross-section scaling, actual quantities, zero demand, invalid systems, and restored settings.
- Save/restore, notebook capacity, cost comparison, selected-member geometry, crossing test invalidation, malformed saved results, and optimizer recommendations.
- Playback lifecycle, reduced motion, quiz interaction, print consistency, and Inquiry evidence.

Final validation passed **80 focused checks**:

- **63 unit tests**, including structural, workflow, print, Inquiry, playback, quiz, accessibility, mirror, and shared fullscreen/quiz contracts (`final-unit-results.json`). Unrelated tests in the shared files were deliberately skipped.
- **1 render snapshot test**. Only Bridge Lab's intentional digest changed (`render-snapshot-results.json`).
- **16 real Chromium/WebGL tests** against the local working tree. These cover rendering all truss styles, bracing changes, bowed-member behavior, camera controls, canvas reuse/cleanup, auto-drive, and full inspect/sweep/save/restore workflows at 1000, 390, and 320 pixels (`browser-final/.last-run.json`).

Source and desktop Bridge Lab files are byte-identical; their English registry sections also match. JavaScript syntax and scoped patch whitespace checks pass. Browser screenshots were visually reviewed, including the corrected top-joint bracing and phone inspector/notebook.

Selected screenshots: [desktop overview](bridge-1000-overview.png), [phone member inspector](bridge-390-inspector.png), [small-phone notebook](bridge-320-notebook.png), [phone crossing test](bridge-390-sweep.png).

## Model boundaries

This remains an educational static model. Warren, Pratt, and Howe forces solve ideal 2D pin-jointed equilibrium. K-truss internal forces use a deep-beam approximation. Euler checks assume solid square sections and pinned ends. Compression top-chord members use the longest modeled bracing interval, capped at the actual top-chord extent; this is conservative for a shorter final interval.

Inputs and quantities represent one truss plane. Member self-weight is not added automatically; the second truss, deck, bracing material, connections, labor, fatigue, vibration, impact, and multiple vehicles are outside the quantity/strength model. The 3D geometry illustrates a bridge but does not add a separate 3D structural analysis. The simplified material strengths are not design-code material models.

## Primary references consulted

- [University of Alberta: analysis of trusses](https://engcourses-uofa.ca/books/statics/structural-analysis/analysis-of-trusses/)
- [MIT OpenCourseWare: Euler column buckling](https://ocw.mit.edu/courses/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/3ae07fdec6c3066a886e16f3d45534cf_gm12_13notes.pdf)
- [FHWA: LRFD](https://www.fhwa.dot.gov/bridge/lrfd/)
- [FHWA: National Bridge Inspection Standards](https://www.fhwa.dot.gov/bridge/nbis.cfm)
- [WSDOT: Tacoma Narrows failure](https://www.wsdot.wa.gov/TNBhistory/bridges-failure.htm)
- [Taylor Devices: Millennium Bridge damping](https://www.taylordevices.com/structural/millennium-bridge-london-england/)
- [Golden Gate Bridge operator: design and construction data](https://www.goldengate.org/bridge/history-research/statistics-data/design-construction-stats/)
- [JSCE: Akashi-Kaikyo tower damping study](https://doi.org/10.2208/jscej.1995.507_279)
