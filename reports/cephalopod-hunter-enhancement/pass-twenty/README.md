# Cephalopod Hunter — pass twenty

The moray now has a curved tapering tail, continuous median fin, recessed jaws, small teeth, actual gill openings and visible iris/pupil surfaces. Its home is an irregular stone crevice with an open entrance. Moon jellies now have correctly oriented translucent bells, four horseshoe organs, radial canals, frilled oral arms and twenty-four fine marginal tentacles. Their roots follow the moving bell and mouth; live lighting normals follow the pulse.

Exploration creates the same mineral-finished stone arches and cavity shading as the starting reef. The existing distance gate, placement annulus, den cap, grounding and shelter protection remain. Native gameplay verifies entering a real newly spawned den protects against the real moray, while existing ink, cover, target and mission checks pass.

**69 focused unit cases, 11 Chromium scenarios and thirteen matched native views passed.** Low/balanced GPU checks cover linked shaders, bound attributes, stable resources, pursuit/return, pause/inspection, motion settings and cleanup. The strict fin-normal failure was corrected in geometry; no assertion was relaxed. Capture RNG isolation and pause-veil issues were corrected in the fixture before acceptance.

Measured geometry costs (vertices / triangles / raw attribute and index bytes):

| Object | Before | After | Meshes / materials |
| --- | --- | --- | --- |
| Moray | 199 / 208 / 7616 | 1164 / 1856 / 53040 | 4 / 4 |
| Moray home | 153 / 256 / 6432 | 880 / 400 / 34080 | 1 / 1 |
| Moon jelly, each of five | 423 / 502 / 16548 | 1721 / 2970 / 79776 | 8 / 8 |
| Streamed den | 126 / 86 / 4548 | 565 / 302 / 20120 | 5 / 3 |

These are illustrative forms with static moray anatomy and ordinary alpha transparency. Additional detail is not an FPS or physical-refraction claim. The jelly base-position snapshot is additional CPU state, excluded from the geometry-byte figures.

- [Moray oblique](moray-oblique.png), [side](moray-side.png), [face](moray-face.png), [tail](moray-tail.png), [reef](moray-reef.png), [phone](moray-phone.png)
- [Jelly oblique](jelly-oblique.png), [crown](jelly-crown.png), [underside](jelly-underside.png), [phone](jelly-phone.png)
- [Streamed den front](streamed-den-front.png), [rear](streamed-den-rear.png), [phone](streamed-den-phone.png)
- [Model notes](model-notes.md), [environment notes](environment-notes.md), [streamed shelter notes](streamed-den-notes.md), [validation](validation-notes.md), [summary](validation-summary.json)

All four runtime copies match. Accepted cephalopod, fish, crab/clam, grouper, initial environment and shader helpers remain exact. Twelve pre-existing translation wrappers per tracked source remain outside the scoped commit. No push or deployment.
