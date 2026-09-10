# Printing Press force and distance experiment

Replaced the mechanics text block with a responsive, interactive ideal-screw experiment. Students vary bar length and thread pitch independently while the tangential input stays at 10 N. Linked results show force multiplication, platen force, and both hand and platen travel for a full turn. The bar diagram scales with bar length; the screw diagram changes thread spacing. Both views stack on small screens.

The prediction prompt asks students to double one variable at a time. A disclosure explains unit conversion and the single-start, frictionless assumptions. Reset affects only this experiment and preserves saved proofs and observations. The matching scenario now asks for a computable ideal force in newtons instead of asserting an unprovided historical friction factor.

Physics references: [OpenStax Physics, Simple Machines](https://openstax.org/books/physics/pages/9-3-simple-machines) and [Key Equations](https://openstax.org/books/physics/pages/9-key-equations). Ideal advantage is circumference divided by pitch, using matching length units. This classroom model does not estimate actual historical press force.

Validation: 42 tests passed across nine printing press suites. After splitting the diagram for mobile, the 17 affected model, SVG accessibility, and saved-run tests passed again. The existing workshop browser regression and the new screw-experiment browser checks passed. The latter covers doubling each variable, keyboard slider adjustment, value announcements, reset isolation, calculation disclosure, no horizontal overflow at 1280/768/390/320 px, and zero axe WCAG A/AA violations within the experiment. Source/desktop parity, syntax, and whitespace checks passed. Desktop and phone screenshots were inspected; the mobile inspection prompted larger, separately stacked diagrams.

These checks use the actual tool in an isolated React host. They do not establish classroom learning outcomes.

Evidence: browser-results.json and experiment-1280.png, experiment-768.png, experiment-390.png, experiment-320.png.

## Two-setup comparison refinement

Students can keep setup A, adjust setup B, and compare settings, hand travel, platen travel, and ideal force. The force bars use a shared zero-based scale. Contextual prompts distinguish unchanged settings, one changed variable, and two changed variables. Setup A remains fixed until the student replaces it or resets the experiment.

Add comparison to notebook appends the model assumptions and both sets of measurements while retaining existing writing. Duplicate entries are prevented, and insufficient space leaves the notebook untouched. Explanations remain student-authored. Added evidence persists with the notebook and appears in its download; the unsaved comparison is clearly identified as temporary.

Expanded browser checks cover baseline isolation, shared chart scale, all variable-change messages, duplicate prevention, notebook capacity, keyboard focus, export and reopen recovery, reset isolation, and replacement of setup A. Comparison screenshots at desktop and 320 px were visually reviewed. The experiment has no horizontal overflow at 1280, 768, 390, or 320 px and no axe WCAG A/AA violations in those checks. The new table has a caption and scoped row and column headers.

Additional evidence: comparison-1280.png, comparison-768.png, comparison-390.png, comparison-320.png, and comparison-notebook.txt.
