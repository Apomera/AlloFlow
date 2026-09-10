# Machine Lab visual refinement — pass 22

The wheel-and-axle demonstration now has a marked grip, two opposed stripes on the exposed drum, and markers on both faces of the drum flanges. The flange assembly and its markings rotate with the wheel, making the shared rotation visible during playback and held inspection.

The markings use light paint in ordinary themes and black paint in high-contrast mode. Their placement keeps them attached to the surfaces and clear of the rope winding. The observation text points learners toward an oblique or side view of the drum.

Validation: all 397 focused tests passed in five files, including 14 new cases. After the contrast refinement, all 248 geometry tests passed again. Coverage includes six wheel/drum size combinations, ordinary and reduced motion, aligned markers, shared rotation, unchanged geometry during motion, stripe clearance, rope/load connections, focus mode, playback/reset, and station-specific explanatory text.

Real-host browser checks passed in light, dark, and high-contrast themes. Each theme covered 18 desktop scenarios, 320/390-pixel mobile layouts, keyboard inspection, reduced motion, timer isolation, and station reset. No captured browser errors or horizontal overflow. Visually reviewed the final side/oblique view in all themes and the dark 320-pixel view.

Source and desktop mirror are byte-identical. Changes remain local; no commit, push, or deployment was performed.

Artifacts: [focused tests](pass22-tests.json), [final geometry tests](pass22-geometry-final.json), [summary](pass22-summary.json), [light drum view](pass22-light-final/windlass-0.45-0.1-50.png), [dark drum view](pass22-dark/windlass-0.45-0.1-50.png), [mobile](pass22-dark/mobile-windlass-320.png), [high contrast](pass22-contrast/windlass-0.45-0.1-50.png).
