# Pass 50 — recessed octopus cups

Six reef octopuses now have closed sucker cups with recessed centers, rolled rims and depth shading. Each basal disc fits inside its actual mounting triangle, follows the rendered skin normal, and contracts with compressed arm spacing. The existing 192 instances still share one mesh, material and draw call.

Validation: 265 targeted CPU tests and 7 native browser checks passed without retries or skipped checks. Tests cover closed topology, visible cavity depth, basal attachment, six-species poses, frozen updates, GPU attribute binding, rise and jet input, inspection, pause, reduced motion and disposal. Nine before/after captures match source hashes, camera, world state and rendering counts.

The original placement candidate failed under a sharply folded jet arm; the final implementation anchors to the rendered triangles. Five older squid fingerprints omitted later fin and skin changes from their reference preparation. The tests now reverse only the recorded Pass30, Pass34 and Pass36 changes appropriate to each original snapshot, without changing any expected hashes. Live surfaces retain their dedicated tests.

The cost is 3,840 additional triangles per reef octopus, with no new draw calls, materials or textures. Other anatomy, all swimming species, gameplay and RNG are preserved. Physical mobile performance and audio quality were not measured.

[Open gallery](gallery.html). Detailed hashes and receipts are in [report.json](report.json). All changes remain uncommitted.
