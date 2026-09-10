# Dino Lab: 3D visual enhancement

2026-09-10 · Local implementation and review; not deployed.

The field station now opens with whole-animal framing and a neutral studio. The existing reconstruction profiles drive continuous skin surfaces for the torso, neck, tail, and legs, with integrated theropod head surfaces. Internal muscle and respiratory overlays are hidden at full opacity and remain available in translucent views.

## What changed

- Replaced segmented torso, neck, tail, and limb shells with indexed, smoothly shaded surfaces. Closed ends and matched normals remove open ends and lighting seams.
- Refined biped stance, head and trunk proportions, neck and tail taper, and small-animal detail scaling. Feathered species have broader wing and tail surfaces.
- Added studio/habitat switching, quieter studio scenery, softer skin markings, and directional lighting that reveals volume.
- Moved all five reconstruction presets above the viewer. Added key/all/off label controls, readable label sizing and overlap suppression, and an always-available **Fit whole animal** action.
- Fit the camera to anatomical bounds and viewport aspect ratio. Front, side, and overhead presets now have distinct orientations; overhead exceeds 80 degrees. Active evidence inspection can still focus an anchor.
- Removed premature assembly ghosts and moved the evidence route below the canvas.
- Rebuilt the human reference to measure 1.700 m in the scene. Fixed light-theme contrast for the camera-preset badge.

## Visual review

| View | Image |
| --- | --- |
| Desktop controls and T. rex | [Desktop viewer](viewer-controls.png) |
| Mobile controls | [Mobile viewer](viewer-controls-mobile.png) |
| Horned dinosaur | [Triceratops](triceratops-studio.png) |
| Long-necked dinosaur | [Brachiosaurus](brachiosaurus-studio.png) |
| Small feathered dinosaur | [Microraptor](microraptor-studio.png) |
| Armored dinosaur on mobile | [Stegosaurus](stegosaurus-mobile.png) |
| Habitat environment | [Habitat](stegosaurus-habitat.png) |
| Fossil reconstruction | [Fossil view](stegosaurus-fossil.png) |
| Human scale comparison | [Scale reference](scale-reference.png) |

These remain procedural teaching reconstructions, rather than specimen scans. Species proportions, surfaces, colors, and poses retain the tool's stated evidence and inference limits. Browser verification sampled five body types; it does not establish visual accuracy for every catalog entry.

## Verification

- **116 focused unit and interaction tests passed**, including eight new tests for finite geometry, outward normals, seam continuity, elliptical sections, and portrait camera fitting.
- **7 Chromium browser tests passed**, followed by an additional passing Microraptor capture after correcting its dark feather material: four species framing checks, camera/labels/habitat/mobile/scale/accessibility coverage, and both existing catalog/notebook workflows.
- Every sampled anatomical vertex stayed inside the full-model viewport, with no invalid projected coordinates, lost WebGL contexts, or browser errors.
- Axe checks found **zero violations** in the 3D panel across light, dark, and high-contrast themes. The existing field-guide test also checks catalog, comparison, and notes in all three themes.
- Desktop and mobile layouts checked at 1180, 390, and 320 pixels.
- Canonical, public, and existing app-build Dino Lab modules have matching SHA-256 hashes. Syntax and scoped whitespace checks passed.

Run locally:

~~~powershell
node node_modules/vitest/vitest.mjs run tests/dino_lab_golden.test.js tests/dinolab_3d_accessibility.test.js tests/stem_dinolab_evolab_quiz.test.js tests/dinolab_field_guide.test.js tests/dinolab_3d_geometry.test.js --maxWorkers=1 --testTimeout=30000

node node_modules/@playwright/test/cli.js test tests/e2e/dinolab-3d-visuals.spec.ts tests/e2e/dinolab-field-guide.spec.ts --workers=1 --retries=0 --reporter=list --output=reports/dinolab-3d-visuals/browser-results
~~~

The browser harness serves local React and the repository's Three.js r128 build. It uses software WebGL and reduced motion for repeatable capture; this is not a hardware performance benchmark.
