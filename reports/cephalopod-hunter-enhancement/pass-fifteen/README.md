# Cephalopod Hunter — pass fifteen

Nautilus now has a smooth ivory coiled shell, broad fixed brown pigment bands, and a real front/lower opening with a thin lip and recessed unbanded interior. Seagrass and kelp bend progressively above fixed roots, with lighting normals corrected to match the curved blades.

The shell drops from 27 meshes to three, with fewer vertices and triangles. Plants reuse all original geometry and instance buffers; each existing material gains one persistent motion uniform. Other animal rigs, seeded placement, strategy, input, depth, collision, feeding and scene lighting are preserved. All four runtime copies match.

Validation: **61 focused unit cases and five serial browser cases passed**, with no browser retries, video or traces. Browser checks cover actual native shader linking and plant uniform uploads at low/balanced quality, ordinary inspection controls, pause, reduced motion, phone framing, stable buffers and cleanup. An older coral extraction boundary was narrowed, and its exhaustive matcher loop was optimized with equivalent strict native assertions; all 54 geometry checks and the original exact fingerprint remain.

Nine final views were reviewed using the real lights, fog and scenery. Plant views use the same seeded objects and cameras before/after. The GPU checks and stills do not establish FPS or temporal shimmer. Plant motion is decorative, and the procedural nautilus retains its illustrative head/hood/filaments.

- [Nautilus three-quarter](nautilus-three-quarter.png), [shell side](nautilus-shell-side.png), [opening](nautilus-aperture.png), [opposite side](nautilus-opposite-side.png), [phone](nautilus-phone.png)
- Seagrass at [early](seagrass-flex-early.png) and [late](seagrass-flex-late.png) phases
- Kelp at [early](kelp-flex-early.png) and [late](kelp-flex-late.png) phases
- [Model construction and cost](model-notes.md), [plant motion and cost](environment-notes.md), [validation summary](validation-summary.json)

The commit excludes the 12 pre-existing translation-wrapper changes in each tracked runtime. Unrelated workspace work is preserved.
