# Long-fin betta anatomy and membrane motion

This pass refines the existing betta stock entry as a representative long-fin domestic male. It does not add a breed or species, change stocking rules, or alter simulation chemistry.

## Visible changes

The betta now has two slender pelvic fins beneath the pectorals, a swept dorsal fin, a long-based anal fin and a single flowing tail with a softer, asymmetric outline. Smaller fan-shaped pectorals replace the generic triangular pair. Gill-cover seams and a small raised mouth opening add head detail. Fin pigment uses a rose-toned ray color and subtle folds rather than the generic brown ray color.

The species identification describes the full fin arrangement and explicitly identifies the model as a representative domestic male. It is not intended to stand for every breed, female or wild form.

## Rooted membrane motion

The dorsal, anal and caudal membranes deform gently across their existing vertices. Weights leave their attachment edges fixed and increase toward free edges. The renderer retains the same geometry and position buffers, updates normals and bounds, and reserves an additional motion envelope when calculating tank containment. Tail sweep is reduced for this long-fin form, while the pectorals stroke in mirrored pairs.

Visual pause and operating-system reduced-motion preferences hold the complete pose. This is illustrative animation, not fluid dynamics or a fin-ray biomechanics model. Fin-ray pigment does not claim an exact meristic count.

## Morphology reference

[Aquarium Industries: Siamese Betta Guide to Variations and Tail Types](https://www.aquariumindustries.com.au/wp-content/uploads/2015/03/Siamese-Betta-Identification-Guide.pdf) is the primary industry identification reference used for domestic fin-form variation and pelvic-fin placement beneath the pectorals. The model uses a representative long-fin outline rather than claiming a breed-standard specimen. Only the fin-form and anatomy material informs this refinement.

## Validation

Real Three geometry checks cover complete anatomy at all three quality levels, three independently deforming membranes, stationary attachment edges, bounded displacement, retained buffers, paired pectoral motion, pause and reduced motion at startup and after a preference change, disposal, and containment across three volumes and three tank shapes. Those containment checks are renderer tests, not stocking recommendations. A non-betta control confirms that other species do not inherit the membrane deformation.

The adjacent goldfish, species identity, dimensions, renderer lifecycle and pigment-surface suites run with the new tests. Real WebGL evidence comes from the active catalog and simulation bridge, including a dedicated rooted-fin animation check. The before-and-after review and exact delivery results are under .codex-artifacts/species-v19.
