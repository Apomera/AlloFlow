# More natural wildlife and forest-floor detail

Open **Ecosystem → Food web → Show 3D meadow** (or the **Habitat restoration** preset). Select a species and use **Inspect selected group** to follow a representative animal. **Selection markers** toggles the study rings; the default view omits them.

## Changes

- Animal symbols are distributed throughout the clearing, rather than arranged in four tight species clusters.
- Deterministic wandering poses orient animals along their visual paths. Foraging head poses, articulated fox legs, and jointed owl wings make posture and motion less uniform.
- Close-up mode follows one representative animal and uses a closer camera. The full habitat and forest overview remain available.
- Smooth normals and finer body geometry soften the faceted animal appearance.
- Curved three-dimensional fern fronds, low grass, fallen branches, small fungi, and canopy shade add layers to the forest floor. The modeled food plants have tapered leaves. Repeated ground cover uses instanced geometry.
- Selection rings are optional. Numerical values, species buttons, and the selected-group label remain available with markers off.
- Picking now checks visibility through all parent groups, preventing selection of hidden animals through an articulated body part.

## Interpretation and accessibility

All wildlife paths, foraging poses, ferns, fungi, and added ground cover are visual representations. They do not change biomass, feeding, or the configured habitat-cover index. The model still does not simulate individuals navigating, hunting, or hiding. Rewinding the timeline reproduces the same poses; reduced-motion mode keeps the poses still while biomass samples remain inspectable.

## Screenshots

- [Natural clearing](clearing.jpg)
- [Rabbit inspection](rabbits.jpg)
- [Fox inspection](foxes.jpg)
- [Owl inspection](owls.jpg)
- [Mobile clearing](mobile-clearing.jpg)
- [Mobile inspection](mobile-inspection.jpg)

## Verification

The pose tests check dispersion, finite bounded positions, reproducible scrubbing, and reduced motion. Browser coverage checks understory rendering, marker controls without model changes, representative-camera positions, species selection, scrubbing, mobile layout, reduced motion, zero biomass, and existing graphics fallbacks.

Final validation: 17 focused unit tests passed across the pose and food-web suites; all four browser workflows passed, including natural-detail interactions, the existing 3D workflow, WebGL fallback, and context loss. JavaScript syntax and scoped diff checks passed, and the source and desktop public mirror are identical. The final browser run completed in 1.4 minutes with tracing disabled; an earlier run encountered a teardown timeout without an assertion failure. Implementation: `stem_lab/stem_tool_ecosystem.js` and its desktop public mirror. Tests: `tests/ecosystem_natural_poses.test.js` and `tests/e2e/ecosystem-natural-detail.spec.ts`.
