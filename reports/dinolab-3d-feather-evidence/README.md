# Dino Lab feather coats and reconstruction evidence

The 3D life surfaces now have overlapping contour plumage on feathered forms and narrow, swept tufts on filament-covered forms. Body, nape, neck, tail and upper-leg tracts are rooted in the rendered skin and inherit its motion. Six batched meshes avoid creating a separate draw call for every feather. Existing feather wings, pigment patterns, anatomy labels and fossil layers remain available.

The **Compare coverings** button opens the model choices directly. **Why this covering?** separates supported observations from reconstruction uncertainty and links six example species to primary research. Historical views carry a persistent canvas caption, including on phones. The evidence-led reconstruction remains the default.

Velociraptor's minimum view retains the supported forearm feathers but omits its inferred body coat and tail arrangement. Psittacosaurus retains localized tail bristles without acquiring a body coat in the conservative or avian-informed modes. Tyrannosaurus stays scale-dominated by default; its optional filament treatment is restricted to a dorsal tract and explicitly marked speculative.

## Scientific basis and limits

Birds are living theropod dinosaurs. Feather presence is well supported for some extinct species; full coat shape, density, resting posture and many colors remain reconstructions. The models are procedural educational illustrations, not scans of complete preserved animals or calibrated feather-density maps. Model variants are not equally supported scientific claims.

- [Turner et al. (2007)](https://doi.org/10.1126/science.1145076): Velociraptor forearm quill knobs support secondary feathers, without supplying a complete body plumage map.
- [Xu et al. (2003)](https://doi.org/10.1038/nature01342): Microraptor preserves long feathers on arms and legs; flight behavior remains a separate question.
- [Hu et al. (2009)](https://doi.org/10.1038/nature08322): Anchiornis preserves extensive feathering, including long feathers on the hind limbs.
- [Xu et al. (2012)](https://doi.org/10.1038/nature10906): Yutyrannus specimens preserve long filaments, including in large individuals.
- [Bell et al. (2017)](https://doi.org/10.1098/rsbl.2017.0092): tyrannosaurid skin impressions support scales in sampled regions. They do not provide a complete living surface for every body region.
- [Zhang et al. (2010)](https://doi.org/10.1038/nature08740): fossil pigment evidence informs Sinosauropteryx tail bands. Fine pattern boundaries remain reconstructed.

## Visual review

[Microraptor](microraptor-life.png) · [Anchiornis](anchiornis-life.png) · [Yutyrannus](yutyrannus-life.png) · [Sinosauropteryx](sinosauropteryx-life.png) · [Phone model](microraptor-phone.png) · [Phone evidence panel](evidence-phone.png)

Initial visual review caught reversed face winding in the new coat; corrected winding now agrees with the supplied shading normals and has a regression check. Tail pigment samples use the coat roots, preventing a feather from switching bands along its length. The phone review prompted moving the reconstruction identity into the two persistent compact readouts.

## Validation

**155 focused checks across eight suites passed in the final run**, including geometry, plumage, pigment mapping, accessibility, body labels, moving labels, camera studies and all catalog/render goldens. Only the Field Station snapshot was updated. [Final unit results](final-unit-results.txt) · [Snapshot update](snapshot-update.txt)

**Eight distinct Chromium scenarios passed.** They cover four feathered species, the Tyrannosaurus regional alternative, Psittacosaurus bristles, motion/keyboard opacity/accessibility, and the Velociraptor minimum view. The Microraptor comparison/phone scenario passed again after the final compact-caption adjustment, including the visible historical label. [Browser results](final-browser-results.txt) · [Final phone recheck](phone-browser-results.txt) · [Historical phone view](historical-phone.png)

The sampled moving coat remained exactly rooted (zero parent/coat root displacement), moved with breathing, and followed opacity changes. Reference resource counts remained 353 geometries / 8 textures through those interactions. The evidence panel had zero axe violations. Shader/error/context-loss and model-framing checks passed. These checks use local software WebGL, not a physical-device frame-rate benchmark. [Motion and accessibility record](motion-opacity-accessibility.json)

An initial extended unit run hit the existing five-second interaction-test timeout and produced a subsequent mount-failure cascade. The isolated 15-case accessibility recheck passed; the final 155-case run also passed using a 30-second per-test allowance. [Initial extended attempt](extended-unit-attempt.txt) · [Isolated recheck](accessibility-recheck.txt)

Canonical, public and both existing desktop build copies are byte-identical. Renderer SHA256: `8e562e6adcec3d39298434486d5b60d89f486b01f1611b404e6ee17e6b3d074b`. [Validation record](validation.json)

No push, deployment or packaged installer. This pass includes the previously staged [moving-callout refinement](../dinolab-3d-label-flow/README.md).
