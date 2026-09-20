# Refined woodland leaf surfaces

The shared canopy texture now renders at 512 by 512 pixels. Individual leaves have soft directional shading, a central vein and fine paired side veins. The existing cutout silhouettes, random draws and leaf positions are preserved, so this refinement does not rearrange trees, shrubs, grass or mushrooms.

Mature trees, saplings and shrubs reuse the same texture and existing instanced meshes. No meshes, materials, draw calls or animation timers are added. Texture storage increases with the higher resolution. The established breeze and reduced-motion behavior are unchanged. This is visual detail rather than a new plant species or change to food-web calculations.

## Validation

JavaScript syntax passed. The existing foliage-motion and woodland-layer browser scenarios both passed (6.4 minutes total). They cover exact rendered rewind, Still mode, reduced motion, mobile layouts, woodland spacing, isolation, scene recreation and unchanged saved model data. No shader or runtime errors were reported.

The actual leaf atlas was rendered from the production drawing code and reviewed at full resolution. Mobile clearing and fox inspection captures were also visually reviewed. The web and desktop source SHA-256 hashes match: FB6D0F9FA0618B63C5791137F8B67A1CBF8860730FFBB206D17B4E9ACE93D15C.