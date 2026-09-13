# Machine Lab engagement and visual refinement — pass 24

Each workshop station now has a Motion detective card with an observation challenge, an Inspect the clue action, and a learner-controlled explanation reveal. A magnifying-glass icon, accent border, and clear action hierarchy give the activity its own visual identity.

Inspect the clue holds the mechanism at half stroke, chooses a station-specific camera view, hides the workshop room, and brings the scene into view without animated scrolling. Learners can then scrub or rotate the model and reveal the explanation with a native keyboard-accessible disclosure. Changing stations closes the previous reveal. The explanations account for shorter/equal lever arms and a vertical ramp. The activity does not mark the existing prove task complete.

Validation: all 187 focused tests passed in four files on the final code, including 29 new cases covering every station at every learning band and setting-dependent explanations. An earlier new-test punctuation assertion had a syntax error; it was corrected before the final successful run.

Real-host browser checks passed in light, dark, and high-contrast themes. Each theme covered nine desktop scenarios and all six stations at 320/390-pixel widths. The checks exercised keyboard setup/reveal, scene scrolling, model identity, focus mode, held poses, reveal persistence during scrubbing, reveal reset on station change, reduced motion, and timer isolation. No captured browser errors or horizontal overflow. Visually reviewed the light lever, vertical ramp, dark mobile screw, and high-contrast wedge.

Source and desktop mirror are byte-identical. This pass remains local; no commit, push, or deployment was performed.

Artifacts: [final tests](pass24-tests-final.json), [summary](pass24-summary.json), [lever activity](pass24-light-final/discovery-lever.png), [vertical ramp](pass24-light-final/vertical-ramp.png), [mobile screw](pass24-dark/mobile-screw-320.png), [high-contrast wedge](pass24-contrast/discovery-wedge.png).
