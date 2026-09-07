# Honey-bee spatial ecology: correcting the RTS map

The previous hard frontier and flowers switching between colony colors implied ownership of a divided landscape. That was a misleading representation of honey-bee foraging. This revision removes that implication from both the 3D landscape and 2D construction board.

## Evidence and interpretation

- **Overlapping foraging, with local differences.** [Good Fences Make Good Neighbors: Adjacent Honey Bee Colonies Locally Partition Their Foraging Across Landscapes (2025)](https://doi.org/10.1002/ece3.71401) reports overlap at the landscape scale alongside local differences in patch use. This supports showing shared access and patch preferences, not a straight ownership boundary. It does not establish that every colony visits every patch equally. The displayed routes are illustrative examples, not reconstructed observations or a calibrated foraging model.
- **Nest defense and robbing.** [Couvillon et al. (2008), En garde](https://eprints.whiterose.ac.uk/id/eprint/46213/) experimentally documented rapid changes in entrance guarding in response to intruders. Robbing concerns stored food, with greater risk during nectar scarcity. The game's automatic raid cadence, combat formations, and defeat-the-neighbor victory rule are fictional mechanics, not a biological timetable.
- **Africa requires local context.** [Kleckner et al. (2026), Eastern Cape nest survey](https://link.springer.com/article/10.1007/s10841-026-00749-0) recorded nests in ground, plant, manmade, and rock cavities. Ground cavities predominated at those study sites. That finding cannot define nest types or spacing across Africa. The new tree and rock symbols illustrate possible cavity types; this is not a mapped African field site or a calibrated regional climate scenario.
- **Wasps are not a blanket explanation for territorial borders.** [Injaian and Tibbetts (2015)](https://doi.org/10.1016/j.anbehav.2015.01.031) studied paper-wasp contests over nest ownership. Such evidence requires specifying the species and contested resource; it does not justify treating all wasp colonies as armies defending separate landscape halves.

## Changes

- Smaller cavity-nest symbols with more separation and open space. Nest geometry stays fixed when game health changes; a ring indicates health.
- Six scattered flower patches. Flower colors and positions remain independent of the RTS score.
- Solid purple routes from the home nest and dashed coral routes from the neighboring nest reach the same patches. Both colonies have visible foragers. Colors and symbols identify the illustration and are not biological markings.
- Removed the moving line and flag in 3D and the dividing line and ownership shading in 2D. A stationary ring now serves only as a shared-patch camera target.
- Buildings and combat animations are an optional game overlay, off by default. Chemical-index domes are also off by default and explicitly uncalibrated. Controls and existing saves remain usable.
- Renamed the displayed territorial metric to **RTS advantage**, with score units, and clarified that the 2D board contains game stations rather than owned habitat.
- Added visible shared-foraging guidance and expandable source-linked notes beside the scene. Notes identify the remaining fictional mechanics and the simplified temperate season calendar.

## Scope limits

This is a focused correction of the RTS map's spatial ecology and explanations, not a scientific certification of every simulation in the Bee Tool. The RTS remains a strategy game. It does not predict nest spacing, African rainfall or flowering, real forage yield, flight distributions, pheromone dispersal, or colony survival. No physical distance scale was invented for the diagram.

## Validation

All 400 Bee regression tests passed across the full run and focused rerun (41 files). The full run passed 399 tests; its one failure was an assertion for the superseded scouting label. After updating that assertion, all 14 tests in the affected RTS file passed. All nine relevant browser scenarios passed across the combined run and focused rerun; the final rerun corrected a test selector to use the button’s actual accessible name.

Checks cover shared patch endpoints, stable flower colors and routes at both score extremes, fixed nest geometry and spacing, traffic from both colonies, opt-in buildings/raids/signals, pause and reduced motion, construction, game commands, source links, keyboard access, 320px layout, dark mode, and Axe accessibility checks. Desktop and mobile screenshots were visually reviewed and terrain bounds were checked against the real camera. Source and desktop files match; whitespace checks passed.

Preview: `scratch/beehive-rts/shared-foraging-landscape.png`. Detailed machine results are in `scratch/bee-science-vitest.json`, `scratch/bee-science-rts-rerun.json`, `scratch/bee-science-browser-final.log`, and `scratch/bee-science-notes-final.log`.

Source: `stem_lab/stem_tool_beehive.js`; synchronized desktop copy: `desktop/web-app/public/stem_lab/stem_tool_beehive.js`. Changes are local; no deployment was performed.
