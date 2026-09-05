# Grove Journey: campaign concept

Status: initial design proposal, September 4, 2026. The first playable slice is now implemented locally; see `tree-life-lab-grove-implementation-2026-09-04.md` for delivered scope and remaining extensions. This proposal builds on the current Tree Life Lab source and its Spread activity. Pacing, event probabilities and success thresholds below are prototype choices, not ecological estimates or validated learning outcomes.

## Recommendation

Add an optional, turn-based grove campaign alongside the single-tree lab. The player guides a small tree community through disturbance and renewal, watching descendants become part of a persistent landscape. Use short runs, repeatable worlds and a lasting field journal. Begin with weather and regeneration; introduce an invasive-species scenario after this core loop is understandable.

The strongest objective is “leave a living next generation,” rather than maximize territory or keep every original tree alive. A damaged parent with surviving descendants can represent a meaningful recovery. The player can identify with the grove; explain that allocating resources across individuals is a game abstraction, not evidence that trees collectively plan or freely share a common carbon bank.

## First playable slice

- One compact map with nine habitat patches: exposed ground, sheltered understory and a damp edge. Limit the first prototype to a small number of persistent tree cohorts.
- Three starting trees, including an established reproductive adult, with a choice of two contrasting species already in the lab. Start with oak and aspen; research and label any added maturity assumptions.
- Eight annual turns, presented through a visible seasonal timeline, aiming for a 10–15 minute run. Tune this target with learners.
- Three recurring decisions: **Build roots**, **Keep reserves**, or **Invest in offspring**. Each is a transparent allocation preset with a visible cost and optional detailed controls.
- Three event families: a dry growing season, a favourable wet year and a canopy-opening storm. Include quiet years. Storm damage and patch-level conditions require new, explicitly documented model assumptions.
- A visible goal: keep a lineage alive and establish descendants in two habitat patches by the last year. Prototype counts are for pacing, not a claim about viable forest populations.
- A living descendant means an established individual or cohort that survived an annual update, not merely a seed dispersed or an attempted birth. A parent need not survive for the lineage to continue.

## The turn loop

1. **Read the grove.** Show the year, the map and one plain-language concern: “The exposed seedlings have little stored food.” Select a tree to open the familiar close-up.
2. **See a forecast.** Show the known next-year conditions or a clearly labelled range. Introduce uncertainty after the first guided turn. Never let a hidden event invalidate a choice before the learner has seen a response.
3. **Choose a priority.** Show two or three choices and their tradeoffs. “More roots may improve water access next year; less carbon remains for offspring.” Species restrict the available reproduction routes.
4. **Watch the year.** Animate seasonal changes briefly, with pause, skip and reduced-motion equivalents. Show exactly when the annual model advances.
5. **Read the result.** Highlight affected patches and show a short receipt: the choice, the event, the physiological effect and the outcome. Separate chance from the effects of the choice.
6. **Continue or compare.** Allow an optional same-world replay from the prior turn. Compare matching tree IDs and the same environmental event, not two unrelated random runs.

Do not require a quiz or written explanation after every turn. Offer a brief evidence choice at major milestones and a journal entry at the end.

## Visual direction

Keep the grove in the largest part of the screen. Use a shallow isometric or overhead map with recognisable species silhouettes, distinct seedling/adult sizes and gentle habitat boundaries. Render most trees as inexpensive symbols or instances, reserving the detailed existing 3D tree for the selected individual.

Use a compact seasonal ribbon above the map and a single decision area beneath it. Avoid a dashboard of competing meters. Persistent summaries should be **Living trees**, **Established descendants** and **Years remaining**; reserve condition belongs on the selected tree and can use the existing food indicators.

Show offspring physically appearing in a patch, briefly trace their parent connection, and add a dated journal mark. Distinguish an attempted seed journey from successful establishment. Keep clonal stems and seed offspring identifiable with shape and text as well as colour. A storm opening a canopy gap should visibly change the light map. Use optional overlays for light, moisture and lineage, one at a time.

Keyboard users must be able to select every occupied patch and read the same evidence. Provide an equivalent patch list, meaningful focus order, non-colour status labels and explicit event announcements. Phone layouts put the selected patch and choices below the map. No camera movement or animation is required to understand a turn.

## What carries between runs

Carry forward discoveries, field notes, encountered habitats and alternate starting scenarios. Unlock variety through exploration, not repeated grinding. Keep the basic species and learning routes available from the start. Avoid permanent stat bonuses that silently change the biology or make classroom comparisons unequal.

On loss, preserve the timeline and the last meaningful decision. Offer **Try that year again**, **Replay this grove**, and **New grove**. Assisted exploration can allow unlimited rewinds; an optional challenge setting can keep a fixed sequence and limited retries. Both use the same ecological rules.

## Invasive-species chapter

An invasive species could make an engaging later chapter, but it needs a specific mechanism and habitat rather than a generic enemy health bar. Candidate patterns are an introduced understory competitor that affects seedling establishment, or a host-specific insect affecting a susceptible species. Damage must follow the modelled host and environmental conditions.

Avoid “more diversity makes all trees immune” or “all non-native plants always suppress seedlings.” Research illustrates why context matters: at Catoctin Mountain Park, tree seedlings increased following deer management, and Japanese stiltgrass did not appear to prevent that recovery. This is not a universal result for stiltgrass or other sites. [National Park Service, Stiltgrass and Tree Seedling Recovery](https://www.nps.gov/articles/000/stiltgrass-and-tree-seedling-recovery.htm).

The Forest Service's emerald ash borer research tracks ash decline alongside changes in forest structure, other plants and ecosystem processes. Such a scenario needs appropriate host species; do not apply an ash-specific event to the current oak/aspen/willow/pine roster as a generic attack. [US Forest Service, Effects of emerald ash borer on forest ecosystems](https://research.fs.usda.gov/treesearch/34553).

Keep agency consistent. Tree-perspective actions concern investment, survival and reproduction. Removing invasive plants or fencing seedlings belongs in a separately labelled stewardship scenario with management actions and costs.

## Engineering and scientific boundaries

The source already contains `simulateYear`, `treePhysiology`, species-specific reproduction modes, `STRATEGIES`, `EVENTS`, a seeded generator and `resolveSpread`. These support a prototype, but the current Spread activity resolves counts for one round; it does not yet supply a spatial, persistent population model.

- Store campaign data separately from the user's lab tree and saved experiment. Version the state and save after each completed turn. Include stable tree/cohort IDs, parent and clone-group IDs, patch conditions, the event seed, pending decision and turn receipts.
- Reuse annual physiology. The existing seasonal ledger is an illustrative breakdown of a year. Do not call `simulateYear` four times and label that one year, or claim a mid-season allocation changed physiology retroactively. In the first version, choices precede one annual update; seasonal scenes explain that update. Truly interactive seasonal turns require a separately validated timestep model.
- `seedsBanked` accumulates reproduction carbon (`toRepro`), not a literal seed count. Track committed reproductive carbon and actual propagules separately; debit investment once. Add species maturity, establishment and habitat rules explicitly. Do not give every seedling immediate reproduction just to accelerate the story.
- The existing Spread strategy probabilities and event multipliers are teaching assumptions. Its seed-versus-clone ratio is not a measured genetic diversity index, and generic seed offspring must not receive guaranteed disease resistance. Basal resprouting is recovery of an existing individual, not a new independent descendant.
- A shared soil-water balance is not currently implemented. Patch moisture can be a prescribed scenario input initially; do not describe it as physical depletion by neighbouring roots. Likewise, derive or label any new canopy-shading model before presenting competition as simulated evidence.
- Use independent deterministic random streams for weather and establishment, keyed by world/year/patch/individual/event purpose. The existing single sequential generator is insufficient for fair replays if changing a reproductive strategy changes the number of random draws and therefore future weather.
- Cap rendered population and use documented cohorts for larger populations. Avoid building a fully detailed canopy for every descendant. Preserve real counts when visuals aggregate them.

## Evaluate before expanding

The next implementation should test the eight-turn weather-and-regeneration slice. Defer invasive species, procedural biomes, trait upgrades and complex food webs until this is rewarding on its own.

Observe whether learners can choose an action without help, explain one survival/reproduction tradeoff, distinguish establishment from seed dispersal, identify the effect of location and choose to try a different strategy. Ask a transfer question about a new grove. Return visits or longer sessions alone do not establish learning.

Technical checks should cover deterministic replay, carbon debited once, no seasonal time multiplication, species-eligible reproduction, parent/descendant identity, extinction and recovery boundaries, save/resume at a pending decision, accessible patch navigation, and bounded rendering. Run balance checks over many seeds to detect unavoidable opening losses and a single dominant strategy; report distributions rather than one attractive run.
