# Meadow and Studio scene looks

Showcase now offers two accessible scene choices. Meadow keeps the current world; Studio isolates the selected creation against a warm ivory floor and backdrop, with dedicated key, fill, and rim lighting. The floor receives real shadows, with a restrained contact shadow when Battery saver disables shadow maps. Orbit and image download work in both looks.

The choices have 44-pixel targets, visible focus rings, and `aria-pressed` state. Studio uses dark text on its light background and fits both desktop and portrait layouts.

Studio changes presentation only. The original mesh geometries, material properties, reflection maps, block collection, placement history, and printing data remain intact. Its floor, contact shadow, and lights never enter the block or picking collections. Returning to Meadow restores original object visibility, background/fog references, and bloom state. Exiting Showcase restores the original editor visibility; teardown also disposes Studio resources without updating tool state.

## Verified in actual WebGL

- A 172-block creation exported the same 748-triangle STL before, during, and after Studio, including a change from Detailed to Battery saver. SHA-256: `e3ba621ef237669df898a3639bfeb3392e0e2a18820c5908c6a4755ad2995be0`.
- Desktop at 1440 × 900 and portrait at 390 × 844 fit every creation bound without horizontal overflow.
- Gold, diamond, and ice were visually inspected; no additional reflection-map override was necessary.
- All five Studio-owned geometry/material/texture resources were disposed after each tested switch. Allocated shadow maps were also disposed.
- Repeated switching, closing Showcase, and unmounting the active Studio cleaned up correctly.
- PNG download succeeded. No console, page, or shader errors occurred.

The raw exit result includes `visibilityRestored: false` for the intermediate Showcase snapshot because closing restores the original editor overlays instead. A separate assertion verifies every block's original visibility exactly; the full verification passed.

Evidence: [desktop](studio-desktop.png), [portrait in Battery saver](studio-phone-saver.png), [Meadow comparison](studio-meadow-comparison.png), [downloaded PNG](studio-download.png), [results](studio-results.json), and [reproducible verifier](verify-studio.cjs).
