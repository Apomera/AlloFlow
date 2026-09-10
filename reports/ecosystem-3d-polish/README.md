# Ecosystem 3D visual refinement

Open **Ecosystem → Food web → Show 3D meadow**. Select a species, then use **Inspect selected group** for a closer view. **Habitat view** and **Reset camera** return to the whole meadow.

## Visual changes

- Gently shaped terrain with blended meadow colors, a layered soil edge, grouped rocks, and fallen wood.
- Branching trees with layered canopies, rounded refuge thickets, and grass/flower symbols for food plants.
- Distinct fox muzzles, pointed ears, dark legs and white-tipped tails; rabbit ears and hindquarters; compact voles with round ears; owls with pale facial disks, eyes, beaks, wings and feather details.
- Contact shadows ground organisms and scenery without requiring a continuously rendered shadow map.
- Warm directional lighting, cool fill light, tone mapping, and a graduated backdrop.
- Yellow selection rings and a high-contrast label show the selected group and current biomass. Zero biomass is identified explicitly.
- A group-inspection camera complements the whole-habitat camera. Camera controls remain keyboard accessible, and narrow screens receive adjusted framing.

The existing numerical model and symbol-count mapping remain unchanged. Terrain, scenery, and motion are illustrative. Only the configured habitat-cover index affects feeding; individual animals do not navigate or hide in specific patches. Reduced-motion, on-demand rendering, capped pixel ratio, fallback behavior, and resource cleanup are retained.

## Screenshots

- [Whole habitat](habitat-desktop.png)
- [Rabbit detail](rabbits-detail.png)
- [Fox detail](foxes-detail.png)
- [Vole detail](voles-detail.png)
- [Owl detail](owls-detail.png)
- [Mobile habitat](mobile-habitat.png)
- [Mobile inspection](mobile-detail.png)

## Validation

The visual browser workflow checks camera changes without model edits, selection synchronization, four species close-ups, mobile and 320px overflow, reduced motion, cover in baseline/experiment, and zero-biomass display. Existing meadow tests cover playback, graphics fallback, context loss, and reopening; the habitat workflow covers timed cover changes.

Validation passed: 20 focused food-web/habitat unit tests and five distinct browser workflows. The four meadow/visual workflows passed again after lighting, soft-shadow, and outlined-selection refinements. Desktop habitat, fox/owl close-ups, and mobile inspection screenshots were visually reviewed. JavaScript syntax and scoped whitespace checks passed; source and desktop public copies have matching SHA-256 hashes. Implementation is in `stem_lab/stem_tool_ecosystem.js` and its desktop public mirror. New browser coverage: `tests/e2e/ecosystem-3d-polish.spec.ts`.
