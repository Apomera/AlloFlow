# Be the Water: leaf detail and plant transport illustrations

The five plant leaves now share a small, deterministic surface texture with subtle shading and fine vein accents. Each leaf has UV coordinates that follow its length and width. Existing curved surfaces, branching veins, and the near-camera fade remain in use. The surface pattern is decorative botanical detail, not a measured cellular or stomatal map.

The plant pathway card includes a compact illustration that follows the journey:

- Root uptake: liquid water enters the roots.
- Stem transport: enlarged xylem channels carry liquid upward.
- Leaf arrival: a magnified pore previews the next liquid-to-vapor step and explicitly says that vapor is invisible.

The illustrations use fixed geometry and readable text, remain still during motion, and are hidden from assistive technology because their adjacent text supplies the meaning. They reuse the existing compact teaching-card layout and forced-color treatment. The stage thresholds organize the schematic journey; they are not physical measurements of plant anatomy. The simulation kernel and energy rules are unchanged.

Scientific reference: [USGS, Evapotranspiration and the Water Cycle](https://www.usgs.gov/water-science-school/science/evapotranspiration-and-water-cycle). Its explanation distinguishes uptake of liquid water, transport through plant tissue, and release of vapor through leaf stomata.

Mobile forced-colors review also found that the Reset control retained pale yellow text on a light system background. The Reset label and form badge now use system text colors. Pilot buttons explicitly use matched system button or selection colors in forced-colors mode, preventing text backplates from obscuring selected labels; the final screenshot confirms the labels are visible.

## Validation

- Existing pilot experience and kernel regressions: **117 passed, 0 failed** (`pilot-plant-detail-regressions.json`).
- JavaScript syntax check passed; canonical and desktop mirror hashes match.
- Browser checks passed across the plant-stage/camera run and the final focused mobile run (`--mobile-only`). The final mobile run covers normal and forced colors, layout, guide visibility, shared geometry/material/texture cleanup, and browser errors. Screenshot review confirmed selected controls remain legible. The initial audit scope was corrected to target the live pilot interface after checkpoint restoration dismisses its notice.
- Browser acceptance script: `dev-tools/watercycle_pilot_plant_detail_qa.cjs` checks shared textures, valid UVs, all three guide stages, both cameras, paused and reduced-motion behavior, actual leaf arrival, checkpoint restoration, mobile layout, forced colors, accessibility, and disposal of shared leaf resources.
- Visual captures: `scratch/water-plant-detail-review/`.

Source: `stem_lab/stem_tool_watercycle.js`, mirrored in `desktop/web-app/public/stem_lab/stem_tool_watercycle.js`.
