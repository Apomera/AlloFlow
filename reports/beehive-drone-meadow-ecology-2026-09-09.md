# Bee drone flight: meadow ecology and predators

The meadow now includes flowering shrubs, tall seed grasses, and reed-like plants on both banks of the existing stream. A separate fixed random stream supplies 324 illustrative plant placements without changing course generation or flight randomness. Seven instanced batches render their foliage, flowers, stems, and seed heads. Eco retains 40% of each batch, balanced 70%, and high all instances. Each prefix spans the route, so reduced detail retains all three habitat layers. Two harmless butterflies also remain visible in Eco.

Predator birds now have bee-eater-inspired colors and silhouettes: tapered wings, a long bill, dark facial markings, and tail streamers. Their forward direction matches their modeled velocity. Reduced-motion mode holds wing poses and warning-ring size steady. The 2D fallback includes corresponding foliage and a recognizable bird silhouette.

**Meadow life & bee predators** is a collapsible field guide after the controls. Opening it pauses live flight. It explains plant forms, harmless butterfly visitors, and real bee predation, with references and an observation prompt appropriate to live flight or pause-and-plan. A text readout reports the nearest valid predator using the existing model encounter thresholds. The guide supports mobile layouts, keyboard access, dark/light themes, and forced colors.

## Science and model boundaries

Bee-eaters catch bees and other flying insects; they are not exclusively honey-bee predators. The visual bird is stylized, and the meadow is not a surveyed location or an African habitat reconstruction. See [RSPB's bee-eater overview](https://www.rspb.org.uk/whats-happening/news/buzz-as-rare-rainbow-birds-set-up-summer-home-in-norfolk) and [SANBI's Southern Carmine Bee-eater account](https://www.sanbi.org/animal-of-the-week/carmine-bee-eater/).

Varied flowering plants and plant structures support habitat diversity; regional species selection matters. The guide links to [Xerces' plant-habitat guidance](https://xerces.org/bring-back-the-pollinators/grow-pollinator-friendly-flowers). Grasses and reeds are presented as habitat structure, not drone refueling sources.

Existing predator rules remain unchanged: close contact costs 15 energy units and up to 10 points, then scatters the bird. The guide explicitly distinguishes this practice mechanic from a fatal real capture. No eating animation or biologically calibrated hunting range was added. New plants and butterflies remain scenery, and drones still do not forage or refuel at flowers.

## Verification

- **28 unit tests passed:** 4 ecology tests, 6 WebGL-runtime tests, and 18 existing height-guide tests.
- **Three distinct browser scenarios passed:** habitat quality scaling and bird orientation; mobile fallback and accessible field-guide pausing; predator contact and retained maneuver evidence.
- After refining the mode-specific prompt and overview capture, the habitat and predator scenarios passed again, including the new pause-and-plan prompt assertion.
- Quality changes preserve scene geometry, physics, hazard positions, flight evidence, and random state.
- Ecology tests cover deterministic independent plant layouts, stream-bank placement, bounded heights, distributed habitat prefixes, invalid predator coordinates, and exact encounter thresholds.
- Visually reviewed the new meadow overview, streamside reeds, and high-detail meadow.
- Source and desktop mirror match, parse successfully, and pass scoped whitespace checks.

## Local artifacts

- Unit log: `scratch/bee-ecology-unit.log`
- Initial browser log: `scratch/bee-ecology-browser.log`
- Final browser log: `scratch/bee-ecology-preview-browser.log`
- Meadow overview: `scratch/beehive-flight-deck/ecology-meadow-overview.png`
- Streamside view: `scratch/beehive-flight-deck/ecology-stream.png`
- Mobile fallback: `scratch/beehive-flight-deck/ecology-fallback.png`
- Field guide: `scratch/beehive-flight-deck/ecology-guide-light.png` and `ecology-guide-dark.png`

Implementation is in `stem_lab/stem_tool_beehive.js` and its desktop public mirror. Changes are local and have not been deployed.
