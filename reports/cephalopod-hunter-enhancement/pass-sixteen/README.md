# Cephalopod Hunter — pass sixteen

Nautilus now has pale short eye cups, small circular pinhole openings and recessed dark interiors. The generic gold iris, blue slit and painted white glint are removed. Kelp gains four alternating curved, folded leaves within each existing mesh, giving the tall strands a fuller silhouette.

The eye assembly drops from eight meshes/3,400 vertices/5,760 triangles to six/1,190/1,984. Kelp adds 2,100 vertices, 2,400 triangles and 106,800 raw buffer bytes across the 25 strands, with no added meshes, materials or draws. Original kelp geometry remains an exact prefix; grass, 525 seeded placement draws, motion uniforms and gameplay metadata are unchanged. The accepted shell, head, siphon, 90 filaments and other 11 species remain protected. All four runtimes match.

Validation: **70 latest focused unit cases and four serial native browser cases passed**. The initial 70-case batch had 69 passes and one normal-oracle failure: appended geometry exposed the original clamped tip to a centered difference. All interior samples stayed accurate; a second-order inward difference restores the same strict threshold. The affected four-case file passed again without production changes.

Native low/balanced checks cover actual eye draws/programs/buffers, plant uniform uploads, expanded culling bounds, pause/inspection, reduced motion, resume, phone framing and disposal. Seven final views were reviewed with real lights, fog and scenery. Kelp camera/seed fixtures match before and after. No FPS, temporal shimmer or GPU vertex-readback claim is made. The forms are illustrative, the pinhole size is static, and the preserved head/filaments remain simplified.

- [Nautilus three-quarter](nautilus-three-quarter.png), [side](nautilus-shell-side.png), [front opening](nautilus-aperture.png), [opposite side](nautilus-opposite-side.png), [phone](nautilus-phone.png)
- Kelp at [early](kelp-flex-early.png) and [late](kelp-flex-late.png) poses
- [Eye anatomy and cost](model-notes.md), [kelp construction and cost](environment-notes.md), [regression proof](validation-notes.md), [validation summary](validation-summary.json)

The commit excludes the 12 pre-existing translation-wrapper changes in each tracked runtime and preserves unrelated workspace work.
