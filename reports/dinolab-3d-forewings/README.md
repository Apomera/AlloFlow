# Dino Lab forewing continuity

Feathered forelimbs now have a surface-rooted contour coat that blends into the existing forearm fans. Microraptor, Archaeopteryx, Anchiornis and Caudipteryx also receive curved, swept-back hand feathers with overlapping coverts. The new details use the existing species-specific feather material and remain attached to the middle finger surface during movement.

Caudipteryx's conservative minimum keeps its hand feathers but omits the less securely reconstructed long forearm tract. Its evidence panel explains that this does not prove those feathers were absent. The evidence-led view retains a reconstructed forearm arrangement.

Hand feathers are curated for those four taxa. They are removed in historical and fossil-only views. Velociraptor's conservative reconstruction retains the supported forearm feather tract without adding this curated hand-wing treatment or a full body coat.

## Scientific basis and limits

These are procedural educational reconstructions. Feather counts, spacing, length ratios and resting pose are schematic; they are not specimen measurements or demonstrations of flight ability. The simplified covert row does not reproduce every preserved feather layer.

- [Grosmougin et al. (2025), Microraptor forelimb feathering](https://link.springer.com/article/10.1186/s12862-025-02397-5): specimens preserve differentiated hand and arm remiges and coverts. This supports separating the two rendered tracts.
- [Wing morphology of Anchiornis huxleyi (2025)](https://www.nature.com/articles/s42003-025-09019-2): extensive overlapping primary coverts differ from a simple modern-bird silhouette. The model gives Anchiornis longer coverts but remains a simplified illustration.
- [Foth et al. (2014), Archaeopteryx pennaceous feathers](https://www.nature.com/articles/nature13467): fossil evidence supports substantial wing plumage.
- [Ji et al. (1998), Two feathered dinosaurs from northeastern China](https://www.nature.com/articles/31635): feather preservation in Caudipteryx informs its feathered reconstruction without implying powered flight.

- [Qiu et al. (2019), caudipterid wing attachments](https://www.nature.com/articles/s41598-019-42547-6): describes hand-restricted remiges in known Caudipteryx specimens when comparing a new relative. This informs the conservative hand-only wing tract. Forearm arrangements in broader reconstructions remain inference; [a 2018 aerodynamic study](https://pmc.ncbi.nlm.nih.gov/articles/PMC6294793/) used reconstructed hand and forearm feathers in an aerodynamic model.

## Visual review

Reviewed the desktop life views of all four hand-wing species, a close-up of Microraptor's wing transition, and its phone view. The paired hand/forearm surfaces share each species' existing feather colors. Additional side and overhead frames are captured by the browser checks.

[Microraptor](microraptor-life.png) · [Wing detail](microraptor-wing-study.png) · [Archaeopteryx](archaeopteryx-life.png) · [Anchiornis](anchiornis-life.png) · [Caudipteryx](caudipteryx-life.png) · [Phone](microraptor-mobile.png) · [Caudipteryx minimum](caudipteryx-minimum.png)

## Validation

**52 focused unit checks across five suites passed:** hand-wing evidence boundaries across the catalog, feather geometry and frames, skin attachment, body-coat geometry, and camera-study bounds. [Final unit results](final-unit-results.txt)

**Eight wing browser scenarios passed:** all four curated hand-wing species, two non-wing controls, live hand/tail motion, historical/minimum view transitions, fossil-only layers, side/overhead cameras and narrow phone framing. The added feathers remain above the ground, use one shared feather texture, and pass finite-coordinate, camera-clipping, shader and context-loss checks. [Browser results](browser-results.txt)

**Two final Caudipteryx checks passed** after the minimum-view refinement: the original desktop/mobile life-view scenario and the new hand-only minimum/source-note/restoration scenario. The minimum view was visually reviewed. Across the completed runs, **15 distinct browser scenarios passed**. [Final comparison results](minimum-browser-results.txt)

Feather roots retain the existing tiny surface clearance (3% of feather width); the moving hand feathers keep stable local roots while their vanes sway. [Motion record](motion-metrics.json)

**Six coat browser scenarios passed:** Microraptor, Anchiornis, Yutyrannus and Sinosauropteryx surface attachment, Velociraptor's forearm-only minimum, and motion/opacity/accessibility. Geometry and texture counts stayed at 419 / 8 through opacity changes; the evidence panel had 0 axe violations. [Coat results](coat-browser-results.txt) · [Motion, opacity and accessibility](coat-checks/motion-opacity-accessibility.json)

The first coat run was interrupted when the conversation resumed. It was rerun to completion; the partial record is retained as [interrupted run](coat-browser-interrupted.txt).

Canonical, public, and both existing desktop build copies are byte-identical. Renderer SHA256: db153309ce9a2af969c04c0bb2ae1fcd5b6d07eb1a49907669f87be0500336f9.

No push, deployment or packaged installer. Browser checks use local software WebGL, not a physical-device frame-rate benchmark.
