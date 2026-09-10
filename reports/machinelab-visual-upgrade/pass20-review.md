# Machine Lab visual refinement — pass 20

All six workshop machines now distinguish the complete working stroke from distance already traveled. Thin rails retain the full path, while wider bars grow from the shared zero to the diamond and ring markers. The bars keep the exact effort-to-load ratio, including reversed and very small ratios, without adding artificial minimum lengths.

The fills clear at rest, follow automatic playback, and remain accurate during held inspection and reduced motion. The legend explains both widths, with the same explanation included in the scene's accessible description. Trail markers sit above the fill surfaces.

Validation: 370 focused tests passed in five files, including 22 new cases covering all machines, extreme ratios, invalid comparisons, exact endpoints, geometry reuse, marker clearance, playback/reset, and the visible/accessible explanation at every learning band.

Real-host browser checks passed in light, dark, and high-contrast themes. Each theme covered 22 desktop scenarios, all six machines at 320- and 390-pixel widths, keyboard scrubbing, reduced motion, timer isolation, and station reset. No captured browser errors or horizontal overflow. Visually reviewed the light halfway pulley, reversed lever, dark 320-pixel pulley, and high-contrast halfway pulley.

Source and desktop mirror are byte-identical. Changes remain local; no commit, push, or deployment was performed.

Artifacts: [tests](pass20-tests.json), [summary](pass20-summary.json), [halfway pulley](pass20-light/pulley-50.png), [reversed lever](pass20-light/reverse.png), [mobile](pass20-dark/mobile-pulley-320.png), [high contrast](pass20-contrast/pulley-50.png).
