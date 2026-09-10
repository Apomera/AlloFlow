# Mudskipper anatomy and pectoral-fin refinement

This pass refines the existing mudskip stock identity. The model remains a representative mudskipper group rather than an exact species identification. No new stock entry or husbandry rule is introduced.

## Visible changes

The body now has a broader anterior region, a lower underside and a rear taper. The existing continuous mottled pigment map follows the reshaped mesh. Raised eye mounds, upward-angled irises and pupils, small nostrils, a mouth line and gill-cover marks clarify the head.

Each pectoral fin has a fleshy base and a broad fan with visible supporting rays and a more opaque membrane for readability against the substrate. The rays move with the same fin assembly. Paired pelvic fins, a posterior anal fin and two separate dorsal fins complete the representative fin arrangement. Visible rays are illustrative details, not exact anatomical counts.

The two pectoral assemblies stroke together with mirrored rotations. Their subtle stroke rate follows the existing modeled activity/vitality cue. This is a visual crawling cue within the current scene, not a biomechanical simulation of land contact, a new amphibious habitat model, or a claim that the animal is walking on dry ground. Pausing and reduced-motion preferences freeze the fin pose.

## Morphology references

- [Ziadi-Kunzli and colleagues, 2024, Journal of Anatomy](https://pmc.ncbi.nlm.nih.gov/articles/PMC11424826/): raised dorsal eyes, muscular pectoral bases, reinforced fin structures and coordinated pectoral use in barred mudskippers. This supports general anatomy and the motion cue; it does not establish the identity of the catalog's generic mudskipper.
- [Pectoral fin development in Periophthalmus modestus, 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6086994/): supporting fin-development research (search abstract consulted; direct page presented a browser check).
- [Australian Museum Magazine, volume 3 issue 11](https://media.australian.museum/media/dd/Uploads/Documents/28768/AMS368_V3-11_lowres.9240649.pdf): observations of pectoral-fin propulsion and mottled coloration.

## Verification

The dedicated tests cover all three quality settings, biological identity despite a misleading nickname, the broader head/rear taper, finite geometry, paired fin coordination, pause/reduced-motion behavior, complete bounds while moving through resized tanks, preserved scale and disposal of added resources.

Existing species identity, dimensions and renderer lifecycle tests run alongside these checks. The exact final count is recorded in .codex-artifacts/species-v16/delivery-validation.json.

Desktop side-view and mobile upper-view captures come from the active species catalog and simulation bridge. The mobile WebGL review additionally exercises paired fin movement, paused pose and stable geometry. Captures are stored under .codex-artifacts/aquarium-visual-qa/species-v16-side-verified and species-v16-top-verified. The source and desktop public copy are synchronized at delivery.
