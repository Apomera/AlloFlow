# Machine Lab refinement — pass 23

A new Drum camera button at the wheel-and-axle station frames the exposed barrel and lifting rope in one action. It retains the current working-stroke pose and the learner's room/focus setting. The button has a selected appearance and aria-pressed state that clear when the camera moves away from the preset. The observation text now points learners directly to this view.

Validation: 158 focused tests passed across camera, views, accessibility, and translation hygiene. Nine new camera cases cover the native button at all four learning bands, selected-state accuracy, and station/view scoping.

Real-host browser checks passed in light, dark, and high-contrast themes. Each theme covered 18 desktop scenarios and 320/390-pixel layouts. Checks exercised actual click/Enter activation, preservation of scene identity, focus preference and held pose, manual-orbit deselection, keyboard scrubbing, reduced motion, timer isolation, and removal of the drum control on the next station. No captured browser errors or horizontal overflow. Visually reviewed the ordinary room view, dark 320-pixel layout, and high-contrast focus view.

Source and desktop mirror are byte-identical. This pass remains local; no commit, push, or deployment was performed.

Artifacts: [tests](pass23-tests.json), [summary](pass23-summary.json), [room view](pass23-light/windlass-side-50.png), [mobile](pass23-dark/mobile-windlass-320.png), [high contrast](pass23-contrast/windlass-0.45-0.1-50.png).
