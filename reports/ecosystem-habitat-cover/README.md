# Ecosystem habitat cover

Open **Ecosystem → Food web → Habitat restoration**, then **Run food-web comparison**.

This extension gives habitat cover a measurable effect in the food-web model and synchronizes its representation in the 3D meadow.

## Added behavior

- Starting refuge cover from 0% to 80%, independently of food-plant biomass and resource capacity.
- Timed restoration adds 40 percentage points, capped at 80%; timed clearing sets cover to zero.
- Both runs begin with the same cover. Only the experiment receives the selected event.
- Rounded thickets track the selected baseline/experiment sample and shared timeline. Upright tufts remain food plants.
- The results show both cover percentages, including when 3D is unavailable or hidden.
- A no-change notice identifies restoration at the cap or clearing an already open habitat.
- CSV exports append baseline/experiment capacity and cover columns to the original 11 columns, for 15 total. Existing species-column positions are preserved.
- Old saves normalize missing cover to zero and retain their previous biomass trajectories.

## Scientific scope

The model multiplies herbivore biomass accessible to foxes and owls by `1 - cover / 100`, using that accessible biomass in both the feeding numerator and saturation denominator. Grazing and plant capacity are unchanged directly. Habitat changes do not instantly create or remove organisms; their biomass effects begin in subsequent integration steps.

This is an illustrative habitat-wide accessibility rule. It is not calibrated to these species and does not implement individual navigation, patch occupancy, corridors, or hunting ranges. Thicket positions are visual symbols, not areas checked by the feeding calculations. Predators and prey can respond indirectly over time, so additional cover does not guarantee that every group benefits.

The general connection between vegetation cover and vulnerability to predators is discussed in this [National Park Service wildlife and habitat assessment](https://parkplanning.nps.gov/showFile.cfm?projectID=14330&sfid=122740). The chosen percentage range and numerical rule are teaching assumptions, not estimates taken from that assessment.

This supersedes the earlier 3D report's statement that all habitat scenery is decorative: the cover percentage now affects feeding; the placement of individual thickets, trees, rocks, and animals still does not.

## Visual review

- [Baseline: 10% cover](baseline-desktop.png)
- [Restored experiment: 50% cover](restored-desktop.png)
- [Mobile layout](restored-mobile.png)

## Verification

- **98 unit tests across 23 ecosystem files passed.** New checks cover compatibility, early predation effects, unchanged grazing without predators, exact event timing, delayed biomass effects, no-op comparisons, finite/nonnegative extremes, timestep convergence, and the CSV schema.
- **Five browser workflows passed:** habitat restoration/clearing, the existing food-web workflow, 3D interaction, unavailable WebGL, and context loss. These include keyboard interaction, reduced motion, mobile overflow, persistence, and synchronized baseline/experiment samples.
- Desktop and mobile screenshots were visually reviewed.
- JavaScript syntax and scoped whitespace checks passed; source and desktop public copies are synchronized.

Implementation: `stem_lab/stem_tool_ecosystem.js` and its desktop mirror. New tests: `tests/ecosystem_habitat_cover.test.js` and `tests/e2e/ecosystem-habitat-cover.spec.ts`.
