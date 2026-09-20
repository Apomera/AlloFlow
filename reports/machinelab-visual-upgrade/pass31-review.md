# Machine Lab: hold the moment

**Hold this pose** freezes the position currently shown during a demonstration. Learners can then rotate the model or use the position slider to inspect the mechanism. The control includes a pause icon, works from the keyboard, and hands focus to the slider after holding.

The renderer records its current travel without triggering React updates each frame. Holding preserves that exact value, avoiding a jump to a rounded percentage or a preset. The current run and station must match before a pose can be captured. Existing playback timer guards also protect restarted demonstrations.

## Validation

- 546 unique tests passed, including 16 added in this pass: 291 geometry, 192 view, 27 camera, 28 accessibility, and 8 translation checks.
- All six mechanisms preserve their exact transforms when held, with both normal motion and reduced motion.
- Browser checks passed in light, dark, and high contrast at desktop and 390/320px mobile widths: 24 screenshots and 27 interaction checks, no recorded errors or horizontal overflow.
- Browser checks verify exact pose preservation, no model rebuild, slider focus, persistent holds, restart timer isolation, keyboard operation, and holding a motion-off demonstration.
- Reviewed the light 320px layout, dark screw desktop view, and high-contrast 390px layout.
- Source and desktop copies are byte-identical; production and browser-harness JavaScript parse successfully.

The first UI run exposed outdated button-count assertions and a fallback fixture that did not explicitly remove the viewer. Both were corrected, and all 192 view tests passed on rerun. The first high-contrast browser attempt timed out while waiting for restart; a complete rerun passed without changing production code. Existing React key and THREE material warnings remain outside this change.

## Evidence

- [Final view tests](pass31-views-final-tests.json)
- [Geometry, camera, accessibility, and translation results](pass31-tests.json)
- [Light browser results](pass31-light/results.json)
- [Dark browser results](pass31-dark/results.json)
- [High-contrast browser results](pass31-contrast-final/results.json)
- [Summary](pass31-summary.json)

Changes remain local; publishing remains paused.
