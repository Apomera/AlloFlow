# Scale Explorer: red blood cell

The red blood cell now has a measured resting profile, a local anatomy window, and five selectable landmarks. The cell's 7.5 µm catalogue diameter remains the measured dimension in the intact, opened, and inspected views.

## What changed

- Replaced the approximate deformed sphere with the Evans–Fung biconcave profile. Both dimples remain enclosed; the cell contains cytoplasm through its thin centre.
- Added native inspection of the dimples, thicker rim, membrane, spectrin scaffold, and hemoglobin. The scaffold is an irregular enlarged sample beneath the membrane.
- Added one experimental hemoglobin backbone guide from human deoxygenated PDB 2HHB: two alpha chains, two beta chains, 574 retained alpha-carbon positions and four heme groups. Other protein particles are illustrative samples.
- Added a warm blood environment with restrained drifting background cells, phone framing, and reduced-motion behavior.
- Added an explicit saved-window flag. Older RBC observations retain an intact whole view; newly saved windows and native anatomy views restore intentionally. Slider and journey entry start intact.

## Evidence

The actual app source passed **96 unit tests and 10 browser cases**, with one worker, zero retries and no source substitution. Both source mirrors and all tests remained unchanged. Verification is recorded in `verification.json`; exact artifact hashes are listed in `artifacts.json`. Candidate runs and exploratory failures remain separate in the indexed scratch evidence.

The standalone geometry review checks closed dimples, fixed diameter, finite geometry, normal/winding agreement, WebGL 1 indices, all five first-hit anatomy targets, 1,000 stable pose changes, and owned-resource disposal. The reviewed model contains 14 meshes and 99,612 triangles. The largest indexed batch contains 11,907 vertices. The section mesh retains every one of its 128 outer and 80 window boundary edges.

Desktop and 330 px phone captures cover the intact cell, opened window, all landmarks, and return to the whole view. Browser checks cover anatomy selection, keyboard and gesture inspection, comparison, continuous scale entry, and saved-view restoration. All final browser checks passed against the adopted source.

## Scientific scope

This is an educational view of a resting mature human red blood cell. The measured profile is scaled to the catalogue's 7.5 µm diameter. Membrane layers, filament thickness, protein size, spacing, colors and background-cell placement are composed for readability. It does not model blood flow, cell deformation or oxygen binding.

The hemoglobin guide follows alpha-carbon coordinates and selected heme heavy atoms. It does not show every atom or secondary-structure ribbon. The deoxygenated 2HHB snapshot has no bound oxygen. Heme organic bonds use a distance rule; bond orders and iron coordination are not represented.

The section surface was generated offline. A Python/SciPy attempt failed with a local native runtime error; the verified replacement used Delaunator 5.0.0. Only the resulting mesh data are embedded in the app. No new runtime dependency was added.

## Primary references

- [Evans and Fung, 1972](https://doi.org/10.1016/0026-2862(72)90069-6), original erythrocyte geometry measurements; coefficients reproduced in Eq. 7 of [Dao et al., 2003](https://www.mit.edu/~mingdao/papers/JMPS_2003_Red_Blood_Cell.pdf).
- [Pan et al., 2018](https://doi.org/10.1016/j.celrep.2017.12.107), membrane-preserved erythrocyte cytoskeleton and irregular spectrin network.
- [Sae-Lee et al., 2022](https://www.sciencedirect.com/science/article/pii/S2211124722009056), mature red blood cell protein organization.
- [RCSB PDB 2HHB](https://www.rcsb.org/structure/2HHB), human deoxygenated hemoglobin, and its [primary structural paper](https://doi.org/10.1016/0022-2836(84)90472-8).

Changes remain uncommitted and unstaged.
