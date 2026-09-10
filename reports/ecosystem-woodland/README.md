# A larger woodland setting

The small raised island has been replaced with continuous terrain spanning 100 × 86 scene units, about 34 times its former ground area. The five modeled groups occupy a visible clearing inside the surrounding woodland.

## Changes

- No pedestal, soil cutaway, or exposed island rim.
- Broad, gently varying ground with a grassy clearing that transitions to a darker forest floor.
- Up to 175 deterministically placed trees, with tapered trunks, branches, irregular clustered foliage, and varied height and color.
- Instanced forest geometry keeps the distant trees and litter to a few draw calls.
- Procedural leaf cutouts, bark grain, ground texture, forest-floor litter, contact shadows, and atmospheric haze add depth and scale. Foliage uses crossed textured surfaces instead of solid canopy blobs.
- A lower clearing camera makes the surrounding trees visible behind the animals.
- **Forest overview** reveals the wider landscape; **Habitat view** and **Inspect selected group** retain access to the numerical study area and individual groups.

Open **Ecosystem → Food web → Show 3D meadow**, or choose the **Habitat restoration** preset. The scene is titled **3D woodland clearing**.

## Model boundary

This is a larger visual woodland setting for the existing meadow food-web model. The added trees and litter do not add biological groups, edible biomass, carrying capacity, or modeled refuge cover. Only the explicit cover setting affects feeding. The animals remain stylized representations of biomass, not individually navigating animals or a calibrated forest survey.

## Screenshots

- [Clearing](clearing.png)
- [Whole woodland](forest-overview.png)
- [Rotated woodland](forest-rotated.png)
- [Foxes in the clearing](foxes-clearing.png)
- [Mobile clearing](mobile-clearing.png)
- [Mobile inspection](mobile-detail.png)

## Validation

The woodland browser workflow checks forest extent, tree count, camera-only changes leaving model state unchanged, selection, rotation, reset, mobile layout, reduced motion, and the shared comparison sample. Existing meadow browser checks cover playback, baseline/experiment synchronization, WebGL fallback, context loss, and reopening.

All four browser workflows passed before and after the foliage/material refinement. Final screenshots were reviewed for clearing visibility, forest depth, and mobile framing. Syntax and scoped whitespace checks passed, and the source and desktop mirror hashes match. Source and desktop public mirror: `stem_lab/stem_tool_ecosystem.js`. New test: `tests/e2e/ecosystem-woodland.spec.ts`.
