# Machine Lab visual enhancement — pass 19

The pulley now has one small upward force cue for each supporting rope strand, from one through six strands. Equal-size cues explain equal tension in the ideal rope. The free pull remains distinct, with its existing larger downward arrow.

The cues stay centered on the shortening supporting spans throughout the stroke and remain clear of both blocks. Their shape and size remain constant during playback, held inspection, and reduced motion. The workshop explanation identifies the cues as tension, rather than rope travel.

Validation: all 348 focused tests passed in five files, including 13 added regression cases. The new cases cover all six supporting-strand counts in ordinary and reduced motion, exact strand alignment, block clearance, upward direction, stable geometry, focus mode, and station-specific explanatory text.

Real-host browser review passed in light, dark, and high-contrast themes: 13 desktop scenarios per theme (each count at half/full stroke plus the rear view), 320/390-pixel layouts, keyboard inspection, reduced motion, timer isolation, and station reset. No captured browser errors or horizontal overflow. Visually reviewed six-strand light, rear, high-contrast, and dark 320-pixel screenshots.

Source and desktop mirror are byte-identical. Changes remain local; no commit, push, or deployment was performed.

Artifacts: [test results](pass19-tests.json), [summary](pass19-summary.json), [light six-strand view](pass19-light/pulley-6-100.png), [rear view](pass19-light/pulley-rear.png), [dark mobile view](pass19-dark/mobile-pulley-320.png), [high-contrast view](pass19-contrast/pulley-6-100.png).
