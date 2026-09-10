# Free detailed human body integrated

## Result

**3D → Surface** now uses a bundled MakeHuman human body mesh by default. It is free: no purchase, subscription, account, API, or remote model-service dependency. The geometry is 482,744 bytes (under 0.5 MB), 13,380 vertices, and 26,756 triangles, with no external textures or compression decoder dependency.

Blueprint remains available. Surface → Model source → Body detail offers a lightweight simple body. Local GLB import remains available, and an asset-load failure falls back to the simple body.

The detailed mesh provides a continuous body surface with modeled facial features, fingers, and toes. It is a generic surface reference, not a clinical scan and not an internal-organ atlas. Its pose and proportions differ from the procedural teaching body, so whole-body teaching pins are deliberately hidden on the loaded detailed surface. **Explore pins** returns to Blueprint; 2D Atlas also retains the teaching structures. Switching Blueprint/Surface preserves the viewer when the asset source is unchanged.

## Free license explained

A license is permission to use a creator’s work; it does not imply a fee. MakeHuman explicitly released its bundled base mesh under **CC0 1.0**. The app includes the source provenance, original license explanation, CC0 text, and SHA-256 hashes. No upstream application code is imported.

- [Official MakeHuman license](https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/LICENSE.md)
- [Local asset provenance](../../stem_lab/assets/anatomy/body-surface/ATTRIBUTION.md)
- [Asset manifest](../../stem_lab/assets/anatomy/body-surface/asset-manifest.json)
- Reproduce the GLB with `node dev-tools/build-anatomy-body-surface.cjs` using the pinned source OBJ retained in the repository.

## Validation

42 unit tests passed: 36 existing anatomy viewer/UI checks and 6 new asset/default/fallback checks. Binary tests verify buffer/index integrity, normalized normals, exact model/source hashes, a self-contained mesh, and identical desktop/public model files.

The Chromium WebGL workflow verifies front/back rendering, Blueprint/Surface switches with the same canvas, hidden/restored pins, the included/simple selector, mobile page width, and recovery when the GLB request is deliberately blocked. Requests for the model stay on the app’s own origin. Scoped Axe scans of the source and explanation controls pass in light, dark, and high-contrast themes. Screenshots were visually inspected. Syntax and whitespace checks pass.

## Captures

- [Detailed body, front](body-front.png)
- [Detailed body, back](body-back.png)
- [Phone interface](body-phone.png)
- [Accessibility results](accessibility.json)

Tests: `tests/anatomy_free_body_asset.test.js`, `tests/e2e/anatomy-free-body.spec.ts`.
