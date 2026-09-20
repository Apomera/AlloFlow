# Machine Lab visual refinement: pulley rope motion

Added contrasting bands along the pulley rope so learners can follow rope movement around the sheaves and distinguish it from the existing upward tension arrows. The bands work across all one-to-six supporting-strand configurations. The observation panel and accessible explanation describe what to follow.

Each band occupies a fixed material distance from the anchored rope end. As supporting strands shorten and the free strand grows, its position is evaluated along the connected straight sections and semicircular turns. Bands keep their size instead of stretching with the rope cylinders. The existing working stroke, return, held-pose, and reduced-motion paths drive their placement.

The scene uses one shared band geometry and material, with at most 32 band meshes. There is no added render loop or per-frame geometry allocation. Existing force cues and machine motion are unchanged.

## Validation

- 551 tests passed: 323 geometry, 192 views, 28 accessibility, and 8 translation hygiene.
- Seven new regressions recover each band's material coordinate independently from the actual rope geometry. They verify spacing, tangent alignment, fixed size, bounded/shared resources, free-end displacement, outward/return agreement, and reduced-motion stability.
- 371 browser checks passed across light, dark, and high-contrast palettes, including forced colors, all six pulley configurations, held poses, camera framing, keyboard adjustment, 390/320-pixel layouts, and the accessible explanation. No browser errors or horizontal overflow.
- 46 screenshots captured. Visually inspected the six-strand light desktop view, dark mobile Close view, and six-strand high-contrast desktop view.
- Source and desktop mirror are identical and parse successfully. Scoped git whitespace check passed with existing CRLF normalization warnings.

Existing React key warnings in siege/compare and a Three material-property warning remain outside this pass.

## Artifacts

- [Light desktop pulley](pass50-light/pulley-6-half.png)
- [Dark mobile pulley](pass50-dark/mobile-320.png)
- [High-contrast pulley](pass50-contrast/pulley-6-half.png)
- [Summary](pass50-summary.json)
- [Test report](pass50-tests.json)

Changes remain local. No commit, push, or deployment was performed.
