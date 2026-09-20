# Anatomy studio surface refinement — 2026-09-19

The included CC0 body now uses smooth direct lighting without receiving its own shadow map. It continues to cast a ground shadow. The bundled mesh respects its front-sided surface material, removing the extra back-face rendering that contributed to visible artifacts. Clinical and locally imported models retain their previous shadow and sidedness behavior.

Surface mode uses a quieter slate pedestal ring with lower emission and reduced metallic shine. Blueprint restores the system-colored stage. Camera behavior and the body geometry are unchanged.

Validation:
- 62 regression tests passed: 36 anatomy_3d_visual_refinement tests, plus 26 tests across anatomy_free_body_asset and anatomy_view_model_refinement.
- The initial run had worker startup timeouts in two files; those files passed when rerun with one thread worker after browser testing completed.
- Two browser tests passed: anatomy-studio-shading and anatomy-camera-continuity.
- Real WebGL checks verify retained mesh geometry, front-side rendering, ground shadow support, reversible stage styling, stable canvas identity, camera region/angle continuity, and phone layout without horizontal overflow.
- Inspected whole-body, head, hand, and rear torso screenshots. Controlled before/bias/studio screenshots document the shading diagnosis.
- Syntax and scoped whitespace checks passed. Anatomy source and desktop runtime mirror hashes match.

Final screenshots: whole-body.png, head-soft.png, head-contour.png, hand.png, phone-back.png.
Scene evidence: scene-checks.json.
