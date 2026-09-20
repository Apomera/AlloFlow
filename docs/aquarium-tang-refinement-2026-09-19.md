# Palette tang anatomy refinement

This pass refines the existing palette tang stock entry. It improves the representative 3D model without adding a species or changing chemistry, diet, stocking rules or other biological parameters.

## Anatomy and pigment

A continuous, long dorsal fin replaces the generic triangle. The model now has a long anal fin, paired pelvic fins and broader pectorals. Its tail has a filled central trailing edge and short protruding lobes, representing the adult-type outline. The yellow center is bordered in black above and below.

The black body pattern connects toward the eye and tail base while preserving the blue central window. A yellow wedge continues forward onto the tail base. Two small folded spine blades sit in shallow grooves, one on each side; raycast tests check that the blades are visible outside the body and groove geometry. Gill-cover lines add restrained head detail.

The pectorals stroke in mirrored pairs and the tail sweep is reduced. Pause and reduced-motion settings hold the pose. Proportions, fin-ray detail and swimming strokes remain illustrative. The model does not simulate spine deployment, hydrodynamics or age-dependent growth.

## Primary morphology references

- [Australian Museum: Blue Tang, Paracanthurus hepatus](https://australian.museum/learn/animals/fishes/blue-tang-paracanthurus-hepatus/): blue-and-black body coloration, yellow caudal fin with black upper and lower margins, and a blade on each side of the tail base.
- [FAO species identification guide, page 3681 / PDF page 9](https://www.fao.org/4/y0870e/y0870e30.pdf): continuous dorsal fin, anal and pelvic fins, adult tail outline, folding peduncular spine, black head and rear connections, and the yellow tail wedge. The profile distinguishes the adult-type outline from younger forms.

## Validation

Real Three tests check complete fin anatomy and visible bilateral blades at all three quality levels; a filled tail center; yellow and black tail pigment on both faces; connected body markings; paired motion; pause and reduced motion; unchanged geometry; full-body containment through tank resizing; and disposal of mesh, material and texture resources. Tank-volume samples are rendering checks, not stocking recommendations.

The new tests run alongside angelfish anatomy, species identity, dimensions, renderer lifecycle and surface-pigment suites. Real WebGL screenshots use the active catalog and simulation bridge. The frame-based browser check verifies moving paired fins, mirrored strokes, restrained tail movement, paused pose and stable geometry. Exact test counts, browser results, source hashes and desktop mirror parity are recorded under .codex-artifacts/species-v21.
