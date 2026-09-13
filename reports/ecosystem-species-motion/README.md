# Caterpillar articulation, owl banking, and action labels

The caterpillar now has articulated segments instead of moving as a rigid shape. A small travelling deformation follows distance moved, eases out when crawling stops, and preserves overlap between neighbouring segments. The head tips during feeding. Eyes and body markings move with their own segment. Each segment samples the local terrain height, with a low body offset and contact shadow beneath the feet, to avoid floating over slopes.

The generic anatomy uses a head, three thoracic segments, and ten abdominal segments. It distinguishes three pairs of true legs from five pairs of prolegs, rather than placing an identical leg pair on every segment. This depicts one common caterpillar form; proleg counts vary across caterpillar groups. [University of Missouri Extension: caterpillar anatomy](https://extension.missouri.edu/publications/ipm1019), [UC IPM: distinguishing caterpillar-like larvae](https://ipm.ucanr.edu/home-and-landscape/distinguishing-caterpillar-like-larvae/).

Owls now bank according to their actual heading changes, with bounded, eased roll, replacing the previous independent body sway. Wingbeat amplitude eases between flapping and gliding. The current action and representative number appear inside the inspection image, so the behavior remains readable while watching or capturing a close-up. The overlay is absent in habitat view and says Starting pose when reduced motion is enabled.

These are illustrative kinematics, not measured gait or flight dynamics. The changes do not alter biomass samples, food-web equations, representative counts, or caterpillar life stages. Reduced motion uses the same frozen starting articulation at every selected time.

## Verification

Twenty unit checks passed across species motion, action transitions, contextual behavior, and insect/bird model integration. New checks cover connected segment spacing, crawl settling, feeding articulation, turn-driven banking, bounded wingbeat changes, deterministic replay, and unchanged model samples.

Browser verification covers action captions, exact timeline articulation, specimen isolation, camera selection, desktop and mobile views, and reduced motion. Captures and final results are retained in this directory.


Final verification: both browser scenarios passed, and desktop caterpillar, desktop owl, and mobile owl captures were visually reviewed. The terrain-grounding refinement was checked again in the species-motion browser scenario. All 20 unit checks passed; during the grounding rerun, the exhaustive movement case exceeded a 30-second limit under machine load and passed when rerun alone with a 120-second allowance. Syntax validation passed. The web and desktop source copies match.
