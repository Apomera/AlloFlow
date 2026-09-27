# Pass ten: fin visual review

Reviewed the final cuttlefish, bobtail, Dumbo and vampire profile PNGs against their matching `initial-*` captures, plus the cuttlefish and Dumbo phone captures. Also reviewed `dumboOcto-fin-detail.png` and `vampireSquid-fin-detail.png`, captured using three ordinary Higher inputs and one Orbit right input. This was an image-only review; no browser or production-source edits.

The cuttlefish now carries a narrow membrane along nearly the full mantle instead of a hanging central strip. Bobtail has a shorter rounded lateral paddle. No visible seam gap, displaced fin, clipping, lighting failure or phone-control overlap appeared in these captures. Dumbo's previous long crescent crossing the mantle is gone.

The default profile presents the near-side Dumbo and vampire fins almost edge-on. The additional ordinary orbit views resolve this concern: each shows a curved, rounded lobe attached to the mantle, with the opposite fin contributing a separate silhouette. Neither view shows a detached seam or the previous crescent strip crossing the body. Vampire's dark palette reduces contrast but its two fin shapes remain readable in the orbit view. No further visual correction is needed for this pass. Still images do not establish swimming continuity; the geometry audit and live browser tests cover that separately.

## Anatomy basis and limits

- [Mangold and Young, Sepiidae](https://tolweb.org/Sepiidae/19987): narrow fins extending almost the mantle's full length, with separate posterior attachments. This supports the cuttlefish skirt rather than a short central flap.
- [Young, Grimpoteuthis](https://tolweb.org/Grimpoteuthis/20104): lateral fins and a lobe near the anterior insertion, with considerable variation across the genus. The model represents a general Dumbo form, not a measured species reconstruction.
- [Young, Vampyroteuthis infernalis](https://tolweb.org/Vampyroteuthis_infernalis): adult paired fins differ from the temporary additional juvenile pair; the documented stroke sequence supports a flexible paired-lobe motion. The existing adult two-fin interpretation is retained.
- [Seehafer et al. 2018, Hawaiian bobtail defensive behavior](https://pmc.ncbi.nlm.nih.gov/articles/PMC5884957/): Figure 2 and its fin-swimming description document extended undulating fins with a rounded mantle. The model's shorter paddle outline is an illustrative interpretation; exact dimensions and beat rates are not asserted as measured anatomy.

No reference image is bundled. The change adds no flashing, texture, shader, eye, arm, feeding or movement-rule changes. The only intentional non-fin transform change is continuous mantle breathing for these four swimmers. Raw jet state still drives their pre-existing arm poses.

## Geometry cost and attachment verification

Each affected animal retains two fin meshes, two fin draw calls and the existing material ownership. Each fin has 28 longitudinal segments and five span divisions (174 vertices and 280 triangles). The pair changes from 116 to 348 vertices and 112 to 560 triangles: +232 vertices and +448 triangles per affected animal. Buffers remain fixed and update in place; no rig RNG or new asset is introduced.

The guarded script's bundled-Three check completed 720 animation frames across the four species. All emitted fin positions were finite and all normals unit length. Maximum observed fin-vertex displacement between 1/60-second samples was 0.017012 model units, including boost entry and exit. Zero-delta updates and reduced-motion updates preserve the new fin pose; reduced motion also fixes the new mantle breathing scale.

Root vertices are at normalized mantle radius 0.992, including the mantle's current scale and position. Every seam was additionally tested against actual rendered mantle triangles, not only an ideal ellipsoid: measured embedding was 0.001292 to 0.006129 model units. The obsolete Dumbo mesh rotation was removed so it cannot detach this seam in the live loop.

The audit also verified unchanged non-fin vertex/normal data and sucker-instance matrices for the four swimmers, stable geometry/material/buffer identities, and exact animated geometry plus mantle-scale parity for Humboldt squid, common octopus, blue-ringed octopus and nautilus. Root subsequently reported all nine geometry units and all four new browser cases passing, including world-space Dumbo seam attachment and cuttlefish reduced motion/resource disposal. Browser captures and integration tests remain owned by the root task.
