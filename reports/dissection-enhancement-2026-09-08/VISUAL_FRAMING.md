# Visual framing and inspector hierarchy — September 9, 2026

This pass improves the optional 3D eye's screen use and simplifies the visual hierarchy of the structure inspector.

## Eye framing

- Camera distance now derives from the authored geometry projected into the current viewing angle and viewport aspect ratio. The fitted view reserves a margin around the entire specimen, including the optic nerve.
- Geometry points are cached when the scene is created. The whole shell is used for fit calculations so toggling the opening does not move the camera.
- Rotation and resizing retain zoom relative to the fitted view. **Fit specimen** restores 100% at the current angle; **Reset camera** also restores the overview angle.
- Keyboard zoom and existing direct surface picking, reference selection, resource cleanup, fallback, and context recovery remain available.
- No anatomy, structure dimensions, exposure rules, evidence, or scores change.

## Inspector hierarchy

- Anatomy/function and specimen context now sit on a shared white reference surface with simple dividers, replacing multiple colored nested cards.
- The human/clinical comparison uses a neutral treatment.
- The evidence editor has a distinct pale teal surface. The self-check and note handoff use divider lines, keeping the note and next action more prominent.
- All reference copy, links, confidence controls, and evidence prompts remain available in the existing reading order. The overrides exclude high-contrast mode.

## Verification

- **126 focused checks passed.**
- **18 Chromium scenarios passed** without retries: the full eye-study and reference-workbench acceptance suites, including the new geometry-projection checks for all four camera presets at desktop and phone sizes.
- At 100% fit, projected geometry stays inside the reserved frame margin. Fit specimen restores full framing while retaining a custom viewing angle and preserving evidence.
- Scoped automated accessibility audits passed for the phone eye viewer and existing reference/inspector panels. Overview, phone framing, and the updated inspector were visually inspected.
- Syntax, scoped whitespace, and canonical/desktop bundle parity checks passed.
- Physical-device testing and full translation of new controls remain follow-up work.

## Artifacts

- [Browser verification](visual-framing-browser.log)
- [Focused verification](visual-framing-focused.log)
- [Fitted 3D overview](eye-3d-overview.png)
- [Fitted phone view](eye-3d-fitted-mobile.png)
- [Updated structure inspector](inspector-desktop.png)
