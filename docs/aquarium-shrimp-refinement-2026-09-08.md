# Aquarium shrimp refinement — September 8, 2026

This pass refines the existing Cherry Shrimp, Cleaner Shrimp, Pederson Cleaner Shrimp and Pistol Shrimp catalog entries.

## Visual and motion changes

- A tapered carapace and six connected abdominal sections replace the generic oval body and four bead-like segments. All four have a horizontal fan with a central telson and paired, two-branched uropods.
- Two pairs of sensory appendages, stalked compound eyes, five pairs of thoracic limbs, and five pairs of small abdominal swimming appendages are visible in close-ups.
- Cherry shrimp retain the red domestic morph with translucent shell pigment. Cleaner shrimp have amber flanks, a flush white stripe bordered in red, long pale antennae and white accents on a red fan. Pederson shrimp have translucent tissue, irregular violet shell patches and violet limb bands. Pigment follows the shell surface instead of sitting on raised tubes or beads.
- The pistol shrimp has one enlarged chela and a smaller opposite chela, with distinct fixed and movable fingers. They occupy the first limb pair rather than adding extra legs. This is a generic snapping-shrimp form; claw handedness varies among animals.
- Subtle limb and antenna joint movement uses the existing visual animation clock. Pause and reduced-motion settings freeze the joints. The change does not advance simulation time or add snapping, cleaning, feeding or health effects.
- Texture resolution follows the existing quality control. Shared shell textures and materials remain owned by the resident and are disposed on quality changes or removal. Pixel painting uses numeric color channels and limits spot evaluation to relevant texture rows.

## References and limits

- [UF/IFAS crustacean anatomy activity](https://irrec.ifas.ufl.edu/teachaquaculture/curriculum/_files/modules/2_generalbiology/Crustaceans/Activity/Anatomy_of_shrimp-crawfish.pdf): decapod appendage plan and external shrimp structures.
- [Walla Walla University invertebrate glossary](https://inverts.wallawalla.edu/Glossary/Glossary.html): antennae versus antennules, and the horizontal caudal fan's telson and uropods.
- [Aquarium of the Pacific: Pacific Cleaner Shrimp](https://www.aquariumofpacific.org/onlinelearningcenter/species/pacific_cleaner_shrimp): narrow amber body, stalked eyes, white antennae and red/white tail pattern.
- [Lamar University: Pederson's Cleaner Shrimp](https://www.lamar.edu/arts-sciences/biology/study-abroad-belize/marine-critters/marine-critters-3/perdersons-cleaner-shrimp.html): transparent form and long white antennae.
- [UF/IFAS: Cherry Shrimp](https://ask.ifas.ufl.edu/publication/IN1301): red is one domestic color morph of Neocaridina davidi, rather than the only appearance of that species.
- [Kaji et al., Current Biology (2018)](https://doi.org/10.1016/j.cub.2017.11.044): snapping claw joint/finger mechanics. The model depicts externally recognizable unequal claws; it does not simulate cavitation, sound or measured snap kinematics.

These remain representative visual models at illustrative display scales. Color density, sex, exact rostral dentition, fine setae and exact measurements are not reconstructed. Movement is an illustrative crawl, not a calibrated gait or proof that a shrimp is cleaning another animal. Existing tank dimensions, plant biomass, resident identities and simulation rules retain their contracts.

## Validation

61 targeted checks across 7 suites pass, including the seven new shrimp anatomy, pigment, motion/pause, eye visibility and texture ownership checks. Existing species dimensions, catfish/snail anatomy, profile mapping, renderer lifecycle, environment and viewport checks also pass.

Real WebGL previews pass for all four shrimp from the side at desktop width and from above at 390 pixels. The existing mobile lifecycle scenario also passes plant zero/regrow and quality rebuild cycles, focus restoration, unchanged simulation state, unmount resource cleanup and remount behavior. No browser errors were reported.

Both app copies match SHA-256 `b885445447e6ccfc619fcf68db66a2c697bf4f0ab892dcceb7f7bafdb514f07f`. Evidence: `.codex-artifacts/species-v7/delivery-validation.json`. The compact review gallery is `.codex-artifacts/species-v7/species-gallery.html`. Syntax and scoped whitespace checks pass.
