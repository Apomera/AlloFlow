# Machine Lab visual refinement: quarter-turn position guides

The wheel-and-axle and screw guides now cover nearly a full revolution, with four equally spaced angular marks, an open start ring, and a moving diamond aligned with the actual grip. This makes quarter, half, and full turns easier to compare with load movement. The directional arrow remains distinct from the moving position marker.

The start reference keeps its angular position. The screw's guide translates with the descending handle; the wheel's guide stays centered on its axle. The cursor returns with the existing demo motion and remains fixed during pose inspection. The observation panel and accessible explanation describe the marks. No controls or saved-state fields were added.

The marker has a contrasting silhouette for visibility. The wheel guide was sized to keep the marker and its outline above the platform at the largest handle radius. Geometry is allocated once per build and reused through animation.

## Validation

- 559 unique tests passed: 331 geometry, 192 views, 28 accessibility, and 8 translation hygiene. The 331 geometry tests were rerun successfully after the final marker-outline refinement; repeat runs are not double-counted.
- Eight new geometry regressions verify grip alignment, quarter-turn spacing, start/full-turn agreement, platform clearance at three handle sizes, fixed geometry, return motion, and reduced-motion stability.
- 286 browser checks passed across light, dark, and high-contrast themes, including forced colors, extreme handle sizes, held quarter turns, keyboard adjustment, motion-off poses, camera framing, and 390/320-pixel layouts. No browser errors or horizontal overflow.
- 43 final screenshots captured. Inspected dark wheel-and-axle at three-quarter turn, light mobile screw at quarter turn, and forced-color mobile screw. Earlier light screenshots informed the outline refinement and are not counted separately.
- Source and desktop mirror match and parse successfully. Scoped whitespace check passed with existing CRLF normalization warnings.

Existing React key warnings in siege/compare and a Three material-property warning remain outside this pass.

## Artifacts

- [Dark wheel-and-axle](pass51-dark/windlass-75.png)
- [Light mobile screw](pass51-light/screw-mobile-320.png)
- [Forced-color mobile screw](pass51-contrast/forced-colors-screw-320.png)
- [Summary](pass51-summary.json)
- [Full test run](pass51-tests.json)
- [Final geometry recheck](pass51-geometry-final-tests.json)

Changes remain local. No commit, push, or deployment was performed.
