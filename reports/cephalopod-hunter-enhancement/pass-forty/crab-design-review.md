Body-only crab cuticle proposal

Retains geometry, all attributes, indices, bounds, normals, named slots, child transforms, material type/static properties, four-draw spawn contract, gameplay and resource ownership. Only body materials receive the hook.

The body has no authored-frame rotation/anchor correction or legacy scale. A static per-material clCrabScale normalizes local position; clCrabHermit adjusts the oval proportions and center without any geometry change. Curved front/back divisions and paired shoulder divisions are shallow pigment/roughness variation on dorsal central tissue only. Fine sparse pores resolve only under supported derivatives and fade before lattice cells alias at distance. Broad coloring survives the fallback. No normal perturbation, fake glints, emission, loops, textures or extra attributes.

Fine-grid integer cells stay around [-34,34] on the actual body. The small modular hash avoids large sine arguments. Mottling uses bounded fixed local coordinates. Tone conservatively stays positive, under roughly 1.05; roughness is clamped to [0.56,0.82]. Visual captures must decide whether groove contrast should be reduced further.

Proposal files are task-local. Root must run all CPU/native shader tests and capture matching baseline/current views before accepting. The portable unit suite expects tests/helpers/cephalopod_crab_cuticle_reference.cjs to export restorePass40CrabSource and uses the inverse only as an immutable baseline for geometry/resource comparisons.
