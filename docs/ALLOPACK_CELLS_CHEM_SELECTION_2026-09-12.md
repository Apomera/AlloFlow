# Cell Structure, Chemical Reactions and Natural Selection — illustrated editions

Completed locally on 2026-09-12. These are educator-review drafts, not live community-library publications. Original text-only packs are preserved.

| Edition | Image placements | Resources | Audited text refinements |
|---|---:|---:|---:|
| [Cell Structure, Grade 7](../allopacks/illustrated/cell_structure_grade7.allopack.json) | 35 | 15 | 88 |
| [Chemical Reactions, Grade 8](../allopacks/illustrated/chemical_reactions_grade8.allopack.json) | 34 | 14 | 96 |
| [Natural Selection, Grade 8](../allopacks/illustrated/natural_selection_grade8.allopack.json) | 36 | 15 | 156 |

The 105 placements cover all 34 glossary entries, 15 anchor-chart sections, 32 concept-sort cards and 24 lesson panels. There are 16 generated original artworks and 29 precise SVG diagram designs, reused where the concepts match. Artwork contains no baked-in text; titles and explanatory captions remain editable. Image-specific descriptions, hashes and embedded WebP pixels travel with each pack. No external image URL is required to reopen them offline.

Cell Structure uses ink-and-watercolor microscopy with organelle diagrams. Chemistry uses gouache material studies and particle models. Natural Selection uses field-guide linocut and colored-pencil wildlife, plus population diagrams. The pictures focus on lesson content, with no generated student portraits.

## Accuracy and model limits

**Cell Structure:** distinguishes cytoplasm from cytosol, identifies the nucleus as containing most rather than all cellular DNA, explains energy transfer into ATP, and gives ER/Golgi more accurate functions. Typical plant and animal models are distinguished from specialized cells. Onion bulb cells provide a visible exception to the claim that all plant cells contain chloroplasts. A transport-vesicle sort card is categorized as shared by both groups. Wilting is explained through reduced turgor without requiring an empty vacuole. The virus FAQ now recognizes lipid envelopes. [NHGRI cytoplasm](https://www.genome.gov/genetics-glossary/Cytoplasm), [nucleus](https://www.genome.gov/genetics-glossary/Nucleus), [mitochondria](https://www.genome.gov/genetics-glossary/Mitochondria), [virus](https://www.genome.gov/genetics-glossary/Virus).

Models simplify organelle anatomy and scale. The membrane diagram is explicitly a selective-channel schematic, not a literal two-wall cross section. Generated microscopy art is not a calibrated micrograph. The hypothetical cell design activity identifies guesses and tradeoffs. [Cell correction audit](../allopacks/media/cell_structure_grade7/content-refinements.json).

**Chemical Reactions:** reaction indicators require context and controlled evidence; one changed density or melting point does not independently prove new chemical identity. Reactants need not all be consumed, and products can already be present. Atom accounting includes incoming oxygen and outgoing gases in combustion. Recovery or reversibility alone is not a universal physical-change test. [ACS middle-school chemistry curriculum](https://www.acs.org/middleschoolchemistry/lessonplans.html).

The former sealed-bag experiment is now **Account for the Atoms**, a supplied-data investigation. Its explicitly invented values produce differences of -0.44 g and -0.01 g, compared with ±0.03 g estimated difference uncertainty. Students draw system boundaries and interpret the results; the pack no longer directs them to seal gas-producing reactions in rigid vessels or burn material in a sealed container. The diagrams' boxes represent conceptual boundaries. Particle colors are conventions, and the red/blue reaction is an unnamed counting example. [Chemistry correction audit](../allopacks/media/chemical_reactions_grade8/content-refinements.json).

**Natural Selection:** distinguishes growth, learning and acclimation from population evolution; explains inherited variation and relative reproductive contribution; avoids claiming that variants must precede an environmental change or that overcrowding is always required. Drift can act in populations of any size. Helpful variants are not guaranteed to spread, and reproductive advantage can help cause spread. Directional selection is compatible with having no foresight. [UC Berkeley natural selection](https://evolution.berkeley.edu/evolution-101/mechanisms-the-processes-of-evolution/natural-selection/), [misconceptions](https://evolution.berkeley.edu/teach-evolution/misconceptions-about-evolution/).

The bacterial resistance model explicitly assumes pre-existing inherited resistance for its example, while acknowledging mutation, gene transfer and the limits of survival evidence. Rod-shaped bacterial symbols are used for resistance; beetles illustrate the separate trait-frequency model. The activity uses counters, not microorganisms or antibiotics. [CDC resistance mechanisms](https://www.cdc.gov/antimicrobial-resistance/causes/index.html).

Population counts are invented teaching examples. Moth pictures illustrate habitat context, not measured selection. The one-parent inheritance sketch is a simplified connection, not a full sexual pedigree. The counter investigation includes replacement generations and reproduction, rather than removal alone. [Selection correction audit](../allopacks/media/natural_selection_grade8/content-refinements.json).

## Verification

- 320 passing tests: 18 targeted tests for these editions and 302 catalog checks. Coverage includes all embedded slots, actual selected pixels, alt hashes, retained learning content after audited corrections, valid answer keys, production artifact envelopes and scientific diagram conventions.
- Production imports pass for all 77 collection files and 897 resources. The collection now has 27 illustrated editions.
- Local catalog download and offline production-loader reopen preserve all 44 resources in this batch. All 105 embedded image placements decode offline; all 24 lesson alt attributes are verified.
- All 15 anchor images and all 32 sort images render offline in the native anchor, teacher-sort and student-sort components, with zero pending images.
- All generated originals, all diagram designs, all 12 mobile lesson groups and all three mobile native-resource views were visually reviewed. Native screenshots remain 390 pixels wide; no horizontal growth was found.

[Test report](allopack-quality-2026-09-12/cells-chem-selection-tests.json) · [Collection imports](allopack-quality-2026-09-12/imports.json). Per-pack integration and native-resource reports are stored alongside these reports using the pack slug. Screenshots remain under `scratch/<slug>-qa/` and `scratch/resource-backfill-qa/<slug>/`.

These are local component tests with mocked catalog responses, not a signed-in live-library test. The harness does not include complete translations or app styling. Small anchor images are reminders; larger lesson panels teach the details.

Descriptions are stored in every image slot. Existing glossary and lesson views consume those descriptions; anchor and teacher-sort views treat their adjacent images as decorative, while student-sort uses card statements as alt. This integration does not constitute a complete screen-reader or accessibility audit of those renderers.

## Rebuild and handoff

```powershell
node dev-tools/build_cells_chem_selection.cjs cell_structure_grade7 chemical_reactions_grade8 natural_selection_grade8
```

Always use this wrapper: it assembles images and applies each content refiner. The generic image builder alone omits the science corrections. The initial planner `dev-tools/plan_cells_chem_selection.cjs` refuses to overwrite existing manifests. Reviewed sources, prompts, diagrams, placement manifests, compressed assets and correction audits are under `allopacks/media/<slug>/`.

Before publication, an educator should review the full readings, activities and captions. Use the illustrated files above for any authorized live-library test. No commit, push or live publication was performed in this pass.
