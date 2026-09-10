# Machine Lab visual refinement — pass 21

The screw press now descends by one rendered thread spacing per revolution. Shaft, swivel shoe, pressure cue, and turn guide move together, so the helix remains aligned at the fixed nut across the selected pitch settings.

Fine threads are narrower and remain joined to the shaft, keeping adjacent turns visibly separated. The shaft now reaches the handle. Three bands on each face of the workpiece move closer together as it compresses; the workpiece stays planted on the press base and does not spin.

Validation: all 383 focused tests passed in five files. After the final fine-thread refinement, all 235 geometry tests passed again. Thirteen new cases cover six pitch settings in ordinary/reduced motion, engagement at the nut, thread separation and shaft contact, handle continuity, compression clearance, attached bands, and the explanatory text. Existing inspection and rotational-cue assertions now use the actual rendered lead. Four earlier browser harnesses were updated to use that lead too.

Real-host browser review passed in light, dark, and high-contrast themes. Each theme covered 15 desktop scenarios (six pitches at half/full stroke, two handle sizes, and a rear view), 320/390-pixel layouts, keyboard inspection, reduced motion, timer isolation, and station reset. No captured browser errors or horizontal overflow. Visually reviewed both pitch extremes, dark mobile, and the high-contrast rear view.

Source and desktop mirror are byte-identical. Changes remain local; no commit, push, or deployment was performed.

Artifacts: [focused tests](pass21-tests.json), [final geometry tests](pass21-geometry-final.json), [summary](pass21-summary.json), [fine thread](pass21-light/screw-0.001-100.png), [coarse thread](pass21-light/screw-0.02-100.png), [mobile](pass21-dark/mobile-screw-320.png), [high-contrast rear](pass21-contrast/screw-rear.png).
