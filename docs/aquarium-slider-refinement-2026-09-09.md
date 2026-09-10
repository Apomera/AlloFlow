# Red-eared slider visual refinement

This pass refines the existing slider catalog entry. No additional species or husbandry parameters were added.

## Model changes

The former raised shell blobs have been replaced with a continuous low domed carapace. Curved seams describe five central vertebral regions, four costal regions on each side, and the marginal border. Muted yellow markings and fine surface variation follow the cap. The lower shell is yellow with paired dark markings.

The neck, head and limbs carry longitudinal pale stripes. The paired red patches remain behind the eyes. Four feet now have webbing and five visible digits; the model depicts short claws, a tapered tail, small nostrils and a beak line. Color and anatomy metadata describe a representative red-eared slider; age, sex and individual markings vary. This is a procedural teaching model with static appendages within a moving organism.

The existing physical-size and tank-boundary calculation uses all new geometry. Repeated digits, claws and tail segments are batched; quality settings reduce shell and skin subdivisions. The renderer retains stable catalog identity and disposal ownership.

## Morphology references

- [University of Michigan, Animal Diversity Web: Trachemys scripta](https://animaldiversity.org/accounts/Trachemys_scripta/): webbed feet with five digits, shell and skin coloration, and variation with age and sex.
- [California Department of Fish and Wildlife: Red-eared slider](https://wildlife.ca.gov/Conservation/Invasives/Species/Redeared-Slider): olive-to-brown shell and skin, yellow stripes, and the characteristic red marking behind each eye.
- [Naturalis: Turtles of the World, scutes](https://turtles.linnaeus.naturalis.nl/linnaeus_ng/app/views/introduction/topic.php?epi=11&id=179): central vertebral and paired pleural arrangement.
- [Jasinski 2018, fossil Trachemys description](https://pmc.ncbi.nlm.nih.gov/articles/PMC5815335/): supporting genus-level scute architecture. This fossil is not used as a color or body-proportion reference.

## Validation

The targeted geometry tests exercise low, balanced and high quality, anatomical landmarks, finite surfaces, containment during movement in multiple tank dimensions, unchanged geometry scale when resizing, and resource disposal. Existing species identity, dimensions and renderer lifecycle tests run alongside them.

Real WebGL captures from the active catalog and simulation bridge are saved in .codex-artifacts/aquarium-visual-qa/species-v13-top and species-v13-underside. The visual review and exact validation counts are saved in .codex-artifacts/species-v13. The primary renderer and desktop public copy are synchronized at delivery.
