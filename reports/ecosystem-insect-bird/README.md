# Caterpillars and blue tits

Use Ecosystem > Food web > Insect food shortage. The preset includes the original five groups plus Caterpillars and Blue tits, opens the 3D view, and reduces caterpillar biomass by 80% at modeled time 8. Select either new organism and choose Inspect selected group for a close-up.

## Model and interface

The new pathway is plants → caterpillars → blue tits. Caterpillars share plant resources with the existing herbivores; blue tits use caterpillars as their sole modeled food source. Feeding uses the same shared donor budget and saturating intake equations as the existing web. Rates are authored teaching assumptions, not fitted population estimates. Butterfly/moth metamorphosis, breeding stages, seasonal diets, and site-specific species distributions are not simulated. Background trees are still scenery and add no food biomass. The existing refuge-cover term applies to foxes and owls, not insect accessibility to blue tits.

The original presets leave both optional groups off. They can also be selected individually in Build your community. New groups have independent biomass, disturbance targets, 3D representatives, detailed charts, overview plots, and notebook values. The diagram uses a third column when needed. Standard CSVs retain 15 columns; expanded CSVs add paired columns for enabled optional groups, including groups starting at zero.

Old notebook observations remain readable. Missing optional groups in an old, disabled configuration are normalized to zero on a copy; existing recorded values are preserved without recalculation. A missing value for an explicitly enabled optional group is rejected as incomplete evidence.

## Ecology sources and next additions

- [RSPB: Blue tit](https://www.rspb.org.uk/birds-and-wildlife/blue-tit) supports the caterpillar feeding link. Actual blue tit diets include other foods; the model deliberately selects one link.
- [RSPB: natural food for birds](https://www.rspb.org.uk/birds-and-wildlife/feeding-birds-near-you/natural-food-for-birds) describes plants supporting caterpillars and birds.
- [University of Minnesota Extension: soil biology](https://extension.umn.edu/natural-resources/conservation/agricultural-soil-and-water/soil-biology) describes the soil food web and decomposers.

The next useful expansion would be decomposer fungi/bacteria and leaf-litter detritivores, with explicit dead organic matter and nutrient pools. That would represent recycling rather than treating decomposers as ordinary predators. Pollinators could follow once flowering and plant reproduction are modeled. Amphibians and aquatic insects would make more sense with a pond habitat and water conditions.

## Review artifacts

- [Expanded community](community.jpg)
- [Blue tit](blue-tit.jpg)
- [Caterpillar](caterpillar.jpg)
- [Mobile food web](mobile-food-web.jpg)
- [Expanded comparison CSV](comparison.csv)

## Validation

42 unit checks passed across the food-web, insect/bird, habitat, overview, notebook, and pose suites. Checks cover exact disturbance timing, delayed bird response, exclusion, nonnegative bounded results, timestep refinement, old notebook migration, export schema, and deterministic reduced-motion poses. All six browser workflows passed across the initial and final runs. The final two-workflow rerun passed in 26.9 seconds after correcting optional result-table rows and moving the inspected blue tit clear of a decorative log. Twenty directly affected unit checks also passed again after those corrections. The new workflow covers seven-node mobile layout, both organism close-ups, shared timeline values, CSV download, saving/reopening observations, reduced motion, and complete caterpillar removal. Existing graphics controls/fallbacks and notebook workflows passed. Screenshots and the 19-column expanded CSV were reviewed. Syntax, scoped diff checks, and source/desktop mirror parity passed.
