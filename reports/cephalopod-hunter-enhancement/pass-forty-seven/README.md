# Cephalopod Hunter — pass 47

Moon-jelly bells now have a clearer center and a soft rim. A fragment shader hook multiplies the existing alpha by 32% when a surface faces the camera, rising smoothly toward 100% at grazing angles. A bounded rim uses the existing indirect diffuse scene light and reflected sky direction. Both separately owned BackSide and FrontSide bell passes retain static material opacity 0.34.

This is a gel appearance approximation. True physical refraction is not implemented. No geometry, texture, uniform, spawn draw, pulse motion, simulation behavior or static material setting was added or changed. The hook keeps the original PBR lighting, camera modes, fog and tone mapping.

## Validation

- 111 targeted CPU checks passed: 107 existing checks plus four gel checks. The new checks compare the strict baseline inverse, all 65 ordered spawn draws, every initial pose and geometry byte, static material parameters, both shell hooks, original shader bindings and output placement, and retained resources throughout live deformation. This is a targeted result, not a full-repository run.
- 11 native Chromium scenarios passed with one attempt per case and zero unexpected results, retries, flakes or skips: two gel cases, two ambient-motion cases, two moray/jelly drawing cases, two water/lifecycle cases and three target-presentation cases.
- Desktop/balanced and phone/low gel cases draw both original shell sides with compiled, linked native programs. Above, below and side camera probes leave the paused world unchanged. An actual GPU pixel probe checks increasing alpha at 0°, 60° and 85°, matching behavior on both sides, unchanged 0.34 material opacity, and zero RGB when ambient light is removed. The checks retain all 85 owned jelly geometries/materials and observe disposal exactly once for each, then check for no renderer leak.
- Six context pairs and 18 motion frames per version use native WebGL with visual RNG seed 8191 and production world seed 2741. The context pairs have exactly matching camera positions and rotations, world transforms, world hashes and draw budgets. Every recorded motion state also matches. The crown and underbell images, and the motion sequence, show different PNG hashes after shading. All 48 image files are checked against their manifests.
- The sequence tracks one existing jelly after 60 controlled 0.05-second active steps, with five steps between frames, covering elapsed time 3.00–7.25 seconds. The diagnostic camera follows the actor; no actor is repositioned. Crown and underbell views use fixed diagnostic cameras. The four context views retain the prior reef, water, octopus and phone comparisons.
- Audio output was disabled during native automation. No hardware frame-rate or audio-quality claim is made.
- All four runtime mirrors have SHA-256 ead96ebfcbe994c840e56d6251d559cceed1228d1e7f16d8200b16096399453c. The strict inverse recovers accepted pass 46 73f233bc33e9ccb0bff5908983a122bfc6ebf67aa034fb90487253b477bd30e5. Syntax and scoped git diff --check pass. Both complete run receipts pin the candidate source, record unchanged source/tests before and after execution, and match the files present when this report is generated.

## Review

Open [gallery.html](gallery.html) for the 18-frame scrubber, optional playback and six independent before/after comparisons. [report.json](report.json) summarizes the result. [comparison-receipt.json](comparison-receipt.json) contains paired state, draw budget and image-hash evidence. [source-audit.json](source-audit.json) lists mirrors, the inverse, syntax and pinned source/test files.

The scoped work remains uncommitted. No staging, commit, push or deployment was performed by this report script.
