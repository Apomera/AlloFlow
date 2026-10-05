# Pass38 coral QA review

Accepted input runtime SHA256: `26f15968d0260feb3a192b1bda52819666363e94b4231894d091ced5fa05e795`.

The input geometry factory builds 54 exhaustive height/index fixtures (three heights, 18 colony indices), with finger, antler, and corymbose topology. Each branch is an eight-sided tube with a duplicated ninth seam vertex, three hemisphere cap rings, a collapsed final ring, and one unindexed basal boundary. A colony owns one mesh, material, index array, and four attributes. The pore coordinates and colors are baked once. Geometry construction must not consume dive RNG.

## Preserve the historical contracts

- Add a separate portable literal inverse helper for the reviewed pass38 factory replacements. Require exactly one match per literal replacement and invert in reverse order. Do not modify original fixture files or any original SHA constants.
- In `cephalopodlab_coral_surface.test.js`, restore pass38 first, then pass37, to construct the historical geometry. The original combined hash must continue to cover the historical position, normal, color, and index arrays, rather than current position/normal data after intentional geometry changes. Keep the actual current ring coordinates, closure, cap fade, typed-buffer counts, memory budget, scalar pore field, shader, layout, palette, support/fallback, and ownership assertions. New current-geometry tests must independently validate the approved change.
- In `cephalopodlab_reef_form_finish.test.js`, apply the pass38 inverse before the existing pass37 source inverse. This preserves every accepted pass37 preservation, random stream, material, topology, tissue color envelope, and basal-ring contract without relaxing assertions. A new pass38 suite validates the live source directly against the pass38-restored accepted source.
- In `cephalopodlab_habitat_composition.test.js`, invert pass38 and then pass37 solely for the protected coral factory/spawn region. All original region SHA values, actual RNG lines, original fixture data, route/plant checks, and settlement assertions remain unchanged.
- A whole-runtime accepted SHA/round-trip check belongs in the pass report integration receipt. Do not put a whole-runtime pass37 SHA into a permanent unit test; unrelated future approved changes would invalidate that oracle.

## Durable current geometry checks

Use the actual production factory plus its literal source inverse, with Math.random replaced by a function that throws. Use the vendored Three r128 implementation. Fixtures must be reproducible by byte equality, and resource cleanup must run in finally blocks.

For all 54 fixtures, check finite positions/normals/colors/coordinates; exact index bytes, topology counts and attribute ownership; unchanged color and pore coordinates if the proposed production patch changes neither; positive finite bounding box/sphere; intended displacement relative to accepted ring radii; and a visible nonzero change in each growth form. Do not use the candidate formula as the expected algorithm. Derive displacement and tube centerline independently from the accepted geometry ring centroids.

Check wrapped position and normal seam continuity, exact collapsed tip closure, actual triangle area and winding, unit normal lengths, and positive alignment between actual face normals and each indexed corner normal. Do not falsely claim that separate intersecting branches are a single watertight manifold: basal tube boundaries remain deliberately embedded in the parent branches. Test each visible tube independently.

For several colony seeds, compare actual factory/spawn RNG draws, mesh/material counts, transform arrays, metadata, shader keys and material properties with the restored source. The colony's measured footprint may intentionally change; therefore assert actual safe settlement and terrain contact in native tests rather than freezing old settled scene positions.

## Native checks

Root alone should run the existing `cephalopod-reef-colonies.spec.ts` (four cases), `cephalopod-living-surfaces.spec.ts` (two qualities), and habitat tests sequentially after CPU tests. These already cover actual rendered finite merged surfaces, all three growth forms, actual world-vertex clearance, immediate terrain grounding after pool recycling, surviving coral relocation following rock recycling, GPU resource identity, camouflage, inspection on desktop/phone, actual linked coral program with an enabled vec4 pore attribute, static buffers through motion/inspection/reduced motion, and leak-free disposal.

Add native current coral normal/seam inspection only if it provides coverage unavailable from the CPU exhaustive suite. A linked standard material program and actual draws already prove the changed normal attribute is accepted by the renderer; CPU tests can prove its geometric quality without an additional expensive browser job.

Capture actual ordinary desktop/phone views plus camera-only diagnostic macros for each growth form. If selection or camera follows actual bounds, describe images as diagnostic views, not exact pose/pixel-matched A/B images. Require nonblank GL pixels, no page/console errors, identity of the actual geometry/material attributes/index across capture, and no owned resource leaks after unmount. No FPS, acoustic output, or biological accuracy claims follow from these checks.

## Reviewed candidate and portable proposal

Reviewed the form agent's four literal replacements in `pass38-coral-candidate/proposal.cjs`. The shape envelope is a positive inward contraction of at most 22 percent on interior ring rays. Ring zero, the branch terminal ring, and all three rounded-cap rings retain their accepted position calculations byte for byte. Color, pore-coordinate and index arrays are unchanged. Closing seam and pole normals share area-weighted sums based on Float32 positions; geometric seam and pole positions retain the original tiny trigonometric differences.

`cephalopodlab_coral_organic_form.test.js` is a proposed portable permanent four-case suite. It expects the helper `tests/helpers/cephalopod_coral_organic_reference.cjs` to export `restorePass38CoralSource`. The root should adjust only this import if choosing a different helper filename. Tests read actual production source and restore its accepted factory with the literal inverse, without dependencies on this task directory or historical report artifacts.

The proposed tests independently derive each accepted ring center from its eight unique vertices, check current points remain on those rays within Float32 tolerance, enforce the reviewed inward envelope and byte-exact anchor rings, and require visible changes in all three forms. Actual triangle normals must point outward from the interpolated accepted centerline and align with every current corner normal. The suite also checks finite unit normals, byte-identical seam/pole normal copies, deterministic current geometry, declared bounds, all 54 unchanged topology/color/pore streams, and scoped source/RNG preservation.

These proposals have not been executed or copied into the repository by this agent. Root alone must execute and inspect the current candidate before accepting it.
