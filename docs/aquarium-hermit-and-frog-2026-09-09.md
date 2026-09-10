# Aquarium species refinement: hermit crab and African dwarf frog

The existing 36-species catalog was reviewed for the next visual pass. This pass refines two existing residents with distinctive anatomy: Hermit Crab (crab) and African Dwarf Frog (dwarffrog). No new stock entry or husbandry parameters were introduced.

## Visible changes

- Hermit crab: sculpted shell with spiral relief, dark aperture and shell lip; two exposed walking-leg pairs; separate fixed and movable pincer fingers; paired eyestalks, long antennae and short antennules. The larger claw is a representative choice. The soft abdomen and reduced rear legs are described as concealed inside the shell.
- African dwarf frog: mottled olive upper surfaces and pale underside; broad head with lateral eyes and nostrils; folded hind limbs; four forefoot digits and five hindfoot digits, webbing on all four feet, and three small inner hind-toe claws per foot.
- Identification text states the scope of both representative models. The frog is identified at Hymenochirus group level; shell shape and claw asymmetry vary among hermit species.
- Fine repeated anatomy is batched into shared geometry. Existing quality settings, physical sizing, simulation identity, selection, and disposal remain in use.

These are procedural teaching models with simplified geometry, rather than scans of a specific specimen. Anatomy is static within each moving resident; individually articulated gait and shell exchange are outside this pass.

## Sources used for morphology

- [Monterey Bay Aquarium: Hermit crab](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/hermit-crab): carried shell protecting the soft, asymmetrical abdomen.
- [Australian Museum Magazine, volume 1 issue 2](https://media.australian.museum/media/dd/Uploads/Documents/28537/AMS368_V1-2_lowres.50e845e.pdf): two walking-leg pairs behind the claws and reduced legs held inside the shell.
- [Australian Museum: Crustaceans](https://australian.museum/learn/animals/crustaceans/): jointed appendages and two antenna pairs.
- [Honolulu Zoo: African dwarf clawed frog](https://www.honoluluzoo.org/services/african-dwarf-clawed-frog/): mottled olive coloration, pale underside, lateral eyes, folded limbs and long webbed toes.
- [University of Michigan frog care teaching guide](https://deepblue.lib.umich.edu/bitstream/2027.42/143442/1/HarrisE.pdf): forefoot and hindfoot webbing and inner hind-toe claws.
- [Primary research on Hymenochirus boettgeri](https://pmc.ncbi.nlm.nih.gov/articles/PMC10614710/): variation within the traded dwarf-frog group and indented webbing.

## Verification

39 tests passed across four test files. They cover actual Three.js geometry at low, balanced and high quality, diagnostic anatomy, finite geometry, full-body containment during movement at 5/20/80 gallon test dimensions, stable catalog identity despite nicknames, and GPU-resource disposal. These dimensions are geometry test cases, not care recommendations.

Real WebGL close-up evidence is stored under .codex-artifacts/aquarium-visual-qa/species-v12-top and species-v12-underside. The QA captures are rendered from the active catalog and simulation bridge. The screenshot harness now waits for matching resident instance IDs after habitat transitions, and captures the rendered canvas immediately to avoid cleared-buffer screenshots.

The primary renderer and desktop public copy are synchronized. Machine-readable verification and a visual review page are in .codex-artifacts/species-v12.
