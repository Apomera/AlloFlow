# Machine Lab visual refinement: live stroke ruler

The inspection ruler previously remained at 0% during playback, with a generic Running label. Its thumb, colored fill, numeric badge, and accessible value now follow the machine's actual rendered working-stroke position, outward and back. Playback help explains the scale and the Hold this pose control.

Holding retains the exact model pose and its displayed percentage. Keyboard adjustments resume from that position. Motion-off playback shows 100%; completion and station changes reset the ruler. Camera changes preserve the displayed position. The numeric readout is not a live region, and updates do not trigger React rendering per frame.

## Validation

- 228 view, accessibility, and translation tests passed on the final source.
- 520 browser checks passed: 142 light, 142 dark, 144 high contrast/forced colors, and 92 keyboard/ruler checks. No browser errors or horizontal overflow.
- 39 screenshots captured. Inspected light mobile playback, dark desktop lever playback, and forced-color mobile pulley playback.
- All six machines checked at seven points across the playback cycle, with percentages derived from the existing renderer easing. Checks include camera changes, exact hold, keyboard continuation, old timer isolation, replay, completion, normal and slow playback, reduced motion, and 390/320-pixel screens.
- The dedicated keyboard sweep covers Arrow keys, Home, End, focus visibility, ruler alignment, and forced-color marker shapes for all six machines at desktop and mobile widths.
- Source and desktop mirror are identical and parse successfully. Scoped whitespace check passed with CRLF normalization warnings.

Browser testing caught stale text/fill after playback completion when React's previous values matched its next values. Ref callbacks now synchronize the ruler when React commits as well as during playback. The final runs above include this correction. Existing React key warnings in siege/compare remain outside this pass.

## Artifacts

- [Light mobile playback](pass49-light/live-320.png)
- [Dark desktop playback](pass49-dark/live-lever.png)
- [Forced-color playback](pass49-contrast/forced-colors-live-320.png)
- [Summary](pass49-summary.json)
- [UI test report](pass49-tests.json)

Changes remain local. No commit, push, or deployment was performed.
