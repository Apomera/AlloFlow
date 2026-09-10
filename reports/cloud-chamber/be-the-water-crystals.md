# Be the Water: ice and snow refinement

The snow parcel now has six branching arms, a central hexagonal plate, shallow bevels, and fine edge highlights. The geometry is constructed once as a single extruded mesh, with a separate edge outline. The opaque ice-colored material uses the existing shared sky environment. This is an enlarged representative crystal, not a simulation of crystal-habit growth.

The surrounding snow field now uses an original 128 × 128 transparent flake texture instead of a round glowing dot. It retains the existing 76 particles, deterministic drift, and phase visibility. A slight increase in sprite size preserves the finer branches at a distance. The ice parcel retains its hexagonal geometry and gains a subtle edge outline.

Snow tumbles more gently with a readable initial tilt. Snow, ice, vapor-marker, self-cloud, and cloud-veil rotations now respect pause, reduced motion, and document visibility. The simulation's phase rules, gravity, collection thresholds, and movement controls are unchanged.

The snow explanation no longer claims that the parcel has already remained frozen all the way to the ground. It describes the current solid state, natural variety, and the model's melting boundary. The versioned `pilot_form_snow_science_v2` key prevents stale translated copy from replacing the corrected fallback; both English dictionaries include the new explanation.

Scientific context: [NOAA NESDIS: How Do Snowflakes Form?](https://www.nesdis.noaa.gov/about/k-12-education/ice-snow/how-do-snowflakes-form) and [NOAA NESDIS: Snowflake Simulator](https://www.nesdis.noaa.gov/about/k-12-education/ice-snow/snowflake-simulator) describe hexagonal crystal structure and the influence of temperature and moisture on crystal shapes. The interface explicitly presents this geometry as one example of natural snow.

## Verification

- `dev-tools/watercycle_pilot_crystal_qa.cjs` passed live WebGL checks for geometry, the transparent snow texture, 76-flake field, four paused parcel rotations, resumed tumbling, and reduced-motion behavior while physics continues.
- A real snow-to-rain transition at the freezing boundary preserved the absorption cue and removed the snow field.
- First-person snow, 390/320 px notice layout, axe accessibility, and exactly-once disposal of geometry, material, flake texture, and shared environment passed. No captured JavaScript or WebGL errors.
- Snow, ice, and first-person screenshots visually reviewed in `scratch/water-crystal-review`.
- All 40 pilot kernel and 77 pilot experience tests passed. Results are in `pilot-crystal-regressions.json` and `pilot-crystal-experience.json`.
- Canonical and desktop tool sources match. Tool JavaScript syntax and both JSON-formatted English dictionaries validated.

The local preview uses the existing address: `http://127.0.0.1:58122/?immersive=1&cloud=1`.
