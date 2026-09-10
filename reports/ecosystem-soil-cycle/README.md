# Forest-floor nutrient cycle

This optional extension adds a combined fungi-and-bacteria decomposer pool,
organic matter, and plant-available nutrients to the food-web comparison.
Choose **Decomposer decline**, run the comparison, then use **Inspect forest
floor** and the shared timeline. The soil charts, 3D patch, CSV, and saved
observations all use the same model samples.

The forest-floor patch uses modeled organic matter to set a capped litter
display and decomposer biomass to set capped mushroom/thread symbols. These
are illustrative indicators, not predicted mushroom counts or a spatial
microbial model. Background woodland fungi remain scenery. The soil panel
works independently of WebGL.

## Model assumptions

- All living biomass, including decomposers, has a fixed nutrient quota of 0.1
  nutrient-index units per biomass-index unit.
- Positive plant logistic growth consumes available nutrients and is capped
  by that stock. Plant turnover is 0.018 times biomass per modeled time unit.
- Natural mortality and unassimilated food return their nutrient content to
  organic matter. Existing feeding links and efficiencies are retained.
- Microbial mortality per unit time is `0.035 M + 0.0006 M²`.
- Decomposers process organic matter at `0.12 M D / (12 + D)` per modeled
  time unit, capped by the available organic matter. Here `M` is decomposer
  biomass and `D` is organic-matter nutrient content.
- Processing retains 18% of nutrients in microbial growth and releases 82%
  into the available nutrient pool.
- An 80% decomposer mortality pulse transfers the dead microbes' nutrient
  content into organic matter. Removing litter exports its nutrients;
  removing or reducing a food-web group likewise exports removed biomass's
  nutrient content. These events do not instantly change available nutrients.
- Tracked inventory is `D + N + 0.1 × (M + all food-web biomass) + exported`.
  It remains conserved; the export counter records material outside the
  ecosystem rather than making it disappear from the accounting.

Rates, biomass, nutrients, and time are teaching indices. There is no carbon
or energy budget, microbial diversity, fruiting phenology, nutrient leaching,
weather, immigration, or measured forest calibration. Decomposer decline
does not imply every organism must decline. Feedbacks depend on starting
stocks, feeding, and nutrient uptake.

Soil cycling defaults off. Existing presets explicitly switch it off.
Legacy sample trajectories and CSV output are preserved byte for byte, as
checked against fixtures captured before this extension. Soil-enabled CSVs
append eight paired columns: organic matter, decomposer biomass, available
nutrients, and exported nutrients. Old notebook entries remain readable;
soil-enabled entries require complete, finite, nonnegative soil samples.

## Ecology references

- [USDA NRCS Soil Biology Primer](https://www.nrcs.usda.gov/resources/education-and-teaching-materials/soil-biology-primer): soil food webs, decomposition, and nutrient cycling.
- [University of Minnesota Extension: soil biology](https://extension.umn.edu/natural-resources/conservation/agricultural-soil-and-water/soil-biology): bacteria, fungi, and other soil organisms.
- [University of Maryland Extension: soil basics](https://www.extension.umd.edu/resource/soil-basics): organic residues and soil organisms.

These references motivate the ecological roles; they do not supply the
simulation's numerical parameters.

Soil-enabled runs use eight integration substeps per output sample; legacy runs keep four. A small opening in decorative undergrowth keeps the forest-floor close-up visible.

## Verification

Targeted checks cover nutrient conservation for every disturbance, exact
event timing, nutrient limitation, zero pools, timestep refinement, bounded
extreme inputs, legacy trajectory/CSV hashes, soil exports, and notebook
validation. Browser coverage checks shared timeline samples, branch changes,
forest-floor inspection, mobile layout, reduced motion, saved observations,
preset resets, zero decomposers, litter removal, and the original workflows.

Verified: 51 targeted model/regression checks passed. All six browser scenarios passed; the soil workflow was repeated after the final visual refinements. Both app source copies match.
