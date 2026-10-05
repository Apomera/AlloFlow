# Cephalopod Hunter — pass 38

All three existing coral growth forms now have uneven shoulders and shallow asymmetric fluting. Interior tube rings contract by at most 22 percent on their existing radial rays, leaving broad root collars and rounded terminal lobes. Basal, terminal, and all rounded-cap positions stay byte exact. Branch centerlines and layout remain intact.

Normals now come from the actual Float32 triangles, with shared accumulation at each branch's closing seam and cap pole. Every current normal is finite and unit length, with outward winding and positive alignment to its rendered faces across all 54 standard coral geometries. The changes add no vertices, indices, attributes, meshes, materials, textures, shader programs, or per-frame geometry work. Color and pore-coordinate buffers remain byte exact.

**Validation:** 39 CPU cases and 12 native browser cases passed on source `f65b507f0110ab173584c65708a7f5455d8ace814b3fc9e236694aed447dc690`. One worker, zero retries, failures, skips, or flaky cases. Native coverage includes low/balanced living surfaces, grounded open habitat routes, mobile GL rendering, colony recycling, inspection beside rocks, and real rock-navigation controls. Desktop and phone approach captures also passed source, resource, projection, and cleanup checks. All four runtime copies match; Node syntax and scoped Git whitespace checks passed.

The four production guards reverse byte exactly to accepted pass 37 `26f15968d0260feb3a192b1bda52819666363e94b4231894d091ced5fa05e795`. Historical coral/habitat fixture hashes and the pass37 contracts remain protected through literal reviewed source inverses, with a separate exhaustive suite checking current geometry. Accepted fixtures and the prior reference helper are unchanged.

[Comparison gallery](gallery.html) · [Verification receipt](final-verification.json) · [Production guards](change-guards.json) · [Test reference migrations](test-reference-migrations.json)

The three diagnostic close-ups have matching model transforms, bounds, and camera poses. Other meshes are hidden only in these fixtures for unobstructed inspection; ordinary approach views retain natural actors and controls. Branch roots retain overlapping independent topology; this pass does not weld their connections into a manifold surface. Headless validation uses a fake physical audio output stream and makes no sound or hardware FPS claim.

Changes remain uncommitted. Raw checks, receipts, manifests, and baseline views are retained here.
