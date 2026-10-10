# Pass 51 — continuous octopus webbing

Six reef octopuses now have gently curved, scalloped webbing with the same skin pattern and camouflage uniforms as their arms. Shared angular columns and fractional arm samples replace the previous repeated rows and collapsed triangles. The web follows existing movement, squeeze and jet poses without adding a separate animation clock.

Validation: 270 targeted CPU tests and 7 native browser checks passed without retries or skips. Checks cover topology, finite normals, attachments, unchanged non-web anatomy and cups, shared shader uniforms, GPU bindings, locomotion, inspection, pause, reduced motion, targeting and resource disposal. Nine before/after views match world and camera state. Baseline images reuse the accepted Pass50 captures with identical source hashes and image checksums; their provenance is recorded in the manifest.

The existing web mesh and material remain in one draw call. Geometry grows from 128 to 768 triangles, adding 640 per reef octopus. No textures or materials are added. Swimming species, gameplay and RNG are unchanged. Physical mobile performance was not measured.

[Open gallery](gallery.html). [Evidence and source hashes](report.json). All changes remain uncommitted.
