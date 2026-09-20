# Layered woodland vegetation

The forest now includes irregular clusters of young trees and low shrubs between the ground cover and mature canopy. Young trees have slender leaning stems, three branching arms and narrow crowns. Shrubs spread their leaves lower and wider. Height, crown position and foliage tones vary within the clusters, with broad gaps breaking up the woodland edge.

A separate deterministic placement seed preserves existing trees, ferns, grass, mushrooms and the soil-study patch. New plant centres stay outside the modeled clearing and front viewing corridor, with spacing between plants and existing trunk bases. The new scenery disappears during specimen isolation and returns when isolation ends. It remains stable across timeline scrubbing, lighting changes, reduced motion and scene recreation.

Two instanced meshes reuse existing stem/foliage geometry and bark/leaf materials. No new texture or material is added. Saplings and shrubs are visual scenery; they do not add food biomass, change refuge-cover calculations or introduce individual plant growth.

## Validation

Both browser scenarios passed: new woodland layers and existing forest lighting. The new scenario inspects actual instance matrices, placement, color allocation, isolation and exact reconstruction after hiding/showing the 3D view. Existing forest-lighting checks cover all lighting presets and saved model data. Clearing, overview, low animal view and mobile captures were visually reviewed. JavaScript syntax validation passed. Web and desktop source SHA-256 hashes match: AB26F5B242BDF8A681DF696532647061B9A3A9AEE40210D3460904A935AC6EE4.
