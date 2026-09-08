# Decorative landscape helper

Paste `landscape-helper.txt` inside `initEngine`, immediately after the horizon setup. It expects `THREE`, `engine`, and `geometryWorldSrgbColor` in scope. Call `engine.refreshLandscape(lesson.ground)` when loading each lesson; call `engine.disposeLandscape()` in the engine cleanup before clearing the scene. Do not call refresh from the frame loop.

The landscape gives the world the character of a quiet miniature valley: warm moss foreground slopes, cooler layered ridges in the distance, and four restrained clusters of faceted pines. Its low contrast deliberately keeps building materials and selection outlines prominent. Standard materials respond naturally to the existing sun, hemisphere light, environment and fog.

Two merged terrain geometries and two merged tree geometries add exactly four renderable meshes, 1,584 triangles in total, no dependencies, and no frame-loop work. They do not cast or receive shadows, so they add no shadow-pass draws. The terrain uses a rounded rectangle around the actual ground bounds, with the nearest surface at least 29.8 units beyond the outermost block footprint. Long, narrow and offset lessons retain the same clearance. Grass is not added or changed.

Every decorative mesh has a no-op raycast, a `gwLandscape` marker, and stays outside `engine.blocks`; all gameplay, collision, measurements, STL and editable source data stay unchanged. Refreshing the same bounds is a no-op. Refreshing different bounds and explicit cleanup remove the old group and dispose all four geometries and materials.

The terrain starts 30 units outside the lesson floor, with rolling crests 52 units away and taller distant ridges around 103 units away. Fog naturally fades the outer foothills before the camera's far plane. There are no textures, animation loops or objects allocated during rendering.
