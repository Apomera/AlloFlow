# Scale Explorer — the Milky Way in depth

## Experience

- Replaced the flat luminous disc with a volume of starlight and absorbing dust, supported by 22,000 illustrative stellar points and an enlarged Sun locator.
- Added a central bar and bulge, broad spiral arms, finer branches, a thin stellar disc, and a dust lane whose appearance changes with viewing direction.
- Added four sourced landmarks: our Sun’s neighbourhood, the central bar and bulge, spiral arms, and the disc seen edge-on.
- **View from above** and **View edge-on** approach the model in its own coordinate system. Repeating a preset restores its direction after manual orbit.
- The Sun’s neighbourhood offers a journey into the existing Solar System destination.
- Saved observations retain the landmark and actual viewing direction. The existing landmark navigator, phone layout, reduced motion, and orthographic comparison remain available.

## Scientific scope

The nominal stellar disc diameter remains 9.5 × 10²⁰ metres, approximately 100,000 light-years. The Sun locator is placed at about 26% of this diameter from the centre, approximately 26,000 light-years. Star points, arm paths, dust, colors and vertical structure are illustrative; this is not a measured exterior photograph. The extended halo is outside this model. These limits are explained in the interface.

Primary references:

- [NASA: Solar System facts](https://science.nasa.gov/solar-system/solar-system-facts/) — our location near the Orion Spur.
- [NASA: The Milky Way Galaxy](https://science.nasa.gov/resource/the-milky-way-galaxy/) — stellar arms and central bar.
- [ESA: Guide to our galaxy](https://www.esa.int/Science_Exploration/Space_Science/Gaia/Guide_to_our_galaxy) — disc, bulge, bar and Sun’s distance.
- [ESA: Stellar density map](https://www.esa.int/ESA_Multimedia/Images/2015/07/Stellar_density_map) — absorbing dust in the galactic plane.

## Implementation

A deterministic 128 × 32 × 128 field is packed into a 1024 × 512 RGBA texture (2 MiB). A 64-step shader integrates the volume, while stellar light samples dust along each line of sight. Perspective and orthographic rays share the same field. Point brightness accounts for subpixel size so small distant stars do not become uniformly bright pixels.

The renderer uses a single volume mesh and one stellar point cloud. The galaxy participates in the existing cache and resource disposal. There are no new runtime dependencies or remote assets. The main source and desktop mirror were synchronized with 327 atlas strings.

Camera landmarks can now specify a viewing direction and a separate framing centre. Markers and the focus ring continue to mark the feature’s actual location. Manual orbit interrupts an approach; recorded views restore their saved direction.

## Verification

- All 108 unit assertions passed across five suites. See `unit-results.json`.
- All four dedicated galaxy browser scenarios passed with the final model, including actual WebGL 1, saved phone viewpoints, orthographic dimensions, and camera presets.
- All 37 browser scenarios passed in the final regression run (10.6 minutes, one Chromium worker), covering the galaxy, atlas, comparisons, inquiry, inspection, landmarks, microbiology, navigation, nebula, notebook, planets, and Sun. See `browser-results.txt`.
- The source and desktop mirror matched SHA-256 `FD5683F5AD83B3751864E45D2BA715BEC64D1310CCB93BAB5C8CB387C4D90734`; the preview returned HTTP 200.

Visual evidence:

- `galaxy-overview.png`
- `galaxy-from-above.png`
- `galaxy-edge-on.png`
- `solar-neighbourhood.png`
- `central-bar.png`
- `phone-edge-on.png`
- `phone-solar-neighbourhood.png`
- `galaxy-nebula-comparison.png`

Preview: http://127.0.0.1:54391/?tool=scaleExplorer&focus=milkyway&v=galaxy
