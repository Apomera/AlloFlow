# Machine Lab visual refinement: demonstration phases

Added an active-playback indicator above the scene for all six simple machines. It distinguishes **Working stroke** from **Returning to start**, with a two-part stage bar and an explanation that arrows show working direction while the return resets the demonstration. Motion-off playback says **Motion off: full-stroke view** and hides the stage bar.

The indicator follows the renderer's actual timing. Only phase changes update its status text; animation frames do not trigger React renders or repeat status announcements. Hold, completion, and station switching remove the playback indicator. Camera changes preserve the current phase. Existing stroke geometry and easing remain unchanged.

## Validation

- 544 tests passed across geometry, view rendering, accessibility, and translation hygiene. Seven new geometry tests cover all six mechanisms, both playback durations, reduced motion, held poses, and idle.
- 232 browser checks passed across light, dark, and high-contrast palettes; 34 screenshots captured. No browser errors or horizontal overflow were recorded.
- Browser checks use the real React/Three host with a controlled renderer clock for stable phase capture, and manually invoke recorded completion callbacks. They cover camera rerenders, hold, completion, station changes, normal/slow timing, reduced motion, 390/320-pixel layouts, and forced colors.
- Visually inspected light mobile return, dark desktop lever return, and forced-color mobile pulley return screenshots.
- Source and desktop mirror match; both parse successfully. Scoped git diff whitespace check passed with existing CRLF normalization warnings.

An initial QA attempt used the camera button's visible text rather than its accessible name. The selector was corrected; all final browser runs exited successfully. Existing React key warnings in siege/compare and a Three material-property warning remain outside this pass.

## Review artifacts

- [Light mobile return](pass48-light/return-320.png)
- [Dark desktop lever return](pass48-dark/return-lever.png)
- [Forced-color mobile return](pass48-contrast/forced-colors-return-320.png)
- [Machine-readable summary](pass48-summary.json)
- [Test report](pass48-tests.json)

Changes remain local; this pass did not commit, push, or deploy.
