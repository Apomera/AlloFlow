# Water cycle: visible ice growth

The cold-cloud view now illustrates deposition: vapor adds directly to an existing ice crystal. Eight 2D examples and twelve 3D examples show small, growing and mature six-armed crystals. Hollow cyan marks represent invisible vapor approaching the crystal, and disappear as the illustrated growth finishes. Nearby liquid droplets remain visible. Shapes, particle sizes and timing are schematic.

Open **Storm Lab**, choose **Mountain snow**, then **3D cloud chamber → Inside cloud**. Compare the same setup in **2D chamber**. Use the existing temperature, camera, pause and motion controls. The added explanation distinguishes deposition from freezing and describes supercooled liquid water. The enlarged 3D samples appear only in the cloud inspection view with a subfreezing cloud; 0°C alone does not activate them.

The crystal geometry stays symmetric through camera orbit and the cloud’s nonuniform shape changes. Paused and reduced-motion views retain a range of growth stages. Geometry and materials use the existing scene resource cleanup.

Science references: [NWS winter precipitation](https://www.weather.gov/lmk/winter-precip) and [NWS cloud development](https://www.weather.gov/source/zhu/ZHU_Training_Page/clouds/cloud_development/clouds.htm). Six-armed crystals are one illustrative shape, not a forecast of crystal habit or growth rate.

## Verification

- 7 focused tests passed on the helper extracted from both actual runtimes. They check phase boundaries, sixfold symmetry, connected branches, bounded growth, tracer approach, invalid inputs and deterministic independent results.
- 33 browser checks passed, including the prior coalescence checks and actual 2D/3D ice geometry, orbit, pause/resume, reduced motion, temperature/view gating and phone layout. 5 captures are included.
- Both runtime files match the tested source. All recorded edits reverse to the prior source exactly. The owned browser and test server closed. Nothing was committed.

Run `node reports/watercycle-ice-growth/verify.cjs` from the project root to verify the saved artifacts and installed source.

Final source SHA-256: 5753b1b3d4ee100fda579e4dbccdb910f4faa864acb755df45ff162aa02033e3.

The desktop and phone 3D captures use the full cloud render. After those captures, browser interaction checks hide only the cloud-volume mesh to keep software WebGL responsive. The actual particle geometry, camera and controls remain active. Earlier interrupted diagnostic runs are excluded.
