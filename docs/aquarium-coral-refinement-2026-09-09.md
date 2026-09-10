# Branching stony coral refinement

This pass refines the existing stonycoral catalog entry. The catalog continues to describe a representative branching stony-coral colony, without asserting an exact species or adding stock entries.

## Visible changes

The smooth, bulb-tipped branch model has been replaced by tapered main branches and smaller forks, an irregular encrusting base with surface relief, and deeper tissue pigmentation. Small outward-facing corallite cups follow branch surfaces. Each visible cup contains a polyp disc and central mouth; a subset has twelve short tentacles to make the animal structure legible in close-up.

The complete colony is assembled into seven meshes. Quality changes branch subdivisions and corallite density while preserving the same main branching structure. The visible cups and polyps are illustrative enlarged features; they do not represent a measured polyp size or a simulated colony census.

The calcium-carbonate framework stays rigid and anchored as visual time and filter output change. Tank resizing preserves body scale and uses the full geometry for containment. This pass does not introduce coral growth, bleaching, polyp feeding or contraction simulation.

## Morphology references

- [NOAA: Polyps up close](https://oceanservice.noaa.gov/education/tutorial_corals/media/supp_coral01a.html): central mouth, surrounding tentacles, protective skeletal cup and connected living tissue.
- [NOAA: What are corals?](https://oceanservice.noaa.gov/education/tutorial_corals/coral01_intro.html): hard corals produce a rigid calcium-carbonate skeleton.
- [Australian Museum: Coral colonies](https://australian.museum/blog/amri-news/news-from-lirs-deconstructing-coral-colonies/): branching versus massive growth forms and the role of polyp/corallite detail in identification (search extract; direct page returned 403 during this review).
- [Australian Museum Magazine, volume XV issue 8](https://museum-publications.australian.museum/media/dd/Uploads/Documents/35445/ams370_vXV_08_lowres.d05a27e.pdf): distinction between octocoral tentacles and the commonly sixfold pattern of stony-coral polyps.

## Verification

39 tests passed across four files: dedicated coral anatomy checks plus existing catalog identity, tank dimensions and renderer lifecycle checks. The dedicated tests cover low/balanced/high geometry, finite coordinates/normals, outward-facing cup detail, seven-mesh batching, stable rigid placement, preserved scale during resizing, whole-colony containment and resource disposal.

Desktop side-view and mobile upper-view WebGL evidence is stored in .codex-artifacts/aquarium-visual-qa/species-v15-side-final and species-v15-top-final. Captures use the actual active catalog and simulation bridge. The source hash, mirror parity, browser results and visual review are stored in .codex-artifacts/species-v15.
