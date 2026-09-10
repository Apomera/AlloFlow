# Ecosystem scope expansion: multi-species food webs

The Ecosystem tool now has a **Food web** mode. It models a community of meadow plants, rabbits, meadow voles, red foxes, and barn owls, with separate dynamic biomass variables and explicit feeding links.

## What is implemented

- **Build a community:** switch between a simple chain and a shared-prey web, include or exclude animal groups, set starting biomass, and change plant capacity.
- **Real model consequences:** rabbits and voles draw on the same plant resource; foxes can use rabbits and voles; foxes and owls share voles. Plants respond to grazing. Adding or removing a group changes the equations' inputs and food availability.
- **Controlled experiments:** compare an unchanged baseline against removing a group, reducing it by 80%, or halving plant capacity at a selected time. A no-disturbance control produces identical trajectories.
- **Interactive evidence:** select diagram nodes, inspect feeding relationships, choose a chart group, and scrub a shared timeline. The diagram, plot, and table use the same modeled samples.
- **Accessible presentation:** labeled controls, keyboard-accessible mode navigation and diagram nodes, solid/dashed curves, exact tabular alternatives, and palettes for light, dark, and high-contrast themes. The layout accommodates 390px and 320px viewports.
- **Keep and export work:** predictions are captured with the run, explanations survive mode changes, and CSV export includes all five groups in both runs across all 241 sample times. Changing the model setup clears the previous comparison.
- **Avoid false extinction signals:** a tiny positive biomass value displays as `<0.1`, while an exactly removed group displays `0.0`.

The existing animated Explore/Sandbox scenes remain their separate two-population representations. This expansion adds a new quantitative lab; it does not relabel the old animated animals as a five-species simulation.

## Model boundaries

This is a deterministic, illustrative biomass-index model, not a fitted population forecast. Plants grow logistically. Consumer feeding saturates across available foods, and consumers sharing a food source share its finite biomass budget. Only a fraction of consumed biomass becomes consumer biomass; mortality and crowding remove biomass.

Diet links are selected examples, not complete diets. Rates, conversion fractions, diet weights, and modeled time units are teaching assumptions. Immigration, nutrient recycling, spatial refuges, age structure, and seasons are not yet modeled. A zero group cannot recolonize spontaneously. Drought persistently changes plant capacity rather than instantly deleting half the plants.

Natural-history references are linked inside the lab:

- [National Park Service: red fox diets](https://www.nps.gov/yell/learn/nature/red-fox.htm)
- [National Park Service: meadow vole diets](https://www.nps.gov/pipe/learn/nature/mammals.htm)
- [Cornell Lab of Ornithology: barn owl diets](https://www.allaboutbirds.org/guide/barn_owl/lifehistory)
- [National Park Service: interpreting trophic cascades](https://www.nps.gov/articles/the-big-scientific-debate-trophic-cascades.htm)

## Recommended next expansions

| Priority | Expansion | What it adds |
| --- | --- | --- |
| 1 | Habitat patches, refuges, and movement | Learners could connect habitats, vary cover, and investigate how spatial separation changes feeding and survival. Bring the additional species into the animated scene using clearly defined relationships between animation and model state. |
| 2 | Decomposers, detritus, and nutrients | Move beyond feeding chains to recycling. Track mortality and waste into detritus, decomposition into nutrients, and nutrient limits on plants. |
| 3 | Seasons and repeated disturbances | Test drought duration, seasonal productivity, and recovery timing using controlled comparisons. |
| 4 | An aquatic community | Extend the existing kelp scenario into a dynamic resource–grazer–predator food web with independently sourced diet links. |

Adding species is most useful when the new species introduces a different interaction or role. A larger list of animals using identical rules would add less learning value.

## Verification

The full ecosystem unit suite passed 90 tests before the final display refinements. The final focused run passed 14 tests. It adds and checks the near-zero display regression alongside model reproducibility, timestep refinement, extreme inputs, shared resources, alternative prey, event timing, drought behavior, exclusion, CSV values, and saved-run state.

Both the new food-web browser workflow and the existing live-simulation workflow passed. A final focused browser run also passed keyboard activation and focus-contrast checks. Browser coverage exercises keyboard discovery, actual paired data, timeline values, CSV download, retained explanations, setup invalidation, all three themes, and narrow-screen bounds. The existing live-simulation browser regression is also included in final verification.

Commands:

```powershell
npx vitest run tests/ecosystem --pool=threads --maxWorkers=1 --hookTimeout=60000
npx playwright test tests/e2e/ecosystem-foodweb.spec.ts tests/e2e/ecosystem-live-visuals.spec.ts --timeout=240000 --workers=1 --retries=0
```

The long browser timeout accommodates local screenshot and context-cleanup overhead; assertions retain their ordinary timeouts.

## Artifacts

- [Desktop builder](desktop-builder.png)
- [Desktop comparison](desktop-comparison.png)
- [Mobile food web](mobile-network.png)
- [Mobile comparison](mobile-comparison.png)
- [320px layout](mobile-320.png)
- [Dark-theme network](network-dark.png)
- [High-contrast network](network-contrast.png)
- [Exported paired data](comparison.csv)

Source is synchronized between the root plugin and its desktop public copy. No deployment was performed.
