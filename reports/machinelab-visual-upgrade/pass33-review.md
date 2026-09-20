# Machine Lab: clearer distance tracks

Each effort and load track now has a fixed end cap marking the full stroke. The moving diamond and ring have dark silhouette edges that help separate them from the track bed. The ring retains its open center and follows the camera.

The larger legend uses the selected theme and explains the rails, traveled bars, and end caps. It wraps within narrow phone layouts.

## Validation

- 554 tests passed across geometry, views, camera controls, accessibility, and translation hygiene, including eight added geometry checks.
- End caps remain fixed at the true endpoints for advantages from 0.05 to 3000 and hide for invalid advantage. Existing tests verify exact traveled distances, marker clearance, held poses, and reduced motion.
- 81 browser checks and 33 screenshots across three themes, desktop and phone widths, and three additional orbit views. No recorded errors or horizontal overflow.
- Reviewed the final light phone layout, dark drum view, and high-contrast front view.
- Source and desktop mirror are identical; JavaScript syntax and scoped diff checks pass.

The initial edge was slightly too large at full marker scale. Tightening the outline and aligning end caps with the rail height restored clearance; the complete test rerun passes. Legend assertions were updated for the additional explanation. Existing unrelated React key and THREE material warnings remain.

## Evidence

- [Final tests](pass33-final-tests.json)
- [Light browser results](pass33-light-final/results.json)
- [Dark browser results](pass33-dark-final/results.json)
- [High-contrast browser results](pass33-contrast-final/results.json)
- [Summary](pass33-summary.json)

Changes remain local. Publishing remains paused.
