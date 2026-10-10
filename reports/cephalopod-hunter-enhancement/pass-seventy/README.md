# Cephalopod Hunter — Pass 70

Five reef octopuses (common, giant Pacific, mimic, Caribbean reef and coconut) use animal-space pigment coordinates normalized to species scale across mantle, head, arms and web. The bounded procedural hash supports layered broad mottling and fine pigment; screen derivatives filter medium and fine detail as their pixel footprint increases. Derivative-unavailable rendering uses a restrained medium layer and omits fine detail. Soft ventral color and bounded roughness variation replace the uniform generic speckle. Existing camouflage tint remains authoritative.

Validation: 47 tests in 6 files, 7 native checks, six matched baseline/candidate captures, and18 gallery checks. Four runtime copies match e19570539865aea25da4260933bf3a3cbf36f2afce7a9d09e6b2a9f09227b757. Exact inverse edits recover Pass69. Native scenes compare actor geometry, poses, camera, simulation state, lighting, draw calls and resource counts; only material shader sources differ. Pause, jet movement, reduced motion and resource disposal are exercised.

Desktop Chromium and narrow viewport emulation; no physical-device or FPS assessment.

Seeded scenes with deterministic 50 ms timing; intermediate GPU draws skipped; audio disabled.

Only five reef octopuses receive the new skin compiler; gameplay and geometry are preserved.

Changes remain uncommitted. Preview: http://127.0.0.1:62153/reports/cephalopod-hunter-enhancement/pass-seventy/gallery.html
The historical cuttlefish fingerprint fixture now restores the complete source before extracting the animal factory, recovering the approved intervening anatomy changes in the correct order; its original hashes remain unchanged. It also reads the candidate source override. The initial failed fingerprint receipt is retained in the work folder. Native validation caught and corrected a GLSL reserved identifier before adoption; an intermediate successful rendering was then superseded by the final finer-pigment scale. Only final-source checks are counted above.
