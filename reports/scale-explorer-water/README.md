# Scale Explorer: water molecular observatory

Water now has measured atom-center geometry, five native inspection stops, and separate structure and geometry-guide views. The catalogue's approximate 275 pm reference stays fixed through inspection, saved views and comparisons.

## Changes

- Replaced the approximate sphere arrangement with NIST's isolated equilibrium geometry: equal 95.78 pm O–H distances and a 104.4776° H–O–H angle.
- Added polished oxygen and hydrogen spheres, exposed two-tone covalent bonds, a gold angle arc, and a teal chemistry polarity arrow.
- Added inspection of oxygen, equivalent hydrogens, an O–H bond, the bend, and polarity. Each camera aims at a visible mesh surface.
- Added measured geometry cards, qualitative charge labels, cited notes and controls for the whole-molecule guides.
- Added a strict saved `waterView` mode. Older observations retain structure mode; new observations and route origins retain the chosen mode and exact camera.
- Reset water's cutaway state for direct navigation and continuous scale entry.

## Verification

The actual adopted app passed **104 unit tests in 14 files and 10 browser cases in four files**, with one worker, zero retries and no source substitution. Both app mirrors, all four English files and the tested source files retained their before/after hashes. `verification.json` records the result; `artifacts.json` indexes exact evidence hashes. The 13 stage images and two control captures show the whole molecule, all native landmarks, structure and guide modes, saved views, phone controls and scale comparison.

The independent geometry review checks measured rendered atom centers, finite positions, normal/winding agreement, WebGL 1 indices, five first-surface picks, 1,000 stable pose transitions and resource disposal. The model has 13 meshes and 11,784 triangles; the largest indexed geometry has 1,617 vertices. Every guide is built once and toggled through visibility.

## Scientific scope

The atom positions represent one rigid isolated equilibrium molecule. The displayed spheres and bond thickness are chosen for inspection. They do not mark a hard atomic surface or a calculated electron-density contour. The 275 pm catalogue reference is an approximate characteristic size, independent of those display radii.

The crossed-tail chemistry arrow points toward the relatively negative oxygen side. The physical electric dipole vector uses the opposite direction. Its displayed length is a direction annotation. The 1.855 D value is a gas-phase ground-state reference. The scene does not simulate liquid water, vibration or intermolecular hydrogen bonding.

## Sources

- [NIST CCCBDB experimental water geometry](https://cccbdb.nist.gov/expgeom2x.asp?casno=7732185), based on [Hoy and Bunker, 1979](https://doi.org/10.1016/0022-2852(79)90019-5).
- [NIST experimental water properties](https://cccbdb.nist.gov/exp2x.asp?casno=7732185), including the dipole measurement from [Shostak et al., 1991](https://doi.org/10.1063/1.460471).
- [IUPAC electric dipole definition](https://goldbook.iupac.org/terms/view/E01929/html).

Detailed source downloads, hashes and display conventions are retained in the indexed science evidence. Exploratory failures remain separate from final pass counts. Changes are uncommitted and unstaged.

## Preserved exploratory failure

The first candidate browser run failed after the test used the explicit structure and guide mode controls incorrectly. The raw failure report, log, proof, configuration, error context and failure screenshot are retained under `exploratory/browser-mode-assumption-attempt-1`. The corrected test completed in a separate candidate run. This exploratory result is excluded from the final actual-source pass counts.

Full candidate code, staged translations and the large science archive remain in the indexed scratch evidence. This report copies compact science proofs, source references, raw final results and actual stage captures.

## Post-copy integrity audit

After the tests and original report copy, the source and public English files changed in four Perception camera-overview entries. All 1,738 Scale Explorer entries, including the 26 water defaults, retain their exact section bytes. Both app mirrors and all tested files retain their tested hashes; the build and app-build English copies were whole-file identical at the audit.

The original verification, raw results and artifact index remain historical evidence for the tested version. Their full-file before/after checks describe the test and original-copy periods. The separate post-copy-english-audit.json records the later unrelated English changes; whole-file English hashes in that audit are dated snapshots. The completion guard checks current source and tests plus the exact Scale Explorer sections.
