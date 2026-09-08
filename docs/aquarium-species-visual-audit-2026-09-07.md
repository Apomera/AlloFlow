# Aquarium species visual audit — 7 September 2026

This review covers every entry in the active `SPECIES_BY_TANK` catalog: **39 tank entries, 36 distinct IDs, eight tank types**. It separates observed baseline faults from the drawing specification implemented in the next pass. It is not a claim of biometric accuracy or a validation of the full husbandry library.

## Evidence and identity rules

The baseline source anchors are `SPECIES_BY_TANK` (about line 15474), `SPECIES_BODY_MAP` (15158), `SPECIES_COLORS` (15196), `SPECIES_DISPLAY_SIZE` (15350), and `organismShape` / `addFish` (11930 / 11959) in `stem_lab/stem_tool_aquarium.js`. Line numbers move during implementation; the named functions and tables are the durable anchors. The browser audit independently captured all 36 real catalog profiles in `.codex-artifacts/aquarium-visual-qa/species-baseline-v3/`.

The baseline classifier missed `nerite` and `kelp`, so both became swimming fish. `seastar` inherited the five-arm sea-star form. `crab` had no occupied shell. The three tetra entries shared the neon pattern. Otocinclus and plecostomus inherited Corydoras morphology; pike, oscar, rockfish, goby, archerfish, and mudskipper lacked their distinguishing silhouettes. Several table colors were decorative rather than representative natural colors, including violet Corydoras and lime Otocinclus. The urchin catalog also incorrectly described spines as modified teeth: movable skeletal spines are distinct from the five-toothed feeding apparatus underneath. [Monterey Bay Aquarium anatomy](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/purple-sea-urchin).

Stable catalog ID must select the profile before legacy body-plan fallbacks; editable names must never determine anatomy. Unknown IDs need an explicitly generic fallback. A broad common name cannot support a fabricated exact species. Domestic color and fin varieties also differ substantially: the UF/IFAS account documents this for livebearers, and primary betta research demonstrates extensive inherited variation. [UF/IFAS ornamental catalog](https://ask.ifas.ufl.edu/publication/FA054), [betta morphology study](https://pmc.ncbi.nlm.nih.gov/articles/PMC9491723/).

## Complete drawing specification

`R` means a representative group, domestic form, or selected appearance; it does not assert that the catalog identifies an exact taxon, sex, or strain. Even the more diagnostic common names use illustrative size. Colors below are drawing choices within the stated scope, not physiological measurements. Sources support the diagnostic form or the stated ambiguity; they do not certify the finished mesh.

### Freshwater and planted tanks

| ID | Catalog name; type; tank | Required form and distinguishing features | Scope / reference |
| --- | --- | --- | --- |
| `neon` | Neon Tetra; Fish; freshwater | Slender silver body, blue lateral stripe, red confined to rear lower flank; forked tail. | Neon form. Compare the red-stripe extent in the [Brazilian agricultural research account](https://www.alice.cnptia.embrapa.br/alice/bitstream/doc/1177428/1/AmazonianOrnamentalFish.pdf). |
| `guppy` | Guppy; Fish; freshwater | Slender livebearer, broad patterned fan tail. | R: fancy male. [UF/IFAS](https://ask.ifas.ufl.edu/publication/FA054). |
| `cory` | Corydoras; Fish; freshwater | Short armored body, subtle brown mottling, short mouth barbels. | R: Corydoras group. [UF/IFAS](https://ask.ifas.ufl.edu/publication/FA054). |
| `angel` | Angelfish; Fish; freshwater | Tall diamond profile, vertical dark bars, extended dorsal/anal fins and pelvic filaments. | R: silver domestic angelfish. [UF/IFAS](https://ask.ifas.ufl.edu/publication/FA054). |
| `platy` | Platy; Fish; freshwater | Short, deep livebearer; modest rounded tail; representative orange body. | R: domestic platy. [UF/IFAS](https://ask.ifas.ufl.edu/publication/FA054). |
| `molly` | Molly; Fish; freshwater | Longer livebearer profile; dark body; avoid assigning a male sailfin to every molly. | R: black domestic form. [UF/IFAS](https://ask.ifas.ufl.edu/publication/FA054). |
| `nerite` | Nerite Snail; Mollusk; freshwater + planted | Rounded low shell, visible foot and paired tentacles; crawl; no fish fins. Shell pattern is representative. | R: nerite family. [Smithsonian specimen and gastropod anatomy](https://qrius.si.edu/browse/object/10007787). |
| `dwarffrog` | African Dwarf Frog; Amphibian; freshwater | Flattened frog body, folded long hind limbs, webbed feet. | R: captive Hymenochirus; exact captive identification is unresolved in [primary taxonomic research](https://academic.oup.com/zoolinnean/article/200/4/1034/7321480). |
| `cardinal` | Cardinal Tetra; Fish; planted | Blue lateral stripe with red along the lower body's length, distinct from neon. | Cardinal form. [Dallas World Aquarium](https://dwazoo.com/animal/cardinal-tetra/). |
| `rummy` | Rummynose Tetra; Fish; planted | Silver body, red head, contrasting dark/light tail markings; no neon blue stripe. | R: Petitella group; red extent differs among taxa in the [primary revision](https://doi.org/10.1590/1982-0224-2019-0109). |
| `oto` | Otocinclus; Fish; planted | Slender armored body, underside sucker mouth; a dark lateral stripe is a selected representative pattern. | R: Otocinclus, not a Corydoras. Color diversity is explicit in the [taxonomic study](https://www.scielo.br/j/ni/a/wPGTX6y85zTWDFfFVnkzkdR/?lang=en). |
| `shrimp` | Cherry Shrimp; Crustacean; planted | Translucent red segmented shrimp, antennae and walking legs. | R: red domestic morph, supported by [primary observations](https://pmc.ncbi.nlm.nih.gov/articles/PMC8069546/). |
| `betta` | Betta; Fish; planted | Slender body, flowing caudal, anal and dorsal fins. | R: long-fin domestic male; [primary morphology research](https://pmc.ncbi.nlm.nih.gov/articles/PMC9491723/). |

### Reef and invertebrate tanks

| ID | Catalog name; type; tank | Required form and distinguishing features | Scope / reference |
| --- | --- | --- | --- |
| `clown` | Clownfish; Fish; reef | Orange compressed body, three black-edged white bars; rounded tail. | R: orange three-band clownfish. [Aquarium of the Pacific](https://www.aquariumofpacific.org/onlinelearningcenter/species/clown_anemonefish). |
| `tang` | Blue Tang; Fish; reef | Compressed blue oval, black palette marking, yellow tail. | R: palette tang appearance; “blue tang” alone is ambiguous. [Georgia Aquarium](https://www.georgiaaquarium.org/animal/palette-surgeonfish/). |
| `goby` | Watchman Goby; Fish; reef | Elongate bottom fish, blunt/compressed face, high eyes, separate dorsal fins. | R: watchman group; do not force yellow species identity. [Aquarium of the Pacific](https://www.aquariumofpacific.org/onlinelearningcenter/species/watchman_goby). |
| `anemone` | Sea Anemone; Cnidarian; reef | Attached column, central oral disc, tentacle crown; no face or fish fins. | R: polyp form. [Monterey Bay Aquarium anatomy cards](https://www.montereybayaquarium.org/globalassets/mba/pdf/education/activities/critter-cards/aquarium-crittercards-rocky-shore.pdf). |
| `stonycoral` | Stony Coral Colony; Cnidarian colony; reef + invert | Attached branching skeleton/colony; identify it as a colony, not a single fish. | R: branching form; [NOAA describes multiple coral growth forms](https://oceanservice.noaa.gov/education/tutorial_corals/coral03_growth.html). |
| `copepods` | Copepod Colony; Microcrustacean colony; reef + invert | Enlarged representative with segmented tapering body, antennae and forked tail. | R: displayed individual does not equal colony count. [Smithsonian anatomical photograph](https://ocean.si.edu/ocean-life/plankton/male-copepod). |
| `pistol` | Pistol Shrimp; Crustacean; reef | Segmented shrimp with one conspicuously enlarged snapping claw. | R: pistol shrimp group. [Primary claw study](https://www.nature.com/articles/s41598-017-14312-0). |
| `pederson` | Pederson Cleaner Shrimp; Crustacean; reef | Mostly transparent shrimp, purple/violet markings, long pale antennae. | Pederson form; [primary comparative study](https://ora.ox.ac.uk/objects/uuid%3A1364a109-0327-4d4d-8a78-643006757486/files/mc573c314862e29845a98223caae050e4) distinguishes its purple-dotted dorsum/tail. |
| `cleaner` | Cleaner Shrimp; Crustacean; invert | Pale shrimp with white dorsal stripe bordered in red and long white antennae. | R: skunk cleaner form. [Aquarium of the Pacific](https://www.aquariumofpacific.org/onlinelearningcenter/species/pacific_cleaner_shrimp). |
| `urchin` | Sea Urchin; Echinoderm; invert | Rounded test and radiating spines; crawl at substrate, not swimming. | R: urchin group; [Monterey Bay Aquarium anatomy](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/purple-sea-urchin). |
| `crab` | Hermit Crab; Crustacean; invert | Occupied spiral shell; claws, eyestalks and walking legs project from opening. | R: shell-carrying hermit; [Monterey Bay Aquarium](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/hermit-crab). |
| `starfish` | Sea Star; Echinoderm; invert | Central disc and five tapered textured arms. | R: five-arm sea star, explicitly distinct from sunflower star; [Monterey Bay Aquarium comparison](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/sunflower-star). |

### Predator, turtle, coldwater and brackish tanks

| ID | Catalog name; type; tank | Required form and distinguishing features | Scope / reference |
| --- | --- | --- | --- |
| `oscar` | Oscar; Fish; predator | Deep oval cichlid, rounded tail, dark blotches; contrasting tail-base eyespot. Orange mottling is a selected appearance. | R: representative coloration, not every wild specimen. [Florida Museum specimen](https://www.floridamuseum.ufl.edu/discover-fish/florida-fishes-gallery/oscar/). |
| `pike` | Pike Cichlid; Fish; predator | Long low body, long dorsal fin, subdued lateral marking; avoid a deep generic cichlid. | R: pike cichlid group. [Primary field study](https://www.scielo.br/j/ni/a/xv7sQF4vYX44Bwj5wD5ChLc/?format=pdf&lang=en). |
| `pleco` | Plecostomus; Fish; predator | Broad flattened head, tapering armored body, underside sucker mouth, prominent dorsal fin. | R: suckermouth armored catfish. [Florida Museum specimen](https://www.floridamuseum.ufl.edu/discover-fish/florida-fishes-gallery/suckermouth-catfish/). |
| `slider` | Red-Eared Slider; Reptile; turtle | Scuted oval shell, webbed clawed feet, yellow neck stripes, red patch behind each eye. | Representative non-melanistic slider; [state wildlife identification guide](https://mdc.mo.gov/discover-nature/field-guide/red-eared-slider). |
| `goldfish` | Feeder Goldfish; Fish; turtle | Elongate orange-gold body and single forked tail. | R: common/feeder form; distinguish twin-tail ornamental morphology documented in [primary research](https://pmc.ncbi.nlm.nih.gov/articles/PMC4879570/). |
| `rockfish` | Rockfish; Fish; coldwater | Robust body, conspicuous dorsal spines and angular head; muted representative color. | R: Pacific rockfish group; [Monterey Bay Aquarium documents wide variation](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/rockfish). |
| `seastar` | Sunflower Star; Echinoderm; coldwater | Broad flexible body with many arms; twenty is an adult representative drawing. | Adults have 15–24 arms; [Aquarium of the Pacific](https://www.aquariumofpacific.org/onlinelearningcenter/species/sunflower_sea_star). |
| `kelp` | Giant Kelp; Macroalga; coldwater | Attached holdfast, flexible stipes, blades with buoyancy floats; sway without swimming, eyes or fins. | Giant kelp form; [Monterey Bay Aquarium](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/giant-kelp). |
| `archer` | Archerfish; Fish; brackish | Silver compressed body, dark upper-body bands, upturned mouth, rear-positioned dorsal. | R: banded archerfish; [Aquarium of the Pacific](https://www.aquariumofpacific.org/onlinelearningcenter/species/banded_archerfish). |
| `puffer` | Figure-8 Puffer; Fish; brackish | Uninflated rounded body, pale belly, olive upper body with outlined dark ocelli/loops; avoid uniform random dots. | Figure-eight pattern varies. A [primary taxonomic re-examination](https://thesiamsociety.org/wp-content/uploads/2025/02/nhbss_066_2f_Musikasinthorn.pdf) identifies characteristic ocelli under the dorsal and at the tail base; it does not validate this tool's salinity preset. |
| `mudskip` | Mudskipper; Fish; brackish | Elongate low body, raised eyes, supportive pectoral fins; surface-associated movement. | R: mudskipper group. [Primary anatomical/behavioral study](https://pmc.ncbi.nlm.nih.gov/articles/PMC10160996/). |

## Tank capacity and plant biomass teaching contract

Changing capacity is a **scenario edit**, not a drain/refill action: preserve stock, current concentrations, health and clock; pause and log the intervention. Label US gallons. Use effective volume consistently for stock capacity and concentration increments, including accepted feeding and equipment terms. The prior `clamp(0.2, 2, 20 / volume)` hides differences below 10 or above 100 gallons; the implemented 5–200 gallon control now uses 20 / volume across the full range.

Tank shape can preserve enclosed volume while changing relative surface area. Its effect on atmospheric exchange must be described as an illustrative, well-mixed area/volume heuristic. Real exchange also depends on turbulence and concentration relative to saturation; geometric area alone is not a calibrated oxygenation model. [USGS oxygen-budget account](https://www.usgs.gov/publications/dissolved-oxygen-chapter-6).

Plant size should edit existing `plantBiomass[id]` within `0..maxSize`, with health kept separate. Call this a **relative biomass index**, not height, age, grams or centimeters. Rendering consumes the exact index; explicit zero has no living foliage. Natural growth can subsequently increase it under the existing regrowth equation. Positive biomass affects modeled photosynthesis, respiration and nutrient flows; daylight net exchange is distinct from nighttime respiration. [USGS diurnal monitoring study](https://www.usgs.gov/centers/new-jersey-water-science-center/science/diurnal-variations-water-quality-surface-water).

Manual volume, shape and biomass edits belong in investigation factors and observations; natural growth is an outcome, not a second manual intervention. Clear legacy baselines with missing size factors on the first such edit, with a visible notice. Giant kelp is stocked in `tankFish`, so the plant-list biomass control must not imply that it edits kelp unless explicitly supported. No stock mesh should stretch when the vessel changes. The existing pixel display dimensions are not physical fish lengths.

Three useful comparisons are: hold stock constant and change only capacity; hold capacity constant and change only shape; hold light and stock constant and change only one plant's biomass, then observe the same daytime or nighttime interval. Ask learners to predict a direction, inspect the process contribution, and revise the explanation; a different-looking tank alone is not evidence.

## Acceptance and remaining scope

Required checks: all active catalog IDs resolve; arbitrary editable names cannot change anatomy; nonfish never inherit fish meshes; lookalike tetra patterns differ; unknown and inherited-object keys fail safely; profile return values cannot mutate shared metadata. Real WebGL review must confirm geometry, materials, selection and camera framing for all 36 entries and changed vessel shapes. A profile label alone does not prove visible anatomy.

Validation on 8 September 2026: **18 focused checks pass** across `tests/aquarium_species_visual_profiles.test.js` (six cases) and `tests/aquarium_sizing_runtime.test.js` (twelve cases). The tests cover all 36 catalog identities, misleading names and legacy types, unknown/prototype IDs, nonfish classification, diagnostic and representative text in the actual selected-resident inspector, the real resize/plant/stocking handlers, both feeding actions, hourly process contributions, baseline migration, and hospital return after resizing. Hospital release now checks the returning species minimum and projected display load, excludes other isolated residents, and preserves identity and time when enlargement permits return. The urchin fact and minimum-size stock-card explanation are corrected. Final broader regression and real WebGL contact-sheet review are coordinated separately by the implementation team; their final status should be recorded here before claiming complete visual acceptance.

This pass supports recognizable, explicitly representative educational organisms. Exact species identification, adult/juvenile and sex/strain variation, measured allometry, physical scale, complete diets, disease behavior, real husbandry suitability and calibrated growth/gas exchange remain separate validation work. Broad group names must retain their stated scope even after their artwork improves.
