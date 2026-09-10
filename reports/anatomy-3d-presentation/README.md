# Anatomy 3D presentation and realistic-body feasibility

## Visual changes

- Blueprint and Surface now have distinct body previews and short purpose labels.
- Blueprint uses quieter background grids and less intense wireframe lines so the body is the focus.
- Surface explains that the built-in figure is a simplified teaching mannequin.
- Imported models receive a separate explanation that teaching pins may need alignment.
- Refined the model description panel and 3D viewport framing for desktop and phone.
- Corrected a stale status message when changing between Blueprint and Surface without rebuilding the viewer.

## Both body views are feasible

The application already implements both representations and a local GLB import path. Blueprint is useful for spatial relationships between teaching markers. Surface is useful for body outline and orientation. A high-detail realistic human body would be an asset upgrade to the Surface path; none was added in this pass.

The current built-in surface is assembled from procedural primitives. It is not a photorealistic scan or a detailed anatomical mesh. A production realistic-body upgrade would require a suitably licensed mesh, mobile-friendly geometry and textures, tested camera framing, and alignment/validation of the teaching structure markers. A surface-only mesh would not itself add detailed internal organs or dissectible anatomical layers. Existing locally bundled Clinical Atlas assets cover individual reference organs, not a complete realistic body.

## Validation

36 existing viewer/UI tests passed. The WebGL workflow verifies switching modes without replacing the canvas, correct status labels, mobile layout, and model descriptions. Scoped Axe scans cover the model choices and explanations in light, dark, and high-contrast themes. Main and desktop source copies remain identical.

The first exploratory WebGL capture reached both views but timed out during browser teardown on this busy machine. Subsequent focused validation disables recording overhead.

## Captures

- [Blueprint](blueprint.png)
- [Built-in Surface](surface.png)
- [Phone chooser and Surface](chooser-phone.png)
- [Accessibility scans](accessibility.json)

Browser workflow: `tests/e2e/anatomy-3d-presentation.spec.ts`.
