# Anemone anatomy and filter-linked tentacle motion

This pass refines the existing sea-anemone catalog entry. It introduces no additional species or husbandry parameters.

## Visible anatomy

The model has an attached pedal disc, a subtly ribbed column, a radial oral disc with a central mouth, and a three-row crown of tapered tentacles. Tentacle length and curvature vary deterministically between individuals. Muted tissue pigment becomes lighter toward the tips. All tentacles are combined into one indexed mesh, with 24, 42 or 60 illustrative tentacles depending on rendering quality. Those counts are a display choice, not a species identification or simulated population count.

The profile remains explicitly representative: anemone species differ in color, tentacle arrangement and body form. No clownfish-host species match is asserted by this visual model.

## Connection to the simulation

Effective filter output controls the amplitude of an illustrative tentacle deflection. Half output produces half displacement at the same animation time. An absent, disabled or zero-output filter restores the resting crown when visual animation runs. The pedal disc, body column and organism anchor remain fixed. Pausing visual motion or enabling reduced motion freezes the current pose; resuming continues animation. The view never advances the ecosystem clock.

This is an educational visual response to filtration, not a solved water-current field or a model of tentacle muscle activity. Independent contraction, prey handling and fluid dynamics are outside this pass.

Whole-body clearance reserves the maximum horizontal deflection. Tentacle deformation reuses existing geometry and updates normals and picking bounds. Geometry and materials remain owned by the resident and are disposed when it is removed.

## Biological references

- [Australian Museum: The Spectacular Sea Anemone](https://museum-publications.australian.museum/media/dd/Uploads/Documents/37084/ams370_vXVIII_12_lowres.1023043.pdf): oral disc and central mouth, body column, and pedal disc.
- [Australian Museum: Jellyfish, anemones and corals](https://australian.museum/learn/animals/jellyfish/): anemones are animals within the cnidarians and use tentacles.
- [Monterey Bay Aquarium: Carpet anemone](https://www.montereybayaquarium.org/animals-the-ocean/animals-a-to-z/carpet-anemone): anchored base and expanded tentacle crown; cited for general attachment structure, not as an exact species match.

## Validation evidence

The dedicated tests cover all three quality settings, diagnostic structures, upward-facing oral-disc normals, finite geometry, proportional filter response, fixed attachment, pause/reduced-motion behavior, vessel containment and resource disposal. Existing species identity, dimensions and renderer lifecycle tests accompany them.

Real WebGL evidence under .codex-artifacts/aquarium-visual-qa/species-v14-top and species-v14-side uses the active catalog and simulation bridge. The desktop review also exercises tentacle deformation, pause, fixed attachment and filter-off restoration. A review page and exact test results are stored in .codex-artifacts/species-v14.
