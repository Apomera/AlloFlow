# Silver angelfish anatomy refinement

This pass refines the existing angelfish stock entry as a representative adult silver domestic form. It changes visual anatomy and motion, not chemistry, stocking rules or the catalog species list.

## Visible changes

The former deeply forked tail is replaced by a broad membrane with a nearly straight trailing edge and two extended outer rays. The dorsal and anal fins have fuller bases and elongated posterior regions. The paired pelvic fins now have narrow membranes and finer filament rays instead of thick rods. Small fan-shaped pectorals and subtle gill-cover lines complete the silhouette.

Four dark body bars are painted directly onto the compressed silver body, including the eye and tail-base regions. The dorsal and anal membranes receive their own mapped pigment, continuing the main dark band onto the tall fins. Ray detail remains illustrative rather than an exact ray count. The silver body uses a slightly softer highlight response.

The small pectorals stroke in mirrored pairs and the tail sweep is restrained. The large dorsal and anal fins retain their attachment geometry. Pausing and reduced motion freeze the pose. Fin strokes are illustrative, not a hydrodynamic model.

## Morphology references

- [Nature in Singapore: Some cichlid fishes recorded in Singapore (2012)](https://lkcnhm.nus.edu.sg/app/uploads/2017/04/2012nis229-236.pdf): the angelfish diagnosis describes a deep compressed body, truncate caudal fin, increasing dorsal/anal spine lengths toward the rear, and elongated pelvic rays. The indexed excerpt includes specimen records and photographs; direct PDF access was unavailable in the browsing tool.
- [FishBase: Pterophyllum scalare morphology](https://www.fishbase.se/physiology/Pterophyllum_scalare): independently corroborates a more-or-less truncate tail with upper and lower filaments, elongated pelvic rays, and the representative adult four-bar pattern.

The profile explicitly identifies an adult silver domestic form. Bar intensity, fin extensions and coloration vary among individuals and domestic strains.

## Validation

Dedicated real-Three tests cover anatomy at all quality levels, raycasts proving the tail membrane fills the former central fork, upper and lower tail filaments, fine pelvic structures, four body bars sampled on both sides, fin pigment, paired motion, pause, reduced motion, vessel containment and disposal. Adjacent betta, dimensions, species identity, surface and renderer lifecycle suites accompany the new tests.

Actual WebGL captures use the active catalog and simulation bridge. A frame-based browser check verifies mirrored pectoral strokes, bounded tail movement, paused pose and unchanged geometry. Exact final test counts, source hashes and desktop mirror parity are recorded in .codex-artifacts/species-v20/delivery-validation.json. Rendering bounds tests are not stocking recommendations.
