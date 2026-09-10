# Woodland lighting and vegetation

Open Ecosystem > Food web > Show 3D meadow, or use the Habitat restoration preset.

This pass adds a Lighting control with Daylight, Golden hour, and Overcast views. It changes the sunlight direction, color, sky, haze, and exposure. Nearby animals cast directional shadows; the surrounding canopy retains its inexpensive baked shading. Shadow resources are disposed when the view closes.

The forest floor now has 2,400 instanced tufts, each with five curved grass blades, distributed in irregular patches. Tree roots taper into the terrain. Leafy shelter patches replace solid rounded bushes and continue to follow the existing habitat-cover values. Fern colors now use the same color-space conversion as the surrounding vegetation.

Lighting and added scenery do not change the ecological model. The lighting selector is a temporary viewing preference and resets to Daylight when the 3D view is reopened. Reduced-motion behavior, keyboard controls, and numerical comparisons are retained.

## Review images

- [Daylight](daylight.jpg)
- [Golden hour](golden-hour.jpg)
- [Overcast](overcast.jpg)
- [Fox inspection](fox-inspection.jpg)
- [Mobile](mobile.jpg)

## Validation

Validation: all four Chromium workflows passed (5.9 minutes). The 13 food-web tests passed; the four pose tests passed on a fresh-process rerun after an initial worker-startup timeout. JavaScript syntax and scoped diff checks passed, and the source and desktop public mirror hashes match. Desktop, golden-hour, and mobile images were visually reviewed. Browser coverage checks real rendered differences, unchanged model state, preservation of the canvas, keyboard input, habitat-cover comparisons, reduced motion, mobile layout, reopening, and existing graphics fallbacks.

Source: `stem_lab/stem_tool_ecosystem.js` and its desktop public mirror. New coverage: `tests/e2e/ecosystem-forest-lighting.spec.ts`.
