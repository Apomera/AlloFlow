# Geometry World visual polish

The world now sits in a quiet valley with layered ridges and small groups of faceted pines. Softer oak grain, terracotta brick, stone relief, and warmer gold give builds more character. Sky glow, the sun disc, and reflections follow the selected time of day. Color stays consistent when switching graphics quality.

## Showcase a creation

In Free Build Studio, select your build, then choose **Showcase creation**. The camera frames the whole selection and clears the building tools and measurement graphics. Use the rotate buttons or left/right arrow keys to choose an angle, then **Save image** to download a PNG. **Back to building** or Escape restores the camera and workspace. The view adapts to phone orientation and extends its viewing range for large creations.

![Desktop Showcase](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/showcase-desktop.png)

![Phone Showcase](C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/geometry-world-graphics-2026-09-08/showcase-phone.png)

## Rendering and reliability

- Scenery adds four merged meshes and 1,584 triangles. It is excluded from picking, collisions, measurements, editable builds, and STL export.
- Balanced and Detailed retain shared material relief; Battery saver disables it. Renderer and post-processing resolution now stay synchronized.
- The final output stage converts color once. Actual WebGL sky samples differed by only one channel value out of 255 between direct rendering and post-processing.
- Sun glow and the sun disc align with day, sunset, and night lighting. Loading a lesson initializes its complete environment immediately.
- Lesson resets now release block-edge geometry. Shared edge materials survive individual block removals and are released when the engine closes.

Six rendered lesson reloads held the same **94 GPU geometries and six textures** for the test fixture. All tracked block, scenery, and edge resources were released during removal and teardown.

**251 focused tests passed across ten files**, including the shape, STL, Print Lab, keyboard, graphics, and engine lifecycle checks. The record combines the main run with focused reruns of the graphics and input suites.

Showcase browser checks passed for a **150-block pavilion** on desktop and phone, including rotation, keyboard controls, PNG export, walking-mode stability, and camera/build/history restoration. A separate **129-block row** stayed within the camera and ahead of fog on a phone; closing restored the original viewing range.

Evidence: [atmosphere checks](atmosphere-results.json), [GPU lifecycle checks](gpu-lifecycle-results.json), [Showcase interaction checks](showcase-results.json), [large-build checks](showcase-large-results.json), and [graphics/building/Print Lab regressions](verified-tests.json).

The images and browser checks use the actual local React and Three.js tools in a minimal host. They verify local rendering and interactions; they do not represent deployed-app or physical-printer verification.
